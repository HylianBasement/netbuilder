import { RunService } from "@rbxts/services";
import { NetBuilderMiddleware, MiddlewareCallback } from "../definitions";

import netBuilderError from "../Util/netBuilderError";

/** Builder for middlewares that only executes on the server. */
class ServerMiddlewareBuilder<I = never, O = never, X extends keyof ServerMiddlewareBuilder = never> {
	private label = "Unknown";

	private globalEnabled = false;

	private callback!: MiddlewareCallback;

	public EnableGlobal() {
		this.globalEnabled = true;

		return this as unknown as Omit<
			ServerMiddlewareBuilder<I, O, X | "EnableGlobal">,
			X | "EnableGlobal"
		>;
	}

	/** Creates a label for the middleware, so that it can eliminate duplicates and make debugging easier.
	 *
	 * Default is "Unknown".
	 */
	public Label(label: string) {
		this.label = label;

		return this as unknown as Omit<ServerMiddlewareBuilder<I, O, X | "Label">, X | "Label">;
	}

	/** The checker that is executed when sending and receiving server requests. */
	public SetCallback<F extends Callback>(callback: MiddlewareCallback) {
		(this.callback as unknown) = callback;

		return this as unknown as Omit<
			ServerMiddlewareBuilder<F, O, X | "SetCallback">,
			X | "SetCallback"
		>;
	}

	/** Generates a server middleware. */
	public Build() {
		const { callback } = this;

		if (!callback) {
			netBuilderError("A valid callback must be provided for the server middleware.", 3);
		}

		const middlewareFn: MiddlewareCallback =
			(definition, processNext, drop) =>
			(player, ...args) => {
				if (player && RunService.IsServer()) {
					callback(definition, processNext, drop)(player, ...args);
				} else {
					processNext(args, (r) => r);
				}
			};

		return {
			Send: middlewareFn,
			Recv: middlewareFn,
			GlobalEnabled: this.globalEnabled,
			Label: this.label,
		} as NetBuilderMiddleware;
	}
}

export = ServerMiddlewareBuilder;
