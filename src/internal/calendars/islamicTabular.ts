import { epochDaysToIsoDate } from "../abstractOperations.ts";
import { createMonthCode, isoDayOfWeek, type CalendarDateRecord } from "../calendars.ts";
import { divFloor, modFloor } from "../math.ts";

function epoch(calendar: "islamic-civil" | "islamic-tbla") {
	return +(calendar === "islamic-civil") - 492149;
}

function isLeapYear(arithmeticYear: number) {
	return modFloor((arithmeticYear + 4) * 11, 30) < 11;
}

export function daysInMonth(year: number, month: number) {
	return month === 12 && isLeapYear(year) ? 30 : 29 + (month % 2);
}

export function calendarIntegersToEpochDays(
	calendar: "islamic-civil" | "islamic-tbla",
	arithmeticYear: number,
	ordinalMonth: number,
	day: number,
): number {
	return (
		epoch(calendar) +
		(arithmeticYear - 1) * 354 +
		divFloor((arithmeticYear + 3) * 11, 30) +
		Math.ceil((ordinalMonth - 1) * 29.5) +
		day -
		2
	);
}

export function epochDaysToDate(
	calendar: "islamic-civil" | "islamic-tbla",
	epochDays: number,
): CalendarDateRecord {
	const year = divFloor((epochDays - epoch(calendar)) * 30 + 15, 10631) + 1;
	let month = 12;
	for (; calendarIntegersToEpochDays(calendar, year, month, 1) > epochDays; month--) {}
	return {
		$era: year > 0 ? "ah" : "bh",
		$eraYear: year > 0 ? year : 1 - year,
		$year: year,
		$month: month,
		$monthCode: createMonthCode(month),
		$day: epochDays - calendarIntegersToEpochDays(calendar, year, month, 1) + 1,
		$dayOfWeek: isoDayOfWeek(epochDaysToIsoDate(epochDays)),
		$dayOfYear: epochDays - calendarIntegersToEpochDays(calendar, year, 1, 1) + 1,
		$weekOfYear: { $week: undefined, $year: undefined },
		$daysInWeek: 7,
		$daysInMonth: daysInMonth(year, month),
		$daysInYear: +isLeapYear(year) + 354,
		$monthsInYear: 12,
		$inLeapYear: isLeapYear(year),
	};
}

export function monthDayToEpochDays(
	calendar: "islamic-civil" | "islamic-tbla",
	month: number,
	day: number,
) {
	if (month === 12 && day === 30) {
		return calendarIntegersToEpochDays(calendar, 1390, month, day);
	}
	return calendarIntegersToEpochDays(
		calendar,
		+(month * 30 + day <= -(calendar === "islamic-civil") + 356) + 1391,
		month,
		day,
	);
}
