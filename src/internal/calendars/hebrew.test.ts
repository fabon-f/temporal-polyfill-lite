import { assert, describe, expect, test } from "vitest";
import { parseMonthCode } from "../calendars.ts";
import {
	calendarIntegersToEpochDays,
	daysInMonth,
	epochDaysToDate,
	isLeapYear,
	monthCodeToOrdinal,
	monthDayToEpochDays,
} from "./hebrew.ts";
import { calendarIntegersToEpochDaysByIcu, epochDaysToDateByIcu } from "./testUtils.ts";

test("isLeapYear", () => {
	for (const yearMod19 of [0, 3, 6, 8, 11, 14, 17]) {
		expect(isLeapYear(yearMod19 - 19)).toEqual(true);
		expect(isLeapYear(yearMod19)).toEqual(true);
		expect(isLeapYear(yearMod19 + 19)).toEqual(true);
	}
	for (const yearMod19 of [1, 2, 4, 5, 7, 9, 10, 12, 13, 15, 16, 18]) {
		expect(isLeapYear(yearMod19 - 19)).toEqual(false);
		expect(isLeapYear(yearMod19)).toEqual(false);
		expect(isLeapYear(yearMod19 + 19)).toEqual(false);
	}
});

test("monthCodeToOrdinal", () => {
	expect(monthCodeToOrdinal(1, parseMonthCode("M01"))).toEqual(1);
	expect(monthCodeToOrdinal(1, parseMonthCode("M02"))).toEqual(2);
	expect(monthCodeToOrdinal(1, parseMonthCode("M03"))).toEqual(3);
	expect(monthCodeToOrdinal(1, parseMonthCode("M04"))).toEqual(4);
	expect(monthCodeToOrdinal(1, parseMonthCode("M05"))).toEqual(5);
	expect(monthCodeToOrdinal(1, parseMonthCode("M06"))).toEqual(6);
	expect(monthCodeToOrdinal(1, parseMonthCode("M07"))).toEqual(7);
	expect(monthCodeToOrdinal(1, parseMonthCode("M08"))).toEqual(8);
	expect(monthCodeToOrdinal(1, parseMonthCode("M09"))).toEqual(9);
	expect(monthCodeToOrdinal(1, parseMonthCode("M10"))).toEqual(10);
	expect(monthCodeToOrdinal(1, parseMonthCode("M11"))).toEqual(11);
	expect(monthCodeToOrdinal(1, parseMonthCode("M12"))).toEqual(12);
	expect(monthCodeToOrdinal(3, parseMonthCode("M01"))).toEqual(1);
	expect(monthCodeToOrdinal(3, parseMonthCode("M02"))).toEqual(2);
	expect(monthCodeToOrdinal(3, parseMonthCode("M03"))).toEqual(3);
	expect(monthCodeToOrdinal(3, parseMonthCode("M04"))).toEqual(4);
	expect(monthCodeToOrdinal(3, parseMonthCode("M05"))).toEqual(5);
	expect(monthCodeToOrdinal(3, parseMonthCode("M05L"))).toEqual(6);
	expect(monthCodeToOrdinal(3, parseMonthCode("M06"))).toEqual(7);
	expect(monthCodeToOrdinal(3, parseMonthCode("M07"))).toEqual(8);
	expect(monthCodeToOrdinal(3, parseMonthCode("M08"))).toEqual(9);
	expect(monthCodeToOrdinal(3, parseMonthCode("M09"))).toEqual(10);
	expect(monthCodeToOrdinal(3, parseMonthCode("M10"))).toEqual(11);
	expect(monthCodeToOrdinal(3, parseMonthCode("M11"))).toEqual(12);
	expect(monthCodeToOrdinal(3, parseMonthCode("M12"))).toEqual(13);
});

