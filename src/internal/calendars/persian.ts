import { epochDaysToIsoDate, isoDateToEpochDays } from "../abstractOperations.ts";
import { createLruCache } from "../cacheMap.ts";
import { createMonthCode, isoDayOfWeek, type CalendarDateRecord } from "../calendars.ts";
import { clamp, divFloor, isWithin } from "../math.ts";
import { extractYearMonthDay } from "./dateTimeFormatter.ts";

const newYearCache = createLruCache<number, number>(1000);

function startOfYear(arithmeticYear: number): number {
	const newYearEpochDays = newYearCache.$get(arithmeticYear);
	// newYearEpochDays should not be 0 (1970-01-01 is not a Persian new year)
	if (newYearEpochDays) {
		return newYearEpochDays;
	}
	// 1st May is within the valid range (between -271821-04-20 and +275760-09-13) for all valid ISO years (between -271821 and 275760)
	const epochDaysAfterNewYear = isoDateToEpochDays(arithmeticYear + 621, 4, 1);
	const ymd = extractYearMonthDay("persian", epochDaysAfterNewYear);
	const startOfYearEpochDays =
		epochDaysAfterNewYear - dayOfYearFromMonthDay(ymd.$month, ymd.$day) + 1;
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

function getDate(epochDays: number) {
	const isoYear = epochDaysToIsoDate(epochDays).$year;
	// a vernal equinox always be 20th, 21st, or 22nd March in well-defined ranges (from 1827 to 2120 in ISO calendar),
	// but implementation-defined outside that range.
	// It can be even 28th Feb or 11th April for extreme years in existing implementations.
	let year =
		isoYear -
		622 +
		+(isoDateToEpochDays(isoYear, 2, isWithin(isoYear, 1827, 2120) ? 19 : -5) < epochDays);
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
	return {
		$era: "ap",
		get $eraYear() {
			return getDate(epochDays).$year;
		},
		get $year() {
			return getDate(epochDays).$year;
		},
		get $month() {
			return getDate(epochDays).$month;
		},
		get $monthCode() {
			return createMonthCode(getDate(epochDays).$month);
		},
		get $day() {
			return getDate(epochDays).$day;
		},
		$dayOfWeek: isoDayOfWeek(epochDaysToIsoDate(epochDays)),
		get $dayOfYear() {
			return getDate(epochDays).$dayOfYear;
		},
		$weekOfYear: { $week: undefined, $year: undefined },
		$daysInWeek: 7,
		get $daysInMonth() {
			const date = getDate(epochDays);
			return date.$month <= 6 ? 31 : date.$month !== 12 ? 30 : isLeapYear(date.$year) ? 30 : 29;
		},
		get $daysInYear() {
			return isLeapYear(getDate(epochDays).$year) ? 366 : 365;
		},
		$monthsInYear: 12,
		get $inLeapYear() {
			return isLeapYear(getDate(epochDays).$year);
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
