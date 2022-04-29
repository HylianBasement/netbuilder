import { Result, Vec, unit } from "@rbxts/rust-classes";

import {
	NetBuilderMiddleware,
	MiddlewareCallback,
	DefinitionMembers,
	ThreadResult,
	NetBuilderResult,
	ObjectDispatcher,
} from "../definitions";

import Serialization from "./Serialization";
import TypeChecking from "./TypeChecking";

import GlobalMiddleware from "../Symbol/GlobalMiddleware";

import definitionInfo from "../Util/definitionInfo";
import netBuilderWarn from "../Util/netBuilderWarn";
import symbolDictionary from "../Util/symbolDictionary";
import { IS_SERVER, Timeout } from "../Util/constants";

interface FunctionState {
	CurrentParameters: ReadonlyArray<unknown>;
	ReturnCallbacks: Array<(value: unknown) => unknown>;
	Result: ThreadResult;
}

interface DefinitionEntry {
	Definition: DefinitionMembers;
	Kind: keyof ObjectDispatcher<never, never>;
	Arguments: Array<unknown>;
}

type SenderResult = Result<[unknown[], (r: unknown) => unknown], string>;

const Players = game.GetService("Players");

/** @internal */
namespace Middleware {
	export const timeoutMsg = `middleware processing has timed out. (${Timeout.Middleware}s)`;

	export function CreateReceiver<F extends Callback>(
		definition: DefinitionMembers,
		callback: F,
	): (...args: unknown[]) => NetBuilderResult<unknown> {
		return (...args: unknown[]) => {
			const player = IS_SERVER ? (args as [Player]).shift()! : Players.LocalPlayer;
			const state = resolveMiddlewares(player, {
				Definition: definition,
				Kind: "Recv",
				Arguments: args,
			});

			const [parameterChecks, returnValueCheck] = definition.Checks;
			const seriDef = Serialization.CreateSerializationDefinition(definition);

			const executeFn = (...a: unknown[]) =>
				awaitPromiseDeep(IS_SERVER ? callback(player, ...a) : callback(...a));

			return state.Result.mapErr((message) => {
				warnForEvents(definition, message);

				return {
					Type: "Err",
					Message: message,
				};
			})
				.andWith(() => {
					const newArgs = (state.CurrentParameters as defined[]).map((v) =>
						Serialization.Deserialize(seriDef, v),
					);

					return TypeChecking.Parameters(newArgs, parameterChecks, true)
						.mapErr((message) => {
							warnForEvents(definition, message);

							return {
								Type: "Err",
								Message: message,
							};
						})
						.andWith(() => Result.ok(executeFn(...newArgs)));
				})
				.andWith((returnValue) => {
					state.ReturnCallbacks.unshift((r) => Serialization.Serialize(seriDef, r as never));

					return (
						definition.Kind !== "Event"
							? TypeChecking.ReturnValue(returnValue, returnValueCheck).mapErr(
									(message) => ({
										Type: "Err",
										Message: message,
									}),
							  )
							: Result.ok(unit())
					).andWith(() =>
						Result.ok({
							Type: "Ok",
							Data: state.ReturnCallbacks.reduce((acc, fn) => fn(acc), returnValue),
						}),
					) as never;
				})
				.asPtr() as NetBuilderResult<unknown>;
		};
	}

	export function CreateSender(
		player: Player,
		definition: DefinitionMembers,
		...args: unknown[]
	): SenderResult {
		const state = resolveMiddlewares(player, {
			Definition: definition,
			Kind: "Send",
			Arguments: args,
		});

		const seriDef = Serialization.CreateSerializationDefinition(definition);
		const newArgs = (state.CurrentParameters as defined[]).map((v) =>
			Serialization.Serialize(seriDef, v),
		);
		const [parameterChecks] = definition.Checks;

		return Result.ok(unit())
			.andWith(() => {
				return TypeChecking.Parameters(newArgs, parameterChecks, false)
					.mapErr((message) => {
						warnForEvents(definition, message);

						return message;
					})
					.and(Result.ok(unit()));
			})
			.andWith(() => {
				state.ReturnCallbacks.unshift((r) => Serialization.Deserialize(seriDef, r as never));

				return state.Result;
			})
			.andWith(() =>
				Result.ok([
					newArgs,
					(r: unknown) => state.ReturnCallbacks.reduce((acc, fn) => fn(acc), r),
				]),
			) as SenderResult;
	}

	function awaitPromiseDeep<T>(promise: T | Promise<T>): T {
		const value = Promise.is(promise) ? promise.expect() : promise;
		return Promise.is(value) ? awaitPromiseDeep<T>(value as T) : value;
	}

	function warnForEvents(definition: DefinitionMembers, message: string) {
		if (definition.Kind === "Event") {
			netBuilderWarn(definition, message);
		}
	}

	function getMiddlewares(definition: DefinitionMembers) {
		const globalMiddlewares = symbolDictionary(definition.Namespace)[
			GlobalMiddleware
		] as Array<NetBuilderMiddleware>;

		return Vec.fromPtr([...definition.Middlewares, ...globalMiddlewares])
			.dedupByKey(({ Id }) => Id)
			.iter();
	}

	function resolveMiddlewares(player: Player, { Definition, Kind, Arguments }: DefinitionEntry) {
		return getMiddlewares(Definition)
			.tryFold(
				identity<FunctionState>({
					CurrentParameters: Arguments,
					ReturnCallbacks: [],
					Result: Result.ok([Arguments, (r: unknown) => r]),
				}),
				(state, middleware) => {
					const result = createChannel(Definition, middleware[Kind])
						.then(([fn, e]) => {
							task.spawn(fn, player, ...state.CurrentParameters);

							return e;
						})
						.expect();

					return result
						.andWith<FunctionState>(([newParams, returnFn]) =>
							Result.ok({
								CurrentParameters: newParams,
								ReturnCallbacks: [...state.ReturnCallbacks, returnFn],
								Result: result,
							}),
						)
						.mapErr<FunctionState>(() => ({
							...state,
							Result: result,
						}));
				},
			)
			.asPtr();
	}

	function createChannel(definition: DefinitionMembers, channel: MiddlewareCallback<Callback>) {
		return Promise.resolve([
			coroutine.create(channel),
			coroutine.create((result: ThreadResult) => {
				coroutine.yield();

				return result;
			}),
			new Instance("BindableEvent"),
			Promise.delay(Timeout.Middleware).andThenReturn(Middleware.timeoutMsg),
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
