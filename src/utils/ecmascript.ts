// abstract operations from ECMA-262 spec

import { assertString, isObject } from "./check.ts";

/** `ToPrimitive` when `preferredType` is string, plus type assertion */
export function toPrimitiveAndAssertString(arg: unknown) {
	if (!isObject(arg)) {
		return arg;
	}
	const exoticToPrim = (arg as { [Symbol.toPrimitive]: unknown })[
		Symbol.toPrimitive
	];
	if (typeof exoticToPrim === "function") {
		return assertString(
			(Date.call as (a: unknown, ...rest: unknown[]) => unknown).call(
				exoticToPrim,
				arg,
				"string",
			),
		);
	}
	if (isObject(exoticToPrim) || exoticToPrim != null) {
		throw new TypeError();
	}
	return assertString(new Date()[Symbol.toPrimitive].call(arg, "string"));
}

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
export function toZeroPaddedDecimalString(n: number, minLength: number) {
	return n.toString().padStart(minLength, "0");
}

/** `GetOptionsObject` */
export function getOptionsObject(options: unknown) {
	if (options === undefined) {
		return Object.create(null);
	}
	if (isObject(options)) {
		return options;
	}
	throw new TypeError();
}

/** `GetOption` */
export function getOption<T>(
	options: object,
	property: string,
	values: T[],
	defaultValue?: T,
) {
	const v = (options as Record<string, unknown>)[property];
	if (v === undefined) {
		if (defaultValue === undefined) {
			throw new RangeError();
		}
		return defaultValue;
	}
	const option = String(v);
	if (!values.includes(option as any)) {
		throw new RangeError();
	}
	return option as T;
}
