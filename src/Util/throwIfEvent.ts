import { RemoteKind } from "../definitions";
import netBuilderError from "./netBuilderError";

export = (kind: RemoteKind, message: string) => {
	if (kind === "Event") {
		netBuilderError(message);
	}
};
