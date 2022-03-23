import { NetBuilderMiddleware, RemoteDefinition } from "../definitions";
import BaseBuilder from "./BaseBuilder";

/** Builder for RemoteEvent definitions. */
class EventBuilder<
	D extends Array<any> = [],
	I extends string = never,
	O extends keyof EventBuilder = never,
> extends BaseBuilder {
	private id!: string;

	private kind = "Event";

	public Id<S extends string>(id: S) {
		this.id = id;

		return this as unknown as Omit<EventBuilder<D, S, O | "Id">, O | "Id">;
	}

	public Middleware(middleware: NetBuilderMiddleware[]) {
		this.middlewareList = middleware;

		return this as unknown as Omit<EventBuilder<D, I, O | "Middleware">, O | "Middleware">;
	}

	public Build() {
		this.checkRemote();

		const { id: Id, kind: Kind, middlewareList: Middlewares } = this;

		return {
			Id,
			Kind,
			Middlewares,
		} as unknown as RemoteDefinition<I, "Event", (...args: D) => void>;
	}
}

export = EventBuilder;
