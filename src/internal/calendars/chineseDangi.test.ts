import { describe, expect, test } from "vitest";
import type { MonthCode } from "../calendars.ts";
import { overflowConstrain, overflowReject } from "../enum.ts";
import { constrainMonthCode, epochDaysToDate, monthDayToEpochDays } from "./chineseDangi.ts";
import { epochDaysToDateByIcu } from "./testUtils.ts";

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

describe("monthDayToEpochDays", () => {
	test("chinese", () => {
		expect(monthDayToEpochDays("chinese", 1, false, 1, overflowReject)).toBe(775);
		expect(monthDayToEpochDays("chinese", 1, false, 29, overflowReject)).toBe(803);
		expect(monthDayToEpochDays("chinese", 1, false, 30, overflowReject)).toBe(65);
		expect(monthDayToEpochDays("chinese", 2, false, 1, overflowReject)).toBe(804);
		expect(monthDayToEpochDays("chinese", 2, false, 29, overflowReject)).toBe(832);
		expect(monthDayToEpochDays("chinese", 2, false, 30, overflowReject)).toBe(833);
		expect(monthDayToEpochDays("chinese", 3, false, 1, overflowReject)).toBe(834);
		expect(monthDayToEpochDays("chinese", 3, false, 29, overflowReject)).toBe(862);
		expect(monthDayToEpochDays("chinese", 3, false, 30, overflowReject)).toBe(-1352);
		expect(monthDayToEpochDays("chinese", 4, false, 1, overflowReject)).toBe(863);
		expect(monthDayToEpochDays("chinese", 4, false, 29, overflowReject)).toBe(891);
		expect(monthDayToEpochDays("chinese", 4, false, 30, overflowReject)).toBe(153);
		expect(monthDayToEpochDays("chinese", 5, false, 1, overflowReject)).toBe(892);
		expect(monthDayToEpochDays("chinese", 5, false, 29, overflowReject)).toBe(920);
		expect(monthDayToEpochDays("chinese", 5, false, 30, overflowReject)).toBe(921);
		expect(monthDayToEpochDays("chinese", 6, false, 1, overflowReject)).toBe(922);
		expect(monthDayToEpochDays("chinese", 6, false, 29, overflowReject)).toBe(950);
		expect(monthDayToEpochDays("chinese", 6, false, 30, overflowReject)).toBe(596);
		expect(monthDayToEpochDays("chinese", 7, false, 1, overflowReject)).toBe(951);
		expect(monthDayToEpochDays("chinese", 7, false, 29, overflowReject)).toBe(979);
		expect(monthDayToEpochDays("chinese", 7, false, 30, overflowReject)).toBe(980);
		expect(monthDayToEpochDays("chinese", 8, false, 1, overflowReject)).toBe(981);
		expect(monthDayToEpochDays("chinese", 8, false, 29, overflowReject)).toBe(1009);
		expect(monthDayToEpochDays("chinese", 8, false, 30, overflowReject)).toBe(655);
		expect(monthDayToEpochDays("chinese", 9, false, 1, overflowReject)).toBe(1010);
		expect(monthDayToEpochDays("chinese", 9, false, 29, overflowReject)).toBe(1038);
		expect(monthDayToEpochDays("chinese", 9, false, 30, overflowReject)).toBe(1039);
		expect(monthDayToEpochDays("chinese", 10, false, 1, overflowReject)).toBe(1040);
		expect(monthDayToEpochDays("chinese", 10, false, 29, overflowReject)).toBe(1068);
		expect(monthDayToEpochDays("chinese", 10, false, 30, overflowReject)).toBe(1069);
		expect(monthDayToEpochDays("chinese", 11, false, 1, overflowReject)).toBe(1070);
		expect(monthDayToEpochDays("chinese", 11, false, 26, overflowReject)).toBe(1095);
		expect(monthDayToEpochDays("chinese", 11, false, 27, overflowReject)).toBe(742);
		expect(monthDayToEpochDays("chinese", 11, false, 29, overflowReject)).toBe(744);
		expect(monthDayToEpochDays("chinese", 11, false, 30, overflowReject)).toBe(6);
		expect(monthDayToEpochDays("chinese", 12, false, 1, overflowReject)).toBe(745);
		expect(monthDayToEpochDays("chinese", 12, false, 29, overflowReject)).toBe(773);
		expect(monthDayToEpochDays("chinese", 12, false, 30, overflowReject)).toBe(774);

		expect(() => monthDayToEpochDays("chinese", 1, true, 1, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 1, true, 1, overflowConstrain)).toBe(775);
		expect(() => monthDayToEpochDays("chinese", 1, true, 29, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 1, true, 29, overflowConstrain)).toBe(803);
		expect(() => monthDayToEpochDays("chinese", 1, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 1, true, 30, overflowConstrain)).toBe(65);
		expect(monthDayToEpochDays("chinese", 2, true, 1, overflowReject)).toBe(-8320);
		expect(monthDayToEpochDays("chinese", 2, true, 29, overflowReject)).toBe(-8292);
		expect(() => monthDayToEpochDays("chinese", 2, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 2, true, 30, overflowConstrain)).toBe(833);
		expect(monthDayToEpochDays("chinese", 3, true, 1, overflowReject)).toBe(-1351);
		expect(monthDayToEpochDays("chinese", 3, true, 29, overflowReject)).toBe(-1323);
		expect(monthDayToEpochDays("chinese", 3, true, 30, overflowReject)).toBe(-5339);
		expect(monthDayToEpochDays("chinese", 4, true, 1, overflowReject)).toBe(-2415);
		expect(monthDayToEpochDays("chinese", 4, true, 29, overflowReject)).toBe(-2387);
		expect(monthDayToEpochDays("chinese", 4, true, 30, overflowReject)).toBe(-9326);
		expect(monthDayToEpochDays("chinese", 5, true, 1, overflowReject)).toBe(538);
		expect(monthDayToEpochDays("chinese", 5, true, 29, overflowReject)).toBe(566);
		expect(monthDayToEpochDays("chinese", 5, true, 30, overflowReject)).toBe(-6373);
		expect(monthDayToEpochDays("chinese", 6, true, 1, overflowReject)).toBe(-3448);
		expect(monthDayToEpochDays("chinese", 6, true, 29, overflowReject)).toBe(-3420);
		expect(monthDayToEpochDays("chinese", 6, true, 30, overflowReject)).toBe(-10359);
		expect(monthDayToEpochDays("chinese", 7, true, 1, overflowReject)).toBe(-495);
		expect(monthDayToEpochDays("chinese", 7, true, 29, overflowReject)).toBe(-467);
		expect(monthDayToEpochDays("chinese", 7, true, 30, overflowReject)).toBe(-11423);
		expect(monthDayToEpochDays("chinese", 8, true, 1, overflowReject)).toBe(-4482);
		expect(monthDayToEpochDays("chinese", 8, true, 29, overflowReject)).toBe(-4454);
		expect(() => monthDayToEpochDays("chinese", 8, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 8, true, 30, overflowConstrain)).toBe(655);
		expect(monthDayToEpochDays("chinese", 9, true, 1, overflowReject)).toBe(16367);
		expect(monthDayToEpochDays("chinese", 9, true, 29, overflowReject)).toBe(16395);
		expect(() => monthDayToEpochDays("chinese", 9, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 9, true, 30, overflowConstrain)).toBe(1039);
		expect(monthDayToEpochDays("chinese", 10, true, 1, overflowReject)).toBe(5440);
		expect(monthDayToEpochDays("chinese", 10, true, 29, overflowReject)).toBe(5468);
		expect(() => monthDayToEpochDays("chinese", 10, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 10, true, 30, overflowConstrain)).toBe(1069);
		expect(monthDayToEpochDays("chinese", 11, true, 1, overflowReject)).toBe(23366);
		expect(monthDayToEpochDays("chinese", 11, true, 29, overflowReject)).toBe(23394);
		expect(() => monthDayToEpochDays("chinese", 11, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 11, true, 30, overflowConstrain)).toBe(6);
		expect(() => monthDayToEpochDays("chinese", 12, true, 1, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 12, true, 1, overflowConstrain)).toBe(745);
		expect(() => monthDayToEpochDays("chinese", 12, true, 29, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 12, true, 29, overflowConstrain)).toBe(773);
		expect(() => monthDayToEpochDays("chinese", 12, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("chinese", 12, true, 30, overflowConstrain)).toBe(774);
	});
	test("dangi", () => {
		expect(monthDayToEpochDays("dangi", 1, false, 1, overflowReject)).toBe(775);
		expect(monthDayToEpochDays("dangi", 1, false, 29, overflowReject)).toBe(803);
		expect(monthDayToEpochDays("dangi", 1, false, 30, overflowReject)).toBe(65);
		expect(monthDayToEpochDays("dangi", 2, false, 1, overflowReject)).toBe(804);
		expect(monthDayToEpochDays("dangi", 2, false, 29, overflowReject)).toBe(832);
		expect(monthDayToEpochDays("dangi", 2, false, 30, overflowReject)).toBe(833);
		expect(monthDayToEpochDays("dangi", 3, false, 1, overflowReject)).toBe(834);
		expect(monthDayToEpochDays("dangi", 3, false, 29, overflowReject)).toBe(862);
		expect(monthDayToEpochDays("dangi", 3, false, 30, overflowReject)).toBe(-614);
		expect(monthDayToEpochDays("dangi", 4, false, 1, overflowReject)).toBe(863);
		expect(monthDayToEpochDays("dangi", 4, false, 29, overflowReject)).toBe(891);
		expect(monthDayToEpochDays("dangi", 4, false, 30, overflowReject)).toBe(153);
		expect(monthDayToEpochDays("dangi", 5, false, 1, overflowReject)).toBe(892);
		expect(monthDayToEpochDays("dangi", 5, false, 29, overflowReject)).toBe(920);
		expect(monthDayToEpochDays("dangi", 5, false, 30, overflowReject)).toBe(921);
		expect(monthDayToEpochDays("dangi", 6, false, 1, overflowReject)).toBe(922);
		expect(monthDayToEpochDays("dangi", 6, false, 29, overflowReject)).toBe(950);
		expect(monthDayToEpochDays("dangi", 6, false, 30, overflowReject)).toBe(596);
		expect(monthDayToEpochDays("dangi", 7, false, 1, overflowReject)).toBe(951);
		expect(monthDayToEpochDays("dangi", 7, false, 29, overflowReject)).toBe(979);
		expect(monthDayToEpochDays("dangi", 7, false, 30, overflowReject)).toBe(980);
		expect(monthDayToEpochDays("dangi", 8, false, 1, overflowReject)).toBe(981);
		expect(monthDayToEpochDays("dangi", 8, false, 29, overflowReject)).toBe(1009);
		expect(monthDayToEpochDays("dangi", 8, false, 30, overflowReject)).toBe(655);
		expect(monthDayToEpochDays("dangi", 9, false, 1, overflowReject)).toBe(1010);
		expect(monthDayToEpochDays("dangi", 9, false, 29, overflowReject)).toBe(1038);
		expect(monthDayToEpochDays("dangi", 9, false, 30, overflowReject)).toBe(1039);
		expect(monthDayToEpochDays("dangi", 10, false, 1, overflowReject)).toBe(1040);
		expect(monthDayToEpochDays("dangi", 10, false, 29, overflowReject)).toBe(1068);
		expect(monthDayToEpochDays("dangi", 10, false, 30, overflowReject)).toBe(1069);
		expect(monthDayToEpochDays("dangi", 11, false, 1, overflowReject)).toBe(1070);
		expect(monthDayToEpochDays("dangi", 11, false, 26, overflowReject)).toBe(1095);
		expect(monthDayToEpochDays("dangi", 11, false, 27, overflowReject)).toBe(742);
		expect(monthDayToEpochDays("dangi", 11, false, 29, overflowReject)).toBe(744);
		expect(monthDayToEpochDays("dangi", 11, false, 30, overflowReject)).toBe(6);
		expect(monthDayToEpochDays("dangi", 12, false, 1, overflowReject)).toBe(745);
		expect(monthDayToEpochDays("dangi", 12, false, 29, overflowReject)).toBe(773);
		expect(monthDayToEpochDays("dangi", 12, false, 30, overflowReject)).toBe(774);

		expect(() => monthDayToEpochDays("dangi", 1, true, 1, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 1, true, 1, overflowConstrain)).toBe(775);
		expect(() => monthDayToEpochDays("dangi", 1, true, 29, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 1, true, 29, overflowConstrain)).toBe(803);
		expect(() => monthDayToEpochDays("dangi", 1, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 1, true, 30, overflowConstrain)).toBe(65);
		expect(monthDayToEpochDays("dangi", 2, true, 1, overflowReject)).toBe(-8320);
		expect(monthDayToEpochDays("dangi", 2, true, 29, overflowReject)).toBe(-8292);
		expect(() => monthDayToEpochDays("dangi", 2, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 2, true, 30, overflowConstrain)).toBe(833);
		expect(monthDayToEpochDays("dangi", 3, true, 1, overflowReject)).toBe(-1351);
		expect(monthDayToEpochDays("dangi", 3, true, 29, overflowReject)).toBe(-1323);
		expect(monthDayToEpochDays("dangi", 3, true, 30, overflowReject)).toBe(-5339);
		expect(monthDayToEpochDays("dangi", 4, true, 1, overflowReject)).toBe(-2415);
		expect(monthDayToEpochDays("dangi", 4, true, 29, overflowReject)).toBe(-2387);
		expect(monthDayToEpochDays("dangi", 4, true, 30, overflowReject)).toBe(-9326);
		expect(monthDayToEpochDays("dangi", 5, true, 1, overflowReject)).toBe(538);
		expect(monthDayToEpochDays("dangi", 5, true, 29, overflowReject)).toBe(566);
		expect(monthDayToEpochDays("dangi", 5, true, 30, overflowReject)).toBe(-6373);
		expect(monthDayToEpochDays("dangi", 6, true, 1, overflowReject)).toBe(-3448);
		expect(monthDayToEpochDays("dangi", 6, true, 29, overflowReject)).toBe(-3420);
		expect(monthDayToEpochDays("dangi", 6, true, 30, overflowReject)).toBe(-10359);
		expect(monthDayToEpochDays("dangi", 7, true, 1, overflowReject)).toBe(-495);
		expect(monthDayToEpochDays("dangi", 7, true, 29, overflowReject)).toBe(-467);
		expect(monthDayToEpochDays("dangi", 7, true, 30, overflowReject)).toBe(-11423);
		expect(monthDayToEpochDays("dangi", 8, true, 1, overflowReject)).toBe(-4482);
		expect(monthDayToEpochDays("dangi", 8, true, 29, overflowReject)).toBe(-4454);
		expect(() => monthDayToEpochDays("dangi", 8, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 8, true, 30, overflowConstrain)).toBe(655);
		expect(monthDayToEpochDays("dangi", 9, true, 1, overflowReject)).toBe(16367);
		expect(monthDayToEpochDays("dangi", 9, true, 29, overflowReject)).toBe(16395);
		expect(() => monthDayToEpochDays("dangi", 9, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 9, true, 30, overflowConstrain)).toBe(1039);
		expect(monthDayToEpochDays("dangi", 10, true, 1, overflowReject)).toBe(5440);
		expect(monthDayToEpochDays("dangi", 10, true, 29, overflowReject)).toBe(5468);
		expect(() => monthDayToEpochDays("dangi", 10, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 10, true, 30, overflowConstrain)).toBe(1069);
		expect(monthDayToEpochDays("dangi", 11, true, 1, overflowReject)).toBe(23366);
		expect(monthDayToEpochDays("dangi", 11, true, 29, overflowReject)).toBe(23394);
		expect(() => monthDayToEpochDays("dangi", 11, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 11, true, 30, overflowConstrain)).toBe(6);
		expect(() => monthDayToEpochDays("dangi", 12, true, 1, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 12, true, 1, overflowConstrain)).toBe(745);
		expect(() => monthDayToEpochDays("dangi", 12, true, 29, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 12, true, 29, overflowConstrain)).toBe(773);
		expect(() => monthDayToEpochDays("dangi", 12, true, 30, overflowReject)).toThrow(RangeError);
		expect(monthDayToEpochDays("dangi", 12, true, 30, overflowConstrain)).toBe(774);
	});
});

test.for(["chinese", "dangi"] as const)(
	"epochDaysToDate should match to ICU4X for results of monthDayToEpochDays: %s",
	(calendar) => {
		for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
			for (const inLeapYear of [true, false]) {
				for (const day of [1, 29, 30]) {
					const epochDays = monthDayToEpochDays(
						calendar,
						monthNumber,
						inLeapYear,
						day,
						overflowConstrain,
					);
					expect(epochDaysToDate(calendar, epochDays)).toEqual(
						epochDaysToDateByIcu(calendar, epochDays),
					);
				}
			}
		}
	},
);
