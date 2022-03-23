import { RemoteDefinition, RemoteDefinitionMembers } from "../definitions";

export = (definition: RemoteDefinitionMembers) => `${definition.Kind}<${definition.Id}>`;
