import { Result } from "@rbxts/rust-classes";

import ServerDispatcher from "./Boundary/ServerDispatcher";
import ClientDispatcher from "./Boundary/ClientDispatcher";

export type ArrayLength<T extends Array<any> | ReadonlyArray<any>> = (T & { length: number })["length"];

export type LengthEquals<
	A extends Array<any> | ReadonlyArray<any>,
	B extends Array<any> | ReadonlyArray<any>,
> = ArrayLength<A> extends ArrayLength<B> ? true : false;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ThreadResult = Result<[Array<unknown>, (r: unknown) => unknown], string>;

export type UnwrapAsyncReturnType<T extends Callback> = ReturnType<T> extends Promise<infer U>
	? U extends Promise<any>
		? UnwrapAsyncReturnType<() => U>
		: U
	: ReturnType<T>;

export interface SerializedObject<T extends object = object> {
	readonly ClassName: string;
	readonly Value: T;
}

export type SerializableClassInstance =
	| { Serialize(): SerializedObject }
	| { serialize(): SerializedObject };

export class Serializable<T extends object> {
	public static readonly ClassName: string;
	public static deserialize(serialized: object): SerializableClassInstance;
	public Serialize(): SerializedObject<T>;
}

export interface SerializableClass {
	new (...args: Array<any>): SerializableClassInstance;
	readonly ClassName: string;
	deserialize(serialized: object): SerializableClassInstance;
}

export type NetBuilderResult<T> =
	| {
			Result: "Ok";
			Value: T;
	  }
	| {
			Result: "Err";
			Message: string;
	  };

export interface NetBuilderConfiguration {
	RootInstance?: Instance | ((replicatedStorage: ReplicatedStorage) => Instance);
	SuppressWarnings?: boolean;
}

export type NetBuilderMiddleware = Dispatcher<MiddlewareCallback, MiddlewareCallback> & {
	GlobalEnabled: boolean;
	Label: string;
};

export type MiddlewareCallback = (
	definition: RemoteDefinitionMembers,
	process: (params: unknown[], returnValue: (value: defined) => unknown) => never,
	drop: (reason: string) => never,
) => (player: Player, ...params: unknown[]) => void;

export type Remote<F extends Callback = Callback> = RemoteEvent<F> | RemoteFunction<F>;

export type RemoteKind = "Event" | "Function";

export interface RemoteDefinition<
	I extends string = string,
	K extends RemoteKind = RemoteKind,
	D extends Callback = Callback,
> {
	/** @deprecated @hidden */
	readonly _nominal_remoteDefinition: unique symbol;
}

export interface RemoteDefinitionMembers {
	readonly Id: string;
	readonly Kind: RemoteKind;
	readonly Middlewares: ReadonlyArray<NetBuilderMiddleware>;
	readonly Namespace: RemoteDefinitionNamespace;
}

export interface RemoteDefinitionNamespace {
	[namespaceProp: symbol]: unknown;
	[x: string]: RemoteDefinition;
}

export type RemoteManager = ServerDispatcher<Callback> | ClientDispatcher<Callback>;

export interface RateLimiterOptions {
	readonly MaxRequestsPerMinute: number;
	readonly Listener?: (error: RateLimiterError) => void;
}

export interface RateLimiterError {
	readonly Executor: Player;
	readonly Message: string;
	readonly Requests: number;
	readonly Definition: LoggingRemoteDefinition;
}

export interface BuilderMembers {
	id: string;
	kind: RemoteKind;
}

export interface LoggingRemoteDefinition {
	readonly Id: string;
	readonly Kind: RemoteKind;
}

export type GetRemoteId<R> = R extends RemoteDefinition<infer I, never, never> ? I : never;

export type GetRemoteKind<R> = R extends RemoteDefinition<never, infer K, never> ? K : never;

export type GetRemoteDefinition<R> = R extends RemoteDefinition<never, never, infer D> ? D : never;

export type ParametersAsReturnType<
	P extends Array<any>,
	I extends ReadonlyArray<defined | void> = [],
	A extends ReadonlyArray<defined | void> = never,
> = LengthEquals<I, P> extends true
	? A
	: ParametersAsReturnType<P, [...I, P[ArrayLength<I>] | void], A | [...I, P[ArrayLength<I>] | void]>;

export interface Dispatcher<S, R> {
	Send: S;
	Recv: R;
}
