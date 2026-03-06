import { expect, test } from "vitest";
import type { MonthCode } from "../calendars.ts";
import { constrainMonthCode } from "./chineseDangi.ts";

test("constrainMonthCode", () => {
	const nonLeapMonthCodes: MonthCode[] = Array.from({ length: 12 }, (_, i) => [i + 1, false]);
	for (const monthCode of nonLeapMonthCodes) {
		expect(constrainMonthCode("chinese", 2025, monthCode)).toBe(monthCode);
		expect(constrainMonthCode("dangi", 2025, monthCode)).toBe(monthCode);
	}
	const monthCode: MonthCode = [6, true];
	expect(constrainMonthCode("chinese", 2025, monthCode)).toBe(monthCode);
	expect(constrainMonthCode("dangi", 2025, monthCode)).toBe(monthCode);
	expect(constrainMonthCode("chinese", 2025, [1, true])).toEqual([1, false]);
	expect(constrainMonthCode("dangi", 2025, [1, true])).toEqual([1, false]);
});
