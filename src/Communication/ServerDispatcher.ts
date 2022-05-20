import { OptionMut } from "@rbxts/rust-classes";

import {
	DefinitionMembers,
	NetBuilderAsyncReturn,
	NetBuilderConfiguration,
	NetBuilderResult,
	Remote,
	ThreadResult,
	UnwrapAsyncReturnType,
} from "../definitions";

import Middleware from "../Core/Middleware";
import RemoteResolver from "../Core/RemoteResolver";

import assertRemoteType from "../Util/assertRemoteType";
import definitionInfo from "../Util/definitionInfo";
import isRemoteFunction from "../Util/isRemoteFunction";
import netBuilderDebug from "../Util/netBuilderDebug";
import netBuilderError from "../Util/netBuilderError";
import netBuilderWarn from "../Util/netBuilderWarn";
import promiseYield from "../Util/promiseYield";
import { IS_RUNNING, IS_SERVER, Timeout } from "../Util/constants";

import Configuration from "../Symbol/Configuration";

type ParametersWithPlayer<F extends Callback> = [player: Player, ...params: Parameters<F>];

const Players = game.GetService("Players");

/** Definition manager responsible for processing server events and functions.
 */
class ServerDispatcher<F extends Callback> {
	private readonly remote = OptionMut.none<Remote<F>>();

	private timeout: number;

	private warningTimeout: number;

	public constructor(private readonly definition: DefinitionMembers) {
		if (!IS_SERVER) {
			netBuilderError(definition, "This dispatcher can be only created on the server.", 3);
		}

		const timeout = definition.Timeout;
		const config = definition.Namespace[
			Configuration as never
		] as unknown as NetBuilderConfiguration;

		this.timeout = timeout;
		this.warningTimeout = timeout / 2 >= Timeout.AsyncFunctionMin ? timeout / 2 : math.huge;

		if (config.PreGeneration) {
			this.getOrCreateRemote();
		}
	}

	private getOrCreateRemote() {
		return this.remote.getOrInsertWith(() => {
			netBuilderDebug(
				this.definition,
				`Generating remote instance for ${definitionInfo(this.definition)}.`,
			);

			return RemoteResolver.For<F>(this.definition as never, true);
		});
	}

	private resolvePlayerList(playerOrPlayers: Player | Player[]) {
		return (
			type(playerOrPlayers) !== "table" ? [playerOrPlayers] : playerOrPlayers
		) as ReadonlyArray<Player>;
	}

	private toString() {
		return `NetBuilder.ServerDispatcher<${this.definition.Kind}>`;
	}

	private timeoutMsg() {
		return `Request to server has timed out. (${this.timeout}s)`;
	}

	private warningTimeoutMsg() {
		return `The result from ${definitionInfo(this.definition)} is still pending.`;
	}

