function awaitPromiseDeep<T>(promise: T | Promise<T>): T {
	const value = Promise.is(promise) ? promise.expect() : promise;
	return Promise.is(value) ? awaitPromiseDeep<T>(value as T) : value;
}

export = awaitPromiseDeep;
