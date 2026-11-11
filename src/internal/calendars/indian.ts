import {
	epochDaysToIsoDate,
	isoDateToEpochDays,
	mathematicalInLeapYear as mathematicalInLeapYearIso,
} from "../abstractOperations.ts";
import { createMonthCode, isoDayOfWeek, type CalendarDateRecord } from "../calendars.ts";
import { clamp } from "../math.ts";

function mathematicalInLeapYear(arithmeticYear: number) {
	return mathematicalInLeapYearIso(arithmeticYear + 78);
}

function firstDayOfYear(arithmeticYear: number): number {
	return isoDateToEpochDays(arithmeticYear + 78, 2, 22 - mathematicalInLeapYear(arithmeticYear));
}

export function daysInMonth(year: number, month: number) {
	return month > 6 || (month === 1 && !mathematicalInLeapYear(year)) ? 30 : 31;
}

export function calendarIntegersToEpochDays(
	arithmeticYear: number,
	ordinalMonth: number,
	day: number,
): number {
	return (
		firstDayOfYear(arithmeticYear) -
		1 +
		(ordinalMonth - 1) * 30 +
		day +
		clamp(ordinalMonth - 1, 0, 6) +
		(ordinalMonth === 1 || mathematicalInLeapYear(arithmeticYear) ? 0 : -1)
	);
}

export function epochDaysToDate(epochDays: number): CalendarDateRecord {
	const isoDateYear = epochDaysToIsoDate(epochDays).$year;
	const arithmeticYear =
		firstDayOfYear(isoDateYear - 78) <= epochDays ? isoDateYear - 78 : isoDateYear - 79;
	let month = 12;
	for (; calendarIntegersToEpochDays(arithmeticYear, month, 1) > epochDays; month--) {}
	return {
		$era: "shaka",
		$eraYear: arithmeticYear,
		$year: arithmeticYear,
		$month: month,
		$monthCode: createMonthCode(month),
		$day: epochDays - calendarIntegersToEpochDays(arithmeticYear, month, 1) + 1,
		$dayOfWeek: isoDayOfWeek(epochDaysToIsoDate(epochDays)),
		$dayOfYear: epochDays - firstDayOfYear(arithmeticYear) + 1,
		$weekOfYear: { $week: undefined, $year: undefined },
		$daysInWeek: 7,
		$daysInMonth: daysInMonth(arithmeticYear, month),
		$daysInYear: 365 + mathematicalInLeapYear(arithmeticYear),
		$monthsInYear: 12,
		$inLeapYear: !!mathematicalInLeapYear(arithmeticYear),
	};
}

export function monthDayToEpochDays(month: number, day: number) {
	return calendarIntegersToEpochDays(month * 30 + day <= 310 ? 1894 : 1893, month, day);
}
