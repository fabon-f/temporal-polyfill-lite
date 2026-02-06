import {
	createDateDurationRecord,
	zeroDateDuration,
	type DateDurationRecord,
} from "../Duration.ts";
import {
	addDaysToIsoDate,
	compareIsoDate,
	createIsoDateRecord,
	getInternalSlotForPlainDate,
	isoDateWithinLimits,
	regulateIsoDate,
	validateIsoDate,
	type IsoDateRecord,
} from "../PlainDate.ts";
import { getInternalSlotForPlainDateTime } from "../PlainDateTime.ts";
import { getInternalSlotForPlainMonthDay } from "../PlainMonthDay.ts";
import {
	balanceIsoYearMonth,
	getInternalSlotForPlainYearMonth,
	isoYearMonthWithinLimits,
} from "../PlainYearMonth.ts";
import { getInternalSlotForZonedDateTime } from "../ZonedDateTime.ts";
import {
	isoDateRecordToEpochDays,
	isoDateToEpochDays,
	mathematicalDaysInYear,
	mathematicalInLeapYear,
	toOffsetString,
} from "./abstractOperations.ts";
import { assert, assertNotUndefined } from "./assertion.ts";
import { parseTemporalCalendarString } from "./dateTimeParser.ts";
import {
	toIntegerWithTruncation,
	toNumber,
	toPositiveIntegerWithTruncation,
	toPrimitive,
	toString,
	validateString,
} from "./ecmascript.ts";
import {
	MONTH_DAY,
	YEAR_MONTH,
	DATE,
	type Overflow,
	type ShowCalendarName,
	showCalendarName,
	overflowConstrain,
} from "./enum.ts";
import {
	calendarNotSupported,
	emptyFields,
	invalidEra,
	invalidMonthCode,
	missingField,
	monthMismatch,
	outOfBoundsDate,
	yearMismatch,
} from "./errorMessages.ts";
import { divFloor, divTrunc, modFloor } from "./math.ts";
import { createNullPrototypeObject } from "./object.ts";
import { asciiLowerCase, toZeroPaddedDecimalString } from "./string.ts";
import { toTemporalTimeZoneIdentifier } from "./timeZones.ts";
import { Unit } from "./unit.ts";
import { mapUnlessUndefined, throwRangeError, throwTypeError } from "./utils.ts";

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
type SupportedNonIsoCalendarsWithEras = "gregory";

export const calendarFieldKeys = {
	$era: "era",
	$eraYear: "eraYear",
	$year: "year",
	$month: "month",
	$monthCode: "monthCode",
	$day: "day",
	$hour: "hour",
	$minute: "minute",
	$second: "second",
	$millisecond: "millisecond",
	$microsecond: "microsecond",
	$nanosecond: "nanosecond",
	$offset: "offset",
	$timeZone: "timeZone",
} as const;
const calendarFieldKeyList = [
	calendarFieldKeys.$era,
	calendarFieldKeys.$eraYear,
	calendarFieldKeys.$year,
	calendarFieldKeys.$month,
	calendarFieldKeys.$monthCode,
	calendarFieldKeys.$day,
	calendarFieldKeys.$hour,
	calendarFieldKeys.$minute,
	calendarFieldKeys.$second,
	calendarFieldKeys.$millisecond,
	calendarFieldKeys.$microsecond,
	calendarFieldKeys.$nanosecond,
	calendarFieldKeys.$offset,
	calendarFieldKeys.$timeZone,
];
export type CalendarFieldKey = (typeof calendarFieldKeys)[keyof typeof calendarFieldKeys];

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
		throwRangeError(calendarNotSupported(id));
	}
	return id as SupportedCalendars;
}

