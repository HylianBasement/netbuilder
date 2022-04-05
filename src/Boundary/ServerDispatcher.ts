import {
	Definition,
	DefinitionKind,
	DefinitionMembers,
	InferDefinitionKind,
	InferDefinitionTyping,
	NetBuilderResult,
	ThreadResult,
	UnwrapAsyncReturnType,
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
const Players = game.GetService("Players");

/** Definition manager responsible for processing server events and functions. */
class ServerDispatcher<F extends Callback> {
	private remote;

	private readonly timeout = 60;

	private readonly warningTimeout = 15;

	private constructor(private readonly definition: DefinitionMembers) {
		if (!RunService.IsServer()) {
			netBuilderError("This dispatcher can be only created on the server.", 3);
		}

		this.remote = RemoteResolver.For<F>(definition as never, true);
	}

	private static create(definition: Definition, kind: DefinitionKind) {
		const def = definition as unknown as DefinitionMembers;

		if (def.Kind !== kind) {
			netBuilderError(`Expected ${kind}, got ${def.Kind}.`, 3);
		}

		return new ServerDispatcher(def);
	}

	/**
	 * Creates a server dispatcher exclusive to events.
	 *
	 * @server
	 */
	public static CreateEvent<R extends Definition>(
		definition: InferDefinitionKind<R> extends "Event" ? R : never,
	) {
		return this.create(definition, "Event") as unknown as Omit<
			ServerDispatcher<InferDefinitionTyping<R>>,
			"SetCallback" | "CallAsync"
		>;
	}

	/**
	 * Creates a server dispatcher exclusive to functions.
	 *
	 * @server
	 */
	public static CreateFunction<R extends Definition>(
		definition: InferDefinitionKind<R> extends "Function" ? R : never,
	) {
		return this.create(definition, "Function") as unknown as Omit<
			ServerDispatcher<InferDefinitionTyping<R>>,
			"Connect" | "CallAsync" | "Send" | "SendToAll" | "SendWithout"
		>;
	}

	/**
	 * Creates a server dispatcher exclusive to asynchronous functions.
	 *
	 * @server
	 */
	public static CreateAsyncFunction<R extends Definition>(
		definition: InferDefinitionKind<R> extends "AsyncFunction" ? R : never,
	) {
		return this.create(definition, "AsyncFunction") as unknown as Omit<
			ServerDispatcher<InferDefinitionTyping<R>>,
			"Connect" | "Send" | "SendToAll" | "SendWithout"
		>;
	}

	private resolvePlayerList(playerOrPlayers: Player | Player[]) {
		return (
			type(playerOrPlayers) !== "table" ? [playerOrPlayers] : playerOrPlayers
		) as ReadonlyArray<Player>;
	}

	private toString() {
		return `ServerDispatcher<${this.definition.Kind}>`;
	}

	private timeoutMsg() {
		return `Request to server has timed out. (${this.timeout}s)`;
	}

	private warningTimeoutMsg() {
		return `The result from ${definitionInfo(this.definition)} is still pending.`;
	}

	private rawCall(player: Player, args: unknown[]): NetBuilderResult<UnwrapAsyncReturnType<F>> {
		const { remote, definition } = this;

		if (!remote || !isRemoteFunction(remote)) {
			netBuilderError(`Expected RemoteFunction, got ${remote ? "RemoteEvent" : "nil"}.`, 3);
		}

		const result = Middleware.CreateSender(player, definition, ...args) as ThreadResult;

		return result.match(
			([newArgs, resultFn]) => {
				const returnResult = remote.InvokeClient(
					player,
					...(newArgs as never),
				) as NetBuilderResult<ReturnType<F>>;

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

	/** Calls a client **asynchronously** with a timeout. */
	public CallAsync(player: Player, ...args: Parameters<F>) {
		const promise = new Promise<UnwrapAsyncReturnType<F>>((res, rej) => {
			const result = this.rawCall(player, args);

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
		]) as Promise<UnwrapAsyncReturnType<F>>;
	}

	/** Fires a client event for a player or a specific group of clients. */
	public Send(player: Player | Player[], ...args: Parameters<F>) {
		if (!assertRemoteType("RemoteEvent", this.remote)) return;

		for (const plr of this.resolvePlayerList(player)) {
			const result = Middleware.CreateSender(plr, this.definition, ...(args as unknown[]));

			if (result.isOk()) {
				return this.remote.FireClient(plr, ...(result.unwrap()[0] as never));
			}

			netBuilderError(result.unwrapErr(), 3);
		}
	}

	/** Fires all the clients. */
	public SendToAll(useMiddleware: boolean, ...args: Parameters<F>) {
		if (!assertRemoteType("RemoteEvent", this.remote)) return;

		if (useMiddleware) {
			return this.SendWithout([], ...(args as never));
		}

		this.remote.FireAllClients(...(args as never));
	}

	/** Fires all the clients, except for a selected one or a specific group. */
	public SendWithout(player: Player | Player[], ...args: Parameters<F>) {
		if (!assertRemoteType("RemoteEvent", this.remote)) return;
		const players = new Set(this.resolvePlayerList(player));

		this.Send(
			Players.GetPlayers().filter((plr) => !players.has(plr)),
			...(args as never),
		);
	}

	/** Connects a listener callback that is called whenever new data is received from a client. */
	public Connect(callback: (player: Player, ...args: Parameters<F>) => void | Promise<void>) {
		const { remote } = this;

		if (isRemoteFunction(remote)) {
			netBuilderError("Expected ServerEvent, got Function.", 3);
		}

		remote.OnServerEvent.Connect(Middleware.CreateReceiver(this.definition, callback) as never);
	}

	/** Connects a callback that returns back asynchronous only data to the server. */
	public SetCallback(
		callback: (
			player: Player,
			...args: Parameters<F>
		) => ReturnType<F> extends Promise<any> ? ReturnType<F> : ReturnType<F> | Promise<ReturnType<F>>,
	) {
		const { remote } = this;

		if (!isRemoteFunction(remote)) {
			netBuilderError("Expected ServerFunction, got ServerEvent.", 3);
		}

		remote.OnServerInvoke = Middleware.CreateReceiver(this.definition, callback);
	}
}

export = ServerDispatcher;
