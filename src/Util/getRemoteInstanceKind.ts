import { RemoteKind } from "../definitions";

export = (kind: RemoteKind) => (kind === "Event" ? "RemoteEvent" : "RemoteFunction");
