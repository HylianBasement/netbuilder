import { Definition, DefinitionMembers, NetBuilderConfiguration } from "../definitions";

import Configuration from "../Symbol/Configuration";

function getConfiguration(definition: Definition | DefinitionMembers) {
	return (definition as DefinitionMembers).Namespace[
		Configuration as never
	] as unknown as NetBuilderConfiguration;
}

export = getConfiguration;
