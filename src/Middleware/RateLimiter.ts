import { HashMap } from "@rbxts/rust-classes";

import { LoggingDefinition } from "../definitions";

import NetBuilder from "../Builders/NetBuilder";

import definitionInfo from "../Util/definitionInfo";
import { IS_SERVER, Timeout } from "../Util/constants";

interface RateLimiterOptions {
	readonly Max: number;
	readonly Timeout?: number;
	readonly Listener?: (error: RateLimiterError) => void;
}

interface RateLimiterError {
	readonly Executor: Player;
	readonly Message: string;
	readonly Requests: number;
	readonly Definition: LoggingDefinition;
}

interface RateLimiterProperties {
	Requests: number;
	LastTimestamp: DateTime;
}

const Players = game.GetService("Players");

/**
 * Limits the amount of requests that can be sent every x amount of seconds.
 * Defaults to 1 minute.
 */
const RateLimiter = NetBuilder.CreateMiddleware<[options: RateLimiterOptions]>(
	"RateLimiter",
	(options) => {
		const players = HashMap.empty<string, RateLimiterProperties>();

		if (IS_SERVER) {
			Players.PlayerRemoving.Connect((player) => players.remove(tostring(player.UserId)));
		}

		return {
			ServerOnly: true,
			Global: true,
			Callback: (definition, processNext, drop) => {
				return (player, ...args) => {
					const { Max, Timeout: timeout = Timeout.RateLimiter } = options;
					const { Requests } = players
						.entry(tostring(player.UserId))
						.andModify((props) => {
							const now = DateTime.now();

							if (now.UnixTimestamp - props.LastTimestamp.UnixTimestamp >= timeout) {
								props.Requests = 0;
								props.LastTimestamp = now;
							}

							props.Requests++;
						})
						.orInsert({ Requests: 1, LastTimestamp: DateTime.now() });

					if (Requests > Max) {
						const message = `Exceeded the limit of ${Max} requests every ${timeout}s for ${definitionInfo(
							definition,
						)}.`;

						options.Listener?.({
							Executor: player,
							Message: message,
							Requests,
							Definition: {
								Id: definition.Id,
								Kind: definition.Kind,
							},
						});

						drop(message);
					}

					processNext(args);
				};
			},
		};
	},
);

export = RateLimiter;
