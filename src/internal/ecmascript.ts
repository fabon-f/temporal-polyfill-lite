import { REQUIRED } from "./enum.ts";
import {
	invalidField,
	invalidNumber,
	invalidOptionsObject,
	missingField,
	notString,
} from "./errorMessages.ts";
import { createNullPrototypeObject, isObject } from "./object.ts";
import { throwRangeError, throwTypeError } from "./utils.ts";

/** `ToPrimitive` when `preferredType` is string */
export function toPrimitive(input: unknown): unknown {
	if (!isObject(input)) {
		return input;
	}
	const exoticToPrim = (input as { [Symbol.toPrimitive]: unknown })[Symbol.toPrimitive];
	if (exoticToPrim !== null && exoticToPrim !== undefined) {
		// `Date.call`: unbound `Function.prototype.call`
		// `callFunc.call(exoticToPrim, input, "string")` means `exoticToPrim.call(input, "string")`
		// throws `TypeError` if `exoticToPrim` isn't a function
		const result = (Date.call as (a: unknown, ...rest: unknown[]) => unknown).call(
			exoticToPrim,
			input,
			"string",
		);
		if (!isObject(result)) {
			return result;
		}
		throwTypeError();
	}
	// `Date.prototype[Symbol.toPrimitive]` do almost same things to `OrdinaryToPrimitive`
	return Date.prototype[Symbol.toPrimitive].call(input, "string");
}

/** `ToString` */
export function toString(value: unknown): string {
	return `${value}`;
}

/** `ToBoolean` */
export function toBoolean(value: unknown): boolean {
	return !!value;
}

// `Math.max` do the same thing to `ToNumber` AO
/** `ToNumber` */
export const toNumber: (arg: unknown) => number = Math.max as any;

/** `ToBigInt` */
export function toBigInt(arg: unknown): bigint {
	if (isObject(arg) || typeof arg === "number") {
		// When `arg` is an object and `toPrimitive(arg)` returns `number`, `ToBigInt` AO should raise `TypeError`,
		// therefore we can't simply call `BigInt` function.
		// `BigInt.asIntN` does almost the same thing to `ToBigInt` AO.
		// Note that this code path can return incorrect result
		// when `arg` is converted to BigInt larger than `2**53-1` bits,
		// which is unlikely to occur due to a limit of JavaScript engines.
		return BigInt.asIntN(2 ** 53 - 1, arg as any);
	}
	return BigInt(arg as any);
}

/** `ToIntegerIfIntegral` and alternative to `NumberToBigInt` */
export function toIntegerIfIntegral(arg: unknown): number {
	const num = toNumber(arg);
	if (!Number.isInteger(num)) {
		throwRangeError(invalidNumber(num));
	}
	return num + 0;
}

/** `ToIntegerWithTruncation` */
export function toIntegerWithTruncation(arg: unknown): number {
	const num = toNumber(arg);
	if (isNaN(num) || !isFinite(num)) {
		throwRangeError(invalidNumber(num));
	}
	return Math.trunc(num) + 0;
}

/** `ToPositiveIntegerWithTruncation` */
export function toPositiveIntegerWithTruncation(arg: unknown): number {
	const integer = toIntegerWithTruncation(arg);
	if (integer <= 0) {
		throwRangeError(invalidNumber(integer));
	}
	return integer;
}

/** `GetOptionsObject` */
export function getOptionsObject(options: unknown = createNullPrototypeObject({})): object {
	if (!isObject(options)) {
		throwTypeError(invalidOptionsObject);
	}
	return options;
}

/** `GetOption` */
export function getOption<V extends string | undefined>(
	options: object,
	property: string,
	values: V[],
	defaultValue: typeof REQUIRED | V,
): V {
	const rawValue = (options as Record<string, unknown>)[property];
	if (rawValue === undefined) {
		if (defaultValue === REQUIRED) {
			throwRangeError(missingField(property));
		}
		return defaultValue;
	}
	const value = toString(rawValue);
	if (!values.includes(value as any)) {
		throwRangeError(invalidField(property));
	}
	return value as V;
}

export function getRoundToOptionsObject(roundTo: unknown): object {
	if (roundTo === undefined) {
		throwTypeError();
	}
	return typeof roundTo === "string"
		? createNullPrototypeObject({ smallestUnit: roundTo })
		: getOptionsObject(roundTo);
}

export function validateString(value: unknown): asserts value is string {
	if (typeof value !== "string") {
		throwTypeError(notString(value));
	}
}
