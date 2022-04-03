import { LoggingDefinition, NetBuilderMiddleware } from "../definitions";

import NetBuilder from "../Builders/NetBuilder";

type NetBuilderTracer<P extends Array<any>> = (
	executor: Player,
	definition: LoggingDefinition,
	...parameters: P
) => void;

/** Executes whenever a request is successfully sent, providing information about its executor, definition and parameters used. */
function Tracer<F extends Callback>(tracer: NetBuilderTracer<Parameters<F>>): NetBuilderMiddleware<F> {
	return NetBuilder.CreateMiddleware<[tracer: NetBuilderTracer<Parameters<F>>]>("Tracer", () => {
		return {
			ServerOnly: false,
			Global: true,
			Receiver: ({ Id, Kind }, processNext) => {
				return (player, ...args) => {
					task.spawn(tracer, player, { Id, Kind }, ...(args as never));

					processNext(args);
				};
			},
		};
	})(tracer);
}

export = Tracer;
