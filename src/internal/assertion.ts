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

export function assertUnitIndex(
	index: number,
	message?: string,
): asserts index is 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
	assert([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes(index), message);
}
