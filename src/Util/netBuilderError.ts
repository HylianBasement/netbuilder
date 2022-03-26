function netBuilderError(message?: unknown, level?: number): never {
	error(`[netbuilder] ${message}`, level);
}

export = netBuilderError;
