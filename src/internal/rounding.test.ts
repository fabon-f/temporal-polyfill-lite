import { expect, test } from "vitest";
import { roundHalfEven } from "./rounding.ts";

test("roundHalfEven", () => {
	expect(roundHalfEven(0.5)).toEqual(0);
	expect(roundHalfEven(1.5)).toEqual(2);
	expect(roundHalfEven(-0.5)).toEqual(0);
	expect(roundHalfEven(-1.5)).toEqual(-2);
});
