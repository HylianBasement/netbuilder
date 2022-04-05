import {
	Definition,
	DefinitionMembers,
	InferDefinitionTyping,
	Remote,
	NetBuilderResult,
	ThreadResult,
	UnwrapAsyncReturnType,
	DefinitionKind,
	InferDefinitionKind,
	NetBuilderAsyncReturn,
} from "../definitions";

import Middleware from "../Internal/Middleware";
import RemoteResolver from "../Internal/RemoteResolver";

import assertRemoteType from "../Util/assertRemoteType";
import definitionInfo from "../Util/definitionInfo";
import isRemoteFunction from "../Util/isRemoteFunction";
import netBuilderError from "../Util/netBuilderError";
import netBuilderWarn from "../Util/netBuilderWarn";
import promiseYield from "../Util/promiseYield";

const RunService = game.GetService("RunService");
const player = game.GetService("Players").LocalPlayer;

/** Definition manager responsible for processing client events and async functions. */
class ClientDispatcher<F extends Callback> {
	private readonly remote: Remote<F> | undefined;

	private readonly timeout = 60;

	private readonly warningTimeout = 15;

	private constructor(private readonly definition: DefinitionMembers) {
		if (!RunService.IsClient()) {
			netBuilderError("This dispatcher can be only created on the client.", 3);
		}

		this.remote = RemoteResolver.Request<F>(definition);
	}

	private static get(definition: Definition, kind: DefinitionKind) {
		const def = definition as unknown as DefinitionMembers;

		if (def.Kind !== kind) {
			netBuilderError(`Expected ${kind}, got ${def.Kind}.`, 3);
		}

		return new ClientDispatcher(def);
	}

	/**
	 * Creates a client dispatcher exclusive to events.
	 *
	 * @client
	 */
	public static GetEvent<R extends Definition>(
		definition: InferDefinitionKind<R> extends "Event" ? R : never,
	) {
		return this.get(definition, "Event") as unknown as Omit<
			ClientDispatcher<InferDefinitionTyping<R>>,
			"SetCallback" | "Call" | "CallAsync" | "RawCall" | "CallWith"
		>;
	}

	/**
	 * Creates a client dispatcher exclusive to functions.
	 *
	 * @client
	 */
	public static GetFunction<R extends Definition>(
		definition: InferDefinitionKind<R> extends "Function" ? R : never,
	) {
		return this.get(definition, "Function") as unknown as Omit<
			ClientDispatcher<InferDefinitionTyping<R>>,
			"Connect" | "CallAsync" | "Send"
		>;
	}

	/**
	 * Creates a client dispatcher exclusive to asynchronous functions.
	 *
	 * @client
	 */
	public static GetAsyncFunction<R extends Definition>(
		definition: InferDefinitionKind<R> extends "AsyncFunction" ? R : never,
	) {
		return this.get(definition, "AsyncFunction") as unknown as Omit<
			ClientDispatcher<InferDefinitionTyping<R>>,
			"Connect" | "Call" | "RawCall" | "CallWith" | "Send"
		>;
	}

	private toString() {
		return `ClientDispatcher<${this.definition.Kind}>`;
	}

	private timeoutMsg() {
		return `Request to server has timed out. (${this.timeout}s)`;
	}

	private warningTimeoutMsg() {
		return `The result from ${definitionInfo(this.definition)} is still pending.`;
	}

	/** Calls the server synchronously. */
	public Call(...args: Parameters<F>) {
		const result = this.RawCall(...(args as never));

		if (result.Type === "Ok") {
			return result.Value;
		}

		netBuilderError(result.Message, 3);
	}

	/** Calls the server and returns a promise. */
	public CallAsync(...args: Parameters<F>) {
		const promise = new Promise<UnwrapAsyncReturnType<F>>((res, rej) => {
			const result = this.RawCall(...(args as never));

			if (result.Type === "Ok") {
				res(result.Value);
			} else {
				rej(result.Message);
			}
		});

		return Promise.race([
			promise.timeout(this.timeout, this.timeoutMsg()),
			Promise.delay(this.warningTimeout)
				.andThenCall(netBuilderWarn, this.definition, this.warningTimeoutMsg())
				.then(promiseYield),
		]) as NetBuilderAsyncReturn<UnwrapAsyncReturnType<F>>;
	}

	/** Calls the server synchronously that returns a raw `Result` value that is transformed by its predicate function. */
	public CallWith<R extends defined>(
		predicate: (returnValue: NetBuilderResult<UnwrapAsyncReturnType<F>>) => R,
		...args: Parameters<F>
	) {
		return predicate(this.RawCall(...(args as never)));
	}

	/** Calls the server synchronously and returns a result object containing its status and value/error message. */
	public RawCall(...args: Parameters<F>): NetBuilderResult<UnwrapAsyncReturnType<F>> {
		const { remote, definition } = this;

		if (!remote || !isRemoteFunction(remote)) {
			netBuilderError(`Expected RemoteFunction, got ${remote ? "RemoteEvent" : "nil"}.`, 3);
		}

		const result = Middleware.CreateSender(
			player,
			definition,
			...(args as unknown[]),
		) as ThreadResult;

		return result.match(
			([newArgs, resultFn]) => {
				const returnResult = remote.InvokeServer(...(newArgs as never)) as NetBuilderResult<
					ReturnType<F>
				>;

				if (returnResult.Type === "Err") {
					return returnResult;
				}

				return {
					Type: "Ok",
					Value: resultFn(returnResult.Value),
				} as NetBuilderResult<UnwrapAsyncReturnType<F>>;
			},
			(msg) => ({
				Type: "Err",
				Message: msg,
			}),
		);
	}

	/** Sends a request to the server with the given arguments. */
	public Send(...args: Parameters<F>) {
		const { remote } = this;

		if (!assertRemoteType("RemoteEvent", remote)) return;

		const result = Middleware.CreateSender(player, this.definition, ...(args as unknown[]));

		if (result.isOk()) {
			return remote.FireServer(...(result.unwrap()[0] as never));
		}

		netBuilderWarn(this.definition, result.unwrapErr());
	}

	/** Connects a listener callback that is called whenever new data is received from the server. */
	public Connect(callback: (...args: Parameters<F>) => void | Promise<void>) {
		if (this.definition.Kind === "Function") {
			netBuilderError("Client functions are not supported!", 3);
		}

		const { remote } = this;

		if (!remote) return;

		if (isRemoteFunction(remote)) {
			netBuilderError("Expected ClientEvent, got ClientFunction.", 3);
		}

		remote.OnClientEvent.Connect(Middleware.CreateReceiver(this.definition, callback) as F);
	}

	/** Connects a callback that returns back data to the client. */
	public SetCallback(
		callback: (
			player: Player,
			...args: Parameters<F>
		) => ReturnType<F> extends Promise<any> ? ReturnType<F> : ReturnType<F> | Promise<ReturnType<F>>,
	) {
		const { remote } = this;

		if (!remote) return;

		if (this.definition.Kind === "Function") {
			netBuilderError("Client functions are not supported!", 3);
		} else if (!isRemoteFunction(remote)) {
			netBuilderError("Expected ClientAsyncFunction, got ClientEvent.", 3);
		}

		remote.OnClientInvoke = Middleware.CreateReceiver(this.definition, callback) as F;
	}
}

export = ClientDispatcher;
