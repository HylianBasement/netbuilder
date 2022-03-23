import { RemoteDefinition, RemoteDefinitionMembers, NetBuilderConfiguration } from "../definitions";
import Configuration from "../Symbol/Configuration";

export = (definition: RemoteDefinition | RemoteDefinitionMembers, ...params: unknown[]) => {
	const supressWarnings = (
		(definition as RemoteDefinitionMembers).Namespace[Configuration] as NetBuilderConfiguration
	).SuppressWarnings;

	if (!supressWarnings) warn("[netbuilder]", ...params);
};
