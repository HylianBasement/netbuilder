/**
 * Basic logger for demonstration
 */
namespace Log {
	export function Error(message: unknown) {
		print(message);
	}

	export function Warn(...params: unknown[]) {
		print(...params);
	}
}

export = Log;
