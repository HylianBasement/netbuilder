import { Definition, DefinitionMembers, NetBuilderConfiguration } from "../definitions";

import Configuration from "../Symbol/Configuration";

import netBuilderFormat from "./netBuilderFormat";
import symbolDictionary from "./symbolDictionary";

export = (definition: Definition | DefinitionMembers, ...params: unknown[]) => {
	const supressWarnings = (
		symbolDictionary((definition as DefinitionMembers).Namespace)[
			Configuration
		] as NetBuilderConfiguration
	).SuppressWarnings;

	if (!supressWarnings) warn(...netBuilderFormat(...params));
};
