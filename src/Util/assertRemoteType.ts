import isRemoteFunction from "./isRemoteFunction";
import netBuilderError from "./netBuilderError";

export = <T extends "RemoteEvent" | "RemoteFunction">(
	remoteClass: T,
	remote?: RemoteFunction | RemoteEvent,
): remote is CreatableInstances[T] => {
	if (!remote) {
		netBuilderError("Remote does not exist.");
	} else if (remoteClass === "RemoteEvent" && isRemoteFunction(remote)) {
		netBuilderError("Expected RemoteEvent, got RemoteFunction.");
	} else if (remoteClass === "RemoteFunction" && !isRemoteFunction(remote)) {
		netBuilderError("Expected RemoteFunction, got RemoteEvent.");
	}

	return true;
};