/** `ParseMonthCode` */
function parseMonthCode(arg: unknown): [monthNumber: number, isLeapMonth: boolean] {
	const monthCode = toPrimitive(arg);
	validateString(monthCode);
	const result = monthCode.match(/M(\d\d)L?/);
	if (!result || monthCode === "M00") {
		throwRangeError(invalidMonthCode(monthCode));
	}
	assert(result[1] !== undefined);
	return [toNumber(result[1]), monthCode.length === 4];
}

/** `CreateMonthCode` */
function createMonthCode(monthNumber: number, isLeapMonth = false): string {
	assert(isLeapMonth || monthNumber > 0);
	return `M${toZeroPaddedDecimalString(monthNumber, 2)}${isLeapMonth ? "L" : ""}`;
}

const fieldValues = {
	[calendarFieldKeys.$era]: [toString],
	[calendarFieldKeys.$eraYear]: [toIntegerWithTruncation],
	[calendarFieldKeys.$year]: [toIntegerWithTruncation],
	[calendarFieldKeys.$month]: [toPositiveIntegerWithTruncation],
	[calendarFieldKeys.$monthCode]: [(arg: unknown) => createMonthCode(...parseMonthCode(arg))],
	[calendarFieldKeys.$day]: [toPositiveIntegerWithTruncation],
	[calendarFieldKeys.$hour]: [toIntegerWithTruncation, 0],
	[calendarFieldKeys.$minute]: [toIntegerWithTruncation, 0],
	[calendarFieldKeys.$second]: [toIntegerWithTruncation, 0],
	[calendarFieldKeys.$millisecond]: [toIntegerWithTruncation, 0],
	[calendarFieldKeys.$microsecond]: [toIntegerWithTruncation, 0],
	[calendarFieldKeys.$nanosecond]: [toIntegerWithTruncation, 0],
	[calendarFieldKeys.$offset]: [toOffsetString],
	[calendarFieldKeys.$timeZone]: [toTemporalTimeZoneIdentifier],
} as Record<CalendarFieldKey, [conversion: (value: any) => any, defaultValue?: any]>;

/** `PrepareCalendarFields` */
export function prepareCalendarFields(
	calendar: SupportedCalendars,
	fields: object,
	fieldNames: CalendarFieldKey[],
	requiredFieldNames?: string[],
): CalendarFieldsRecord {
	fieldNames = [...fieldNames, ...calendarExtraFields(calendar, fieldNames)].sort();
	const result = createEmptyCalendarFieldsRecord();
	let hasAnyField = false;
	for (const property of fieldNames) {
		const value = (fields as Record<string, unknown>)[property];
		if (value !== undefined) {
			hasAnyField = true;
			result[property] = fieldValues[property][0](value);
		} else if (requiredFieldNames) {
			if (requiredFieldNames.includes(property)) {
				throwTypeError(missingField(property));
			}
			result[property] = fieldValues[property][1];
		}
	}
	if (!requiredFieldNames && !hasAnyField) {
		throwTypeError(emptyFields);
	}
	return result;
}

/** `CalendarFieldKeysPresent` */
function calendarFieldKeysPresent(additionalFields: CalendarFieldsRecord): CalendarFieldKey[] {
	return calendarFieldKeyList.filter((k) => additionalFields[k] !== undefined);
}

/** `CalendarMergeFields` */
export function calendarMergeFields(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	additionalFields: CalendarFieldsRecord,
): CalendarFieldsRecord {
	const additionalKeys = calendarFieldKeysPresent(additionalFields);
	const overriddenKeys = calendarFieldKeysToIgnore(calendar, additionalKeys);
	const merged = createEmptyCalendarFieldsRecord();
	const fieldsKeys = calendarFieldKeysPresent(fields);
	for (const k of calendarFieldKeyList) {
		if (fieldsKeys.includes(k) && !overriddenKeys.includes(k)) {
			// @ts-expect-error
			merged[k] = fields[k];
		}
		if (additionalKeys.includes(k)) {
			// @ts-expect-error
			merged[k] = additionalFields[k];
		}
	}
	return merged;
}

