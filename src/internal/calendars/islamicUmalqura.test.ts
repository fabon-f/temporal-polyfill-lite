import { expect, test } from "vitest";
import {
	calendarIntegersToEpochDays,
	epochDaysToDate,
	monthDayToEpochDays,
} from "./islamicUmalqura.ts";
import { calendarIntegersToEpochDaysByIcu, epochDaysToDateByIcu } from "./testUtils.ts";

test("monthDayToEpochDays", () => {
	expect(monthDayToEpochDays(1, 1)).toEqual(776);
	expect(monthDayToEpochDays(1, 29)).toEqual(804);
	expect(monthDayToEpochDays(1, 30)).toEqual(805);
	expect(monthDayToEpochDays(2, 1)).toEqual(806);
	expect(monthDayToEpochDays(2, 29)).toEqual(834);
	expect(monthDayToEpochDays(2, 30)).toEqual(125);
	expect(monthDayToEpochDays(3, 1)).toEqual(835);
	expect(monthDayToEpochDays(3, 29)).toEqual(863);
	expect(monthDayToEpochDays(3, 30)).toEqual(509);
	expect(monthDayToEpochDays(4, 1)).toEqual(864);
	expect(monthDayToEpochDays(4, 29)).toEqual(892);
	expect(monthDayToEpochDays(4, 30)).toEqual(893);
	expect(monthDayToEpochDays(5, 1)).toEqual(894);
	expect(monthDayToEpochDays(5, 29)).toEqual(922);
	expect(monthDayToEpochDays(5, 30)).toEqual(568);
	expect(monthDayToEpochDays(6, 1)).toEqual(923);
	expect(monthDayToEpochDays(6, 29)).toEqual(951);
	expect(monthDayToEpochDays(6, 30)).toEqual(952);
	expect(monthDayToEpochDays(7, 1)).toEqual(953);
	expect(monthDayToEpochDays(7, 29)).toEqual(981);
	expect(monthDayToEpochDays(7, 30)).toEqual(-81);
	expect(monthDayToEpochDays(8, 1)).toEqual(982);
	expect(monthDayToEpochDays(8, 29)).toEqual(1010);
	expect(monthDayToEpochDays(8, 30)).toEqual(1011);
	expect(monthDayToEpochDays(9, 1)).toEqual(1012);
	expect(monthDayToEpochDays(9, 29)).toEqual(1040);
	expect(monthDayToEpochDays(9, 30)).toEqual(1041);
	expect(monthDayToEpochDays(10, 1)).toEqual(1042);
	expect(monthDayToEpochDays(10, 29)).toEqual(1070);
	expect(monthDayToEpochDays(10, 30)).toEqual(362);
	expect(monthDayToEpochDays(11, 1)).toEqual(1071);
	expect(monthDayToEpochDays(11, 25)).toEqual(1095);
	expect(monthDayToEpochDays(11, 26)).toEqual(742);
	expect(monthDayToEpochDays(11, 29)).toEqual(745);
	expect(monthDayToEpochDays(11, 30)).toEqual(746);
	expect(monthDayToEpochDays(12, 1)).toEqual(747);
	expect(monthDayToEpochDays(12, 29)).toEqual(775);
	expect(monthDayToEpochDays(12, 30)).toEqual(421);
});

test("calendarIntegersToEpochDays should match to ICU4X in the well-defined range", () => {
	for (let year = 1300; year <= 1600; year++) {
		for (let month = 1; month <= 12; month++) {
			const startEpochDays = calendarIntegersToEpochDays(year, month, 1);
			expect(startEpochDays).toEqual(
				calendarIntegersToEpochDaysByIcu("islamic-umalqura", year, month, 1),
			);
			const daysInMonth = epochDaysToDateByIcu("islamic-umalqura", startEpochDays).$daysInMonth;
			expect(calendarIntegersToEpochDays(year, month, daysInMonth)).toEqual(
				calendarIntegersToEpochDaysByIcu("islamic-umalqura", year, month, daysInMonth),
			);
		}
	}
});

test("epochDaysToDate should match to ICU4X in the well-defined range", () => {
	for (let year = 1300; year <= 1600; year++) {
		for (let month = 1; month <= 12; month++) {
			const startEpochDays = calendarIntegersToEpochDaysByIcu("islamic-umalqura", year, month, 1);
			const expected = epochDaysToDateByIcu("islamic-umalqura", startEpochDays);
			expect(epochDaysToDate(startEpochDays)).toEqual(expected);

			const endEpochDays = calendarIntegersToEpochDaysByIcu(
				"islamic-umalqura",
				year,
				month,
				expected.$daysInMonth,
			);
			expect(epochDaysToDate(endEpochDays)).toEqual(
				epochDaysToDateByIcu("islamic-umalqura", endEpochDays),
			);
		}
	}
});
