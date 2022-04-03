import { HashMap } from "@rbxts/rust-classes";

import { RateLimiterOptions } from "../definitions";

import NetBuilder from "../Builders/NetBuilder";

import definitionInfo from "../Util/definitionInfo";

interface RateLimiterProperties {
	Requests: number;
	LastTimestamp: DateTime;
}

const RunService = game.GetService("RunService");
const Players = game.GetService("Players");

/** Limits the amount of requests that can be sent per minute. */
const RateLimiter = NetBuilder.CreateMiddleware<[options: RateLimiterOptions]>(
	"RateLimiter",
	(options) => {
		const players = HashMap.empty<number, RateLimiterProperties>();

		if (RunService.IsServer()) {
			Players.PlayerRemoving.Connect((player) => players.remove(player.UserId));
		}

		return {
			ServerOnly: true,
			Global: true,
			Callback: (definition, processNext, drop) => {
				return (player, ...args) => {
					const { MaxPerMinute } = options;
					const { Requests } = players
						.entry(player.UserId)
						.andModify((props) => {
							const now = DateTime.now();

							if (now.UnixTimestamp - props.LastTimestamp.UnixTimestamp >= 60) {
								props.Requests = 0;
								props.LastTimestamp = now;
							}

							props.Requests++;
						})
						.orInsert({ Requests: 1, LastTimestamp: DateTime.now() });

					if (Requests > MaxPerMinute) {
						const message = `Exceeded the limit of ${MaxPerMinute} requests per minute for ${definitionInfo(
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
