import { NetBuilderMiddleware, Definition, InferStrictArguments, Check } from "../definitions";

import BaseBuilder from "./BaseBuilder";

/** Builder for RemoteEvent definitions. */
class EventBuilder<
	I extends string,
	D extends Callback = () => void,
	O extends keyof EventBuilder<I> = never,
> extends BaseBuilder {
	private kind = "Event";

	public constructor(private readonly id: I) {
		super();
	}

	public SetArguments<T extends Array<Check<any>>>(...checks: T) {
		this.parameterChecks = checks;

		return this as unknown as Omit<
			EventBuilder<I, (...args: InferStrictArguments<T>) => void, O | "SetArguments">,
			O | "SetArguments"
		>;
	}

	public WithMiddleware(middleware: NetBuilderMiddleware<(...args: Parameters<D>) => void>[]) {
		this.middlewareList = middleware;

		return this as unknown as Omit<EventBuilder<I, D, O | "WithMiddleware">, O | "WithMiddleware">;
	}

	public Build() {
		this.checkRemote();

		const { id, kind, middlewareList, parameterChecks } = this;

		return {
			Id: id,
			Kind: kind,
			Middlewares: middlewareList,
			Checks: [parameterChecks],
		} as unknown as Definition<I, "Event", D>;
	}
}

export = EventBuilder;
