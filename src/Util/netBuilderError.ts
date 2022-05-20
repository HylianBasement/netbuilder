import { Definition, DefinitionMembers, LoggingDefinition } from "../definitions";

import getConfiguration from "./getConfiguration";

import { DEFAULT_CONFIGURATION } from "./constants";

function netBuilderError(
	definition: Definition | DefinitionMembers,
	message?: unknown,
	level?: number,
): never {
	const { Logger } = getConfiguration(definition);

	const loggingDefinition: LoggingDefinition = {
		Id: (definition as DefinitionMembers).Id,
		Kind: (definition as DefinitionMembers).Kind,
	};

	table.freeze(loggingDefinition);

	Logger?.Error?.(loggingDefinition, message);
	error(`[${DEFAULT_CONFIGURATION.Label}] ${message}`, level);
}

export = netBuilderError;
