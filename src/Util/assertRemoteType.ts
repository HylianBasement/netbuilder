import { DefinitionMembers } from "../definitions";

import isRemoteFunction from "./isRemoteFunction";
import netBuilderError from "./netBuilderError";

export = <T extends "RemoteEvent" | "RemoteFunction">(
	definition: DefinitionMembers,
	remoteClass: T,
	remote?: RemoteFunction | RemoteEvent,
): remote is CreatableInstances[T] => {
	if (!remote) {
		netBuilderError(definition, "Remote does not exist.");
	} else if (remoteClass === "RemoteEvent" && isRemoteFunction(remote)) {
		netBuilderError(definition, "Expected RemoteEvent, got RemoteFunction.");
	} else if (remoteClass === "RemoteFunction" && !isRemoteFunction(remote)) {
		netBuilderError(definition, "Expected RemoteFunction, got RemoteEvent.");
	}

	return true;
};
