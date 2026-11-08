import { expect, test } from "vitest";
import { calendarIntegersToEpochDays, epochDaysToDate } from "./islamicUmalqura.ts";
import { calendarIntegersToEpochDaysByIcu, epochDaysToDateByIcu } from "./testUtils.ts";

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
