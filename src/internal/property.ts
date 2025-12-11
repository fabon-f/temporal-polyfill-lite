function makePropertyNonEnumerable(object: object, key: string | symbol) {
	Object.defineProperty(object, key, {
		enumerable: false,
	});
}

export function makePropertiesNonEnumerable(object: object) {
	for (const key of Object.keys(object)) {
		makePropertyNonEnumerable(object, key);
	}
}

export function defineNonEnumerableProperty(object: object, key: string | symbol, value: unknown) {
	// @ts-expect-error
	object[key] = value;
	makePropertyNonEnumerable(object, key);
}

export function defineStringTag(obj: object, tag: string) {
	Object.defineProperty(obj, Symbol.toStringTag, {
		value: tag,
		configurable: true,
	});
}
