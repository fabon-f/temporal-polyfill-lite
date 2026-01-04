export function isObject(obj: unknown): obj is object {
	return typeof obj === "object" && obj !== null;
}

export function pickObject<O extends object, K extends keyof O>(object: O, keys: K[]): Pick<O, K>;
export function pickObject(object: object, keys: string[]) {
	const result = Object.create(null);
	for (const key of keys) {
		// @ts-expect-error
		result[key] = object[key];
	}
	return result;
}
