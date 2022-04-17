import { NetBuilder, DefinitionBuilder } from "@rbxts/netbuilder";
import { t } from "@rbxts/t";

import Person from "./Class/Person";

const personCheck = (value: unknown): value is Person => value instanceof Person;

export = new NetBuilder()
	.Configure({
		RootInstance: (rs) => rs.WaitForChild("remotes"),
		SuppressWarnings: true,
	})
	.AddDefinition(new DefinitionBuilder("PrintOnClient").SetArguments(t.string).Build())
	.AddNamespace(
		"People",
		new NetBuilder()
			.WithSerialization([Person])
			.AddDefinition(
				new DefinitionBuilder("VerifyAge")
					.SetArguments(personCheck)
					.SetReturn(t.boolean)
					.Build(),
			)
			.AsNamespace(),
	)
	.Build();
