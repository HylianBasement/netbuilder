import { DefinitionMembers } from "../definitions";

export = (definition: DefinitionMembers) => `${definition.Kind}<${definition.Id}>`;
