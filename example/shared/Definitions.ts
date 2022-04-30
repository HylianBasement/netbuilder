import { NetBuilder, DefinitionBuilder, RateLimiter, Serialization } from "@rbxts/netbuilder";
import { t } from "@rbxts/t";

import Person from "./Class/Person";
import Log from "./Util/Log";

export = new NetBuilder()
	.Configure((config) =>
		config.SetRootName("ExampleRemotes").SetLogger({
			Error: (def, stderr) => Log.Error(`[${def.Id}] ${stderr}`),
			Warn: (def, ...params) => Log.Warn(`[${def.Id}]`, ...params),
		}),
	)
	.BindDefinition(new DefinitionBuilder("PrintOnClient").SetArguments(t.string).Build())
	.BindNamespace(
		"People",
		new NetBuilder()
			.UseSerialization([Person])
			.BindDefinition(
				new DefinitionBuilder("VerifyAge")
					.SetArguments(Person.Type)
					.SetReturn(t.boolean)
					.UseMiddleware([RateLimiter({ Max: 3 })])
					.Build(),
			)
			.AsNamespace(),
	)
	.Build();
