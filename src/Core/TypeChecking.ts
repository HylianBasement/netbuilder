import { Iterator, Option, Result, unit } from "@rbxts/rust-classes";

import { Check, TypeCheckingResult } from "../definitions";

import { IS_SERVER } from "../Util/constants";

import Validator from "./Validator";

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
				const validationResult = Validator.Validate(value, isReceiver);

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
		return Validator.Validate(value, true).andWith(() => {
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
}

export = TypeChecking;
