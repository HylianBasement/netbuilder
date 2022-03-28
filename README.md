<div>
	<h1><code>NetBuilder</code></h1>
	<p>Networking library for roblox.</p>
</div>

---

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Package](https://badge.fury.io/js/%40rbxts%2Fnetbuilder.svg)](https://www.npmjs.com/package/@rbxts/netbuilder)

NetBuilder is a Roblox networking library, aiming to simplify network management using the [builder pattern](https://refactoring.guru/design-patterns/builder) for creating remote definitions and custom middlewares.

## Features
- Builder API for creating and configuring definitions/middlewares.
- Definitions inside namespaces, for better organization.
- Middlewares to have the ability to put your own custom behaviours to remotes. Middlewares have contextual, global and IO mapping support. There are [built-in middlewares](https://github.com/Rimuy/netbuilder/tree/main/src/Middleware) available for use.
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
Let's get started with what definitions are, you can skip this part if you're already familiar with this concept.
Definitions are identifier objects that we create to represent remote events/functions, for a more centralized way of sending and receiving requests.

In NetBuilder, a remote instance is only registered and generated if the same is requested via `(Client|Server).Get(<Definition>)`. This allows us to create definitions that are going to be useful in the future and to prevent instance duplication.

### Creating definitions
The syntax for creating definitions is pretty straight forward. First we must instantiate `NetBuilder`, which is going to be our point of entry for adding definitions.
Definition builders are abstract, we have `EventBuilder` for RemoteEvents and `FunctionBuilder` for RemoteFunctions.

It's also possible to add a namespace that contains another dictionary of remote definitions created by a `NetBuilder` class.

We don't have to specify whether it's a client or server remote, that is meant to be decided when using the definition!

```js
import { NetBuilder, EventBuilder, FunctionBuilder } from "@rbxts/netbuilder";

export = new NetBuilder()
	.AddDefinition(new EventBuilder<[message: string]>().Id("PrintMessage").Build())
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

### Using definitions
To use the definitions we have stored, there are dispatchers for both sides that allow us to send and receive requests.
They can be created by using `(Client|Server).Get`, as previously stated.

```js
// Client-side
import { Client } from "@rbxts/netbuilder";
import { Player, PrintMessage } from "shared/Remotes";

const printMessageEvent = Client.Get(PrintMessage);
const playerStatusEvent = Client.Get(Player.GetStatus);

printMessageEvent.Send("Hello world!");
playerStatusEvent.Call(); // { Level: 1, Atk: 25, Def: 10 }

// Server-side
import { Server } from "@rbxts/netbuilder";
import { Player, PrintMessage } from "shared/Remotes";
import getPlayerStatus from "shared/PlayerData";

Server.Get(PrintMessage).Connect(print);
Server.Get(Player.GetStatus).Connect(getPlayerStatus);
```

Once the game starts, the remote instances are automatically generated in a folder named `NetBuilderRemotes`, located in `ReplicatedStorage`. A way to change the location of the instances will be explained later.

![Generated Remotes S1](assets/generated_remotes1.png)

However, the library only generates remote instances from definitions that are registered via `Server.Get`, which means that if we use the above example, it'll likely only generate two remote instances:

![Generated Remotes S2](assets/generated_remotes2.png)

> Note: Client functions are not supported, therefore cannot be used and will throw an error if doing so.

### Configuring namespaces
Namespaces are configurable! With `NetBuilder.Configure`, we're able to change how the library will behave for a specific namespace and its descendants. Any configuration applied to a descendant will overwrite the existing one.

Current available fields for configuration are:
- `RootInstance` - Changes the location of the remote instances main directory.
- `SupressWarnings` - Disables all the warnings emitted from the library.

```js
import { NetBuilder } from "@rbxts/netbuilder";

export = new NetBuilder()
	.Configure({
		RootInstance: (rs) => rs.WaitForChild("MyRemotes"),
		SupressWarnings: true,
	})
	.AddNamespace("Foo",
		new NetBuilder()
			.Configure({ RootInstance: (rs) => rs.WaitForChild("FooRemotes") })
			// ...
			.Build(),
	)
	// ...
	.Build();
```

## Middleware Guide

### Making a custom middleware

## Serialization Guide

### Creating a serializable class

### Serializing an existing class

## Useful links
- [Example](example/)
- [License](LICENSE)