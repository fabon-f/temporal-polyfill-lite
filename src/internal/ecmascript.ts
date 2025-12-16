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

/** `ToIntegerIfIntegral` */
export function toIntegerIfIntegral(arg: unknown): number {
	const num = toNumber(arg);
	if (!Number.isInteger(num)) {
		throw new RangeError();
	}
	return num + 0;
}
