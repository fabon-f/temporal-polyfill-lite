export function isObject(item: unknown) {
	return (
		(typeof item === "object" || typeof item === "function") && item !== null
	);
}

export function assertString(item: unknown): string {
	if (typeof item !== "string") {
		throw new TypeError();
	}
	return item;
}
