import { createIsoDateRecord, type IsoDateRecord } from "../PlainDate.ts";
import {
	isoDateToEpochDays,
	mathematicalDaysInYear,
	mathematicalInLeapYear,
} from "./abstractOperations.ts";
import { divModFloor } from "./math.ts";
import { asciiLowerCase, ToZeroPaddedDecimalString } from "./string.ts";
import { unreachable } from "./utils.ts";

type YearWeekRecord =
	| {
			$year: number;
			$week: number;
	  }
	| {
			$year: undefined;
			$week: undefined;
	  };

interface CalendarDateRecord {
	$era?: string | undefined;
	$eraYear?: number | undefined;
	$year: number;
	$month: number;
	$monthCode: string;
	$day: number;
	$dayOfWeek: number;
	$dayOfYear: number;
	$weekOfYear: YearWeekRecord;
	$daysInWeek: number;
	$daysInMonth: number;
	$daysInYear: number;
	$monthsInYear: number;
	$inLeapYear: boolean;
}

export type SupportedNonIsoCalendars = "gregory";
export type SupportedCalendars = "iso8601" | SupportedNonIsoCalendars;

/** `CanonicalizeCalendar` */
export function canonicalizeCalendar(id: string): SupportedCalendars {
	id = asciiLowerCase(id);
	if (!["iso8601", "gregory"].includes(id)) {
		throw new RangeError();
	}
	return id as SupportedCalendars;
}

/** `CreateMonthCode` */
function createMonthCode(monthNumber: number, isLeapMonth = false) {
	return `M${ToZeroPaddedDecimalString(monthNumber, 2)}${isLeapMonth ? "L" : ""}`;
}

/** `ISODaysInMonth` */
export function isoDaysInMonth(year: number, month: number): number {
	return isoDateToEpochDays(year, month, 1) - isoDateToEpochDays(year, month - 1, 1);
}

function isoWeeksInYear(year: number) {
	// patterns when the year has 53 ISO weeks:
	// * 01-01: Thursday, 12-31: Thursday (normal year)
	// * 01-01: Thursday, 12-31: Friday (leap year)
	// * 01-01: Wednesday, 12-31: Thursday (leap year)
	return isoDayOfWeek(createIsoDateRecord(year, 1, 1)) === 4 ||
		isoDayOfWeek(createIsoDateRecord(year, 12, 31)) === 4
		? 53
		: 52;
}

/** `ISOWeekOfYear` */
function isoWeekOfYear(isoDate: IsoDateRecord): YearWeekRecord {
	const year = isoDate.$year;
	const weekNumber = divModFloor(isoDayOfYear(isoDate) + 10 - isoDayOfWeek(isoDate), 7)[1];
	if (weekNumber < 1) {
		// last week of the previous year
		return {
			$year: year - 1,
			$week: isoWeeksInYear(year - 1),
		};
	}
	if (weekNumber > isoWeeksInYear(year)) {
		return {
			$year: year + 1,
			$week: 1,
		};
	}
	return {
		$year: year,
		$week: weekNumber,
	};
}

/** `ISODayOfYear` */
function isoDayOfYear(isoDate: IsoDateRecord): number {
	return (
		isoDateToEpochDays(isoDate.$year, isoDate.$month - 1, isoDate.$day) -
		isoDateToEpochDays(isoDate.$year, 0, 0)
	);
}

/** `ISODayOfWeek` */
function isoDayOfWeek(isoDate: IsoDateRecord): number {
	return (
		divModFloor(isoDateToEpochDays(isoDate.$year, isoDate.$month - 1, isoDate.$day) + 3, 7)[1] + 1
	);
}

/** `NonISOCalendarISOToDate` */
function nonIsoCalendarISOToDate(
	calendar: SupportedNonIsoCalendars,
	isoDate: IsoDateRecord,
): CalendarDateRecord {
	if (calendar === "gregory") {
		return {
			$era: isoDate.$year > 0 ? "ce" : "bce",
			$eraYear: isoDate.$year > 0 ? isoDate.$year : 1 - isoDate.$year,
			...isoCalendarIsoToDate(isoDate),
			$weekOfYear: {
				$year: undefined,
				$week: undefined,
			},
		};
	}
	unreachable(calendar);
}

function isoCalendarIsoToDate(isoDate: IsoDateRecord): CalendarDateRecord {
	return {
		$year: isoDate.$year,
		$month: isoDate.$month,
		$monthCode: createMonthCode(isoDate.$month),
		$day: isoDate.$day,
		$dayOfWeek: isoDayOfWeek(isoDate),
		$dayOfYear: isoDayOfYear(isoDate),
		$weekOfYear: isoWeekOfYear(isoDate),
		$daysInWeek: 7,
		$daysInMonth: isoDaysInMonth(isoDate.$year, isoDate.$month),
		$daysInYear: mathematicalDaysInYear(isoDate.$year),
		$monthsInYear: 12,
		$inLeapYear: !!mathematicalInLeapYear(isoDate.$year),
	};
}

/** `CalendarISOToDate` */
export function calendarIsoToDate(
	calendar: SupportedCalendars,
	isoDate: IsoDateRecord,
): CalendarDateRecord {
	if (calendar === "iso8601") {
		return isoCalendarIsoToDate(isoDate);
	} else {
		return nonIsoCalendarISOToDate(calendar, isoDate);
	}
}
