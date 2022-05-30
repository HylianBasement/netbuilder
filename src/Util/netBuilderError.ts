import { Definition, DefinitionMembers, LoggingDefinition } from "../definitions";

import createLoggingDefinition from "./createLoggingDefinition";
import getConfiguration from "./getConfiguration";

import { DEFAULT_CONFIGURATION } from "./constants";

function netBuilderError(
	definition: Definition | DefinitionMembers,
	message?: unknown,
	level?: number,
): never {
	const { Logger } = getConfiguration(definition);

	Logger?.Error?.(createLoggingDefinition(definition), message);
	error(`[${DEFAULT_CONFIGURATION.Label}] ${message}`, level);
}

export = netBuilderError;
