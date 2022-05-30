import { Definition, DefinitionMembers, LoggingDefinition } from "../definitions";
import { IS_SERVER } from "./constants";

export = (definition: Definition | LoggingDefinition, includeBoundary = false) =>
	`${includeBoundary ? (IS_SERVER ? "Server" : "Client") : ""}${
		(definition as DefinitionMembers).Kind
	}<${(definition as DefinitionMembers).Id}>`;
