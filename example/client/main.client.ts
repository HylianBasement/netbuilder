import { Client } from "@rbxts/netbuilder";

import Remotes from "shared/Remotes";
import Person from "shared/Class/Person";

const printOnClient = Client.GetEvent(Remotes.PrintOnClient);
const verifyAge = Client.GetFunction(Remotes.VerifyAge);

printOnClient.Connect((message) => {
	print("Server says: " + message);
});

const john = new Person("John Doe", 6);

for (let i = 0; i < 3; i++) {
	print(verifyAge.Call(john) ? "John is still underage." : "John is now an adult!");
	john.IncrementAge(6);
}
