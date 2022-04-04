import { Server } from "@rbxts/netbuilder";
import Remotes from "shared/Remotes";

const printOnClient = Server.CreateEvent(Remotes.PrintOnClient);
const verifyAge = Server.CreateFunction(Remotes.VerifyAge);

verifyAge.SetCallback((_player, person) => {
	person.Introduce();

	if (person.IsUnderage()) {
		return true;
	}

	return false;
});

task.wait(3);

printOnClient.SendToAll(true, "hi");
