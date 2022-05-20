import { Definition, DefinitionMembers, LoggingDefinition } from "../definitions";

import netBuilderFormat from "./netBuilderFormat";
import getConfiguration from "./getConfiguration";

export = (definition: Definition | DefinitionMembers, ...params: unknown[]) => {
	const { SuppressWarnings, Logger } = getConfiguration(definition);

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
