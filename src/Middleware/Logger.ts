import { LoggingRemoteDefinition } from "../definitions";

import MiddlewareBuilder from "../Builders/MiddlewareBuilder";

type NetBuilderLogger = (
	executor: Player,
	definition: LoggingRemoteDefinition,
	...parameters: unknown[]
) => void;

/** Executes whenever a request is successfully sent, providing information about its executor, definition and parameters used. */
function Logger(logger: NetBuilderLogger) {
	return new MiddlewareBuilder()
		.Label("Logger")
		.EnableGlobal()
		.Receiver(({ Id, Kind }, processNext) => (player, ...args) => {
			task.spawn(logger, player, { Id, Kind }, ...args);

			processNext(args);
		})
		.Build();
}

export = Logger;
