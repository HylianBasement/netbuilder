import { Result, unit } from "@rbxts/rust-classes";

import { TypeCheckingResult } from "../definitions";

interface Validation {
	Message: string;
	Validator: (value: any) => boolean;
}

/** @internal */
namespace Validator {
	export function Validate(value: unknown, isReceiver: boolean): TypeCheckingResult {
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

	function fails() {
		return false;
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
}

export = Validator;
