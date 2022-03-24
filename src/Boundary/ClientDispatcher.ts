import { RunService } from "@rbxts/services";
import {
	GetRemoteDefinition,
	NetBuilderResult,
	Remote,
	RemoteDefinition,
	RemoteDefinitionMembers,
	ThreadResult,
	UnwrapAsyncReturnType,
} from "../definitions";

import MiddlewareResolver from "../Internal/MiddlewareResolver";
import RemoteResolver from "../Internal/RemoteResolver";

import assertRemoteType from "../Util/assertRemoteType";
import definitionInfo from "../Util/definitionInfo";
import isRemoteFunction from "../Util/isRemoteFunction";
import netBuilderError from "../Util/netBuilderError";
import netBuilderWarn from "../Util/netBuilderWarn";
import rustResult from "../Util/rustResult";

const noop = () => {};

/** Definition manager responsible for processing client events and functions. */
class ClientDispatcher<F extends Callback> {
	private readonly remote: Remote<F> | undefined;

	private readonly timeout = 60;

	private readonly warningTimeout = 15;

	private constructor(private readonly definition: RemoteDefinitionMembers) {
		if (!RunService.IsClient()) {
			netBuilderError("This dispatcher can be only created on the client.");
		}

		this.remote = RemoteResolver.Request<F>(definition);
	}

	/**
	 * Creates a client dispatcher for a definition, so it can be used to send and receive requests.
	 *
	 * @client
	 */
	public static Get<R extends RemoteDefinition>(definition: R) {
		return new ClientDispatcher<GetRemoteDefinition<R>>(
			definition as unknown as RemoteDefinitionMembers,
		) as unknown as ClientDispatcher<GetRemoteDefinition<R>>;
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
		return this.CallRust(...(args as never)).unwrapOrElse(netBuilderError);
	}

	/** Calls the server and returns a promise. */
	public CallAsync(...args: Parameters<F>) {
		const promise = new Promise<UnwrapAsyncReturnType<F>>((res, rej) => {
			const result = this.CallResult(...(args as never));

			if (result.Result === "Ok") {
				res(result.Value);
			} else {
				rej(result.Message);
			}
		});

		return Promise.race([
			promise.timeout(this.timeout, this.timeoutMsg()),
			Promise.delay(this.warningTimeout)
				.andThenCall(netBuilderWarn, this.definition, this.warningTimeoutMsg())
				.then(() => Promise.fromEvent({ Connect: noop })),
		]) as Promise<UnwrapAsyncReturnType<F>>;
	}

	/** Calls the server synchronously and returns a result object containing its status and value/error message. */
	public CallResult(...args: Parameters<F>): NetBuilderResult<UnwrapAsyncReturnType<F>> {
		const { remote } = this;

		if (!remote || !isRemoteFunction(remote))
			return {
				Result: "Err",
				Message: `Expected RemoteFunction, got ${remote ? "RemoteEvent" : "nil"}.`,
			};

		const result = MiddlewareResolver.CreateSender(
			this.definition,
			...(args as unknown[]),
		) as ThreadResult;

		if (result.isOk()) {
			const [newArgs, resultFn] = result.unwrap();
			const returnResult = remote.InvokeServer(...(newArgs as never)) as NetBuilderResult<
				ReturnType<F>
			>;

			if (returnResult.Result === "Err") {
				return returnResult;
			}

			return {
				Result: "Ok",
				Value: resultFn(returnResult.Value),
			} as NetBuilderResult<UnwrapAsyncReturnType<F>>;
		}

		return {
			Result: "Err",
			Message: result.unwrapErr(),
		};
	}

	/** Calls the server synchronously and returns a RustResult value. */
	public CallRust(...args: Parameters<F>) {
		return this.CallWith(rustResult, ...(args as never));
	}

	/** Calls the server synchronously that returns a value transformed by its predicate function. */
	public CallWith<R extends defined>(
		predicate: (returnValue: NetBuilderResult<UnwrapAsyncReturnType<F>>) => R,
		...args: Parameters<F>
	) {
		return predicate(this.CallResult(...(args as never)));
	}

	/** Sends a request to the server with the given arguments. */
	public Send(...args: Parameters<F>) {
		const { remote } = this;

		if (!assertRemoteType("RemoteEvent", remote)) return;

		const result = MiddlewareResolver.CreateSender(this.definition, ...(args as unknown[]));

		if (result.isOk()) {
			remote.FireServer(...(result.unwrap()[0] as never));
		}
	}

	/** Connects a listener callback that is called whenever new data is received from the server. */
	public Connect(callback: (...args: Parameters<F>) => void | Promise<void>) {
		const { remote } = this;

		if (!remote) return;

		const fn = MiddlewareResolver.CreateReceiver(this.definition, callback);

		if (isRemoteFunction(remote)) {
			remote.OnClientInvoke = fn as F;
			return;
		}

		remote.OnClientEvent.Connect(fn as F);
	}
}

export = ClientDispatcher;
