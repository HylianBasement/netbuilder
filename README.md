<div>
	<h1><code>NetBuilder</code></h1>
	<p>Networking library for roblox.</p>
</div>

```js
import { NetBuilder, EventBuilder, FunctionBuilder } from "@rbxts/netbuilder";

export = new NetBuilder()
	.AddDefinition(new EventBuilder<[message: string]>().Id("Print").Build())
	.AddDefinition(new FunctionBuilder<(x: number, y: number) => number>().Id("Sum").Build())
	.AddNamespace("Player",
		new NetBuilder()
			.AddDefinition(new EventBuilder<[itemId: number]>().Id("ConsumeItem").Build())
			.AddDefinition(new FunctionBuilder<() => PlayerStatus>().Id("GetStatus").Build())
			.Build()
	)
	.AddNamespace("Party",
		new NetBuilder()
			.AddDefinition(new FunctionBuilder<(info: PartyCreatorInfo) => Party>().Id("Create").Build())
			.AddDefinition(new FunctionBuilder<(partyId: number) => void>().Id("Disband").Build())
			.AddDefinition(new EventBuilder<[partyId: number]>().Id("SendJoinRequest").Build())
			.AddDefinition(new EventBuilder<[invitedPlayer: Player, partyId: number]>().Id("SendInvite").Build())
			.Build()
	)
	.Build();
```
