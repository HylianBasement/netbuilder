import {
	InferDefinitonId,
	NetBuilderMiddleware,
	NetBuilderSerializer,
	NetBuilderConfiguration,
	Definition,
	DefinitionMembers,
	DefinitionNamespace,
	SerializableClass,
	MiddlewareCallback,
	SerializableObject,
	SerializationType,
	SerializationMap as ISerializationMap,
} from "../definitions";

import Serialization from "../Internal/Serialization";

import Configuration from "../Symbol/Configuration";
import GlobalMiddleware from "../Symbol/GlobalMiddleware";
import NamespaceId from "../Symbol/NamespaceId";
import NamespaceParent from "../Symbol/NamespaceParent";
import Serializables from "../Symbol/Serializables";
import Serializers from "../Symbol/Serializers";
import SerializationMap from "../Symbol/SerializationMap";

import netBuilderError from "../Util/netBuilderError";

type NetBuilderMiddlewareOptions = {
	Global?: boolean;
} & (
	| {
			ServerOnly: false;
			Sender?: MiddlewareCallback<Callback>;
			Receiver?: MiddlewareCallback<Callback>;
	  }
	| {
			ServerOnly: true;
			Callback: MiddlewareCallback<Callback>;
	  }
);

interface NetBuilderSerializerCreator<S> {
	Serialize(this: void, value: defined): S;
	Deserialize(this: void, serialized: S): defined;
}

const RunService = game.GetService("RunService");

const middlewareFn: MiddlewareCallback<Callback> =
	(_remote, processNext) =>
	(_player, ...args) => {
		processNext(args);
	};

/** Builder for a dictionary of remote definitions. */
class NetBuilder<R extends DefinitionNamespace = {}, O extends keyof NetBuilder = never> {
	private definitions = new Array<Definition>();

	private middlewareList = new Array<NetBuilderMiddleware>();

	private namespaces = new Array<{ name: string; space: DefinitionNamespace }>();

	private configuration: NetBuilderConfiguration = { SuppressWarnings: false };

	private serializableClasses = new Array<SerializableClass>();

	private serializers = new Array<NetBuilderSerializer<defined>>();

	private serializationMap: ISerializationMap = {
		Serializables: new Map(),
		Serializers: new Map(),
		SerializerClasses: new Map(),
	};

	private toString() {
		return "NetBuilder";
	}

	/** Creates a custom middleware. */
	public static CreateMiddleware<P extends Array<any>>(
		id: string,
		callback: (...args: P) => NetBuilderMiddlewareOptions,
	) {
		return <F extends Callback>(...args: P): NetBuilderMiddleware<F> => {
			const options = callback(...(args as never));
			const { Global = false, ServerOnly } = options;

			if (ServerOnly === true) {
				const { Callback } = options;

				const serverFn: MiddlewareCallback<Callback> =
					(definition, processNext, drop) =>
					(player, ...args) => {
						if (player && RunService.IsServer()) {
							Callback(definition, processNext, drop)(player, ...(args as never[]));
						} else {
							processNext(args);
						}
					};

				return {
					Id: id,
					GlobalEnabled: Global,
					Send: serverFn,
					Recv: serverFn,
				};
			}

			const { Sender = middlewareFn, Receiver = middlewareFn } = options;

			return {
				Id: id,
				GlobalEnabled: Global,
				Send: Sender,
				Recv: Receiver,
			};
		};
	}

	/** Creates a custom serializer. Useful for existing classes. */
	public static CreateSerializer<S>(
		object: object,
		methods: NetBuilderSerializerCreator<S>,
	): NetBuilderSerializer<S> {
		return {
			Class: object,
			Serialize(namespace, value) {
				return {
					SerializationType: SerializationType.Custom,
					SerializationId: (
						namespace[SerializationMap] as ISerializationMap
					).SerializerClasses.get(object as never)!.Id,
					Value: methods.Serialize(value),
				};
			},
			Deserialize(serialized: S) {
				return methods.Deserialize(serialized);
			},
		};
	}

