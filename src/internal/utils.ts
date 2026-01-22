export function mapUnlessUndefined<T, R>(
	value: T | undefined,
	func: (value: T) => R,
): R | undefined {
	return value === undefined ? undefined : func(value);
}
