import type { ISODateRecord } from "../PlainDate.ts";
import { isoDateToEpochDays } from "./ao.ts";
import { toZeroPaddedDecimalString } from "./ecmascript.ts";
import { mod } from "./math.ts";

type YearWeekRecord = [year: number, week: number];

/** alternative to `CanonicalizeCalendar` */
export function assertCalendar(id: string) {
	if (!/^[iI][sS][oO]8601$/.test(id)) {
		throw new RangeError();
	}
}

/** `ISODaysInMonth` */
export function isoDaysInMonth(year: number, month: number): number {
	return (
		isoDateToEpochDays(year, month + 1, 1) - isoDateToEpochDays(year, month, 1)
	);
}

const isoWeeksInYear = (year: number) => {
	// patterns when the year has 53 ISO weeks:
	// * 01-01: Thursday, 12-31: Thursday (normal year)
	// * 01-01: Thursday, 12-31: Friday (leap year)
	// * 01-01: Wednesday, 12-31: Thursday (leap year)
	return isoDayOfWeek([year, 1, 1]) === 4 || isoDayOfWeek([year, 12, 31]) === 4
		? 53
		: 52;
};

/** `ISOWeekOfYear` */
export function isoWeekOfYear(isoDate: ISODateRecord): YearWeekRecord {
	const year = isoDate[0];
	const weekNumber = Math.floor(
		(isoDayOfYear(isoDate) + 10 - isoDayOfWeek(isoDate)) / 7,
	);
	if (weekNumber < 1) {
		// last week of the previous year
		return [year - 1, isoWeeksInYear(year - 1)];
	}
	if (weekNumber > isoWeeksInYear(year)) {
		return [year + 1, 1];
	}
	return [year, weekNumber];
}

/** `ISODayOfYear` */
export function isoDayOfYear([year, month, day]: ISODateRecord) {
	return isoDateToEpochDays(year, month, day) - isoDateToEpochDays(year, 1, 0);
}

/** `ISODayOfWeek` */
export function isoDayOfWeek(record: ISODateRecord) {
	return mod(isoDateToEpochDays(...record) + 3, 7) + 1;
}

/** part of `CalendarISOToDate` */
export function monthToMonthCode(n: number) {
	return `M${toZeroPaddedDecimalString(n, 2)}`;
}
