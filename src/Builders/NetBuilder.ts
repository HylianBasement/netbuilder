import {
	GetRemoteId,
	NetBuilderMiddleware,
	NetBuilderConfiguration,
	RemoteDefinition,
	RemoteDefinitionMembers,
	RemoteDefinitionNamespace,
	SerializableClass,
} from "../definitions";

import Configuration from "../Symbol/Configuration";
import GlobalMiddleware from "../Symbol/GlobalMiddleware";
import NamespaceId from "../Symbol/NamespaceId";
import NamespaceParent from "../Symbol/NamespaceParent";
import Serialization from "../Symbol/Serialization";

import netBuilderError from "../Util/netBuilderError";

/** Builder for a dictionary of remote definitions. */
class NetBuilder<R extends RemoteDefinitionNamespace = {}, O extends keyof NetBuilder = never> {
	private definitions = new Array<RemoteDefinition>();

	private middlewareList = new Array<NetBuilderMiddleware>();

	private namespaces = new Array<{ name: string; space: RemoteDefinitionNamespace }>();

	private configuration: NetBuilderConfiguration = { SuppressWarnings: false };

	private serializableClasses = new Map<string, SerializableClass>();

	private toString() {
		return "NetBuilder";
	}

	/** Adds a definition to the namespace. */
	public AddDefinition<D extends RemoteDefinition>(definition: D) {
		this.definitions.push(definition);

		return this as unknown as NetBuilder<R & { readonly [_ in GetRemoteId<D>]: D }, O>;
	}

	/** Adds a child definition namespace. */
	public AddNamespace<S extends string, N extends RemoteDefinitionNamespace>(name: S, space: N) {
		this.namespaces.push({ name, space });

		return this as unknown as NetBuilder<R & { readonly [_ in S]: N }, O>;
	}

	/** Sets a configuration valid for every descendant definition.
	 *
	 *
	 */
	public Configure(configuration: NetBuilderConfiguration) {
		this.configuration = { ...this.configuration, ...configuration };

		return this as unknown as Omit<NetBuilder<R, O | "Configure">, O | "Configure">;
	}

	/** Sets a list of middlewares valid for every descendant definition. */
	public GlobalMiddleware(middleware: NetBuilderMiddleware[]) {
		this.middlewareList = middleware;

		return this as unknown as Omit<NetBuilder<R, O | "GlobalMiddleware">, O | "GlobalMiddleware">;
	}

	/** (De)serializes parameters and return values if they match any of the provided serializable classes. */
	public Serialization(classes: SerializableClass[]) {
		this.serializableClasses = new Map(classes.map((c) => [c.ClassName, c]));

		return this as unknown as Omit<NetBuilder<R, O | "Serialization">, O | "Serialization">;
	}

	/** Returns a dictionary of remote definitions. */
	public Build() {
		const { definitions, namespaces } = this;
		const dict = new Map<string, RemoteDefinition | RemoteDefinitionNamespace>();

		for (const { GlobalEnabled, Label } of this.middlewareList) {
			if (!GlobalEnabled) {
				netBuilderError(`The middleware "${Label}" is not globally enabled.`);
			}
		}

		for (const d of definitions) {
			const def = d as unknown as RemoteDefinitionMembers;
			(def.Namespace as unknown) = dict;

			table.freeze(d);

			dict.set(def.Id, d);
		}

		for (const { name, space } of namespaces) {
			space[NamespaceId] ??= name;
			space[NamespaceParent] ??= dict;
			space[GlobalMiddleware] ??= this.middlewareList;
			space[Serialization] ??= this.serializableClasses;

			space[Configuration] = space[Configuration]
				? { ...this.configuration, ...(space[Configuration] as NetBuilderConfiguration) }
				: this.configuration;

			table.freeze(space);

			dict.set(name, space);
		}

		(dict as unknown as RemoteDefinitionNamespace)[Configuration] = this.configuration;
		(dict as unknown as RemoteDefinitionNamespace)[GlobalMiddleware] = this.middlewareList;
		(dict as unknown as RemoteDefinitionNamespace)[Serialization] = this.serializableClasses;

		return dict as unknown as R;
	}
}

export = NetBuilder;
