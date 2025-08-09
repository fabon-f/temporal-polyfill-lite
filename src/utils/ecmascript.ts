// abstract operations from ECMA-262 spec

import { isObject } from "./check.ts";

/** `ToNumber` */
export function toNumber(arg: unknown): number {
	if (typeof arg === "bigint") {
		throw new TypeError();
	}
	return Number(arg);
}

/** `ToIntegerIfIntegral` */
export function toIntegerIfIntegral(arg: unknown): number {
	const num = toNumber(arg);
	if (!Number.isInteger(num)) {
		throw new RangeError();
	}
	return num + 0;
}

/** `ToIntegerWithTruncation` */
export function toIntegerWithTruncation(arg: unknown): number {
	const num = toNumber(arg);
	if (isNaN(num) || !isFinite(num)) {
		throw new RangeError();
	}
	return Math.trunc(num + 0);
}

/** `ToBigInt` */
export function toBigInt(arg: unknown) {
	if (isObject(arg)) {
		// `BigInt.asIntN` do almost the same thing to `ToBigInt` AO.
		// However, this code path returns incorrect result
		// when `arg` is converted to BigInt larger than `2**53-1` bits,
		// which is unlikely to occur due to a limit of JavaScript engines.
		return BigInt.asIntN(2 ** 53 - 1, arg as any);
	}
	if (typeof arg === "number") {
		throw new TypeError();
	}
	return BigInt(arg as any);
}

/** alternative to `RequireInternalSlot` */
export function getInternalSlotOrThrow<C extends WeakKey, S>(
	slot: WeakMap<C, S>,
	object: C,
) {
	const value = slot.get(object);
	if (value === undefined) {
		throw new TypeError();
	}
	return value;
}

/** `ToZeroPaddedDecimalString` */
export const toZeroPaddedDecimalString = (n: number, minLength: number) =>
	n.toString().padStart(minLength, "0");
