import { expect, test } from "vitest";
import { isoDayOfWeek, isoDayOfYear, isoDaysInMonth, isoWeekOfYear } from "./calendars.ts";
import { createIsoDateRecord } from "../PlainDate.ts";

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

function createYearWeekRecord(year: number, week: number) {
	return { $year: year, $week: week };
}

test("isoWeekOfYear", () => {
	// normal year
	expect(isoWeekOfYear(createIsoDateRecord(2023, 1, 1))).toEqual(createYearWeekRecord(2022, 52));
	expect(isoWeekOfYear(createIsoDateRecord(2023, 1, 2))).toEqual(createYearWeekRecord(2023, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2023, 12, 31))).toEqual(createYearWeekRecord(2023, 52));
	// 01-01: Thursday, 12-31: Thursday (normal year)
	expect(isoWeekOfYear(createIsoDateRecord(2025, 12, 28))).toEqual(createYearWeekRecord(2025, 52));
	expect(isoWeekOfYear(createIsoDateRecord(2025, 12, 29))).toEqual(createYearWeekRecord(2026, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2025, 12, 30))).toEqual(createYearWeekRecord(2026, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2025, 12, 31))).toEqual(createYearWeekRecord(2026, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2026, 1, 1))).toEqual(createYearWeekRecord(2026, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2026, 1, 2))).toEqual(createYearWeekRecord(2026, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2026, 1, 3))).toEqual(createYearWeekRecord(2026, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2026, 1, 4))).toEqual(createYearWeekRecord(2026, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2026, 1, 5))).toEqual(createYearWeekRecord(2026, 2));
	expect(isoWeekOfYear(createIsoDateRecord(2026, 12, 27))).toEqual(createYearWeekRecord(2026, 52));
	expect(isoWeekOfYear(createIsoDateRecord(2026, 12, 28))).toEqual(createYearWeekRecord(2026, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2026, 12, 29))).toEqual(createYearWeekRecord(2026, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2026, 12, 30))).toEqual(createYearWeekRecord(2026, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2026, 12, 31))).toEqual(createYearWeekRecord(2026, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2027, 1, 1))).toEqual(createYearWeekRecord(2026, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2027, 1, 2))).toEqual(createYearWeekRecord(2026, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2027, 1, 3))).toEqual(createYearWeekRecord(2026, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2027, 1, 4))).toEqual(createYearWeekRecord(2027, 1));
	// 01-01: Thursday, 12-31: Friday (leap year)
	expect(isoWeekOfYear(createIsoDateRecord(2003, 12, 28))).toEqual(createYearWeekRecord(2003, 52));
	expect(isoWeekOfYear(createIsoDateRecord(2003, 12, 29))).toEqual(createYearWeekRecord(2004, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2003, 12, 30))).toEqual(createYearWeekRecord(2004, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2003, 12, 31))).toEqual(createYearWeekRecord(2004, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 1, 1))).toEqual(createYearWeekRecord(2004, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 1, 2))).toEqual(createYearWeekRecord(2004, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 1, 3))).toEqual(createYearWeekRecord(2004, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 1, 4))).toEqual(createYearWeekRecord(2004, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 1, 5))).toEqual(createYearWeekRecord(2004, 2));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 12, 26))).toEqual(createYearWeekRecord(2004, 52));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 12, 27))).toEqual(createYearWeekRecord(2004, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 12, 28))).toEqual(createYearWeekRecord(2004, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 12, 29))).toEqual(createYearWeekRecord(2004, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 12, 30))).toEqual(createYearWeekRecord(2004, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2004, 12, 31))).toEqual(createYearWeekRecord(2004, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2005, 1, 1))).toEqual(createYearWeekRecord(2004, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2005, 1, 2))).toEqual(createYearWeekRecord(2004, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2005, 1, 3))).toEqual(createYearWeekRecord(2005, 1));
	// 01-01: Wednesday, 12-31: Thursday (leap year)
	expect(isoWeekOfYear(createIsoDateRecord(2019, 12, 29))).toEqual(createYearWeekRecord(2019, 52));
	expect(isoWeekOfYear(createIsoDateRecord(2019, 12, 30))).toEqual(createYearWeekRecord(2020, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2019, 12, 31))).toEqual(createYearWeekRecord(2020, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 1, 1))).toEqual(createYearWeekRecord(2020, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 1, 2))).toEqual(createYearWeekRecord(2020, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 1, 3))).toEqual(createYearWeekRecord(2020, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 1, 4))).toEqual(createYearWeekRecord(2020, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 1, 5))).toEqual(createYearWeekRecord(2020, 1));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 1, 6))).toEqual(createYearWeekRecord(2020, 2));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 12, 27))).toEqual(createYearWeekRecord(2020, 52));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 12, 28))).toEqual(createYearWeekRecord(2020, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 12, 29))).toEqual(createYearWeekRecord(2020, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 12, 30))).toEqual(createYearWeekRecord(2020, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2020, 12, 31))).toEqual(createYearWeekRecord(2020, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2021, 1, 1))).toEqual(createYearWeekRecord(2020, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2021, 1, 2))).toEqual(createYearWeekRecord(2020, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2021, 1, 3))).toEqual(createYearWeekRecord(2020, 53));
	expect(isoWeekOfYear(createIsoDateRecord(2021, 1, 4))).toEqual(createYearWeekRecord(2021, 1));

	expect(isoWeekOfYear(createIsoDateRecord(21, 1, 3))).toEqual(createYearWeekRecord(20, 53));
	expect(isoWeekOfYear(createIsoDateRecord(-271821, 4, 19))).toEqual(
		createYearWeekRecord(-271821, 16),
	);
	expect(isoWeekOfYear(createIsoDateRecord(275760, 9, 13))).toEqual(
		createYearWeekRecord(275760, 37),
	);
});

test("isoDayOfYear", () => {
	expect(isoDayOfYear(createIsoDateRecord(-271821, 4, 19))).toEqual(109);
	expect(isoDayOfYear(createIsoDateRecord(275760, 9, 13))).toEqual(257);
	expect(isoDayOfYear(createIsoDateRecord(0, 12, 31))).toEqual(366);
});

test("isoDayOfWeek", () => {
	expect(isoDayOfWeek(createIsoDateRecord(-271821, 4, 19))).toEqual(1);
	expect(isoDayOfWeek(createIsoDateRecord(275760, 9, 13))).toEqual(6);
	expect(isoDayOfWeek(createIsoDateRecord(1, 1, 7))).toEqual(7);
});
