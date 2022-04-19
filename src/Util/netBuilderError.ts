import {
	Definition,
	DefinitionMembers,
	LoggingDefinition,
	NetBuilderConfiguration,
} from "../definitions";

import symbolDictionary from "./symbolDictionary";

import Configuration from "../Symbol/Configuration";

function netBuilderError(
	definition: Definition | DefinitionMembers,
	message?: unknown,
	level?: number,
): never {
	const { Logger } = symbolDictionary((definition as DefinitionMembers).Namespace)[
		Configuration
	] as NetBuilderConfiguration;

	const loggingDefinition: LoggingDefinition = {
		Id: (definition as DefinitionMembers).Id,
		Kind: (definition as DefinitionMembers).Kind,
	};

	table.freeze(loggingDefinition);

	Logger?.Error?.(loggingDefinition, message);
	error(`[netbuilder] ${message}`, level);
}

export = netBuilderError;
