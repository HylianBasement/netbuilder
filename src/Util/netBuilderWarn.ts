import {
	Definition,
	DefinitionMembers,
	LoggingDefinition,
	NetBuilderConfiguration,
} from "../definitions";

import Configuration from "../Symbol/Configuration";

import netBuilderFormat from "./netBuilderFormat";
import symbolDictionary from "./symbolDictionary";

export = (definition: Definition | DefinitionMembers, ...params: unknown[]) => {
	const { SuppressWarnings, Logger } = symbolDictionary((definition as DefinitionMembers).Namespace)[
		Configuration
	] as NetBuilderConfiguration;

	const loggingDefinition: LoggingDefinition = {
		Id: (definition as DefinitionMembers).Id,
		Kind: (definition as DefinitionMembers).Kind,
	};

	table.freeze(loggingDefinition);

	if (!SuppressWarnings) {
		const log = Logger?.Warn
			? (...params: unknown[]) => Logger.Warn!(loggingDefinition, ...params)
			: (...params: unknown[]) => warn(...netBuilderFormat(...params));

		log(...params);
	}
};
