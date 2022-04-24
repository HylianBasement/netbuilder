import { Iterator, Option, Result, unit } from "@rbxts/rust-classes";

import { Check } from "../definitions";

import { IS_SERVER } from "../Util/constants";

interface Validation {
	Message: string;
	Validator: (value: any) => boolean;
}

type TypeCheckingResult = Result<defined, string>;

/** @internal */
namespace TypeChecking {
	export function Parameters(
		args: unknown[],
		checks: ReadonlyArray<Check<any>>,
		isReceiver: boolean,
	): TypeCheckingResult {
		let i = 0;

		return Iterator.fromItems(...checks)
			.findMap<TypeCheckingResult>((check) => {
				const value = args[i++];
				const validationResult = validate(value, isReceiver);

				if (validationResult.isErr()) {
					return Option.some(validationResult);
				}

				if (IS_SERVER) {
					const [result, message] = check(value) as unknown as LuaTuple<[boolean, string?]>;

					if (result === false) {
						return Option.some(
							Result.err(format(`Parameter #${i} has failed typechecking`, message)),
						);
					}
				}

				return Option.none();
			})
			.unwrapOr(Result.ok(unit()));
	}

	export function ReturnValue(value: unknown, check: Check<any>): TypeCheckingResult {
		return validate(value, true).andWith(() => {
			if (IS_SERVER) {
				const [result, message] = check(value) as unknown as LuaTuple<[boolean, string?]>;

				return result === true
					? Result.ok(unit())
					: Result.err(format("Return value has failed typechecking", message));
			}

			return Result.ok(unit());
		});
	}

	function format(title: string, message?: string) {
		return `${title}${message ? ": " + message : "."}`;
	}

	const validationMap = new ReadonlyMap<keyof CheckablePrimitives, Validation[]>([
		[
			"function",
			[
				{
					Message: "Functions cannot be replicated across server and client.",
					Validator: fails,
				},
			],
		],
		[
			"thread",
			[
				{
					Message: "Threads cannot be replicated across server and client.",
					Validator: fails,
				},
			],
		],
		[
			"table",
			[
				// Metatables
				{
					Message:
						"Please, consider serializing your tables before sending them across server and client.",
					Validator: (tbl: object) => getmetatable(tbl) === undefined,
				},
				// Mixed tables
				{
					Message: "Replicating mixed tables across server and client is not supported.",
					Validator: (tbl: Map<defined, unknown>) => {
						const keyTypes = new Set<keyof CheckablePrimitives>();

						for (const [k] of tbl) {
							keyTypes.add(type(k));
						}

						return keyTypes.size() < 2;
					},
				},
			],
		],
	]);

	function fails() {
		return false;
	}

	function validate(value: unknown, isReceiver: boolean): TypeCheckingResult {
		if (isReceiver) {
			return Result.ok(unit());
		}

		const valueType = type(value);

		if (validationMap.has(valueType)) {
			const entries = validationMap.get(valueType)!;

			for (const { Validator, Message } of entries) {
				if (Validator(value) === false) {
					return Result.err(Message);
				}
			}
		}

		return Result.ok(unit());
	}
}

export = TypeChecking;