/** `CalendarDateAdd` */
export function calendarDateAdd(
	calendar: SupportedCalendars,
	isoDate: IsoDateRecord,
	duration: DateDurationRecord,
	overflow: Overflow,
): IsoDateRecord {
	const balancedYearMonth = balanceIsoYearMonth(
		isoDate.$year + duration.$years,
		isoDate.$month + duration.$months,
	);
	return validateIsoDate(
		addDaysToIsoDate(
			regulateIsoDate(balancedYearMonth.$year, balancedYearMonth.$month, isoDate.$day, overflow),
			duration.$weeks * 7 + duration.$days,
		),
	);
}

/** `CalendarDateUntil` */
export function calendarDateUntil(
	_calendar: SupportedCalendars,
	one: IsoDateRecord,
	two: IsoDateRecord,
	largestUnit: Unit,
): DateDurationRecord {
	const sign = compareIsoDate(two, one);
	if (!sign) {
		return zeroDateDuration();
	}
	if (largestUnit === Unit.Week || largestUnit === Unit.Day) {
		const days =
			isoDateToEpochDays(two.$year, two.$month - 1, two.$day) -
			isoDateToEpochDays(one.$year, one.$month - 1, one.$day);
		return largestUnit === Unit.Week
			? createDateDurationRecord(0, 0, divTrunc(days, 7) + 0, (days % 7) + 0)
			: createDateDurationRecord(0, 0, 0, days);
	}
	const months =
		two.$year * 12 +
		two.$month -
		one.$year * 12 -
		one.$month -
		// subtract 1 if adding months to `one` surpasses `two`
		(sign * (one.$day - two.$day) > 0 ? sign : 0);
	const balancedYearMonth = balanceIsoYearMonth(one.$year, one.$month + months);
	const days =
		isoDateRecordToEpochDays(two) -
		isoDateRecordToEpochDays(
			regulateIsoDate(
				balancedYearMonth.$year,
				balancedYearMonth.$month,
				one.$day,
				overflowConstrain,
			),
		);
	if (largestUnit === Unit.Year) {
		return createDateDurationRecord(divTrunc(months, 12), (months % 12) + 0, 0, days);
	}
	return createDateDurationRecord(0, months, 0, days);
}

/** `ToTemporalCalendarIdentifier` */
export function toTemporalCalendarIdentifier(temporalCalendarLike: unknown): SupportedCalendars {
	const slot =
		getInternalSlotForPlainDate(temporalCalendarLike) ||
		getInternalSlotForPlainDateTime(temporalCalendarLike) ||
		getInternalSlotForPlainMonthDay(temporalCalendarLike) ||
		getInternalSlotForPlainYearMonth(temporalCalendarLike) ||
		getInternalSlotForZonedDateTime(temporalCalendarLike);
	if (slot) {
		return slot.$calendar;
	}
	validateString(temporalCalendarLike);
	return canonicalizeCalendar(parseTemporalCalendarString(temporalCalendarLike));
}

/** `GetTemporalCalendarIdentifierWithISODefault` */
export function getTemporalCalendarIdentifierWithIsoDefault(item: object): SupportedCalendars {
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
	return validateIsoDate(calendarDateToISO(calendar, fields, overflow));
}

