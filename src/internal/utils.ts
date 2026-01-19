export function mapUnlessUndefined<T, R>(
	value: T | undefined,
	func: (value: T) => R,
): R | undefined {
	return value === undefined ? undefined : func(value);
}

export function notImplementedYet(): never {
	throw new Error("Not implemented yet");
}
