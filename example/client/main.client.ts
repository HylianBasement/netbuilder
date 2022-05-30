import { Client } from "shared/Definitions";
import Person from "shared/Class/Person";

const [message] = Client.PrintOnClient.Wait();
print("Server says: " + message);

const john = new Person("John Doe", 6);

// Fourth time is supposed to throw because of the rate limiter middleware we registered.
for (let i = 0; i < 4; i++) {
	print(Client.People.VerifyAge(john) ? "John is still underage." : "John is now an adult!");
	john.IncrementAge(6);
}
