import { Definition, DefinitionMembers, LoggingDefinition } from "../definitions";

/** @internal */
function createLoggingDefinition(definition: Definition | DefinitionMembers) {
	const loggingDefinition: LoggingDefinition = {
		Id: (definition as DefinitionMembers).Id,
		Kind: (definition as DefinitionMembers).Kind,
	};

	table.freeze(loggingDefinition);

	return loggingDefinition;
}

export = createLoggingDefinition;
