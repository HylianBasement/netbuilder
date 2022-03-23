function unwrapPromiseDeep<T>(promise: T | Promise<T>): T {
	const value = Promise.is(promise) ? promise.expect() : promise;
	return Promise.is(value) ? unwrapPromiseDeep<T>(value as T) : value;
}

export = unwrapPromiseDeep;
