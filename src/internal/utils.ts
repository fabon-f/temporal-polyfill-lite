import { assert } from "./assertion.ts";
import { invalidMethodCall } from "./errorMessages.ts";

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

export function getInternalSlotOrThrow<C>(slots: WeakMap<any, C>, instance: unknown): C {
	const slot = slots.get(instance);
	if (!slot) {
		throwTypeError(invalidMethodCall);
	}
	return slot;
}
