export function isObject(obj: unknown): obj is object {
	return (typeof obj === "object" || typeof obj === "function") && obj !== null;
}

export function createNullPrototypeObject<O = {}>(obj?: O): O {
	return Object.assign(Object.create(null), obj);
}
