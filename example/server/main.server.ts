import Definitions from "shared/Definitions";

Definitions.Server.People.VerifyAge.SetCallback((_player, person) => {
	person.Introduce();

	if (person.IsUnderage()) {
		return true;
	}

	return false;
});

task.wait(3);

Definitions.Server.PrintOnClient.SendToAll("hi");
