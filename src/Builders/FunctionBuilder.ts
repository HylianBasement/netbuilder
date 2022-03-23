import { NetBuilderMiddleware, RemoteDefinition } from "../definitions";
import BaseBuilder from "./BaseBuilder";

/** Builder for RemoteFunction definitions. */
class FunctionBuilder<
	D extends (...args: any[]) => defined = () => defined,
	I extends string = never,
	O extends keyof FunctionBuilder = never,
> extends BaseBuilder {
	private id!: string;

	private kind = "Function";

	public Id<S extends string>(id: S) {
		this.id = id;

		return this as unknown as Omit<FunctionBuilder<D, S, O | "Id">, O | "Id">;
	}

	public Middleware(middleware: NetBuilderMiddleware[]) {
		this.middlewareList = middleware;

		return this as unknown as Omit<FunctionBuilder<D, I, O | "Middleware">, O | "Middleware">;
	}

	public Build() {
		this.checkRemote();

		const { id: Id, kind: Kind, middlewareList: Middlewares } = this;

		return {
			Id,
			Kind,
			Middlewares,
		} as unknown as RemoteDefinition<I, "Function", D>;
	}
}

export = FunctionBuilder;
