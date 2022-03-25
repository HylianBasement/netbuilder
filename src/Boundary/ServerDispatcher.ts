import { Players, RunService } from "@rbxts/services";
import { GetRemoteDefinition, RemoteDefinition, RemoteDefinitionMembers } from "../definitions";

import MiddlewareManager from "../Internal/MiddlewareManager";
import RemoteManager from "../Internal/RemoteManager";

import assertRemoteType from "../Util/assertRemoteType";
import isRemoteFunction from "../Util/isRemoteFunction";
import netBuilderError from "../Util/netBuilderError";

/** Definition manager responsible for processing server events and functions. */
class ServerDispatcher<F extends Callback> {
	private remote;

	private isDuplicate;

	private constructor(private readonly definition: RemoteDefinitionMembers) {
		if (!RunService.IsServer()) {
			netBuilderError("This dispatcher can be only created on the server.");
		}

		[this.remote, this.isDuplicate] = RemoteManager.For<F>(
			definition as unknown as RemoteDefinition,
			true,
		);
	}

	/**
	 * Creates a server dispatcher for a definition, so it can be used to send and receive requests.
	 *
	 * @server
	 */
	public static Get<R extends RemoteDefinition>(definition: R) {
		return new ServerDispatcher<GetRemoteDefinition<R>>(
			definition as unknown as RemoteDefinitionMembers,
		) as unknown as ServerDispatcher<GetRemoteDefinition<R>>;
	}

	private resolvePlayerList(playerOrPlayers: Player | Player[]) {
		return (
			type(playerOrPlayers) !== "table" ? [playerOrPlayers] : playerOrPlayers
		) as readonly Player[];
	}

	private toString() {
		return `ServerDispatcher<${this.definition.Kind}>`;
	}

	/** Fires a client event for a player or a specific group of players. */
	public Send(player: Player | Player[], ...args: Parameters<F>) {
		if (this.isDuplicate || !assertRemoteType("RemoteEvent", this.remote)) return;

		const result = MiddlewareManager.CreateSender(this.definition, ...(args as unknown[]));

		if (result.isOk()) {
			for (const plr of this.resolvePlayerList(player)) {
				this.remote.FireClient(plr, ...(result.unwrap()[0] as never));
			}
		}
	}

	/** Fires a client event for all the players. */
	public SendToAll(...args: Parameters<F>) {
		if (this.isDuplicate || !assertRemoteType("RemoteEvent", this.remote)) return;

		const result = MiddlewareManager.CreateSender(this.definition, ...(args as unknown[]));

		if (result.isOk()) {
			this.remote.FireAllClients(...(result.unwrap()[0] as never));
		}
	}

	/** Fires a client event for all the players, except for a selected player or a specific group. */
	public SendWithout(player: Player | Player[], ...args: Parameters<F>) {
		if (this.isDuplicate || !assertRemoteType("RemoteEvent", this.remote)) return;
		const players = new Set(this.resolvePlayerList(player));

		this.Send(
			Players.GetPlayers().filter((plr) => !players.has(plr)),
			...(args as never),
		);
	}

	/** Connects a listener callback that is called whenever new data is received from a client. */
	public Connect(
		callback: (
			player: Player,
			...args: Parameters<F>
		) => ReturnType<F> extends Promise<any> ? ReturnType<F> : ReturnType<F> | Promise<ReturnType<F>>,
	) {
		if (this.isDuplicate) return;

		const fn = MiddlewareManager.CreateReceiver(this.definition, callback);
		const { remote } = this;

		if (isRemoteFunction(remote)) {
			remote.OnServerInvoke = fn as F;
			return;
		}

		remote.OnServerEvent.Connect(fn as never);
	}
}

export = ServerDispatcher;
