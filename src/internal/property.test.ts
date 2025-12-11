import { expect, test } from "vitest";
import {
	defineNonEnumerableProperty,
	defineStringTag,
	makePropertiesNonEnumerable,
} from "./property.ts";

test("defineNonEnumerableProperty", () => {
	const object = {};
	defineNonEnumerableProperty(object, "foo", 0);
	expect(Object.getOwnPropertyDescriptor(object, "foo")).toEqual({
		writable: true,
		enumerable: false,
		configurable: true,
		value: 0,
	});
});

test("defineStringTag", () => {
	const object = {};
	defineStringTag(object, "foo");
	expect(Object.getOwnPropertyDescriptor(object, Symbol.toStringTag)).toEqual({
		writable: false,
		enumerable: false,
		configurable: true,
		value: "foo",
	});
});

test("makePropertiesNonEnumerable", () => {
	const object = {
		foo: 0,
		bar: 1,
	};
	makePropertiesNonEnumerable(object);
	expect(Object.getOwnPropertyDescriptors(object)).toEqual({
		foo: {
			writable: true,
			enumerable: false,
			configurable: true,
			value: 0,
		},
		bar: {
			writable: true,
			enumerable: false,
			configurable: true,
			value: 1,
		},
	});
});
