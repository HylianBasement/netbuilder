<div>
	<h1><code>NetBuilder</code></h1>
	<p>Networking library for roblox.</p>
</div>

---

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Package](https://badge.fury.io/js/%40rbxts%2Fnetbuilder.svg)](https://www.npmjs.com/package/@rbxts/netbuilder)

NetBuilder is a Roblox networking library, aiming to simplify network management using the [builder pattern](https://refactoring.guru/design-patterns/builder) for creating remote definitions and custom middlewares.

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

## Features
- Builder API for creating and configuring definitions/middlewares.
- Definitions inside namespaces, for better organization.
- Middlewares to have the ability to put your own custom behaviours to remotes. Middlewares have contextual, global and IO mapping support. There are currently [5 built-in middlewares](https://github.com/Rimuy/netbuilder/tree/main/src/Middleware) available for use.
- Specific APIs for when choosing to connect events/functions on the client or server.
- Async server functions with timeouts, using `CallAsync` in the client.
- `Result` and `RustResult` ([rust-classes](https://github.com/Dionysusnu/rbxts-rust-classes)) return values for server functions.
- Supports promise return values (asynchronous functions) for both events and functions.
- Supports (de)serialization for both parameters and return values.

## Goals
- An authentic, simple and intuitive API.
- To make the overall networking development experience in Roblox less stressing.
- Fully customizable definitions by being able to map what is sent and what is received. (Useful for things like serialization and encryption)

## Non-goals
- Support ClientFunctions ─ The server just shouldn't expect any output from a client at all. Giving a client access to edit whatever is requested from the server, makes your game very vulnerable to exploits due to it having *full control* on what is returned to the server.
It is considered an anti-pattern and should be avoided.
A full and elaborated explanation about that can be found [here](https://www.youtube.com/watch?v=0H_xcA-0LDE).

## Installation
### npm
Simply execute the command below to install it to your [roblox-ts](https://roblox-ts.com/) project.
```bash
npm i @rbxts/netbuilder
```

<!-- ### Wally
For [wally](https://wally.run/) users, the package can be installed by adding the following line into their `wally.toml`.
```cs
[dependencies]
NetBuilder = "rimuy/netbuilder@0.1.0"
```

After that, just run `wally install`. -->

<!-- ### From model file
Model files are uploaded to every release as `.rbxmx` files. You can download the file from the [Releases page](https://github.com/Rimuy/netbuilder/releases) and load it into your project however you see fit. -->

## Definitions Guide

## Middleware Guide

## Serialization Guide

## Useful links
- [Example](example/)
- [License](LICENSE)