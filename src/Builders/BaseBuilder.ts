import { BuilderMembers, NetBuilderMiddleware } from "../definitions";

import netBuilderError from "../Util/netBuilderError";

abstract class BaseBuilder {
	/** Sets the definition's identifier. */
	public abstract Id(id: string): unknown;

	/** Generates a remote definition. */
	public abstract Build(id: string): unknown;

	/** Applies all the given middleware functions to the remote definition. */
	public abstract Middleware(middleware: NetBuilderMiddleware[]): unknown;

	protected middlewareList = new Array<NetBuilderMiddleware>();

	protected toString() {
		return `NetBuilder.${(this as unknown as { kind: string }).kind}Builder`;
	}

	protected checkRemote() {
		const { id, kind } = this as unknown as BuilderMembers;

		// eslint-disable-next-line roblox-ts/lua-truthiness
		if (!id) {
			netBuilderError(`You must provide a valid identifier for this ${kind}.`, 4);
		}
	}
}

export = BaseBuilder;
