export function assert(condition: boolean, message?: string): asserts condition {
	if (!condition) {
		throw new Error(message || "assertion error");
	}
}

export function assertNotUndefined<T>(value: T | undefined, message?: string): asserts value is T {
	assert(value !== undefined, message);
}

export function assertUnreachable(_: never, message?: string): never {
	throw new Error(message);
}
