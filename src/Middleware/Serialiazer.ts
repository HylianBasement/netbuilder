import { Dispatcher, LengthEquals, ParametersAsReturnType } from "../definitions";

import MiddlewareBuilder from "../Builders/MiddlewareBuilder";

// So that the array can have a fixed size
type Anyify<T extends Array<any>, U extends Array<any> = []> = LengthEquals<T, U> extends true
	? U
	: Anyify<T, [...U, any]>;

type InReturn<R> = (value: never) => R;

interface SerializerType {
	Parameters: Dispatcher<
		(...parameters: Array<any>) => Array<defined>,
		(...values: Array<any>) => Array<defined>
	>;
	Return: Dispatcher<Callback, Callback>;
}

type SerializerOptions<
	F extends Callback,
	InParameters extends Callback = (...params: Parameters<F>) => Anyify<Parameters<F>>,
	OutParameters extends Callback = (
		...values: ReturnType<InParameters>
	) => ParametersAsReturnType<Parameters<F>>,
	OutReturn extends Callback = (returnValue: ReturnType<F>) => unknown,
> = ReturnType<F> extends void
	? {
			Parameters: Dispatcher<InParameters, OutParameters>;
	  }
	:
			| {
					Parameters: Dispatcher<InParameters, OutParameters>;
			  }
			| {
					Return: Dispatcher<InReturn<ReturnType<F>>, OutReturn>;
			  }
			| {
					Parameters: Dispatcher<InParameters, OutParameters>;
					Return: Dispatcher<InReturn<ReturnType<F>>, OutReturn>;
			  };

/** (De)serializes parameters and return values set in its configuration. */
function Serializer<F extends Callback>(options: SerializerOptions<F>) {
	const opt = {
		Return: { In: (v: defined) => v, Out: (v: defined) => v },
		...options,
	} as SerializerType;

	const { Parameters, Return } = opt;

	return new MiddlewareBuilder()
		.Label("Serializer")
		.Sender<F>((_, processNext) => (_, ...args) => {
			const newArgs = Parameters.Send(...args);

			processNext(
				(args as defined[]).map((arg, i) => (newArgs[i] ? newArgs[i] : arg)),
				(returnValue) => (returnValue ? Return.Send(returnValue) : undefined),
			);
		})
		.Receiver((_, processNext) => (_, ...args) => {
			const newArgs = Parameters.Recv(...args);

			processNext(
				(args as defined[]).map((arg, i) => (newArgs[i] ? newArgs[i] : arg)),
				(returnValue) => (returnValue ? Return.Recv(returnValue) : undefined),
			);
		})
		.Build();
}

export = Serializer;
