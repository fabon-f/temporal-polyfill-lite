export function rewritePropertyDescriptorsForProperties(obj: object) {
	for (const [k, v] of Object.entries(obj)) {
		Object.defineProperty(obj, k, {
			value: v,
			configurable: true,
			writable: true,
		});
	}
}

export function defineStringTag(obj: object, tag: string) {
	Object.defineProperty(obj, Symbol.toStringTag, {
		value: tag,
		configurable: true,
	});
}
