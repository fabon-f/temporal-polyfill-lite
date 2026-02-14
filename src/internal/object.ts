export function isObject(obj: unknown): obj is object {
	return (typeof obj === "object" || typeof obj === "function") && obj !== null;
}

export function pickObject<O extends object, K extends keyof O>(object: O, keys: K[]): Pick<O, K> {
	const result = createNullPrototypeObject({}) as O;
	for (const key of keys) {
		result[key] = object[key];
	}
	return result;
}

export function createNullPrototypeObject<O>(obj: O): O {
	return Object.assign(Object.create(null), obj);
}
