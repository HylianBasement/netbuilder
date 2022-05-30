import {
	NetBuilderMiddleware,
	Definition,
	DefinitionKind,
	InferArguments,
	Check,
	Static,
} from "../definitions";

import { Timeout } from "../Util/constants";

interface AsyncFunctionOptions {
	Timeout: number;
}

/** Builder for RemoteFunction definitions. */
class DefinitionBuilder<
	I extends string,
	D extends (...args: any[]) => any = () => void,
	K extends DefinitionKind = "Event",
	O extends keyof DefinitionBuilder<I> = never,
> {
	private kind: DefinitionKind = "Event";

	private returnValueCheck = (value: unknown) => value === undefined;

	private timeout = Timeout.AsyncFunctionDefault;

	private parameterChecks = new Array<Check<any>>();

	private middlewareList = new Array<NetBuilderMiddleware>();

	public constructor(private readonly id: I) {}

	/** Transforms this function definition into an asynchronous function definition. */
	private Async(options?: AsyncFunctionOptions) {
		this.kind = "AsyncFunction";
		this.timeout = options ? options.Timeout : this.timeout;

		return this;
	}

	private toString() {
		return "NetBuilder.DefinitionBuilder";
	}

	/** Applies an ordered list of typecheckers for the callback parameters. */
	public SetArguments<T extends Array<Check<any>>>(...checks: T) {
		this.parameterChecks = checks;

		return this as unknown as Omit<
			DefinitionBuilder<I, (...args: InferArguments<T>) => ReturnType<D>, K, O | "SetArguments">,
			O | "SetArguments"
		>;
	}

	/** Applies a typecheck for the callback's return value. */
	public SetReturn<T extends Check<any>>(check: T) {
		this.kind = "Function";
		this.returnValueCheck = check;

		return this as unknown as Omit<
			DefinitionBuilder<I, (...args: Parameters<D>) => Static<T>, "Function", O | "SetReturn">,
			O | "SetReturn"
		> & {
			Async(
				options?: AsyncFunctionOptions,
			): Omit<
				DefinitionBuilder<
					I,
					(...args: Parameters<D>) => Static<T>,
					"AsyncFunction",
					O | "SetReturn"
				>,
				O | "SetReturn"
			>;
		};
	}

	/** Applies all the given middleware functions to the definition. */
	public UseMiddleware(middleware: NetBuilderMiddleware<D>[]) {
		this.middlewareList = middleware;

		return this as unknown as Omit<
			DefinitionBuilder<I, D, K, O | "UseMiddleware">,
			O | "UseMiddleware"
		>;
	}

	/** Generates a remote definition. */
	public Build() {
		const { id, kind, middlewareList, parameterChecks, returnValueCheck } = this;

		return {
			Id: id,
			Kind: kind,
			Middlewares: middlewareList,
			Checks: [parameterChecks, returnValueCheck],
			Timeout: this.timeout,
		} as unknown as Definition<I, K, D>;
	}
}

export = DefinitionBuilder;
