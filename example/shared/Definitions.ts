import { NetBuilder, DefinitionBuilder, RateLimiter } from "@rbxts/netbuilder";
import { t } from "@rbxts/t";

import Person from "./Class/Person";
import Log from "./Util/Log";

const remotes = new NetBuilder()
	.Configure({
		RootName: "ExampleRemotes",
		Logger: {
			Error: (def, stderr) => Log.Error(`[${def.Id}] ${stderr}`),
			Warn: (def, ...params) => Log.Warn(`[${def.Id}]`, ...params),
		},
		CacheFunctions: true,
	})
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

export const Server = remotes.Server;

export const Client = remotes.Client;
