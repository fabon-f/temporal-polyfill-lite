import { balanceIsoYearMonth } from "../../PlainYearMonth.ts";
import { epochDaysToIsoDate } from "../abstractOperations.ts";
import { createLruCache } from "../cacheMap.ts";
import { createMonthCode, isoDayOfWeek, type CalendarDateRecord } from "../calendars.ts";
import { clamp, isWithin } from "../math.ts";
import { extractYearMonthDay, type YearMonthDayNumber } from "./dateTimeFormatter.ts";
import {
	calendarIntegersToEpochDays as calendarIntegersToEpochDaysIslamicTabular,
	epochDaysToDate as epochDaysToDateIslamicTabular,
} from "./islamicTabular.ts";

const cache = createLruCache<number, YearMonthDayNumber>(5000);

function getYearMonthDay(epochDays: number) {
	const ymdFromCache = cache.$get(epochDays);
	if (ymdFromCache) {
		return ymdFromCache;
	}
	const ymd = extractYearMonthDay("islamic-umalqura", epochDays);
	cache.$set(epochDays, ymd);
	return ymd;
}

function getFirstDayOfMonth(year: number, month: number): number {
	const balancedYearMonth = balanceIsoYearMonth(year, month);
	const civilEpochDays = calendarIntegersToEpochDaysIslamicTabular(
		"islamic-civil",
		balancedYearMonth.$year,
		balancedYearMonth.$month,
		1,
	);
	// All existing implementation (original ICU4C, Apple's ICU4C, and ICU4X) falls back to "islamic-civil" calendar where year < 1300 or year > 1600,
	// and this behavior is explicitly defined in the Intl era and month code proposal
	if (isWithin(year * 12 + month, 15540, 19260)) {
		return civilEpochDays + 14 - getYearMonthDay(civilEpochDays + 14).$day + 1;
	}
	return civilEpochDays;
}

function daysInMonth(year: number, month: number) {
	return getFirstDayOfMonth(year, month + 1) - getFirstDayOfMonth(year, month);
}

export function calendarIntegersToEpochDays(
	arithmeticYear: number,
	ordinalMonth: number,
	day: number,
): number {
	return getFirstDayOfMonth(arithmeticYear, ordinalMonth) + day - 1;
}

export function epochDaysToDate(epochDays: number): CalendarDateRecord {
	const civilDate = epochDaysToDateIslamicTabular("islamic-civil", epochDays);
	const isoDate = epochDaysToIsoDate(epochDays);
	if (epochDays < -33600 || epochDays > 76200) {
		return civilDate;
	}
	return {
		$era: "ah",
		get $eraYear() {
			return getYearMonthDay(epochDays).$year;
		},
		get $year() {
			return getYearMonthDay(epochDays).$year;
		},
		get $month() {
			return getYearMonthDay(epochDays).$month;
		},
		get $monthCode() {
			return createMonthCode(getYearMonthDay(epochDays).$month);
		},
		get $day() {
			return getYearMonthDay(epochDays).$day;
		},
		$dayOfWeek: isoDayOfWeek(isoDate),
		get $dayOfYear() {
			return epochDays - getFirstDayOfMonth(getYearMonthDay(epochDays).$year, 1) + 1;
		},
		$weekOfYear: { $week: undefined, $year: undefined },
		$daysInWeek: 7,
		get $daysInMonth() {
			const date = getYearMonthDay(epochDays);
			return (
				getFirstDayOfMonth(date.$year, date.$month + 1) -
				getFirstDayOfMonth(date.$year, date.$month)
			);
		},
		get $daysInYear() {
			const year = getYearMonthDay(epochDays).$year;
			return getFirstDayOfMonth(year + 1, 1) - getFirstDayOfMonth(year, 1);
		},
		$monthsInYear: 12,
		get $inLeapYear() {
			const year = getYearMonthDay(epochDays).$year;
			return getFirstDayOfMonth(year + 1, 1) - getFirstDayOfMonth(year, 1) > 354;
		},
	};
}

export function constrainDay(year: number, month: number, day: number) {
	if (day < 30) {
		return day;
	}
	return clamp(day, 1, daysInMonth(year, month));
}

export function monthDayToEpochDays(month: number, day: number): number {
	for (let year = 1392; ; year--) {
		if (constrainDay(year, month, day) === day) {
			const epoch = calendarIntegersToEpochDays(year, month, day);
			if (epoch <= 1095) {
				return epoch;
			}
		}
	}
}
