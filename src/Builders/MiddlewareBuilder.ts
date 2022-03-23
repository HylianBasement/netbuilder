import { NetBuilderMiddleware, MiddlewareCallback } from "../definitions";

const middlewareFn: MiddlewareCallback =
	(_remote, processNext) =>
	(_player, ...args) => {
		processNext(args, (r) => r);
	};

/** Builder for middlewares. Senders are optional. */
class MiddlewareBuilder<I = never, O = never, X extends keyof MiddlewareBuilder = never> {
	private label = "Unknown";

	private globalEnabled = false;

	private senderCallback = middlewareFn;

	private receiverCallback = middlewareFn;

	public EnableGlobal() {
		this.globalEnabled = true;

		return this as unknown as Omit<MiddlewareBuilder<I, O, X | "EnableGlobal">, X | "EnableGlobal">;
	}

	/** Creates a label for the middleware, so that it can eliminate duplicates and make debugging easier.
	 *
	 * Default is "Unknown".
	 */
	public Label(label: string) {
		this.label = label;

		return this as unknown as Omit<MiddlewareBuilder<I, O, X | "Label">, X | "Label">;
	}

	/** The checker that is executed when sending requests. */
	public Sender<F extends Callback>(callback: MiddlewareCallback) {
		(this.senderCallback as unknown) = callback;

		return this as unknown as Omit<MiddlewareBuilder<F, O, X | "Sender">, X | "Sender">;
	}

	/** The checker that is executed when receiving requests. */
	public Receiver<F extends Callback, P = I>(callback: MiddlewareCallback) {
		(this.receiverCallback as unknown) = callback;

		return this as unknown as Omit<MiddlewareBuilder<P, F, X | "Receiver">, X | "Receiver">;
	}

	/** Generates a middleware. */
	public Build() {
		const { senderCallback, receiverCallback } = this;

		return {
			Send: senderCallback,
			Recv: receiverCallback,
			GlobalEnabled: this.globalEnabled,
			Label: this.label,
		} as NetBuilderMiddleware;
	}
}

export = MiddlewareBuilder;
