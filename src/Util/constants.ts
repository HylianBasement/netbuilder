import { NetBuilderConfiguration } from "../definitions";

const RunService = game.GetService("RunService");

export const DEFAULT_CONFIGURATION: NetBuilderConfiguration = {
	Label: "netbuilder",
	Debug: false,
	SuppressWarnings: false,
	PreGeneration: false,
	CacheFunctions: false,
};

export const IS_RUNNING = RunService.IsRunning();

export const IS_SERVER = RunService.IsServer() || !IS_RUNNING;

export const IS_CLIENT = RunService.IsClient() && IS_RUNNING;

export const enum Timeout {
	AsyncFunctionMin = 10,
	AsyncFunctionDefault = 30,
	Middleware = 45,
	Remote = 60,
	RateLimiter = 60,
}
