import { expect, test } from "vitest";
import { truncateDigits } from "./math.ts";

test("truncateDigits with small integers", () => {
	expect(truncateDigits(100000, 6)).toEqual(0);
	expect(truncateDigits(-100000, 6)).toEqual(0);
});

test("truncateDigits with unsafe integers", () => {
	expect(truncateDigits(9007199254740990926258176, 9)).toEqual(9007199254740990);
	expect(truncateDigits(-9007199254740990926258176, 9)).toEqual(-9007199254740990);
});
