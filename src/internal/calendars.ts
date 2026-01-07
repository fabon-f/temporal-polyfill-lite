import {
	createIsoDateRecord,
	getInternalSlotForPlainDate,
	isoDateWithinLimits,
	regulateIsoDate,
	type IsoDateRecord,
} from "../PlainDate.ts";
import { getInternalSlotForPlainDateTime } from "../PlainDateTime.ts";
import { getInternalSlotForPlainMonthDay } from "../PlainMonthDay.ts";
import { getInternalSlotForPlainYearMonth } from "../PlainYearMonth.ts";
import { getInternalSlotForZonedDateTime } from "../ZonedDateTime.ts";
import {
	isoDateRecordToEpochDays,
	isoDateToEpochDays,
	mathematicalDaysInYear,
	mathematicalInLeapYear,
	toOffsetString,
} from "./abstractOperations.ts";
import { parseTemporalCalendarString } from "./dateTimeParser.ts";
import {
	toIntegerWithTruncation,
	toNumber,
	toPositiveIntegerWithTruncation,
	ToPrimitive,
	toString,
} from "./ecmascript.ts";
import { monthDay, yearMonth, date, type Overflow } from "./enum.ts";
import { divFloor, modFloor } from "./math.ts";
import { asciiLowerCase, ToZeroPaddedDecimalString } from "./string.ts";
import { toTemporalTimeZoneIdentifier } from "./timeZones.ts";
import { mapUnlessUndefined, unreachable } from "./utils.ts";

type YearWeekRecord =
	| {
			$year: number;
			$week: number;
	  }
	| {
			$year: undefined;
			$week: undefined;
	  };

