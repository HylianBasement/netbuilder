import { DefinitionKind } from "../definitions";

export = (kind: DefinitionKind) => (kind === "Event" ? "RemoteEvent" : "RemoteFunction");
