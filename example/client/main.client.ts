import Definitions from "shared/Definitions";
import Person from "shared/Class/Person";

Definitions.Client.PrintOnClient.Connect((message) => {
	print("Server says: " + message);
});

const john = new Person("John Doe", 6);

// Fourth time is supposed to throw because of the rate limiter middleware we registered.
for (let i = 0; i < 4; i++) {
	print(
		Definitions.Client.People.VerifyAge(john) ? "John is still underage." : "John is now an adult!",
	);
	john.IncrementAge(6);
}
