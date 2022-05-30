import { Server } from "shared/Definitions";

Server.People.VerifyAge.SetCallback((_player, person) => {
	person.Introduce();

	if (person.IsUnderage()) {
		return true;
	}

	return false;
});

task.wait(3);

Server.PrintOnClient.SendToAll("hi");
