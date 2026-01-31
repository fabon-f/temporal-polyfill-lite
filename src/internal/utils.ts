import { assert } from "./assertion.ts";

export function mapUnlessUndefined<T, R>(
	value: T | undefined,
	func: (value: T) => R,
): R | undefined {
	return value === undefined ? undefined : func(value);
}

export function withArray(newArray: (number | undefined)[], originalArray: number[]): number[] {
	assert(newArray.length === originalArray.length);
	return newArray.map((v, i) => v ?? originalArray[i]!);
}

export function throwRangeError(message?: string): never {
	throw new RangeError(message);
}

export function throwTypeError(message?: string): never {
	throw new TypeError(message);
}
