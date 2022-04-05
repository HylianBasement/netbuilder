import { NetBuilder, EventBuilder, FunctionBuilder } from "@rbxts/netbuilder";
import { t } from "@rbxts/t";

import Person from "./Class/Person";

const personCheck = (value: unknown): value is Person => value instanceof Person;

export = new NetBuilder()
	.WithSerialization([Person])
	.AddDefinition(
		new FunctionBuilder("VerifyAge").SetArguments(personCheck).SetReturn(t.boolean).Build(),
	)
	.AddDefinition(new EventBuilder("PrintOnClient").SetArguments(t.string).Build())
	.Build();
