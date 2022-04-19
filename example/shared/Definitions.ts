import { NetBuilder, DefinitionBuilder, RateLimiter } from "@rbxts/netbuilder";
import { t } from "@rbxts/t";

import Person from "./Class/Person";
import Log from "./Util/Log";

const personCheck = (value: unknown): value is Person => value instanceof Person;

export = new NetBuilder()
	.Configure((config) =>
		config
			.SetRoot((rs) => rs.WaitForChild("remotes"))
			.SetLogger({
				Error: (def, stderr) => Log.Error(`[${def.Id}] ${stderr}`),
				Warn: (def, ...params) => Log.Warn(`[${def.Id}]`, ...params),
			}),
	)
	.AddDefinition(new DefinitionBuilder("PrintOnClient").SetArguments(t.string).Build())
	.AddNamespace(
		"People",
		new NetBuilder()
			.WithSerialization([Person])
			.AddDefinition(
				new DefinitionBuilder("VerifyAge")
					.WithMiddleware([RateLimiter({ MaxPerMinute: 3 })])
					.SetArguments(personCheck)
					.SetReturn(t.boolean)
					.Build(),
			)
			.AsNamespace(),
	)
	.Build();
