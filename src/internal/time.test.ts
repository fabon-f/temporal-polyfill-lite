import { expect, test } from "vitest";
import { utcEpochMilliseconds } from "./time.ts";

test("utcEpochMilliseconds", () => {
	expect(utcEpochMilliseconds(2000, 1, 1, 0, 0, 0, 0)).toEqual(
		new Date("2000-01-01T00:00:00Z").getTime(),
	);
	expect(utcEpochMilliseconds(10, 1, 1, 0, 0, 0, 0)).toEqual(
		new Date("0010-01-01T00:00:00Z").getTime(),
	);
	expect(utcEpochMilliseconds(0, 7, 1, 23, 59, 59, 999)).toEqual(
		new Date("0000-07-01T23:59:59.999Z").getTime(),
	);
	expect(utcEpochMilliseconds(-10, 1, 1, 0, 0, 0, 0)).toEqual(
		new Date("-000010-01-01T00:00:00Z").getTime(),
	);
});
