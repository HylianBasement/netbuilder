import Remotes from "shared/Remotes";
import Person from "shared/Class/Person";

Remotes.Client.PrintOnClient.Connect((message) => {
	print("Server says: " + message);
});

const john = new Person("John Doe", 6);

for (let i = 0; i < 3; i++) {
	print(Remotes.Client.People.VerifyAge(john) ? "John is still underage." : "John is now an adult!");
	john.IncrementAge(6);
}
