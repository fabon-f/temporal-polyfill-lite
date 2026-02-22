import type { IsoDateRecord } from "../../PlainDate.ts";
import {
	epochDaysToIsoDate,
	isoDateRecordToEpochDays,
	isoDateToEpochDays,
} from "../abstractOperations.ts";
import { createLruCache } from "../cacheMap.ts";
import { createMonthCode, isoDayOfWeek, type CalendarDateRecord } from "../calendars.ts";
import { clamp, divFloor } from "../math.ts";
import { extractYearMonthDay } from "./dateTimeFormatter.ts";

const newYearCache = createLruCache<number, number>(1000);

function startOfYear(arithmeticYear: number): number {
	const newYearEpochDays = newYearCache.$get(arithmeticYear);
	// newYearEpochDays should not be 0 (1970-01-01 is not a Persian new year)
	if (newYearEpochDays) {
		return newYearEpochDays;
	}
	// 1st April should be after a vernal equinox
	const epochDaysFewDaysAfterNewYear = isoDateToEpochDays(arithmeticYear + 621, 3, 1);
	const startOfYearEpochDays =
		epochDaysFewDaysAfterNewYear -
		extractYearMonthDay("persian", epochDaysFewDaysAfterNewYear).$day +
		1;
	newYearCache.$set(arithmeticYear, startOfYearEpochDays);
	return startOfYearEpochDays;
}

export function dayOfYearFromMonthDay(month: number, day: number) {
	return (month - 1) * 30 + day + clamp(month - 1, 0, 6);
}

export function calendarIntegersToEpochDays(
	arithmeticYear: number,
	ordinalMonth: number,
	day: number,
): number {
	return (
		startOfYear(arithmeticYear) - 1 + (ordinalMonth - 1) * 30 + day + clamp(ordinalMonth - 1, 0, 6)
	);
}

export function monthDayFromDayOfYear(dayOfYear: number): [number, number] {
	const month =
		dayOfYear <= 186 ? divFloor(dayOfYear - 1, 31) + 1 : divFloor(dayOfYear - 7, 30) + 1;
	return [month, dayOfYear - dayOfYearFromMonthDay(month, 1) + 1];
}

function isLeapYear(arithmeticYear: number) {
	return startOfYear(arithmeticYear + 1) - startOfYear(arithmeticYear) > 365;
}

function getDate(isoDate: IsoDateRecord) {
	const epochDays = isoDateRecordToEpochDays(isoDate);
	let year = isoDate.$month * 30 + isoDate.$day <= 105 ? isoDate.$year - 622 : isoDate.$year - 621;
	let firstDay = startOfYear(year);
	if (firstDay > epochDays) {
		year--;
		firstDay = startOfYear(year);
	}
	const monthDay = monthDayFromDayOfYear(epochDays - firstDay + 1);
	return {
		$year: year,
		$month: monthDay[0],
		$day: monthDay[1],
		$dayOfYear: epochDays - firstDay + 1,
	};
}

export function epochDaysToDate(epochDays: number): CalendarDateRecord {
	const isoDate = epochDaysToIsoDate(epochDays);
	return {
		$era: "ap",
		get $eraYear() {
			return getDate(isoDate).$year;
		},
		get $year() {
			return getDate(isoDate).$year;
		},
		get $month() {
			return getDate(isoDate).$month;
		},
		get $monthCode() {
			return createMonthCode(getDate(isoDate).$month);
		},
		get $day() {
			return getDate(isoDate).$day;
		},
		$dayOfWeek: isoDayOfWeek(isoDate),
		get $dayOfYear() {
			return getDate(isoDate).$dayOfYear;
		},
		$weekOfYear: { $week: undefined, $year: undefined },
		$daysInWeek: 7,
		get $daysInMonth() {
			const date = getDate(isoDate);
			return date.$month <= 6 ? 31 : date.$month !== 12 ? 30 : isLeapYear(date.$year) ? 30 : 29;
		},
		get $daysInYear() {
			return isLeapYear(getDate(isoDate).$year) ? 366 : 365;
		},
		$monthsInYear: 12,
		get $inLeapYear() {
			return isLeapYear(getDate(isoDate).$year);
		},
	};
}

export function constrainDay(year: number, month: number, day: number) {
	if (month <= 6) {
		return clamp(day, 1, 31);
	}
	if (month !== 12) {
		return clamp(day, 1, 30);
	}
	if (day < 30) {
		return day;
	}
	return clamp(day, 1, isLeapYear(year) ? 30 : 29);
}

export function monthDayToEpochDays(month: number, day: number) {
	if (month === 12 && day === 30) {
		for (let y = 1350; ; y--) {
			if (isLeapYear(y)) {
				return calendarIntegersToEpochDays(y, month, day);
			}
		}
	}
	const epochDays = calendarIntegersToEpochDays(1351, month, day);
	return epochDays <= 1095 ? epochDays : calendarIntegersToEpochDays(1350, month, day);
}
