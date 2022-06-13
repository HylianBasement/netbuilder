import { Result, unit } from "@rbxts/rust-classes";

import { TypeCheckingResult } from "../definitions";

interface ValidationEntry {
	Message: string;
	Validator: (value: any) => boolean;
}

/** @internal */
namespace Validation {
	export function Validate(value: unknown, isReceiver: boolean): TypeCheckingResult {
		if (isReceiver) {
			return Result.ok(unit());
		}

		const entries = validationMap.get(type(value));

		if (entries) {
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

	const validationMap = new ReadonlyMap<keyof CheckablePrimitives, ValidationEntry[]>([
		[
			"function",
			[
				{
					Message: "Functions cannot be passed.",
					Validator: fails,
				},
			],
		],
		[
			"thread",
			[
				{
					Message: "Threads cannot be passed.",
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
						"Please, consider serializing your metatables before sending them across server and client.",
					Validator: (tbl: object) => getmetatable(tbl) === undefined,
				},
				// Non-String Indices
				{
					Message:
						"Tables with non-string indices cannot be sent because those indices would be converted to a string.",
					Validator: (tbl: Map<defined, unknown>) => {
						for (const [k] of tbl) {
							if (type(k) !== "number" && type(k) !== "string") {
								return false;
							}
						}

						return true;
					},
				},
				// Mixed tables
				{
					Message:
						"Mixed tables cannot be sent, as only the data indexed by number will be passed.",
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

export = Validation;
