import { RunService } from "@rbxts/services";
import {
	GetRemoteDefinition,
	NetBuilderResult,
	Remote,
	RemoteDefinition,
	RemoteDefinitionMembers,
	ThreadResult,
} from "../definitions";

import MiddlewareResolver from "../Internal/MiddlewareResolver";
import RemoteResolver from "../Internal/RemoteResolver";

import assertRemoteType from "../Util/assertRemoteType";
import definitionInfo from "../Util/definitionInfo";
import isRemoteFunction from "../Util/isRemoteFunction";
import netBuilderError from "../Util/netBuilderError";
import netBuilderWarn from "../Util/netBuilderWarn";

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

	public Call(...args: Parameters<F>): NetBuilderResult<ReturnType<F>> {
		const { remote } = this;

		if (!remote || !isRemoteFunction(remote))
			return {
				Result: "ERR",
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

			if (returnResult.Result === "ERR") {
				return returnResult;
			}

			const value = resultFn(returnResult.Value);

			return {
				Result: "OK",
				Value: Promise.is(value) ? value.await()[1] : value,
			} as NetBuilderResult<ReturnType<F>>;
		}

		return {
			Result: "ERR",
			Message: result.unwrapErr(),
		};
	}

	public CallWith<R extends defined>(
		predicate: (returnValue: NetBuilderResult<ReturnType<F>>) => R,
		...args: Parameters<F>
	) {
		return predicate(this.Call(...(args as never)));
	}

	public CallAsync(...args: Parameters<F>) {
		const promise = new Promise<ReturnType<F>>((res, rej) => {
			const result = this.Call(...(args as never));

			if (result.Result === "OK") {
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
		]) as Promise<ReturnType<F>>;
	}

	/** Sends a request to the server with the given arguments. */
	public Send(...args: Parameters<F>) {
		const { remote } = this;

		if (!assertRemoteType("RemoteEvent", remote)) return;

		const result = MiddlewareResolver.CreateSender(this.definition, ...(args as unknown[]));

		if (result.isOk()) {
			const value = result.unwrap()[0];

			remote.FireServer(...((Promise.is(value) ? value.await()[1] : value) as never));
		}
	}

	/** Connects a listener callback that is called whenever new data is received from the server. */
	public Connect(callback: (...args: Parameters<F>) => ReturnType<F> | Promise<ReturnType<F>>) {
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