	/**
	 * Calls the client synchronously and returns a result object containing its status and value/error message.
	 *
	 *  Reserved for **internal use only**.
	 */
	private rawCall(player: Player, args: unknown[]): NetBuilderResult<UnwrapAsyncReturnType<F>> {
		const remote = this.getOrCreateRemote();
		const { definition } = this;

		if (!remote || !isRemoteFunction(remote)) {
			netBuilderError(
				this.definition,
				`Expected RemoteFunction, got ${remote ? "RemoteEvent" : "nil"}.`,
				3,
			);
		}

		const result = Middleware.CreateSender(player, definition, ...args) as ThreadResult;

		return result.match(
			([newArgs, resultFn]) => {
				netBuilderDebug(
					definition,
					`Client${definitionInfo(definition)} was invoked for ${player.Name}.`,
				);

				const returnResult = remote.InvokeClient(
					player,
					...(newArgs as never),
				) as NetBuilderResult<ReturnType<F>>;

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

	/** Calls a client **asynchronously** with a timeout. */
	public CallAsync(player: Player, ...args: Parameters<F>) {
		const promise = new Promise<UnwrapAsyncReturnType<F>>((res, rej) => {
			const result = this.rawCall(player, args);

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

	/** Fires a client event for a player or a specific group of clients. */
	public Send(player: Player | Player[], ...args: Parameters<F>) {
		const remote = this.getOrCreateRemote();
		const { definition } = this;

		if (!IS_RUNNING || !assertRemoteType(definition, "RemoteEvent", remote)) return;

		for (const plr of this.resolvePlayerList(player)) {
			const result = Middleware.CreateSender(plr, definition, ...(args as unknown[]));

			if (result.isOk()) {
				netBuilderDebug(
					definition,
					`Client${definitionInfo(definition)} was fired for ${plr.Name}.`,
				);

				return remote.FireClient(plr, ...(result.unwrap()[0] as never));
			}

			netBuilderError(definition, result.unwrapErr(), 3);
		}
	}

	/** Fires all the clients. **(Does not resolve middlewares)** */
	public SendToAll(...args: Parameters<F>) {
		const remote = this.getOrCreateRemote();
		const { definition } = this;

		if (!IS_RUNNING || !assertRemoteType(definition, "RemoteEvent", remote)) return;

		netBuilderDebug(definition, `Client${definitionInfo(definition)} was fired for all players.`);

		remote.FireAllClients(...(args as never));
	}

	/** Fires all the clients, except for a selected one or a specific group. */
	public SendWithout(player: Player | Player[], ...args: Parameters<F>) {
		if (IS_RUNNING || !assertRemoteType(this.definition, "RemoteEvent", this.getOrCreateRemote()))
			return;

		const players = new Set(this.resolvePlayerList(player));

		this.Send(
			Players.GetPlayers().filter((plr) => !players.has(plr)),
			...(args as never),
		);
	}

	/** Connects a listener callback that is called whenever new data is received from a client. */
	public Connect(callback: (player: Player, ...args: Parameters<F>) => void | Promise<void>) {
		const { definition } = this;
		const remote = this.getOrCreateRemote();

		if (isRemoteFunction(remote)) {
			netBuilderError(definition, "Expected ServerEvent, got Function.", 3);
		}

		netBuilderDebug(definition, `Created a new connection for ${definitionInfo(definition, true)}.`);

		return remote.OnServerEvent.Connect(Middleware.CreateReceiver(definition, callback) as never);
	}

	/** Yields the current thread until the a request is sent. Returns what was fired to the signal. */
	public Wait() {
		const remote = this.getOrCreateRemote();
		const { definition } = this;

		if (isRemoteFunction(remote)) {
			netBuilderError(definition, "Expected ServerEvent, got Function.", 3);
		}

		netBuilderDebug(definition, `Created a waiter for ${definitionInfo(definition, true)}.`);

		return new Promise<ParametersWithPlayer<F>>((res) =>
			task.spawn(
				(connection) => connection.Disconnect(),
				this.Connect((...args) => res(args)),
			),
		).expect() as LuaTuple<ParametersWithPlayer<F>>;
	}

	/** Connects a callback that returns back asynchronous only data to the server. */
	public SetCallback(
		callback: (
			player: Player,
			...args: Parameters<F>
		) => ReturnType<F> extends Promise<any> ? ReturnType<F> : ReturnType<F> | Promise<ReturnType<F>>,
	) {
		const { definition } = this;
		const remote = this.getOrCreateRemote();

		if (!isRemoteFunction(remote)) {
			netBuilderError(this.definition, "Expected ServerFunction, got ServerEvent.", 3);
		}

		netBuilderDebug(definition, `A callback was set for ${definitionInfo(definition, true)}.`);

		remote.OnServerInvoke = Middleware.CreateReceiver(this.definition, callback);
	}
}

(ServerDispatcher as LuaMetatable<ServerDispatcher<Callback>>).__call = (Self, ...a) => {
	const args = [...a];
	const def = Self["definition"];
	const kind = def.Kind;

	if (kind === "Event") {
		const player = (args as [Player | Player[]]).shift()!;

		return Self.Send(player, ...args);
	} else if (kind === "AsyncFunction") {
		const player = (args as [Player]).shift()!;

		return Self.CallAsync(player, ...args);
	}

	netBuilderError(def, "Direct calls are not supported for Functions.");
};

export = ServerDispatcher;
