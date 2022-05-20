import { Definition, DefinitionMembers } from "../definitions";
import { IS_SERVER } from "./constants";

export = (definition: Definition | DefinitionMembers, includeBoundary = false) =>
	`${includeBoundary ? (IS_SERVER ? "Server" : "Client") : ""}${
		(definition as DefinitionMembers).Kind
	}<${(definition as DefinitionMembers).Id}>`;
