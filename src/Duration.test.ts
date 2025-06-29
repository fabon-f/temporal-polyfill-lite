import { expect, test } from "vitest";
import { isDurationSignValid } from "./Duration.js";

test("isDurationSignValid", () => {
	expect(isDurationSignValid([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])).toEqual(true);
	expect(isDurationSignValid([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1])).toEqual(
		true,
	);
	expect(isDurationSignValid([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toEqual(true);
	expect(isDurationSignValid([-1, 1, 1, 1, 1, 1, 1, 1, 1, 1])).toEqual(false);
	expect(isDurationSignValid([0, 0, 0, 0, 0, 0, 0, 0, 0, 1])).toEqual(true);
	expect(isDurationSignValid([-1, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toEqual(true);
	expect(isDurationSignValid([-1, 0, 1, 1, 1, 1, 1, 1, 1, 1])).toEqual(false);
});
