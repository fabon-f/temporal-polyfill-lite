// abstract operations from ECMA-262 spec

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
