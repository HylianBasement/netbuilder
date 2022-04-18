import {
	DefinitionMembers,
	Remote,
	NetBuilderResult,
	ThreadResult,
	UnwrapAsyncReturnType,
	NetBuilderAsyncReturn,
} from "../definitions";

import Middleware from "../Core/Middleware";
import RemoteResolver from "../Core/RemoteResolver";

import assertRemoteType from "../Util/assertRemoteType";
import definitionInfo from "../Util/definitionInfo";
import isRemoteFunction from "../Util/isRemoteFunction";
import netBuilderError from "../Util/netBuilderError";
import netBuilderWarn from "../Util/netBuilderWarn";
import promiseYield from "../Util/promiseYield";
import { IS_CLIENT } from "../Util/boundary";

const player = game.GetService("Players").LocalPlayer;

/** Definition manager responsible for processing client events and async functions.
 * @internal
 */
class ClientDispatcher<F extends Callback> {
	private remote: Remote<F> | undefined;

	private readonly timeout = 60;

	private readonly warningTimeout = 15;

	public constructor(private readonly definition: DefinitionMembers) {
		if (!IS_CLIENT) {
			netBuilderError("This dispatcher can be only created on the client.", 3);
		}
	}

	private tryFindRemote() {
		return (this.remote ??= RemoteResolver.Request<F>(this.definition));
	}

	private toString() {
		return `NetBuilder.ClientDispatcher<${this.definition.Kind}>`;
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
			return result.Data;
		}

		netBuilderError(result.Message, 3);
	}

	/** Calls the server and returns a promise. */
	public CallAsync(...args: Parameters<F>) {
		const promise = new Promise<UnwrapAsyncReturnType<F>>((res, rej) => {
			const result = this.RawCall(...(args as never));

			if (result.Type === "Ok") {
				res(result.Data);
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
		const remote = this.tryFindRemote();
		const { definition } = this;

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
					Data: resultFn(returnResult.Data),
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
		const remote = this.tryFindRemote();

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

		const remote = this.tryFindRemote();

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
		const remote = this.tryFindRemote();

		if (!remote) return;

		if (this.definition.Kind === "Function") {
			netBuilderError("Client functions are not supported!", 3);
		} else if (!isRemoteFunction(remote)) {
			netBuilderError("Expected ClientAsyncFunction, got ClientEvent.", 3);
		}

		remote.OnClientInvoke = Middleware.CreateReceiver(this.definition, callback) as F;
	}
}

(ClientDispatcher as LuaMetatable<ClientDispatcher<Callback>>).__call = (Self, ...args) => {
	const kind = Self["definition"].Kind;

	if (kind === "Event") {
		Self.Send(...args);
		return;
	} else if (kind === "Function") {
		return Self.Call(...args);
	}

	return Self.CallAsync(...args);
};

export = ClientDispatcher;
