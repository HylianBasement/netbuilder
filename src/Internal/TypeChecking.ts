import { Check } from "../definitions";

type TypeCheckingResult =
	| LuaTuple<[failed: true, errMessage: string]>
	| LuaTuple<[failed: false, errMessage: undefined]>;

namespace TypeChecking {
	export function Parameters(args: unknown[], checks: ReadonlyArray<Check<any>>) {
		let errMessage!: string;

		const failed = checks.some((check, i) => {
			const [result, message] = check(args[i]) as unknown as LuaTuple<[boolean, string?]>;

			if (result === false) {
				errMessage = `Parameter #${i + 1} ${message ?? "has failed typechecking."}`;
			}

			return !result;
		});

		return [failed, errMessage] as TypeCheckingResult;
	}

	export function ReturnValue(value: unknown, check: Check<any>) {
		const [result, message = "Return value has failed typechecking."] = check(
			value,
		) as unknown as LuaTuple<[boolean, string]>;

		return [!result, result ? undefined : message] as unknown as TypeCheckingResult;
	}
}

export = TypeChecking;