	/** Adds a definition to the namespace. */
	public AddDefinition<D extends Definition>(definition: D) {
		this.definitions.push(definition);

		return this as unknown as NetBuilder<R & { readonly [_ in InferDefinitonId<D>]: D }, O>;
	}

	/** Adds a child definition namespace. */
	public AddNamespace<S extends string, N extends DefinitionNamespace>(name: S, space: N) {
		this.namespaces.push({ name, space });

		return this as unknown as NetBuilder<R & { readonly [_ in S]: N }, O>;
	}

	/** Sets the root instance of the remotes from the namespace. */
	public SetRoot(instance: Instance | ((replicatedStorage: ReplicatedStorage) => Instance)) {
		this.configuration.RootInstance = instance;

		return this as unknown as Omit<NetBuilder<R, O | "SetRoot">, O | "SetRoot">;
	}

	/** Disables the warnings emitted from the namespace. */
	public SupressWarnings(value = true) {
		this.configuration.SuppressWarnings = value;

		return this as unknown as Omit<NetBuilder<R, O | "SupressWarnings">, O | "SupressWarnings">;
	}

	/** Sets a list of middlewares valid for every descendant definition. */
	public WithGlobalMiddleware(middleware: NetBuilderMiddleware[]) {
		this.middlewareList = middleware;

		return this as unknown as Omit<
			NetBuilder<R, O | "WithGlobalMiddleware">,
			O | "WithGlobalMiddleware"
		>;
	}

	/** Adds a list serializers to the registry. Whenever a request is made, parameters and return values are (de)serialized if they match any of the provided serializable classes. */
	public WithSerialization(classes: SerializableObject[]) {
		this.serializableClasses = classes.filter(
			(v) => !Serialization.IsSerializer(v),
		) as Array<SerializableClass>;

		this.serializers = classes.filter((v) => Serialization.IsSerializer(v)) as Array<
			NetBuilderSerializer<defined>
		>;

		// eslint-disable-next-line roblox-ts/no-array-pairs
		for (const [i, obj] of ipairs(this.serializableClasses)) {
			this.serializationMap.Serializables.set(obj, i);
		}

		// eslint-disable-next-line roblox-ts/no-array-pairs
		for (const [i, obj] of ipairs(this.serializers)) {
			this.serializationMap.Serializers.set(obj, i);
			this.serializationMap.SerializerClasses.set(obj.Class, { Serializer: obj, Id: i });
		}

		return this as unknown as Omit<NetBuilder<R, O | "WithSerialization">, O | "WithSerialization">;
	}

	/** Returns a dictionary of remote definitions. */
	public Build() {
		const { definitions, namespaces } = this;
		const dict = new Map<string, Definition | DefinitionNamespace>();

		for (const { GlobalEnabled, Id } of this.middlewareList) {
			if (!GlobalEnabled) {
				netBuilderError(`The middleware "${Id}" is not globally enabled.`, 3);
			}
		}

		for (const d of definitions) {
			const def = d as unknown as DefinitionMembers;
			(def.Namespace as unknown) = dict;

			table.freeze(d);

			dict.set(def.Id, d);
		}

		for (const { name, space } of namespaces) {
			space[NamespaceId] ??= name;
			space[NamespaceParent] ??= dict;
			space[GlobalMiddleware] ??= this.middlewareList;
			space[Serializables] ??= this.serializableClasses;
			space[Serializers] ??= this.serializers;
			space[SerializationMap] ??= this.serializationMap;

			space[Configuration] = space[Configuration]
				? { ...this.configuration, ...(space[Configuration] as NetBuilderConfiguration) }
				: this.configuration;

			table.freeze(space);

			dict.set(name, space);
		}

		const thisNamespace = dict as unknown as DefinitionNamespace;
		thisNamespace[Configuration] = this.configuration;
		thisNamespace[GlobalMiddleware] = this.middlewareList;
		thisNamespace[Serializables] = this.serializableClasses;
		thisNamespace[Serializers] = this.serializers;
		thisNamespace[SerializationMap] = this.serializationMap;

		return dict as unknown as R;
	}
}

export = NetBuilder;
