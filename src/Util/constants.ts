const RunService = game.GetService("RunService");

export const __ = {};

export const IS_RUNNING = RunService.IsRunning();

export const IS_SERVER = RunService.IsServer() || !IS_RUNNING;

export const IS_CLIENT = RunService.IsClient() && IS_RUNNING;
