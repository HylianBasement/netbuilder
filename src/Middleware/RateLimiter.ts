import { Players, RunService } from "@rbxts/services";
import { HashMap } from "@rbxts/rust-classes";

import { RateLimiterOptions } from "../definitions";

import ServerMiddlewareBuilder from "../Builders/ServerMiddlewareBuilder";

import definitionInfo from "../Util/definitionInfo";

interface RateLimiterProperties {
	Requests: number;
	LastTimestamp: DateTime;
}

/** Limits the amount of requests that can be sent per minute. */
function RateLimiter(options: RateLimiterOptions) {
	const players = HashMap.empty<number, RateLimiterProperties>();

	if (RunService.IsServer()) {
		Players.PlayerRemoving.Connect((player) => players.remove(player.UserId));
	}

	return new ServerMiddlewareBuilder()
		.Label("RateLimiter")
		.EnableGlobal()
		.SetCallback((definition, processNext, drop) => (player, ...args) => {
			const { MaxRequestsPerMinute } = options;
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

			if (Requests > MaxRequestsPerMinute) {
				const message = `Exceeded the limit of ${MaxRequestsPerMinute} requests per minute for ${definitionInfo(
					definition,
				)}.`;

				options.Listener?.({
					Executor: player,
					Message: message,
					Requests,
					Definition: definition,
				});

				drop(message);
			}

			processNext(args, (r) => r);
		})
		.Build();
}

export = RateLimiter;
