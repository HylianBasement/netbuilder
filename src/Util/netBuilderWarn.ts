import { Definition, DefinitionMembers, LoggingDefinition } from "../definitions";

import createLoggingDefinition from "./createLoggingDefinition";
import netBuilderFormat from "./netBuilderFormat";
import getConfiguration from "./getConfiguration";

export = (definition: Definition | DefinitionMembers, ...params: unknown[]) => {
	const { SuppressWarnings, Logger } = getConfiguration(definition);

	if (!SuppressWarnings) {
		const log = Logger?.Warn
			? (...params: unknown[]) => Logger.Warn!(createLoggingDefinition(definition), ...params)
			: (...params: unknown[]) => warn(...netBuilderFormat(...params));

		log(...params);
	}
};
