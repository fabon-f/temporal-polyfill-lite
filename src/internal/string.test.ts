import { expect, test } from "vitest";
import { asciiLowerCase } from "./string.ts";

test("asciiLowerCase", () => {
	expect(asciiLowerCase("AAxAAxAA")).toEqual("aaxaaxaa");
	expect(asciiLowerCase("ÅAА")).toEqual(asciiLowerCase("ÅaА"));
});
