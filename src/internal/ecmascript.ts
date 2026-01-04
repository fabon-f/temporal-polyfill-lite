import { isObject } from "./object.ts";

/** `ToString` */
export function toString(value: unknown): string {
	if (typeof value === "symbol") {
		throw new TypeError();
	}
	return String(value);
}

/** `ToBoolean` */
export function toBoolean(value: unknown): boolean {
	return Boolean(value);
}

/** `ToNumber` */
export function toNumber(arg: unknown): number {
	if (typeof arg === "bigint") {
		throw new TypeError();
	}
	return Number(arg);
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

/** `GetOptionsObject` */
export function getOptionsObject(options: unknown = Object.create(null)) {
	if (!isObject(options)) {
		throw new TypeError();
	}
	return options;
}

/** `GetOption` */
export function getOption<V extends string>(
	options: object,
	property: string,
	values: V[],
	defaultValue?: V,
): V {
	const rawValue = (options as Record<string, unknown>)[property];
	if (rawValue === undefined) {
		if (defaultValue === undefined) {
			throw new RangeError();
		}
		return defaultValue;
	}
	const value = toString(rawValue);
	if (!values.includes(value as any)) {
		throw new RangeError();
	}
	return value as V;
}
