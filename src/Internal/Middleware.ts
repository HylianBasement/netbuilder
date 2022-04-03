import { Result, Vec } from "@rbxts/rust-classes";

import {
	NetBuilderMiddleware,
	MiddlewareCallback,
	DefinitionMembers,
	ThreadResult,
	NetBuilderResult,
	Optional,
} from "../definitions";

import Serialization from "./Serialization";

import GlobalMiddleware from "../Symbol/GlobalMiddleware";

import definitionInfo from "../Util/definitionInfo";
import awaitPromiseDeep from "../Util/awaitPromiseDeep";
import netBuilderWarn from "../Util/netBuilderWarn";
import TypeChecking from "./TypeChecking";

interface MiddlewareEntry {
	CurrentParameters: ReadonlyArray<unknown>;
	ReturnCallbacks: Array<(value: unknown) => unknown>;
	Result: ThreadResult;
}

const RunService = game.GetService("RunService");
const Players = game.GetService("Players");

const IS_SERVER = RunService.IsServer();

/** @internal */
namespace Middleware {
	export const timeout = 60;

	export const timeoutMsg = `middleware processing has timed out. (${Middleware.timeout}s)`;

	export function CreateReceiver<F extends Callback>(
		definition: DefinitionMembers,
		callback: F,
	): (...args: unknown[]) => NetBuilderResult<unknown> {
		return (...args: unknown[]) => {
			const player = getPlayerFromArgs(...args);
			const middlewares = getMiddlewares(definition);

			const executeFn = (...args: unknown[]) =>
				awaitPromiseDeep(RunService.IsServer() ? callback(player, ...args) : callback(...args));

			const [parameterChecks] = definition.Checks;

			if (middlewares.size() > 0) {
				const state = resolveMiddlewares(definition, "Recv", args);

				if (state.Result.isErr()) {
					const message = state.Result.unwrapErr();

					warnForEvents(definition, message);

					return {
						Type: "Err",
						Message: message,
					};
				}

				const newArgs = (state.CurrentParameters as defined[]).map((v) =>
					Serialization.Deserialize(definition.Namespace, v),
				);

				const [failed, message] = TypeChecking.Parameters(newArgs, parameterChecks);

				if (IS_SERVER && failed) {
					warnForEvents(definition, message);

					return {
						Type: "Err",
						Message: message,
					};
				}

				state.ReturnCallbacks.unshift((r) =>
					Serialization.Serialize(definition.Namespace, r as never),
				);

				const returnValue = executeFn(...newArgs);

				if (definition.Kind !== "Event") {
					const [, returnValueCheck] = definition.Checks;
					const [failed, message] = TypeChecking.ReturnValue(returnValue, returnValueCheck);

					if (IS_SERVER && failed) {
						return {
							Type: "Err",
							Message: message,
						};
					}
				}

				return {
					Type: "Ok",
					Value: state.ReturnCallbacks.reduce((acc, fn) => fn(acc), returnValue),
				};
			}

			if (definition.Kind !== "Event") {
				const [failed, message] = TypeChecking.Parameters(args, parameterChecks);

				if (IS_SERVER && failed) {
					return {
						Type: "Err",
						Message: message,
					};
				}
			}

			const returnValue = executeFn(...args);

			if (definition.Kind !== "Event") {
				const [, returnValueCheck] = definition.Checks;
				const [failed, message] = TypeChecking.ReturnValue(returnValue, returnValueCheck);

				if (IS_SERVER && failed) {
					warnForEvents(definition, message);

					return {
						Type: "Err",
						Message: message,
					};
				}
			}

			return {
				Type: "Ok",
				Value: Serialization.Serialize(
					definition.Namespace,
					Serialization.Deserialize(definition.Namespace, returnValue),
				),
			};
		};
	}

	export function CreateSender(
		definition: DefinitionMembers,
		...args: unknown[]
	): Result<[unknown[], (r: unknown) => unknown], string> {
		const middlewares = getMiddlewares(definition);
		const [parameterChecks] = definition.Checks;

		if (middlewares.size() > 0) {
			const state = resolveMiddlewares(definition, "Send", args);

			const newArgs = (state.CurrentParameters as defined[]).map((v) =>
				Serialization.Serialize(definition.Namespace, v),
			);

			const [failed, message] = TypeChecking.Parameters(newArgs, parameterChecks);

			if (IS_SERVER && failed) {
				warnForEvents(definition, message);

				return Result.err(message);
			}

			state.ReturnCallbacks.unshift((r) =>
				Serialization.Deserialize(definition.Namespace, r as never),
			);

			return state.Result.and(
				Result.ok([
					newArgs,
					(r: unknown) => state.ReturnCallbacks.reduce((acc, fn) => fn(acc), r),
				]),
			);
		}

		const newArgs = (args as defined[]).map((v) => Serialization.Serialize(definition.Namespace, v));

		const [failed, message] = TypeChecking.Parameters(newArgs, parameterChecks);

		if (IS_SERVER && failed) {
			warnForEvents(definition, message);

			return Result.err(message);
		}

		return Result.ok([
			newArgs,
			(r: unknown) => Serialization.Deserialize(definition.Namespace, r as never),
		]);
	}

	function getMiddlewares(definition: DefinitionMembers) {
		const globalMiddlewares = definition.Namespace[GlobalMiddleware] as Array<NetBuilderMiddleware>;

		return Vec.fromPtr([...definition.Middlewares, ...globalMiddlewares])
			.dedupBy(({ Id: i1 }, { Id: i2 }) => i1 === i2 && i1 !== "Unknown")
			.asPtr();
	}

	function warnForEvents(definition: DefinitionMembers, message: string) {
		if (definition.Kind === "Event") {
			netBuilderWarn(definition, message);
		}
	}

	function resolveMiddlewares(definition: DefinitionMembers, kind: "Send" | "Recv", args: unknown[]) {
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

	function createChannel(definition: DefinitionMembers, channel: MiddlewareCallback<Callback>) {
		return Promise.resolve([
			coroutine.create(channel),
			coroutine.create((result: ThreadResult) => {
				coroutine.yield();

				return result;
			}),
			new Instance("BindableEvent"),
			Promise.delay(Middleware.timeout).andThenReturn(Middleware.timeoutMsg),
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
						coroutine.resume(ch, definition, p, d)[1] as ReturnType<
							MiddlewareCallback<Callback>
						>,
						e as Promise<ThreadResult>,
					] as const,
			);
	}
}

export = Middleware;