test("daysInMonth", () => {
	// year of 353 days
	expect(daysInMonth(15, 1)).toEqual(30);
	expect(daysInMonth(15, 2)).toEqual(29);
	expect(daysInMonth(15, 3)).toEqual(29);
	expect(daysInMonth(15, 4)).toEqual(29);
	expect(daysInMonth(15, 5)).toEqual(30);
	expect(daysInMonth(15, 6)).toEqual(29);
	expect(daysInMonth(15, 7)).toEqual(30);
	expect(daysInMonth(15, 8)).toEqual(29);
	expect(daysInMonth(15, 9)).toEqual(30);
	expect(daysInMonth(15, 10)).toEqual(29);
	expect(daysInMonth(15, 11)).toEqual(30);
	expect(daysInMonth(15, 12)).toEqual(29);
	// year of 354 days
	expect(daysInMonth(4, 1)).toEqual(30);
	expect(daysInMonth(4, 2)).toEqual(29);
	expect(daysInMonth(4, 3)).toEqual(30);
	expect(daysInMonth(4, 4)).toEqual(29);
	expect(daysInMonth(4, 5)).toEqual(30);
	expect(daysInMonth(4, 6)).toEqual(29);
	expect(daysInMonth(4, 7)).toEqual(30);
	expect(daysInMonth(4, 8)).toEqual(29);
	expect(daysInMonth(4, 9)).toEqual(30);
	expect(daysInMonth(4, 10)).toEqual(29);
	expect(daysInMonth(4, 11)).toEqual(30);
	expect(daysInMonth(4, 12)).toEqual(29);
	// year of 355 days
	expect(daysInMonth(5, 1)).toEqual(30);
	expect(daysInMonth(5, 2)).toEqual(30);
	expect(daysInMonth(5, 3)).toEqual(30);
	expect(daysInMonth(5, 4)).toEqual(29);
	expect(daysInMonth(5, 5)).toEqual(30);
	expect(daysInMonth(5, 6)).toEqual(29);
	expect(daysInMonth(5, 7)).toEqual(30);
	expect(daysInMonth(5, 8)).toEqual(29);
	expect(daysInMonth(5, 9)).toEqual(30);
	expect(daysInMonth(5, 10)).toEqual(29);
	expect(daysInMonth(5, 11)).toEqual(30);
	expect(daysInMonth(5, 12)).toEqual(29);
	// year of 383 days
	expect(daysInMonth(3, 1)).toEqual(30);
	expect(daysInMonth(3, 2)).toEqual(29);
	expect(daysInMonth(3, 3)).toEqual(29);
	expect(daysInMonth(3, 4)).toEqual(29);
	expect(daysInMonth(3, 5)).toEqual(30);
	expect(daysInMonth(3, 6)).toEqual(30);
	expect(daysInMonth(3, 7)).toEqual(29);
	expect(daysInMonth(3, 8)).toEqual(30);
	expect(daysInMonth(3, 9)).toEqual(29);
	expect(daysInMonth(3, 10)).toEqual(30);
	expect(daysInMonth(3, 11)).toEqual(29);
	expect(daysInMonth(3, 12)).toEqual(30);
	expect(daysInMonth(3, 13)).toEqual(29);
	// year of 384 days
	expect(daysInMonth(27, 1)).toEqual(30);
	expect(daysInMonth(27, 2)).toEqual(29);
	expect(daysInMonth(27, 3)).toEqual(30);
	expect(daysInMonth(27, 4)).toEqual(29);
	expect(daysInMonth(27, 5)).toEqual(30);
	expect(daysInMonth(27, 6)).toEqual(30);
	expect(daysInMonth(27, 7)).toEqual(29);
	expect(daysInMonth(27, 8)).toEqual(30);
	expect(daysInMonth(27, 9)).toEqual(29);
	expect(daysInMonth(27, 10)).toEqual(30);
	expect(daysInMonth(27, 11)).toEqual(29);
	expect(daysInMonth(27, 12)).toEqual(30);
	expect(daysInMonth(27, 13)).toEqual(29);
	// year of 385 days
	expect(daysInMonth(6, 1)).toEqual(30);
	expect(daysInMonth(6, 2)).toEqual(30);
	expect(daysInMonth(6, 3)).toEqual(30);
	expect(daysInMonth(6, 4)).toEqual(29);
	expect(daysInMonth(6, 5)).toEqual(30);
	expect(daysInMonth(6, 6)).toEqual(30);
	expect(daysInMonth(6, 7)).toEqual(29);
	expect(daysInMonth(6, 8)).toEqual(30);
	expect(daysInMonth(6, 9)).toEqual(29);
	expect(daysInMonth(6, 10)).toEqual(30);
	expect(daysInMonth(6, 11)).toEqual(29);
	expect(daysInMonth(6, 12)).toEqual(30);
	expect(daysInMonth(6, 13)).toEqual(29);
});

