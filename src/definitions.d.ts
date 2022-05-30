import { Result } from "@rbxts/rust-classes";

import ClientSide from "./Communication/ClientDispatcher";
import ServerSide from "./Communication/ServerDispatcher";

export type ArrayLength<T extends Array<any> | ReadonlyArray<any>> = (T & { length: number })["length"];

export type LengthEquals<
	A extends Array<any> | ReadonlyArray<any>,
	B extends Array<any> | ReadonlyArray<any>,
> = ArrayLength<A> extends ArrayLength<B> ? true : false;

/** Checks if `value` is a T.  */
export type Check<T> = (value: unknown) => value is T;

/** Creates a static type from a t-defined type.  */
export type Static<T> = T extends Check<infer U> ? U : never;

export type ThreadResult = Result<[Array<unknown>, (r: unknown) => unknown], string>;

export type InferArguments<
	Checks extends Array<Check<any>>,
	Args extends Array<any> = [],
> = LengthEquals<Checks, Args> extends true
	? Args
	: InferArguments<Checks, [...Args, Static<Checks[ArrayLength<Args>]>]>;

export type UnwrapAsyncReturnType<T extends Callback> = ReturnType<T> extends Promise<infer U>
	? U extends Promise<any>
		? UnwrapAsyncReturnType<() => U>
		: U
	: ReturnType<T>;

export const enum SerializationType {
	Custom,
	Implemented,
}

/** Interface for implementing serializable classes. */
export type Serializable<T extends object> = Deserialize &
	Partial<Reconstruct<UnionToIntersection<SerializableClassInstance<T>>>>;

/** Serialized object representation of a specific class. */
export interface SerializedObject<S extends object> {
	readonly SerializationType: SerializationType;
	readonly SerializationId: number;
	readonly Value: S;
}

export type SerializableClassInstance<T = object> =
	| { Serialize(definition: SerializationDefinition): T }
	| { serialize(definition: SerializationDefinition): T };

export class Deserialize {
	public static deserialize(
		serialized: object,
		definition: SerializationDefinition,
	): SerializableClassInstance;
}

export interface SerializableClass extends Deserialize {
	new (...args: Array<any>): SerializableClassInstance;
	deserialize(serialized: object, definition: SerializationDefinition): SerializableClassInstance;
}

export interface SerializationMap {
	readonly Serializables: Map<SerializableClass, number>;
	readonly Serializers: Map<NetBuilderSerializer<defined>, number>;
	readonly SerializerClasses: Map<object, { Serializer: NetBuilderSerializer<defined>; Id: number }>;
}

export interface NetBuilderSerializer<S extends defined> {
	readonly Class: object;
	Serialization(
		namespace: DefinitionNamespace,
		value: object,
		definition: SerializationDefinition,
	): SerializedObject<S>;
	Deserialization(serialized: S, definition: SerializationDefinition): object;
}

export type SerializableObject = NetBuilderSerializer<defined> | SerializableClass;

/** Raw result object type. */
export type NetBuilderResult<T> =
	| {
			Type: "Ok";
			Data: T;
	  }
	| {
			Type: "Err";
			Message: string;
	  };

export interface NetBuilderAsyncReturn<T> extends Promise<T> {
	catch<TResult = never>(
		onRejected?: ((reason: string) => TResult | Promise<TResult>) | void,
	): Promise<T | TResult>;
}

export type NetBuilderLoggerCallback<P extends Array<any>> = (
	definition: LoggingDefinition,
	...params: P
) => void;

export interface NetBuilderLogger {
	Debug?: NetBuilderLoggerCallback<Array<unknown>>;
	Error?: NetBuilderLoggerCallback<[stderr: unknown]>;
	Warn?: NetBuilderLoggerCallback<Array<unknown>>;
}

export interface NetBuilderConfiguration {
	/** Changes the default name of the root directory. */
	RootName?: string;
	/** Changes the location of the remote instances main directory. */
	RootInstance?: Instance;
	/** Changes the logger to all of the namespace's definitions. */
	Logger?: NetBuilderLogger;
	/**
	 * Changes the warning/error messages text between brackets.
	 * e.g: `[netbuilder] Could not find remote instance.` -> `[newtext] Could not find remote instance.`
	 */
	Label: string;
	/** Activates debug mode. */
	Debug: boolean;
	/** Disables all the warnings emitted from the library. */
	SuppressWarnings: boolean;
	/** Generates remotes for all the registered definitions, regardless if they are being used or not. */
	PreGeneration: boolean;
	/** If set to true, functions called via `Call` will always return their latest successful value instead of throwing an error when a middleware fails. */
	CacheFunctions: boolean;
}

/** Middleware entry type. */
export type NetBuilderMiddleware<F extends Callback = Callback> = ObjectDispatcher<
	MiddlewareCallback<F>,
	MiddlewareCallback<F>
> & {
	Id: string;
	GlobalEnabled: boolean;
};

/** Callback that is executed on a middleware check. */
export type MiddlewareCallback<F extends Callback> = (
	definition: LoggingDefinition,
	process: (params: Parameters<F>, returnValue?: (value: ReturnType<F>) => unknown) => never,
	drop: (reason: string) => never,
) => (player: Player, ...params: Parameters<F>) => void;

