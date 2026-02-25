import { expect, test } from "vitest";
import { daysInMonth, isLeapYear, monthCodeToOrdinal } from "./hebrew.ts";

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
	expect(monthCodeToOrdinal(1, "M01")).toEqual(1);
	expect(monthCodeToOrdinal(1, "M02")).toEqual(2);
	expect(monthCodeToOrdinal(1, "M03")).toEqual(3);
	expect(monthCodeToOrdinal(1, "M04")).toEqual(4);
	expect(monthCodeToOrdinal(1, "M05")).toEqual(5);
	expect(monthCodeToOrdinal(1, "M06")).toEqual(6);
	expect(monthCodeToOrdinal(1, "M07")).toEqual(7);
	expect(monthCodeToOrdinal(1, "M08")).toEqual(8);
	expect(monthCodeToOrdinal(1, "M09")).toEqual(9);
	expect(monthCodeToOrdinal(1, "M10")).toEqual(10);
	expect(monthCodeToOrdinal(1, "M11")).toEqual(11);
	expect(monthCodeToOrdinal(1, "M12")).toEqual(12);
	expect(monthCodeToOrdinal(3, "M01")).toEqual(1);
	expect(monthCodeToOrdinal(3, "M02")).toEqual(2);
	expect(monthCodeToOrdinal(3, "M03")).toEqual(3);
	expect(monthCodeToOrdinal(3, "M04")).toEqual(4);
	expect(monthCodeToOrdinal(3, "M05")).toEqual(5);
	expect(monthCodeToOrdinal(3, "M05L")).toEqual(6);
	expect(monthCodeToOrdinal(3, "M06")).toEqual(7);
	expect(monthCodeToOrdinal(3, "M07")).toEqual(8);
	expect(monthCodeToOrdinal(3, "M08")).toEqual(9);
	expect(monthCodeToOrdinal(3, "M09")).toEqual(10);
	expect(monthCodeToOrdinal(3, "M10")).toEqual(11);
	expect(monthCodeToOrdinal(3, "M11")).toEqual(12);
	expect(monthCodeToOrdinal(3, "M12")).toEqual(13);
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
