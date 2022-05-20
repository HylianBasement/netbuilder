import { DEFAULT_CONFIGURATION } from "./constants";

export = (...params: unknown[]) =>
	["[" + DEFAULT_CONFIGURATION.Label + "]", ...params] as LuaTuple<[string, ...unknown[]]>;
