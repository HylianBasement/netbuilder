import MiddlewareBuilder from "../Builders/MiddlewareBuilder";
import { ParametersAsReturnType } from "../definitions";

/** Applies a change to each parameter before the request is sent. */
function Mediator<P extends Array<any>>(callback: (...values: P) => ParametersAsReturnType<P>) {
	return new MiddlewareBuilder()
		.Label("Mediator")
		.Sender((_, processNext) => (_, ...args) => {
			const newArgs = callback(...(args as P)) as defined[];

			processNext(
				(args as defined[]).map((arg, i) => (newArgs[i] ? newArgs[i] : arg) as defined),
				(r) => r,
			);
		})
		.Build();
}

export = Mediator;
