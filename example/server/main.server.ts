import Remotes from "shared/Remotes";

Remotes.Server.People.VerifyAge.SetCallback((_player, person) => {
	person.Introduce();

	if (person.IsUnderage()) {
		return true;
	}

	return false;
});

task.wait(3);

Remotes.Server.PrintOnClient.SendToAll("hi");
