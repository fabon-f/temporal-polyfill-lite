import { expect, test } from "vitest";
import { asciiCapitalize, asciiLowerCase } from "./string.ts";

test("asciiLowerCase", () => {
	expect(asciiLowerCase("AAxAAxAA")).toEqual("aaxaaxaa");
	expect(asciiLowerCase("ÅAА")).toEqual(asciiLowerCase("ÅaА"));
});

test("asciiCapitalize", () => {
	expect(asciiCapitalize("aaAX")).toEqual("AaAX");
	expect(asciiCapitalize("åaz")).toEqual("åaz");
});
