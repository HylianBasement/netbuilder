export = (dict: { [x: string]: unknown } | Map<string, unknown>) =>
	dict as unknown as { [x: symbol]: defined };
