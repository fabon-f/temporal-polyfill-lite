import type { ISODateRecord } from "../PlainDate.js";
import { toZeroPaddedDecimalString } from "./ecmascript.js";

type YearWeekRecord = [year: number, week: number];

/** alternative to `CanonicalizeCalendar` */
export function assertCalendar(id: string) {
	if (id.toLowerCase() !== "iso8601") {
		throw new RangeError();
	}
}

const utcTimeStampOnCorrespondingCalendarCycle = (
	year: number,
	month: number,
	day: number,
) => {
	// gregorian has a cycle of 400 years including day of week
	// avoid one and two-digit years to deal with `Date.UTC`
	return Date.UTC((year % 400) + 800, month - 1, day);
};

/** `ISODaysInMonth` */
export const isoDaysInMonth = (year: number, month: number): number => {
	return (
		// "13th month"
		(utcTimeStampOnCorrespondingCalendarCycle(year, month + 1, 1) -
			utcTimeStampOnCorrespondingCalendarCycle(year, month, 1)) /
		86400000
	);
};

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
export const isoDayOfYear = ([year, month, day]: ISODateRecord) => {
	return (
		(utcTimeStampOnCorrespondingCalendarCycle(year, month, day) -
			utcTimeStampOnCorrespondingCalendarCycle(year, 1, 1)) /
			86400000 +
		1
	);
};

/** `ISODayOfWeek` */
export const isoDayOfWeek = ([year, month, day]: ISODateRecord) => {
	return (
		((new Date(
			utcTimeStampOnCorrespondingCalendarCycle(year, month, day),
		).getUTCDay() +
			6) %
			7) +
		1
	);
};

/** part of `CalendarISOToDate` */
export const monthToMonthCode = (n: number) =>
	`M${toZeroPaddedDecimalString(n, 2)}`;
