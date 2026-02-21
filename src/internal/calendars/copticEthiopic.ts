import { epochDaysToIsoDate } from "../abstractOperations.ts";
import { createMonthCode, isoDayOfWeek, type CalendarDateRecord } from "../calendars.ts";
import { divFloor, modFloor } from "../math.ts";

function epoch(calendar: "coptic" | "ethioaa" | "ethiopic") {
	// [0001, M01, 01] -> 1th day
	return calendar === "coptic" ? -615924 : calendar === "ethioaa" ? -2725608 : -716733;
}

function mathematicalInLeapYear(year: number) {
	return +!((year + 1) % 4);
}

export function daysInMonth(year: number, month: number) {
	return month === 13 ? 5 + mathematicalInLeapYear(year) : 30;
}

export function calendarIntegersToEpochDays(
	calendar: "coptic" | "ethioaa" | "ethiopic",
	arithmeticYear: number,
	ordinalMonth: number,
	day: number,
): number {
	return Math.floor(365.25 * arithmeticYear) + (ordinalMonth - 1) * 30 + day + epoch(calendar);
}

export function epochDaysToDate(
	calendar: "coptic" | "ethioaa" | "ethiopic",
	epochDays: number,
): CalendarDateRecord {
	const arithmeticYear = divFloor(epochDays - epoch(calendar) + 365, 365.25) - 1;
	const dayOfYear = epochDays - calendarIntegersToEpochDays(calendar, arithmeticYear, 1, 1) + 1;
	const month = divFloor(dayOfYear - 1, 30) + 1;
	return {
		$era: calendar === "coptic" || (calendar === "ethiopic" && arithmeticYear > 0) ? "am" : "aa",
		$eraYear:
			calendar === "ethiopic" && arithmeticYear <= 0 ? arithmeticYear + 5500 : arithmeticYear,
		$year: arithmeticYear,
		$month: month,
		$monthCode: createMonthCode(month),
		$day: modFloor(dayOfYear - 1, 30) + 1,
		$dayOfWeek: isoDayOfWeek(epochDaysToIsoDate(epochDays)),
		$dayOfYear: dayOfYear,
		$weekOfYear: { $week: undefined, $year: undefined },
		$daysInWeek: 7,
		$daysInMonth: daysInMonth(arithmeticYear, month),
		$daysInYear: mathematicalInLeapYear(arithmeticYear) + 365,
		$monthsInYear: 13,
		$inLeapYear: !!mathematicalInLeapYear(arithmeticYear),
	};
}

export function monthDayToEpochDays(month: number, day: number) {
	return month === 13 && day === 6 ? 618 : (((month - 1) * 30 + day + 252) % 365) + 731;
}
