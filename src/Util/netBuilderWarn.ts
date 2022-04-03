import { Definition, DefinitionMembers, NetBuilderConfiguration } from "../definitions";

import Configuration from "../Symbol/Configuration";

import netBuilderFormat from "./netBuilderFormat";

export = (definition: Definition | DefinitionMembers, ...params: unknown[]) => {
	const supressWarnings = (
		(definition as DefinitionMembers).Namespace[Configuration] as NetBuilderConfiguration
	).SuppressWarnings;

	if (!supressWarnings) warn(...netBuilderFormat(...params));
};
