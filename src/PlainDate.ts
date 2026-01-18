import {
	applySignToDurationSlot,
	combineDateAndTimeDuration,
	createTemporalDuration,
	createTemporalDurationSlot,
	Duration,
	temporalDurationFromInternal,
	toDateDurationRecordWithoutTime,
	toTemporalDuration,
} from "./Duration.ts";
import {
	epochDaysToIsoDate,
	getDifferenceSettings,
	getTemporalOverflowOption,
	getTemporalShowCalendarNameOption,
	isoDateRecordToEpochDays,
	isoDateToEpochDays,
	isoDateToFields,
	isPartialTemporalObject,
} from "./internal/abstractOperations.ts";
import { assert, assertNotUndefined } from "./internal/assertion.ts";
import {
	calendarDateAdd,
	calendarDateFromFields,
	calendarDateUntil,
	calendarEquals,
	calendarFieldKeys,
	calendarIsoToDate,
	calendarMergeFields,
	calendarMonthDayFromFields,
	calendarYearMonthFromFields,
	canonicalizeCalendar,
	formatCalendarAnnotation,
	getTemporalCalendarIdentifierWithIsoDefault,
	isoDaysInMonth,
	prepareCalendarFields,
	toTemporalCalendarIdentifier,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { parseIsoDateTime, temporalDateTimeStringRegExp } from "./internal/dateTimeParser.ts";
import { getOptionsObject, toIntegerWithTruncation } from "./internal/ecmascript.ts";
import {
	DATE,
	disambiguationCompatible,
	overflowConstrain,
	showCalendarName,
	type Overflow,
	type ShowCalendarName,
} from "./internal/enum.ts";
import { clamp, compare, isWithin, type NumberSign } from "./internal/math.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { toZeroPaddedDecimalString } from "./internal/string.ts";
import { createTimeDurationFromSeconds } from "./internal/timeDuration.ts";
import {
	createOffsetCacheMap,
	getEpochNanosecondsFor,
	getStartOfDay,
	toTemporalTimeZoneIdentifier,
} from "./internal/timeZones.ts";
import { notImplementedYet } from "./internal/utils.ts";
import {
	combineIsoDateAndTimeRecord,
	createTemporalDateTime,
	getInternalSlotOrThrowForPlainDateTime,
	isoDateTimeWithinLimits,
	isPlainDateTime,
} from "./PlainDateTime.ts";
import { createTemporalMonthDay } from "./PlainMonthDay.ts";
import {
	getInternalSlotOrThrowForPlainTime,
	noonTimeRecord,
	toTemporalTime,
	toTimeRecordOrMidnight,
} from "./PlainTime.ts";
import { createTemporalYearMonth } from "./PlainYearMonth.ts";
import {
	createTemporalZonedDateTime,
	getInternalSlotOrThrowForZonedDateTime,
	getIsoDateTimeForZonedDateTimeSlot,
	isZonedDateTime,
} from "./ZonedDateTime.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

export interface IsoDateRecord {
	$year: number;
	$month: number;
	$day: number;
}

interface PlainDateSlot {
	$isoDate: IsoDateRecord;
	$calendar: SupportedCalendars;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, PlainDateSlot>();

/** `CreateISODateRecord` */
export function createIsoDateRecord(year: number, month: number, day: number): IsoDateRecord {
	assert(isValidIsoDate(year, month, day));
	return {
		$year: year,
		$month: month,
		$day: day,
	};
}

/** `CreateTemporalDate` */
export function createTemporalDate(
	date: IsoDateRecord,
	calendar: SupportedCalendars,
	instance = Object.create(PlainDate.prototype) as PlainDate,
): PlainDate {
	if (!isoDateWithinLimits(date)) {
		throw new RangeError();
	}
	const slot = createPlainDateSlot(date, calendar);
	slots.set(instance, slot);
	return instance;
}

/** `ToTemporalDate` */
function toTemporalDate(item: unknown, options?: unknown): PlainDate {
	if (isObject(item)) {
		if (isPlainDate(item)) {
			getTemporalOverflowOption(getOptionsObject(options));
			const slot = getInternalSlotOrThrowForPlainDate(item);
			return createTemporalDate(slot.$isoDate, slot.$calendar);
		}
		if (isZonedDateTime(item)) {
			getTemporalOverflowOption(getOptionsObject(options));
			const slot = getInternalSlotOrThrowForZonedDateTime(item);
			return createTemporalDate(getIsoDateTimeForZonedDateTimeSlot(slot).$isoDate, slot.$calendar);
		}
		if (isPlainDateTime(item)) {
			getTemporalOverflowOption(getOptionsObject(options));
			const slot = getInternalSlotOrThrowForPlainDateTime(item);
			return createTemporalDate(slot.$isoDateTime.$isoDate, slot.$calendar);
		}
		const calendar = getTemporalCalendarIdentifierWithIsoDefault(item);
		const fields = prepareCalendarFields(calendar, item, ["year", "month", "monthCode", "day"], []);
		const oveflow = getTemporalOverflowOption(getOptionsObject(options));
		return createTemporalDate(calendarDateFromFields(calendar, fields, oveflow), calendar);
	}
	if (typeof item !== "string") {
		throw new TypeError();
	}
	const result = parseIsoDateTime(item, [temporalDateTimeStringRegExp]);
	assertNotUndefined(result.$year);
	const calendar = canonicalizeCalendar(result.$calendar || "iso8601");
	getTemporalOverflowOption(getOptionsObject(options));
	return createTemporalDate(
		createIsoDateRecord(result.$year, result.$month, result.$day),
		calendar,
	);
}

/** `RegulateISODate` */
export function regulateIsoDate(
	year: number,
	month: number,
	day: number,
	overflow: Overflow,
): IsoDateRecord {
	if (overflow === overflowConstrain) {
		month = clamp(month, 1, 12);
		return createIsoDateRecord(year, month, clamp(day, 1, isoDaysInMonth(year, month)));
	}
	if (!isValidIsoDate(year, month, day)) {
		throw new RangeError();
	}
	return createIsoDateRecord(year, month, day);
}

/** `IsValidISODate` */
export function isValidIsoDate(year: number, month: number, day: number): boolean {
	return isWithin(month, 1, 12) && isWithin(day, 1, isoDaysInMonth(year, month));
}

/** `AddDaysToISODate` */
export function addDaysToIsoDate(isoDate: IsoDateRecord, days: number): IsoDateRecord {
	return epochDaysToIsoDate(
		isoDateToEpochDays(isoDate.$year, isoDate.$month - 1, isoDate.$day + days),
	);
}

/** `PadISOYear` */
export function padIsoYear(year: number): string {
	if (isWithin(year, 0, 9999)) {
		return toZeroPaddedDecimalString(year, 4);
	}
	return `${year < 0 ? "-" : "+"}${toZeroPaddedDecimalString(Math.abs(year), 6)}`;
}

/** `TemporalDateToString` */
function temporalDateToString(slot: PlainDateSlot, showCalendar: ShowCalendarName) {
	return `${padIsoYear(slot.$isoDate.$year)}-${toZeroPaddedDecimalString(slot.$isoDate.$month, 2)}-${toZeroPaddedDecimalString(slot.$isoDate.$day, 2)}${formatCalendarAnnotation(slot.$calendar, showCalendar)}`;
}

/** `ISODateWithinLimits` */
export function isoDateWithinLimits(isoDate: IsoDateRecord): boolean {
	return isoDateTimeWithinLimits(combineIsoDateAndTimeRecord(isoDate, noonTimeRecord()));
}

/** `CompareISODate` */
export function compareIsoDate(isoDate1: IsoDateRecord, isoDate2: IsoDateRecord): NumberSign {
	return compare(isoDateRecordToEpochDays(isoDate1), isoDateRecordToEpochDays(isoDate2));
}

/** `DifferenceTemporalPlainDate` */
function differenceTemporalPlainDate(
	operationSign: 1 | -1,
	temporalDate: PlainDateSlot,
	other: unknown,
	options: unknown,
): Duration {
	const otherSlot = getInternalSlotOrThrowForPlainDate(toTemporalDate(other));
	if (!calendarEquals(temporalDate.$calendar, otherSlot.$calendar)) {
		throw new RangeError();
	}
	const settings = getDifferenceSettings(
		operationSign,
		getOptionsObject(options),
		DATE,
		[],
		"day",
		"day",
	);
	if (!compareIsoDate(temporalDate.$isoDate, otherSlot.$isoDate)) {
		return createTemporalDuration(createTemporalDurationSlot(0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
	}
	const duration = combineDateAndTimeDuration(
		calendarDateUntil(
			temporalDate.$calendar,
			temporalDate.$isoDate,
			otherSlot.$isoDate,
			settings.$largestUnit,
		),
		createTimeDurationFromSeconds(0),
	);
	if (settings.$smallestUnit !== "day" || settings.$roundingIncrement !== 1) {
		// TODO
		notImplementedYet();
	}
	return createTemporalDuration(
		applySignToDurationSlot(temporalDurationFromInternal(duration, "day"), operationSign),
	);
}

/** `AddDurationToDate` */
function addDurationToDate(
	operationSign: 1 | -1,
	temporalDate: PlainDateSlot,
	temporalDurationLike: unknown,
	options: unknown,
): PlainDate {
	return createTemporalDate(
		calendarDateAdd(
			temporalDate.$calendar,
			temporalDate.$isoDate,
			toDateDurationRecordWithoutTime(
				applySignToDurationSlot(toTemporalDuration(temporalDurationLike), operationSign),
			),
			getTemporalOverflowOption(getOptionsObject(options)),
		),
		temporalDate.$calendar,
	);
}

export function getInternalSlotForPlainDate(plainDate: unknown): PlainDateSlot | undefined {
	return slots.get(plainDate);
}

export function getInternalSlotOrThrowForPlainDate(plainDate: unknown): PlainDateSlot {
	const slot = getInternalSlotForPlainDate(plainDate);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

export function isPlainDate(item: unknown): boolean {
	return !!getInternalSlotForPlainDate(item);
}

function createPlainDateSlot(date: IsoDateRecord, calendar: SupportedCalendars): PlainDateSlot {
	return {
		$isoDate: date,
		$calendar: calendar,
	} as PlainDateSlot;
}

export class PlainDate {
	constructor(isoYear: unknown, isoMonth: unknown, isoDay: unknown, calendar: unknown = "iso8601") {
		if (!new.target) {
			throw new TypeError();
		}
		const y = toIntegerWithTruncation(isoYear);
		const m = toIntegerWithTruncation(isoMonth);
		const d = toIntegerWithTruncation(isoDay);
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		const canonicalizedCalendar = canonicalizeCalendar(calendar);
		if (!isValidIsoDate(y, m, d)) {
			throw new RangeError();
		}
		createTemporalDate(createIsoDateRecord(y, m, d), canonicalizedCalendar, this);
	}
	static from(item: unknown, options: unknown = undefined) {
		return toTemporalDate(item, options);
	}
	static compare(one: unknown, two: unknown) {
		return compareIsoDate(
			getInternalSlotOrThrowForPlainDate(toTemporalDate(one)).$isoDate,
			getInternalSlotOrThrowForPlainDate(toTemporalDate(two)).$isoDate,
		);
	}
	get calendarId() {
		return getInternalSlotOrThrowForPlainDate(this).$calendar;
	}
	get era() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$era;
	}
	get eraYear() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$eraYear;
	}
	get year() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$year;
	}
	get month() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$month;
	}
	get monthCode() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$monthCode;
	}
	get day() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$day;
	}
	get dayOfWeek() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$dayOfWeek;
	}
	get dayOfYear() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$dayOfYear;
	}
	get weekOfYear() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$weekOfYear.$week;
	}
	get yearOfWeek() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$weekOfYear.$year;
	}
	get daysInWeek() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$daysInWeek;
	}
	get daysInMonth() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$daysInMonth;
	}
	get daysInYear() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$daysInYear;
	}
	get monthsInYear() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$monthsInYear;
	}
	get inLeapYear() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$inLeapYear;
	}
	toPlainYearMonth() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return createTemporalYearMonth(
			calendarYearMonthFromFields(
				slot.$calendar,
				isoDateToFields(slot.$calendar, slot.$isoDate, DATE),
				overflowConstrain,
			),
			slot.$calendar,
		);
	}
	toPlainMonthDay() {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return createTemporalMonthDay(
			calendarMonthDayFromFields(
				slot.$calendar,
				isoDateToFields(slot.$calendar, slot.$isoDate, DATE),
				overflowConstrain,
			),
			slot.$calendar,
		);
	}
	add(temporalDurationLike: unknown, options: unknown = undefined) {
		return addDurationToDate(
			1,
			getInternalSlotOrThrowForPlainDate(this),
			temporalDurationLike,
			options,
		);
	}
	subtract(temporalDurationLike: unknown, options: unknown = undefined) {
		return addDurationToDate(
			-1,
			getInternalSlotOrThrowForPlainDate(this),
			temporalDurationLike,
			options,
		);
	}
	with(temporalDateLike: unknown, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		if (!isPartialTemporalObject(temporalDateLike)) {
			throw new TypeError();
		}
		const fields = calendarMergeFields(
			slot.$calendar,
			isoDateToFields(slot.$calendar, slot.$isoDate, DATE),
			prepareCalendarFields(slot.$calendar, temporalDateLike as object, [
				calendarFieldKeys.$year,
				calendarFieldKeys.$month,
				calendarFieldKeys.$monthCode,
				calendarFieldKeys.$day,
			]),
		);
		const overflow = getTemporalOverflowOption(getOptionsObject(options));
		return createTemporalDate(
			calendarDateFromFields(slot.$calendar, fields, overflow),
			slot.$calendar,
		);
	}
	withCalendar(calendarLike: unknown) {
		return createTemporalDate(
			getInternalSlotOrThrowForPlainDate(this).$isoDate,
			toTemporalCalendarIdentifier(calendarLike),
		);
	}
	until(other: unknown, options: unknown = undefined) {
		return differenceTemporalPlainDate(1, getInternalSlotOrThrowForPlainDate(this), other, options);
	}
	since(other: unknown, options: unknown = undefined) {
		return differenceTemporalPlainDate(
			-1,
			getInternalSlotOrThrowForPlainDate(this),
			other,
			options,
		);
	}
	equals(other: unknown) {
		return !compareIsoDate(
			getInternalSlotOrThrowForPlainDate(this).$isoDate,
			getInternalSlotOrThrowForPlainDate(toTemporalDate(other)).$isoDate,
		);
	}
	toPlainDateTime(temporalTime: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		return createTemporalDateTime(
			combineIsoDateAndTimeRecord(slot.$isoDate, toTimeRecordOrMidnight(temporalTime)),
			slot.$calendar,
		);
	}
	toZonedDateTime(item: unknown) {
		const slot = getInternalSlotOrThrowForPlainDate(this);
		let temporalTime: unknown;
		let timeZone: string;
		if (isObject(item)) {
			const tzLike = (item as Record<string, unknown>)["timeZone"];
			if (tzLike === undefined) {
				timeZone = toTemporalTimeZoneIdentifier(item);
				temporalTime = undefined;
			} else {
				timeZone = toTemporalTimeZoneIdentifier(tzLike);
				temporalTime = (item as Record<string, unknown>)["plainTime"];
			}
		} else {
			timeZone = toTemporalTimeZoneIdentifier(item);
			temporalTime = undefined;
		}
		const cache = createOffsetCacheMap();
		if (temporalTime === undefined) {
			return createTemporalZonedDateTime(
				getStartOfDay(timeZone, slot.$isoDate, cache),
				timeZone,
				slot.$calendar,
				undefined,
				cache,
			);
		}
		const isoDateTime = combineIsoDateAndTimeRecord(
			slot.$isoDate,
			getInternalSlotOrThrowForPlainTime(toTemporalTime(temporalTime)),
		);
		if (!isoDateTimeWithinLimits(isoDateTime)) {
			throw new RangeError();
		}
		return createTemporalZonedDateTime(
			getEpochNanosecondsFor(timeZone, isoDateTime, disambiguationCompatible, cache),
			timeZone,
			slot.$calendar,
			undefined,
			cache,
		);
	}
	toString(options: unknown = undefined) {
		return temporalDateToString(
			getInternalSlotOrThrowForPlainDate(this),
			getTemporalShowCalendarNameOption(getOptionsObject(options)),
		);
	}
	// oxlint-disable-next-line no-unused-vars
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		getInternalSlotOrThrowForPlainDate(this);
		// TODO
		return "";
	}
	toJSON() {
		return temporalDateToString(getInternalSlotOrThrowForPlainDate(this), showCalendarName.$auto);
	}
	valueOf() {
		throw new TypeError();
	}
}

defineStringTag(PlainDate.prototype, "Temporal.PlainDate");
renameFunction(PlainDate, "PlainDate");
