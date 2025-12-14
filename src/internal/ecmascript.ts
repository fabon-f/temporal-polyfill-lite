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
