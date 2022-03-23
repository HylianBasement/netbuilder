interface PromiseConstructor {
	retryWithDelay: <P extends Array<any>, T>(
		callback: (...args: P) => Promise<T>,
		times: number,
		seconds: number,
		...args: P
	) => Promise<T>;
}
