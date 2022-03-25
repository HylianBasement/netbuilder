import { Players, RunService } from "@rbxts/services";
import { Option, Result, Vec } from "@rbxts/rust-classes";

import {
	NetBuilderMiddleware,
	MiddlewareCallback,
	RemoteDefinitionMembers,
	ThreadResult,
	NetBuilderResult,
	SerializableClassInstance,
	Optional,
	SerializableClass,
	RemoteDefinitionNamespace,
} from "../definitions";

import GlobalMiddleware from "../Symbol/GlobalMiddleware";
import Serialization from "../Symbol/Serialization";

import definitionInfo from "../Util/definitionInfo";
import unwrapPromiseDeep from "../Util/unwrapPromiseDeep";
import netBuilderFormat from "../Util/netBuilderFormat";
import isSerializedObject from "../Util/isSerializedObject";

interface MiddlewareEntry {
	CurrentParameters: ReadonlyArray<unknown>;
	ReturnCallbacks: Array<(value: unknown) => unknown>;
	Result: ThreadResult;
}

function isSerializableClassInstance(
	namespace: RemoteDefinitionNamespace,
	value: unknown,
): value is SerializableClassInstance {
	if (!typeIs(value, "table")) {
		return false;
	}

	const mt = getmetatable(value);

	if (!typeIs(mt, "table") || !("ClassName" in mt)) {
		return false;
	}

	const serializables = namespace[Serialization] as Map<string, SerializableClass>;

	return serializables.has((mt as { ClassName: string }).ClassName);
}

function serialize(namespace: RemoteDefinitionNamespace, v: defined) {
	return isSerializableClassInstance(namespace, v)
		? "Serialize" in v
			? v.Serialize()
			: v.serialize()
		: v;
}

function deserialize(namespace: RemoteDefinitionNamespace, v: defined) {
	const serializables = namespace[Serialization] as Map<string, SerializableClass>;

	return isSerializedObject(v)
		? Option.wrap(serializables.get(v.ClassName))
				.andWith((s) => Option.some(s.deserialize(v.Value)))
				.expect(
					netBuilderFormat(`Class "${v.ClassName}" is not a registered serializable class.`),
				)
		: v;
}

/** @internal */
namespace MiddlewareManager {
	export const timeout = 60;

	export const timeoutMsg = `middleware processing has timed out. (${MiddlewareManager.timeout}s)`;

	export function CreateReceiver<F extends Callback>(
		definition: RemoteDefinitionMembers,
		callback: F,
	): (...args: unknown[]) => NetBuilderResult<ReturnType<F>> {
		return (...args: unknown[]) => {
			const player = getPlayerFromArgs(...args);
			const middlewares = getMiddlewares(definition);

			const executeFn = (...args: unknown[]) =>
				unwrapPromiseDeep(RunService.IsServer() ? callback(player, ...args) : callback(...args));

			if (middlewares.size() > 0) {
				const state = checkMiddlewares(definition, "Recv", args);

				if (state.Result.isErr()) {
					return {
						Result: "Err",
						Message: state.Result.unwrapErr(),
					};
				}

				return {
					Result: "Ok",
					Value: state.ReturnCallbacks.reduce(
						(acc, fn) => fn(acc),
						executeFn(
							...(state.CurrentParameters as defined[]).map((v) =>
								deserialize(definition.Namespace, v),
							),
						),
					),
				};
			}

			return { Result: "Ok", Value: executeFn(...args) };
		};
	}

	export function CreateSender(definition: RemoteDefinitionMembers, ...args: unknown[]) {
		const middlewares = getMiddlewares(definition);

		if (middlewares.size() > 0) {
			const state = checkMiddlewares(definition, "Send", args);

			return state.Result.and(
				Result.ok([
					(state.CurrentParameters as defined[]).map((v) =>
						serialize(definition.Namespace, v),
					),
					(r: unknown) => state.ReturnCallbacks.reduce((acc, fn) => fn(acc), r),
				]),
			);
		}

		return Result.ok([args, (r: unknown) => r]);
	}

	function getMiddlewares(definition: RemoteDefinitionMembers) {
		const globalMiddlewares = definition.Namespace[GlobalMiddleware] as Array<NetBuilderMiddleware>;

		return Vec.fromPtr([...definition.Middlewares, ...globalMiddlewares])
			.dedupBy(({ Label: l1 }, { Label: l2 }) => l1 === l2 && l1 !== "Unknown")
			.asPtr();
	}

	function checkMiddlewares(
		definition: RemoteDefinitionMembers,
		kind: "Send" | "Recv",
		args: unknown[],
	) {
		const player = getPlayerFromArgs(...args);
		const middlewares = getMiddlewares(definition);

		const state: Optional<MiddlewareEntry, "Result"> = {
			CurrentParameters: resolveParameters(args),
			ReturnCallbacks: [],
		};

		for (const m of middlewares) {
			createChannel(definition, m[kind])
				.then(([fn, e]) => {
					task.spawn(fn, player, ...state.CurrentParameters);

					return e;
				})
				.then((result) => {
					if (!state.Result || state.Result.isOk()) {
						state.Result = result.andWith(([newParams, returnFn]) => {
							state.CurrentParameters = newParams ?? [];
							state.ReturnCallbacks.push(returnFn);

							return result;
						});
					}
				})
				.expect();

			if (state.Result?.isErr()) {
				break;
			}
		}

		return state as MiddlewareEntry;
	}

	function resolveParameters(args: unknown[]) {
		const newArgs = [...args];

		if (RunService.IsServer()) {
			(newArgs as defined[]).shift();
		}

		return newArgs;
	}

	function getPlayerFromArgs(...args: unknown[]) {
		if (RunService.IsClient()) {
			return Players.LocalPlayer;
		}

		return (args as [Player]).shift()!;
	}

	function createChannel(definition: RemoteDefinitionMembers, channel: MiddlewareCallback) {
		return Promise.resolve([
			coroutine.create(channel),
			coroutine.create((result: ThreadResult) => {
				coroutine.yield();

				return result;
			}),
			new Instance("BindableEvent"),
			Promise.delay(MiddlewareManager.timeout).then(() => MiddlewareManager.timeoutMsg),
		] as const)
			.then(([ch, co, bindable, timeout]) => {
				let isDone = false;

				const close = (result: ThreadResult) => {
					if (!isDone) {
						isDone = true;

						task.spawn(co, result);
						task.defer(coroutine.close, ch);

						timeout.cancel();
						bindable.Fire();

						coroutine.yield();
					}
				};

				const processNext = (args: unknown[], returnFn: (r: unknown) => unknown) =>
					close(Result.ok([args, returnFn]));
				const drop = (reason: string) => close(Result.err(reason));

				timeout.then((msg) => drop(`${definitionInfo(definition)} ${msg}`));

				return [
					ch,
					processNext,
					drop,
					Promise.fromEvent(bindable.Event)
						.tap(() => bindable.Destroy())
						.then(() => coroutine.resume(co)[1]),
				] as const;
			})
			.then(
				([ch, p, d, e]) =>
					[
						coroutine.resume(ch, definition, p, d)[1] as ReturnType<MiddlewareCallback>,
						e as Promise<ThreadResult>,
					] as const,
			);
	}
}

export = MiddlewareManager;