export type Remote<F extends Callback = Callback> = RemoteEvent<F> | RemoteFunction<F>;

export type DefinitionKind = "Event" | "Function" | "AsyncFunction";

export type TypeCheckingResult = Result<defined, string>;

export interface Definition<
	I extends string = string,
	K extends DefinitionKind = DefinitionKind,
	D extends Callback = Callback,
> {
	/** @deprecated @hidden */
	readonly _nominal_remoteDefinition: unique symbol;
}

/** Definition type variant for logging related operations. */
export interface LoggingDefinition {
	/** The identifier that the definition is bound to. */
	readonly Id: string;
	/** The kind of the definition. i.e: `Event`, `Function`, `AsyncFunction` */
	readonly Kind: DefinitionKind;
}

/** Definition type variant for serialization related operations. */
export interface SerializationDefinition extends LoggingDefinition {
	/** Reference to the definition's namespace. */
	readonly Namespace: DefinitionNamespace;
}

/** Definition type variant for internal use. */
export interface DefinitionMembers extends LoggingDefinition, SerializationDefinition {
	readonly Middlewares: ReadonlyArray<NetBuilderMiddleware>;
	readonly Checks: readonly [ReadonlyArray<Check<any>>, Check<any>];
	readonly Timeout: number;
}

export interface DefinitionNamespace {
	[x: string]: Definition;
}

export interface BuilderMembers {
	id: string;
	kind: DefinitionKind;
}

export type ClientDefinition<K extends DefinitionKind, D> = D extends ClientSide<any>
	? K extends "Event"
		? Event<D>
		: K extends "Function"
		? Function<D>
		: AsyncFunction<D>
	: never;

export type ServerDefinition<K extends DefinitionKind, D> = D extends ServerSide<any>
	? K extends "Event"
		? Event<D>
		: K extends "Function"
		? Function<D>
		: AsyncFunction<D>
	: never;

type ServerEvent<D extends ServerSide<any>> = {
	(this: void, ...args: Parameters<D["Send"]>): void;
} & Omit<D, "SetCallback" | "CallAsync">;

type ServerFunction<D extends ServerSide<any>> = {
	/** @hidden @deprecated */
	readonly _nominal_serverFunction: unique symbol;
} & Omit<D, "Connect" | "ConnectParallel" | "Wait" | "CallAsync" | "Send" | "SendToAll" | "SendWithout">;

type ServerAsyncFunction<D extends ServerSide<any>> = {
	(this: void, ...args: Parameters<D["CallAsync"]>): NetBuilderAsyncReturn<
		ReturnType<InferDispatcherCallback<D>>
	>;
} & Omit<D, "Connect" | "ConnectParallel" | "Wait" | "Send" | "SendToAll" | "SendWithout">;

type ClientEvent<D extends ClientSide<any>> = {
	(this: void, ...args: Parameters<D["Send"]>): void;
} & Omit<D, "SetCallback" | "Call" | "CallAsync" | "RawCall" | "CallWith">;

type ClientFunction<D extends ClientSide<any>> = {
	(this: void, ...args: Parameters<D["Call"]>): ReturnType<InferDispatcherCallback<D>>;
} & Omit<D, "Connect" | "ConnectParallel" | "Wait" | "CallAsync" | "Send">;

type ClientAsyncFunction<D extends ClientSide<any>> = {
	(this: void, ...args: Parameters<D["CallAsync"]>): NetBuilderAsyncReturn<
		ReturnType<InferDispatcherCallback<D>>
	>;
} & Omit<D, "Connect" | "ConnectParallel" | "Wait" | "Call" | "RawCall" | "CallWith" | "Send">;

type Event<D> = {
	/** @hidden @deprecated */
	readonly _nominal_event: unique symbol;
} & (D extends ServerSide<any> ? ServerEvent<D> : D extends ClientSide<any> ? ClientEvent<D> : never);

type Function<D> = {
	/** @hidden @deprecated */
	readonly _nominal_function: unique symbol;
} & (D extends ServerSide<any>
	? ServerFunction<D>
	: D extends ClientSide<any>
	? ClientFunction<D>
	: never);

type AsyncFunction<D> = {
	/** @hidden @deprecated */
	readonly _nominal_asyncFunction: unique symbol;
} & (D extends ServerSide<any>
	? ServerAsyncFunction<D>
	: D extends ClientSide<any>
	? ClientAsyncFunction<D>
	: never);

type InferDispatcherCallback<D> = D extends ServerSide<infer F>
	? F
	: D extends ClientSide<infer F>
	? F
	: never;

export type InferDefinitionId<R> = R extends Definition<infer I, never, never> ? I : never;

export type InferDefinitionKind<R> = R extends Definition<never, infer K, never> ? K : never;

export type InferDefinitionTyping<R> = R extends Definition<never, never, infer D> ? D : never;

export type ParametersAsReturnType<
	P extends Array<any>,
	I extends ReadonlyArray<defined | void> = [],
	A extends ReadonlyArray<defined | void> = never,
> = LengthEquals<I, P> extends true
	? A
	: ParametersAsReturnType<P, [...I, P[ArrayLength<I>] | void], A | [...I, P[ArrayLength<I>] | void]>;

export interface ObjectDispatcher<S, R> {
	Send: S;
	Recv: R;
}
