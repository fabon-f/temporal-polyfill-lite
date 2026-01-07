import {
	epochDaysToIsoDate,
	getTemporalOverflowOption,
	isoDateRecordToEpochDays,
	isoDateToEpochDays,
} from "./internal/abstractOperations.ts";
import {
	calendarDateFromFields,
	calendarIsoToDate,
	canonicalizeCalendar,
	getTemporalCalendarIdentifierWithIsoDefault,
	isoDaysInMonth,
	prepareCalendarFields,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { parseIsoDateTime, temporalDateTimeStringRegExp } from "./internal/dateTimeParser.ts";
import { getOptionsObject, toIntegerWithTruncation } from "./internal/ecmascript.ts";
import { disambiguationCompatible, overflowConstrain, type Overflow } from "./internal/enum.ts";
import { clamp, compare, isWithin, type NumberSign } from "./internal/math.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag } from "./internal/property.ts";
import {
	getEpochNanosecondsFor,
	getStartOfDay,
	toTemporalTimeZoneIdentifier,
} from "./internal/timeZones.ts";
import {
	combineIsoDateAndTimeRecord,
	createTemporalDateTime,
	getInternalSlotOrThrowForPlainDateTime,
	isoDateTimeWithinLimits,
	isPlainDateTime,
} from "./PlainDateTime.ts";
import {
	getInternalSlotOrThrowForPlainTime,
	noonTimeRecord,
	toTemporalTime,
	toTimeRecordOrMidnight,
} from "./PlainTime.ts";
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
function toTemporalDate(item: unknown, options?: unknown) {
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
		const fields = prepareCalendarFields(
			calendar,
			item as Record<string, unknown>,
			["year", "month", "monthCode", "day"],
			[],
		);
		const oveflow = getTemporalOverflowOption(getOptionsObject(options));
		return createTemporalDate(calendarDateFromFields(calendar, fields, oveflow), calendar);
	}
	if (typeof item !== "string") {
		throw new TypeError();
	}
	const result = parseIsoDateTime(item, [temporalDateTimeStringRegExp]);
	const calendar = canonicalizeCalendar(result.$calendar || "iso8601");
	getTemporalOverflowOption(getOptionsObject(options));
	return createTemporalDate(
		createIsoDateRecord(result.$year!, result.$month, result.$day),
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

/** `BalanceISODate` */
export function balanceIsoDate(year: number, month: number, day: number): IsoDateRecord {
	return epochDaysToIsoDate(isoDateToEpochDays(year, month - 1, day));
}

/** `ISODateWithinLimits` */
export function isoDateWithinLimits(isoDate: IsoDateRecord): boolean {
	return isoDateTimeWithinLimits(combineIsoDateAndTimeRecord(isoDate, noonTimeRecord()));
}

/** `CompareISODate` */
export function compareIsoDate(isoDate1: IsoDateRecord, isoDate2: IsoDateRecord): NumberSign {
	return compare(isoDateRecordToEpochDays(isoDate1), isoDateRecordToEpochDays(isoDate2));
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
	static from(item: unknown, options?: unknown) {
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
	toPlainYearMonth() {}
	toPlainMonthDay() {}
	add() {}
	subtract() {}
	with() {}
	withCalendar() {}
	until() {}
	since() {}
	equals(other: unknown) {
		return !compareIsoDate(
			getInternalSlotOrThrowForPlainDate(this).$isoDate,
			getInternalSlotOrThrowForPlainDate(toTemporalDate(other)).$isoDate,
		);
	}
	toPlainDateTime(temporalTime?: unknown) {
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
		const cache = new Map<number, number>();
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
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
}

defineStringTag(PlainDate.prototype, "Temporal.PlainDate");
