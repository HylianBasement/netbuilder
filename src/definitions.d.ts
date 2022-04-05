import { Result } from "@rbxts/rust-classes";

export type ArrayLength<T extends Array<any> | ReadonlyArray<any>> = (T & { length: number })["length"];

export type LengthEquals<
	A extends Array<any> | ReadonlyArray<any>,
	B extends Array<any> | ReadonlyArray<any>,
> = ArrayLength<A> extends ArrayLength<B> ? true : false;

export type Check<T> = (value: unknown) => value is T;

export type Static<T> = T extends Check<infer U> ? U : never;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ThreadResult = Result<[Array<unknown>, (r: unknown) => unknown], string>;

export type ToFixed<T extends Array<any>, U extends Array<any> = []> = LengthEquals<T, U> extends true
	? U
	: ToFixed<T, [...U, T[ArrayLength<U>]]>;

export type InferStrictArguments<
	Checks extends Array<Check<any>>,
	New extends Array<any> = [],
> = LengthEquals<Checks, New> extends true
	? New
	: InferStrictArguments<Checks, [...New, Static<Checks[ArrayLength<New>]>]>;

export type UnwrapAsyncReturnType<T extends Callback> = ReturnType<T> extends Promise<infer U>
	? U extends Promise<any>
		? UnwrapAsyncReturnType<() => U>
		: U
	: ReturnType<T>;

export const enum SerializationType {
	Custom,
	Implemented,
}

export interface SerializedObject<S extends object = object> {
	readonly SerializationType: SerializationType;
	readonly SerializationId: number;
	readonly Value: S;
}

export type SerializableClassInstance = { Serialize(): object } | { serialize(): object };

export type Serializable<T extends object> = Deserialize & {
	Serialize?(): T;
	serialize?(): T;
};

export class Deserialize {
	public static deserialize(serialized: object): SerializableClassInstance;
}

export interface SerializableClass extends Deserialize {
	new (...args: Array<any>): SerializableClassInstance;
	deserialize(serialized: object): SerializableClassInstance;
}

export interface SerializationMap {
	readonly Serializables: Map<SerializableClass, number>;
	readonly Serializers: Map<NetBuilderSerializer<defined>, number>;
	readonly SerializerClasses: Map<object, { Serializer: NetBuilderSerializer<defined>; Id: number }>;
}

export interface NetBuilderSerializer<S extends defined> {
	readonly Class: object;
	Serialization(namespace: DefinitionNamespace, value: object): SerializedObject<S>;
	Deserialization(serialized: S): object;
}

export type SerializableObject = NetBuilderSerializer<defined> | SerializableClass;

export type NetBuilderResult<T> =
	| {
			Type: "Ok";
			Value: T;
	  }
	| {
			Type: "Err";
			Message: string;
	  };

export interface NetBuilderConfiguration {
	RootInstance?: Instance | ((replicatedStorage: ReplicatedStorage) => Instance);
	SuppressWarnings?: boolean;
}

export type NetBuilderMiddleware<F extends Callback = Callback> = ObjectDispatcher<
	MiddlewareCallback<F>,
	MiddlewareCallback<F>
> & {
	Id: string;
	GlobalEnabled: boolean;
};

export type MiddlewareCallback<F extends Callback> = (
	definition: DefinitionMembers,
	process: (params: Parameters<F>, returnValue?: (value: ReturnType<F>) => unknown) => never,
	drop: (reason: string) => never,
) => (player: Player, ...params: Parameters<F>) => void;

export type Remote<F extends Callback = Callback> = RemoteEvent<F> | RemoteFunction<F>;

export type DefinitionKind = "Event" | "Function" | "AsyncFunction";

export interface Definition<
	I extends string = string,
	K extends DefinitionKind = DefinitionKind,
	D extends Callback = Callback,
> {
	/** @deprecated @hidden */
	readonly _nominal_remoteDefinition: unique symbol;
}

export interface DefinitionMembers {
	readonly Id: string;
	readonly Kind: DefinitionKind;
	readonly Middlewares: ReadonlyArray<NetBuilderMiddleware>;
	readonly Checks: readonly [ReadonlyArray<Check<any>>, Check<any>];
	readonly Namespace: DefinitionNamespace;
}

export interface DefinitionNamespace {
	[namespaceProp: symbol]: unknown;
	[x: string]: Definition;
}

export interface RateLimiterOptions {
	readonly MaxPerMinute: number;
	readonly Listener?: (error: RateLimiterError) => void;
}

export interface RateLimiterError {
	readonly Executor: Player;
	readonly Message: string;
	readonly Requests: number;
	readonly Definition: LoggingDefinition;
}

export interface BuilderMembers {
	id: string;
	kind: DefinitionKind;
}

export interface LoggingDefinition {
	readonly Id: string;
	readonly Kind: DefinitionKind;
}

export type InferDefinitonId<R> = R extends Definition<infer I, never, never> ? I : never;

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
