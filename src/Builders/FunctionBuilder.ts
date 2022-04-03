import { NetBuilderMiddleware, Definition, InferStrictArguments, Check, Static } from "../definitions";

import BaseBuilder from "./BaseBuilder";

/** Builder for RemoteFunction definitions. */
class FunctionBuilder<
	I extends string,
	D extends (...args: any[]) => any = () => defined,
	K extends "Function" | "AsyncFunction" = "Function",
	O extends keyof FunctionBuilder<I> = never,
> extends BaseBuilder {
	private kind = "Function";

	private returnValueCheck = (value: unknown) => value !== undefined;

	protected parameterChecks = new Array<Check<any>>();

	public constructor(private readonly id: I) {
		super();
	}

	public SetArguments<T extends Array<Check<any>>>(...checks: T) {
		this.parameterChecks = checks;

		return this as unknown as Omit<
			FunctionBuilder<
				I,
				(...args: InferStrictArguments<T>) => ReturnType<D>,
				K,
				O | "SetArguments"
			>,
			O | "SetArguments"
		>;
	}

	/** Applies a type check for the callback's return value. */
	public SetReturn<T extends Check<any>>(check: T) {
		this.returnValueCheck = check;

		return this as unknown as Omit<
			FunctionBuilder<I, (...args: Parameters<D>) => Static<T>, K, O | "SetReturn">,
			O | "SetReturn"
		>;
	}

	public WithMiddleware(middleware: NetBuilderMiddleware<D>[]) {
		this.middlewareList = middleware;

		return this as unknown as Omit<
			FunctionBuilder<I, D, K, O | "WithMiddleware">,
			O | "WithMiddleware"
		>;
	}

	/** Transforms this function definition into an asynchronous function definition. */
	public Async() {
		this.kind = "AsyncFunction";

		return this as unknown as Omit<FunctionBuilder<I, D, "AsyncFunction", O | "Async">, O | "Async">;
	}

	public Build() {
		this.checkRemote();

		const { id, kind, middlewareList, parameterChecks, returnValueCheck } = this;

		return {
			Id: id,
			Kind: kind,
			Middlewares: middlewareList,
			Checks: [parameterChecks, returnValueCheck],
		} as unknown as Definition<I, K, D>;
	}
}

export = FunctionBuilder;