export interface CalendarDateRecord {
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

export interface CalendarFieldsRecord {
	era?: string | undefined;
	eraYear?: number | undefined;
	year?: number | undefined;
	month?: number | undefined;
	monthCode?: string | undefined;
	day?: number | undefined;
	hour?: number | undefined;
	minute?: number | undefined;
	second?: number | undefined;
	millisecond?: number | undefined;
	microsecond?: number | undefined;
	nanosecond?: number | undefined;
	offset?: string | undefined;
	timeZone?: string | undefined;
}

/** `CanonicalizeCalendar` */
export function canonicalizeCalendar(id: string): SupportedCalendars {
	id = asciiLowerCase(id);
	if (!["iso8601", "gregory"].includes(id)) {
		throw new RangeError();
	}
	return id as SupportedCalendars;
}

/** `ParseMonthCode` */
function parseMonthCode(arg: unknown): [monthNumber: number, isLeapMonth: boolean] {
	const monthCode = ToPrimitive(arg);
	if (typeof monthCode !== "string") {
		throw new TypeError();
	}
	const result = monthCode.match(/M(\d\d)L?/);
	if (!result || monthCode === "M00") {
		throw new RangeError();
	}
	return [toNumber(result[1]!), monthCode.length === 4];
}

/** `CreateMonthCode` */
function createMonthCode(monthNumber: number, isLeapMonth = false) {
	return `M${ToZeroPaddedDecimalString(monthNumber, 2)}${isLeapMonth ? "L" : ""}`;
}

const fieldValues = {
	era: [toString],
	eraYear: [toIntegerWithTruncation],
	year: [toIntegerWithTruncation],
	month: [toPositiveIntegerWithTruncation],
	monthCode: [(arg: unknown) => createMonthCode(...parseMonthCode(arg))],
	day: [toPositiveIntegerWithTruncation],
	hour: [toIntegerWithTruncation, 0],
	minute: [toIntegerWithTruncation, 0],
	second: [toIntegerWithTruncation, 0],
	millisecond: [toIntegerWithTruncation, 0],
	microsecond: [toIntegerWithTruncation, 0],
	nanosecond: [toIntegerWithTruncation, 0],
	offset: [toOffsetString],
	timeZone: [toTemporalTimeZoneIdentifier],
} as Record<string, [conversion: (value: any) => any, defaultValue?: any]>;

/** `PrepareCalendarFields` */
export function prepareCalendarFields(
	calendar: SupportedCalendars,
	fields: Record<string, unknown>,
	fieldNames: string[],
	requiredFieldNames: string[],
): CalendarFieldsRecord {
	fieldNames = [...fieldNames, ...calendarExtraFields(calendar, fieldNames)].sort();
	const result: any = Object.create(null);
	let hasAnyField = false;
	for (const property of fieldNames) {
		const value = fields[property];
		if (value !== undefined) {
			hasAnyField = true;
			result[property] = fieldValues[property]![0](value);
		} else {
			if (requiredFieldNames.includes(property)) {
				throw new TypeError();
			}
			result[property] = fieldValues[property]![1];
		}
	}
	if (requiredFieldNames.length === 0 && !hasAnyField) {
		throw new TypeError();
	}
	return result;
}

/** `ToTemporalCalendarIdentifier` */
function toTemporalCalendarIdentifier(temporalCalendarLike: unknown): SupportedCalendars {
	const slot =
		getInternalSlotForPlainDate(temporalCalendarLike) ||
		getInternalSlotForPlainDateTime(temporalCalendarLike) ||
		getInternalSlotForPlainMonthDay(temporalCalendarLike) ||
		getInternalSlotForPlainYearMonth(temporalCalendarLike) ||
		getInternalSlotForZonedDateTime(temporalCalendarLike);
	if (slot) {
		return slot.$calendar;
	}
	if (typeof temporalCalendarLike !== "string") {
		throw new TypeError();
	}
	return canonicalizeCalendar(parseTemporalCalendarString(temporalCalendarLike));
}

/** `GetTemporalCalendarIdentifierWithISODefault` */
export function getTemporalCalendarIdentifierWithIsoDefault(item: object) {
	const slot =
		getInternalSlotForPlainDate(item) ||
		getInternalSlotForPlainDateTime(item) ||
		getInternalSlotForPlainMonthDay(item) ||
		getInternalSlotForPlainYearMonth(item) ||
		getInternalSlotForZonedDateTime(item);
	if (slot) {
		return slot.$calendar;
	}
	const calendarLike = (item as Record<string, unknown>)["calendar"];
	if (calendarLike === undefined) {
		return "iso8601";
	}
	return toTemporalCalendarIdentifier(calendarLike);
}

/** `CalendarDateFromFields` */
export function calendarDateFromFields(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateRecord {
	calendarResolveFields(calendar, fields);
	const result = calendarDateToISO(calendar, fields, overflow);
	if (!isoDateWithinLimits(result)) {
		throw new RangeError();
	}
	return result;
}

/** `CalendarEquals` */
export function calendarEquals(one: SupportedCalendars, two: SupportedCalendars) {
	return one === two;
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
export function isoWeekOfYear(isoDate: IsoDateRecord): YearWeekRecord {
	const year = isoDate.$year;
	const weekNumber = divFloor(isoDayOfYear(isoDate) + 10 - isoDayOfWeek(isoDate), 7);
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
export function isoDayOfYear(isoDate: IsoDateRecord): number {
	return isoDateRecordToEpochDays(isoDate) - isoDateToEpochDays(isoDate.$year, 0, 0);
}

/** `ISODayOfWeek` */
export function isoDayOfWeek(isoDate: IsoDateRecord): number {
	return modFloor(isoDateRecordToEpochDays(isoDate) + 3, 7) + 1;
}

function calendarDateToISO(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateRecord {
	if (calendar === "iso8601") {
		return regulateIsoDate(fields.year!, fields.month!, fields.day!, overflow);
	}
	/** `NonISOCalendarDateToISO` */
	if (calendar === "gregory") {
		return regulateIsoDate(fields.year!, fields.month!, fields.day!, overflow);
	}
	unreachable(calendar);
}

/** `NonISOCalendarISOToDate` */
function nonIsoCalendarIsoToDate(
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
		return nonIsoCalendarIsoToDate(calendar, isoDate);
	}
}

/** `CalendarExtraFields` */
function calendarExtraFields(calendar: SupportedCalendars, fields: string[]): string[] {
	if (calendarSupportsEra(calendar) && fields.includes("year")) {
		return ["era", "eraYear"];
	}
	return [];
}

function isoResolveFields(
	fields: CalendarFieldsRecord,
	type: typeof date | typeof yearMonth | typeof monthDay,
) {
	if (type !== monthDay && fields.year === undefined) {
		throw new TypeError();
	}
	if (type !== yearMonth && fields.day === undefined) {
		throw new TypeError();
	}
	const monthCode = mapUnlessUndefined(fields.monthCode, parseMonthCode);
	if (monthCode) {
		if (
			monthCode[0] > 12 ||
			monthCode[1] ||
			(fields.month !== undefined && monthCode[0] !== fields.month)
		) {
			throw new RangeError();
		}
		fields.month = monthCode[0];
	}
}

/** `NonISOResolveFields` */
function nonIsoResolveFields(
	calendar: SupportedNonIsoCalendars,
	fields: CalendarFieldsRecord,
	type: typeof date | typeof yearMonth | typeof monthDay = date,
): void {
	if ((fields.era === undefined) !== (fields.eraYear === undefined)) {
		throw new TypeError();
	}
	if (calendar === "gregory") {
		if (fields.era !== undefined) {
			if (!["ce", "ad", "bce", "bc"].includes(fields.era)) {
				throw new RangeError();
			}
			const year = calendarDateArithmeticYearForEraYear(calendar, fields.era, fields.eraYear!);
			if (fields.year !== undefined && fields.year !== year) {
				throw new RangeError();
			}
			fields.year = year;
		}
		isoResolveFields(fields, type);
		return;
	}
	unreachable(calendar);
}

/** `CalendarResolveFields` */
function calendarResolveFields(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	type: typeof date | typeof yearMonth | typeof monthDay = date,
): void {
	if (calendar === "iso8601") {
		isoResolveFields(fields, type);
		return;
	}
	nonIsoResolveFields(calendar, fields, type);
}

/** `CalendarSupportsEra` */
function calendarSupportsEra(calendar: SupportedCalendars): boolean {
	return calendar === "gregory";
}

/** `canonicalizeEraInCalendar` */
function canonicalizeEraInCalendar(calendar: SupportedNonIsoCalendars, era: string): string {
	if (calendar === "gregory") {
		if (era === "ad") {
			return "bc";
		}
		if (era === "bc") {
			return "bce";
		}
		return era;
	}
	unreachable(calendar);
}

/** `CalendarDateArithmeticYearForEraYear` */
function calendarDateArithmeticYearForEraYear(
	calendar: SupportedNonIsoCalendars,
	era: string,
	eraYear: number,
): number {
	if (calendar === "gregory") {
		if (canonicalizeEraInCalendar(calendar, era) === "ce") {
			return eraYear;
		}
		return 1 - eraYear;
	}
	// assertion
	throw new Error();
}
