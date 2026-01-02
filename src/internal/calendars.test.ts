import { expect, test } from "vitest";
import { isoDaysInMonth } from "./calendars.ts";

test("isoDaysInMonth", () => {
	expect(isoDaysInMonth(2025, 1)).toEqual(31);
	expect(isoDaysInMonth(2025, 2)).toEqual(28);
	expect(isoDaysInMonth(2025, 3)).toEqual(31);
	expect(isoDaysInMonth(2025, 4)).toEqual(30);
	expect(isoDaysInMonth(2025, 5)).toEqual(31);
	expect(isoDaysInMonth(2025, 6)).toEqual(30);
	expect(isoDaysInMonth(2025, 7)).toEqual(31);
	expect(isoDaysInMonth(2025, 8)).toEqual(31);
	expect(isoDaysInMonth(2025, 9)).toEqual(30);
	expect(isoDaysInMonth(2025, 10)).toEqual(31);
	expect(isoDaysInMonth(2025, 11)).toEqual(30);
	expect(isoDaysInMonth(2025, 12)).toEqual(31);
	expect(isoDaysInMonth(-40000, 2)).toEqual(29);
	expect(isoDaysInMonth(2024, 2)).toEqual(29);
});
