import { Definition, DefinitionMembers } from "../definitions";

import createLoggingDefinition from "./createLoggingDefinition";
import netBuilderFormat from "./netBuilderFormat";
import getConfiguration from "./getConfiguration";

function netBuilderDebug(definition: Definition | DefinitionMembers, ...params: Array<unknown>) {
	const { Debug, Logger } = getConfiguration(definition);

	const loggingDefinition = createLoggingDefinition(definition);

	if (Debug) {
		const log = Logger?.Debug
			? (...params: unknown[]) => Logger.Debug!(loggingDefinition, ...params)
			: (...params: unknown[]) => print("DEBUG:", ...netBuilderFormat(...params));

		log(...params);
	}
}

export = netBuilderDebug;