/** `CalendarYearMonthFromFields` */
export function calendarYearMonthFromFields(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateRecord {
	fields.day = 1;
	calendarResolveFields(calendar, fields, YEAR_MONTH);
	const result = calendarDateToISO(calendar, fields, overflow);
	if (!isoYearMonthWithinLimits(result)) {
		throwRangeError(outOfBoundsDate);
	}
	return result;
}

/** `CalendarMonthDayFromFields` */
export function calendarMonthDayFromFields(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateRecord {
	calendarResolveFields(calendar, fields, MONTH_DAY);
	const result = calendarMonthDayToIsoReferenceDate(calendar, fields, overflow);
	assert(isoDateWithinLimits(result));
	return result;
}

/** `FormatCalendarAnnotation` */
export function formatCalendarAnnotation(
	id: SupportedCalendars,
	showCalendar: ShowCalendarName,
): string {
	if (
		showCalendar === showCalendarName.$never ||
		(showCalendar === showCalendarName.$auto && id === "iso8601")
	) {
		return "";
	}
	return `[${showCalendar === showCalendarName.$critical ? "!" : ""}u-ca=${id}]`;
}

/** `CalendarEquals` */
export function calendarEquals(one: SupportedCalendars, two: SupportedCalendars): boolean {
	return one === two;
}

/** `ISODaysInMonth` */
export function isoDaysInMonth(year: number, month: number): number {
	return isoDateToEpochDays(year, month, 1) - isoDateToEpochDays(year, month - 1, 1);
}

function isoWeeksInYear(year: number): number {
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

/** `CalendarDateToISO` */
function calendarDateToISO(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateRecord {
	assert(calendar === "iso8601" || calendar === "gregory");
	return regulateIsoDate(
		fields[calendarFieldKeys.$year]!,
		fields[calendarFieldKeys.$month]!,
		fields[calendarFieldKeys.$day]!,
		overflow,
	);
}

/** `NonISOCalendarISOToDate` */
function nonIsoCalendarIsoToDate(
	calendar: SupportedNonIsoCalendars,
	isoDate: IsoDateRecord,
): CalendarDateRecord {
	assert(calendar === "gregory");
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

/** `CalendarMonthDayToISOReferenceDate` */
function calendarMonthDayToIsoReferenceDate(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateRecord {
	assert(calendar === "iso8601" || calendar === "gregory");
	const result = regulateIsoDate(
		fields[calendarFieldKeys.$year] ?? 1972,
		fields[calendarFieldKeys.$month]!,
		fields[calendarFieldKeys.$day]!,
		overflow,
	);
	return createIsoDateRecord(1972, result.$month, result.$day);
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
function calendarExtraFields(
	calendar: SupportedCalendars,
	fields: CalendarFieldKey[],
): CalendarFieldKey[] {
	if (calendarSupportsEra(calendar) && fields.includes("year")) {
		return ["era", "eraYear"];
	}
	return [];
}

/** `CalendarFieldKeysToIgnore` */
function calendarFieldKeysToIgnore(
	calendar: SupportedCalendars,
	keys: CalendarFieldKey[],
): CalendarFieldKey[] {
	const ignoredKeys: CalendarFieldKey[] = [];
	for (const k of keys) {
		if (k === calendarFieldKeys.$month) {
			ignoredKeys.push(calendarFieldKeys.$monthCode);
		}
		if (k === calendarFieldKeys.$monthCode) {
			ignoredKeys.push(calendarFieldKeys.$month);
		}
		if (
			calendarSupportsEra(calendar) &&
			(
				[
					calendarFieldKeys.$era,
					calendarFieldKeys.$eraYear,
					calendarFieldKeys.$year,
				] as CalendarFieldKey[]
			).includes(k)
		) {
			ignoredKeys.push(calendarFieldKeys.$era, calendarFieldKeys.$eraYear, calendarFieldKeys.$year);
		}
	}
	return ignoredKeys;
}

function isoResolveFields(
	fields: CalendarFieldsRecord,
	type: typeof DATE | typeof YEAR_MONTH | typeof MONTH_DAY,
) {
	if (type !== MONTH_DAY && fields[calendarFieldKeys.$year] === undefined) {
		throwTypeError(missingField(calendarFieldKeys.$year));
	}
	if (type !== YEAR_MONTH && fields[calendarFieldKeys.$day] === undefined) {
		throwTypeError(missingField(calendarFieldKeys.$day));
	}
	if (
		fields[calendarFieldKeys.$monthCode] === undefined &&
		fields[calendarFieldKeys.$month] === undefined
	) {
		throwTypeError(missingField("month, monthCode"));
	}
	const monthCode = mapUnlessUndefined(fields[calendarFieldKeys.$monthCode], parseMonthCode);
	if (monthCode) {
		if (
			monthCode[0] > 12 ||
			monthCode[1] ||
			(fields[calendarFieldKeys.$month] !== undefined &&
				monthCode[0] !== fields[calendarFieldKeys.$month])
		) {
			throwRangeError(monthMismatch);
		}
		fields[calendarFieldKeys.$month] = monthCode[0];
	}
}

/** `NonISOResolveFields` */
function nonIsoResolveFields(
	calendar: SupportedNonIsoCalendars,
	fields: CalendarFieldsRecord,
	type: typeof DATE | typeof YEAR_MONTH | typeof MONTH_DAY = DATE,
): void {
	const era = fields[calendarFieldKeys.$era];
	const eraYear = fields[calendarFieldKeys.$eraYear];
	const year = fields[calendarFieldKeys.$year];
	const monthCode = fields[calendarFieldKeys.$monthCode];
	const month = fields[calendarFieldKeys.$month];
	const day = fields[calendarFieldKeys.$day];
	if (type !== MONTH_DAY || monthCode === undefined || month !== undefined) {
		// requires year component
		if (
			year === undefined &&
			(!calendarSupportsEra(calendar) || era === undefined || eraYear === undefined)
		) {
			throwTypeError(missingField("year, era, eraYear"));
		}
	}
	if (calendarSupportsEra(calendar)) {
		if ((era === undefined) !== (eraYear === undefined)) {
			throwTypeError();
		}
	}
	if (type !== YEAR_MONTH && day === undefined) {
		throwTypeError(missingField("day"));
	}
	if (month === monthCode) {
		// both are `undefined`
		throwTypeError(missingField("month, monthCode"));
	}
	if (calendarSupportsEra(calendar) && eraYear !== undefined) {
		assertNotUndefined(era);
		const arithmeticYear = calendarDateArithmeticYearForEraYear(
			calendar,
			canonicalizeEraInCalendar(calendar, era),
			eraYear,
		);
		if (year !== undefined && year !== arithmeticYear) {
			throwRangeError(yearMismatch);
		}
		fields[calendarFieldKeys.$year] = arithmeticYear;
	}
	fields[calendarFieldKeys.$era] = fields[calendarFieldKeys.$eraYear] = undefined;
	assert(calendar === "gregory");
	return isoResolveFields(fields, type);
}

/** `CalendarResolveFields` */
function calendarResolveFields(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	type: typeof DATE | typeof YEAR_MONTH | typeof MONTH_DAY = DATE,
) {
	if (calendar === "iso8601") {
		isoResolveFields(fields, type);
	} else {
		nonIsoResolveFields(calendar, fields, type);
	}
}

/** `CalendarSupportsEra` */
function calendarSupportsEra(calendar: SupportedCalendars): boolean {
	return calendar === "gregory";
}

/** `canonicalizeEraInCalendar` */
function canonicalizeEraInCalendar(calendar: SupportedNonIsoCalendars, era: string): string {
	assert(calendar === "gregory");
	if (era === "ad" || era === "ce") {
		return "ce";
	}
	if (era === "bc" || era === "bce") {
		return "bce";
	}
	throwRangeError(invalidEra(era));
}

/** `CalendarDateArithmeticYearForEraYear` */
function calendarDateArithmeticYearForEraYear(
	calendar: SupportedNonIsoCalendarsWithEras,
	era: string,
	eraYear: number,
): number {
	assert(calendar === "gregory");
	if (canonicalizeEraInCalendar(calendar, era) === "ce") {
		return eraYear;
	}
	return 1 - eraYear;
}

export function createEmptyCalendarFieldsRecord(): CalendarFieldsRecord {
	return createNullPrototypeObject({}) as CalendarFieldsRecord;
}