test("monthDayToEpochDays", () => {
	expect(monthDayToEpochDays(1, false, 1)).toEqual(982);
	expect(monthDayToEpochDays(1, false, 30)).toEqual(1011);
	expect(monthDayToEpochDays(2, false, 1)).toEqual(1012);
	expect(monthDayToEpochDays(2, false, 29)).toEqual(1040);
	expect(monthDayToEpochDays(2, false, 30)).toEqual(686);
	expect(monthDayToEpochDays(3, false, 1)).toEqual(1041);
	expect(monthDayToEpochDays(3, false, 29)).toEqual(1069);
	expect(monthDayToEpochDays(3, false, 30)).toEqual(716);
	expect(monthDayToEpochDays(4, false, 1)).toEqual(1070);
	expect(monthDayToEpochDays(4, false, 26)).toEqual(1095);
	expect(monthDayToEpochDays(4, false, 27)).toEqual(743);
	expect(monthDayToEpochDays(4, false, 29)).toEqual(745);
	expect(monthDayToEpochDays(5, false, 1)).toEqual(746);
	expect(monthDayToEpochDays(5, false, 30)).toEqual(775);
	expect(monthDayToEpochDays(5, true, 1)).toEqual(37);
	expect(monthDayToEpochDays(5, true, 30)).toEqual(66);
	expect(monthDayToEpochDays(6, false, 1)).toEqual(776);
	expect(monthDayToEpochDays(6, false, 29)).toEqual(804);
	expect(monthDayToEpochDays(7, false, 1)).toEqual(805);
	expect(monthDayToEpochDays(7, false, 30)).toEqual(834);
	expect(monthDayToEpochDays(8, false, 1)).toEqual(835);
	expect(monthDayToEpochDays(8, false, 29)).toEqual(863);
	expect(monthDayToEpochDays(9, false, 1)).toEqual(864);
	expect(monthDayToEpochDays(9, false, 30)).toEqual(893);
	expect(monthDayToEpochDays(10, false, 1)).toEqual(894);
	expect(monthDayToEpochDays(10, false, 29)).toEqual(922);
	expect(monthDayToEpochDays(11, false, 1)).toEqual(923);
	expect(monthDayToEpochDays(11, false, 30)).toEqual(952);
	expect(monthDayToEpochDays(12, false, 1)).toEqual(953);
	expect(monthDayToEpochDays(12, false, 29)).toEqual(981);
});

test("epochDaysToDate should match to ICU4X", () => {
	// this range (year 5706 - 5711) includes all possible patterns of Hebrew year
	for (let epochDays = -8881; epochDays <= -6668; epochDays++) {
		expect(epochDaysToDate(epochDays)).toEqual(epochDaysToDateByIcu("hebrew", epochDays));
	}
});

describe("calendarIntegersToEpochDays should match ICU4X", () => {
	test("valid year range", () => {
		for (let year = -268058; year <= 279518; year++) {
			// use `assert` instead of `expect` for better performance
			assert.equal(
				calendarIntegersToEpochDays(year, 1, 1),
				calendarIntegersToEpochDaysByIcu("hebrew", year, 1, 1),
				`mismatch in year ${year}`,
			);
		}
	});

	test("each month for all possible year patterns", () => {
		// normal years (deficient, regular, complete)
		for (const year of [5781, 5786, 5788]) {
			for (let month = 1; month <= 12; month++) {
				expect(calendarIntegersToEpochDays(year, month, 1)).toEqual(
					calendarIntegersToEpochDaysByIcu("hebrew", year, month, 1),
				);
			}
		}
		// leap years (deficient, regular, complete)
		for (const year of [5784, 5782, 5787]) {
			for (let month = 1; month <= 13; month++) {
				expect(calendarIntegersToEpochDays(year, month, 1)).toEqual(
					calendarIntegersToEpochDaysByIcu("hebrew", year, month, 1),
				);
			}
		}
	});
});
