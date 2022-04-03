import { BuilderMembers, NetBuilderMiddleware, Check } from "../definitions";

import netBuilderError from "../Util/netBuilderError";

abstract class BaseBuilder {
	/** Generates a remote definition. */
	public abstract Build(id: string): unknown;

	/** Applies an ordered list of type checkers for the callback parameters. */
	public abstract SetArguments(...checks: Array<Check<any>>): unknown;

	/** Applies all the given middleware functions to the definition. */
	public abstract WithMiddleware(middleware: NetBuilderMiddleware[]): unknown;

	protected parameterChecks = new Array<Check<any>>();

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
