import { epochDaysToIsoDate } from "../abstractOperations.ts";
import {
	createMonthCode,
	isoDayOfWeek,
	type CalendarDateRecord,
	type MonthCode,
} from "../calendars.ts";
import { divFloor, modFloor } from "../math.ts";

export function isLeapYear(arithmeticYear: number) {
	// https://judaism.stackexchange.com/questions/6376/how-do-i-know-if-its-a-hebrew-leap-year/6377#6377
	return modFloor(7 * arithmeticYear + 1, 19) < 7;
}

function monthNumber(year: number, month: number) {
	return divFloor(235 * year - 234, 19) + month;
}

function newYearEpochDays(year: number) {
	const monthsUntilNewYear = monthNumber(year, 1) - 1;
	const originalHalakim = modFloor(13753 * monthsUntilNewYear + 5604, 25920);
	let epochDays =
		-2092590 + 29 * monthsUntilNewYear + divFloor(13753 * monthsUntilNewYear + 5604, 25920);
	if (
		originalHalakim >= 19440 ||
		(!isLeapYear(year) && modFloor(epochDays, 7) === 5 && originalHalakim >= 9924) ||
		(isLeapYear(year - 1) && modFloor(epochDays, 7) === 4 && originalHalakim >= 16789)
	) {
		epochDays++;
	}
	const mod7 = modFloor(epochDays, 7);
	if (mod7 === 1 || mod7 === 3 || mod7 === 6) {
		epochDays++;
	}
	return epochDays;
}

export function calendarIntegersToEpochDays(
	arithmeticYear: number,
	ordinalMonth: number,
	day: number,
) {
	// -1: deficient, 0: regular, 1: complete
	const yearType =
		((newYearEpochDays(arithmeticYear + 1) - newYearEpochDays(arithmeticYear)) % 30) - 24;
	return (
		newYearEpochDays(arithmeticYear) +
		(isLeapYear(arithmeticYear)
			? Math.round(29.53 * (ordinalMonth - 1) + 0.35)
			: Math.ceil(29.5 * (ordinalMonth - 1))) +
		(yearType === 1 && ordinalMonth >= 3 ? 1 : yearType === -1 && ordinalMonth >= 4 ? -1 : 0) +
		day -
		1
	);
}

export function daysInMonth(year: number, month: number) {
	// `calendarIntegersToEpochDays` returns intended result even when `month` === `monthsInYear` + 1
	return (
		calendarIntegersToEpochDays(year, month + 1, 1) - calendarIntegersToEpochDays(year, month, 1)
	);
}

export function balanceYearMonth(year: number, month: number) {
	const monthNum = monthNumber(year, 1) + month - 1;
	const balancedYear = Math.floor(((monthNum - 1) * 19 + 17) / 235) + 1;
	return {
		$year: balancedYear,
		$month: monthNum - monthNumber(balancedYear, 1) + 1,
	};
}

export function epochDaysToDate(epochDays: number): CalendarDateRecord {
	const isoDate = epochDaysToIsoDate(epochDays);
	let arithmeticYear = divFloor(epochDays + 2092590, 365.2468222) + 2;
	for (; calendarIntegersToEpochDays(arithmeticYear, 1, 1) > epochDays; arithmeticYear--) {}
	let month = isLeapYear(arithmeticYear) ? 13 : 12;
	for (; calendarIntegersToEpochDays(arithmeticYear, month, 1) > epochDays; month--) {}
	return {
		$era: "am",
		$eraYear: arithmeticYear,
		$year: arithmeticYear,
		$month: month,
		$monthCode: isLeapYear(arithmeticYear)
			? createMonthCode(month <= 5 ? month : month - 1, month === 6)
			: createMonthCode(month),
		$day: epochDays - calendarIntegersToEpochDays(arithmeticYear, month, 1) + 1,
		$dayOfWeek: isoDayOfWeek(isoDate),
		$dayOfYear: epochDays - calendarIntegersToEpochDays(arithmeticYear, 1, 1) + 1,
		$weekOfYear: { $week: undefined, $year: undefined },
		$daysInWeek: 7,
		$daysInMonth: daysInMonth(arithmeticYear, month),
		$daysInYear:
			calendarIntegersToEpochDays(arithmeticYear + 1, 1, 1) -
			calendarIntegersToEpochDays(arithmeticYear, 1, 1),
		$monthsInYear: isLeapYear(arithmeticYear) ? 13 : 12,
		$inLeapYear: isLeapYear(arithmeticYear),
	};
}

export function untilInMonths(
	startYear: number,
	startMonth: number,
	targetYear: number,
	targetMonth: number,
) {
	return monthNumber(targetYear, targetMonth) - monthNumber(startYear, startMonth);
}

export function monthCodeToOrdinal(year: number, monthCode: MonthCode) {
	return monthCode[0] + +(isLeapYear(year) && monthCode[0] + +monthCode[1] >= 6);
}

export function monthDayToEpochDays(monthNumber: number, isLeapMonth: boolean, day: number) {
	if (isLeapMonth) {
		// M05L
		return calendarIntegersToEpochDays(5730, 6, day);
	}
	if ((monthNumber === 2 || monthNumber === 3) && day === 30) {
		return calendarIntegersToEpochDays(5732, monthNumber, day);
	}
	// M05L doesn't appear here, so ordinal month equals to the number in a month code
	const epochDays1 = calendarIntegersToEpochDays(5733, monthNumber, day);
	return epochDays1 <= 1095 ? epochDays1 : calendarIntegersToEpochDays(5732, monthNumber, day);
}
