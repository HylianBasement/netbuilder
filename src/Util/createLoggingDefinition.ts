import { Definition, DefinitionMembers, LoggingDefinition } from "../definitions";

/** @internal */
function createLoggingDefinition(definition: Definition | DefinitionMembers): LoggingDefinition {
	return table.freeze({
		Id: (definition as DefinitionMembers).Id,
		Kind: (definition as DefinitionMembers).Kind,
	});
}

export = createLoggingDefinition;
