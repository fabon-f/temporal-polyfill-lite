import { expect, test } from "vitest";
import {
	isoDayOfWeek,
	isoDayOfYear,
	isoDaysInMonth,
	isoWeekOfYear,
} from "./calendars.ts";

test("isoDaysInMonth", () => {
	expect(isoDaysInMonth(2025, 12)).toEqual(31);
	expect(isoDaysInMonth(0, 2)).toEqual(29);
	expect(isoDaysInMonth(275760, 9)).toEqual(30);
	expect(isoDaysInMonth(-271821, 4)).toEqual(30);
});

test("isoWeekOfYear", () => {
	// normal year
	expect(isoWeekOfYear([2023, 1, 1])).toEqual([2022, 52]);
	expect(isoWeekOfYear([2023, 1, 2])).toEqual([2023, 1]);
	expect(isoWeekOfYear([2023, 12, 31])).toEqual([2023, 52]);
	// 01-01: Thursday, 12-31: Thursday (normal year)
	expect(isoWeekOfYear([2025, 12, 28])).toEqual([2025, 52]);
	expect(isoWeekOfYear([2025, 12, 29])).toEqual([2026, 1]);
	expect(isoWeekOfYear([2025, 12, 30])).toEqual([2026, 1]);
	expect(isoWeekOfYear([2025, 12, 31])).toEqual([2026, 1]);
	expect(isoWeekOfYear([2026, 1, 1])).toEqual([2026, 1]);
	expect(isoWeekOfYear([2026, 1, 2])).toEqual([2026, 1]);
	expect(isoWeekOfYear([2026, 1, 3])).toEqual([2026, 1]);
	expect(isoWeekOfYear([2026, 1, 4])).toEqual([2026, 1]);
	expect(isoWeekOfYear([2026, 1, 5])).toEqual([2026, 2]);
	expect(isoWeekOfYear([2026, 12, 27])).toEqual([2026, 52]);
	expect(isoWeekOfYear([2026, 12, 28])).toEqual([2026, 53]);
	expect(isoWeekOfYear([2026, 12, 29])).toEqual([2026, 53]);
	expect(isoWeekOfYear([2026, 12, 30])).toEqual([2026, 53]);
	expect(isoWeekOfYear([2026, 12, 31])).toEqual([2026, 53]);
	expect(isoWeekOfYear([2027, 1, 1])).toEqual([2026, 53]);
	expect(isoWeekOfYear([2027, 1, 2])).toEqual([2026, 53]);
	expect(isoWeekOfYear([2027, 1, 3])).toEqual([2026, 53]);
	expect(isoWeekOfYear([2027, 1, 4])).toEqual([2027, 1]);
	// 01-01: Thursday, 12-31: Friday (leap year)
	expect(isoWeekOfYear([2003, 12, 28])).toEqual([2003, 52]);
	expect(isoWeekOfYear([2003, 12, 29])).toEqual([2004, 1]);
	expect(isoWeekOfYear([2003, 12, 30])).toEqual([2004, 1]);
	expect(isoWeekOfYear([2003, 12, 31])).toEqual([2004, 1]);
	expect(isoWeekOfYear([2004, 1, 1])).toEqual([2004, 1]);
	expect(isoWeekOfYear([2004, 1, 2])).toEqual([2004, 1]);
	expect(isoWeekOfYear([2004, 1, 3])).toEqual([2004, 1]);
	expect(isoWeekOfYear([2004, 1, 4])).toEqual([2004, 1]);
	expect(isoWeekOfYear([2004, 1, 5])).toEqual([2004, 2]);
	expect(isoWeekOfYear([2004, 12, 26])).toEqual([2004, 52]);
	expect(isoWeekOfYear([2004, 12, 27])).toEqual([2004, 53]);
	expect(isoWeekOfYear([2004, 12, 28])).toEqual([2004, 53]);
	expect(isoWeekOfYear([2004, 12, 29])).toEqual([2004, 53]);
	expect(isoWeekOfYear([2004, 12, 30])).toEqual([2004, 53]);
	expect(isoWeekOfYear([2004, 12, 31])).toEqual([2004, 53]);
	expect(isoWeekOfYear([2005, 1, 1])).toEqual([2004, 53]);
	expect(isoWeekOfYear([2005, 1, 2])).toEqual([2004, 53]);
	expect(isoWeekOfYear([2005, 1, 3])).toEqual([2005, 1]);
	// 01-01: Wednesday, 12-31: Thursday (leap year)
	expect(isoWeekOfYear([2019, 12, 29])).toEqual([2019, 52]);
	expect(isoWeekOfYear([2019, 12, 30])).toEqual([2020, 1]);
	expect(isoWeekOfYear([2019, 12, 31])).toEqual([2020, 1]);
	expect(isoWeekOfYear([2020, 1, 1])).toEqual([2020, 1]);
	expect(isoWeekOfYear([2020, 1, 2])).toEqual([2020, 1]);
	expect(isoWeekOfYear([2020, 1, 3])).toEqual([2020, 1]);
	expect(isoWeekOfYear([2020, 1, 4])).toEqual([2020, 1]);
	expect(isoWeekOfYear([2020, 1, 5])).toEqual([2020, 1]);
	expect(isoWeekOfYear([2020, 1, 6])).toEqual([2020, 2]);
	expect(isoWeekOfYear([2020, 12, 27])).toEqual([2020, 52]);
	expect(isoWeekOfYear([2020, 12, 28])).toEqual([2020, 53]);
	expect(isoWeekOfYear([2020, 12, 29])).toEqual([2020, 53]);
	expect(isoWeekOfYear([2020, 12, 30])).toEqual([2020, 53]);
	expect(isoWeekOfYear([2020, 12, 31])).toEqual([2020, 53]);
	expect(isoWeekOfYear([2021, 1, 1])).toEqual([2020, 53]);
	expect(isoWeekOfYear([2021, 1, 2])).toEqual([2020, 53]);
	expect(isoWeekOfYear([2021, 1, 3])).toEqual([2020, 53]);
	expect(isoWeekOfYear([2021, 1, 4])).toEqual([2021, 1]);

	expect(isoWeekOfYear([21, 1, 3])).toEqual([20, 53]);
	expect(isoWeekOfYear([-271821, 4, 19])).toEqual([-271821, 16]);
	expect(isoWeekOfYear([275760, 9, 13])).toEqual([275760, 37]);
});

test("isoDayOfYear", () => {
	expect(isoDayOfYear([-271821, 4, 19])).toEqual(109);
	expect(isoDayOfYear([275760, 9, 13])).toEqual(257);
	expect(isoDayOfYear([0, 12, 31])).toEqual(366);
});

test("isoDayOfWeek", () => {
	expect(isoDayOfWeek([-271821, 4, 19])).toEqual(1);
	expect(isoDayOfWeek([275760, 9, 13])).toEqual(6);
	expect(isoDayOfWeek([1, 1, 7])).toEqual(7);
});
