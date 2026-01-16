import {
	getTemporalOverflowOption,
	getTemporalShowCalendarNameOption,
	isoDateToFields,
	isPartialTemporalObject,
} from "./internal/abstractOperations.ts";
import { assertNotUndefined } from "./internal/assertion.ts";
import {
	calendarDateFromFields,
	calendarEquals,
	calendarFieldKeys,
	calendarIsoToDate,
	calendarMergeFields,
	calendarMonthDayFromFields,
	canonicalizeCalendar,
	formatCalendarAnnotation,
	getTemporalCalendarIdentifierWithIsoDefault,
	prepareCalendarFields,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { parseIsoDateTime, temporalMonthDayStringRegExp } from "./internal/dateTimeParser.ts";
import { getOptionsObject, toIntegerWithTruncation } from "./internal/ecmascript.ts";
import {
	MONTH_DAY,
	overflowConstrain,
	showCalendarName,
	type ShowCalendarName,
} from "./internal/enum.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { toZeroPaddedDecimalString } from "./internal/string.ts";
import {
	compareIsoDate,
	createIsoDateRecord,
	createTemporalDate,
	isoDateWithinLimits,
	isValidIsoDate,
	padIsoYear,
	type IsoDateRecord,
} from "./PlainDate.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();
interface PlainMonthDaySlot {
	$isoDate: IsoDateRecord;
	$calendar: SupportedCalendars;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, PlainMonthDaySlot>();

/** `ToTemporalMonthDay` */
function toTemporalMonthDay(item: unknown, options: unknown = undefined): PlainMonthDay {
	if (isObject(item)) {
		const slot = getInternalSlotForPlainMonthDay(item);
		if (slot) {
			getTemporalOverflowOption(getOptionsObject(options));
			return createTemporalMonthDay(slot.$isoDate, slot.$calendar);
		}
		const calendar = getTemporalCalendarIdentifierWithIsoDefault(item);
		const fields = prepareCalendarFields(
			calendar,
			item,
			[
				calendarFieldKeys.$year,
				calendarFieldKeys.$month,
				calendarFieldKeys.$monthCode,
				calendarFieldKeys.$day,
			],
			[],
		);
		const overflow = getTemporalOverflowOption(getOptionsObject(options));
		return createTemporalMonthDay(calendarMonthDayFromFields(calendar, fields, overflow), calendar);
	}
	if (typeof item !== "string") {
		throw new TypeError();
	}
	const result = parseIsoDateTime(item, [temporalMonthDayStringRegExp]);
	const calendar = canonicalizeCalendar(result.$calendar || "iso8601");
	getTemporalOverflowOption(getOptionsObject(options));
	if (calendar === "iso8601") {
		assertNotUndefined(result.$day);
		return createTemporalMonthDay(createIsoDateRecord(1972, result.$month, result.$day), calendar);
	}
	assertNotUndefined(result.$year);
	const isoDate = createIsoDateRecord(result.$year, result.$month, result.$day);
	if (!isoDateWithinLimits(isoDate)) {
		throw new RangeError();
	}
	return createTemporalMonthDay(
		calendarMonthDayFromFields(
			calendar,
			isoDateToFields(calendar, isoDate, MONTH_DAY),
			overflowConstrain,
		),
		calendar,
	);
}

/** `CreateTemporalMonthDay` */
export function createTemporalMonthDay(
	isoDate: IsoDateRecord,
	calendar: SupportedCalendars,
	instance = Object.create(PlainMonthDay.prototype) as PlainMonthDay,
): PlainMonthDay {
	if (!isoDateWithinLimits(isoDate)) {
		throw new RangeError();
	}
	slots.set(instance, createPlainMonthDaySlot(isoDate, calendar));
	return instance;
}

/** `TemporalMonthDayToString` */
function temporalMonthDayToString(
	monthDaySlot: PlainMonthDaySlot,
	showCalendar: ShowCalendarName,
): string {
	return `${
		showCalendar === showCalendarName.$always ||
		showCalendar === showCalendarName.$critical ||
		monthDaySlot.$calendar !== "iso8601"
			? `${padIsoYear(monthDaySlot.$isoDate.$year)}-`
			: ""
	}${toZeroPaddedDecimalString(monthDaySlot.$isoDate.$month, 2)}-${toZeroPaddedDecimalString(monthDaySlot.$isoDate.$day, 2)}${formatCalendarAnnotation(monthDaySlot.$calendar, showCalendar)}`;
}

function createPlainMonthDaySlot(
	isoDate: IsoDateRecord,
	calendar: SupportedCalendars,
): PlainMonthDaySlot {
	return {
		$isoDate: isoDate,
		$calendar: calendar,
	} as PlainMonthDaySlot;
}

export function getInternalSlotForPlainMonthDay(
	plainDateTime: unknown,
): PlainMonthDaySlot | undefined {
	return slots.get(plainDateTime);
}

function getInternalSlotOrThrowForPlainMonthDay(plainDateTime: unknown): PlainMonthDaySlot {
	const slot = getInternalSlotForPlainMonthDay(plainDateTime);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

export function isPlainMonthDay(item: unknown): boolean {
	return !!getInternalSlotForPlainMonthDay(item);
}

export class PlainMonthDay {
	constructor(
		isoMonth: unknown,
		isoDay: unknown,
		calendar: unknown = "iso8601",
		referenceIsoYear: unknown = 1972,
	) {
		if (!new.target) {
			throw new TypeError();
		}
		const m = toIntegerWithTruncation(isoMonth);
		const d = toIntegerWithTruncation(isoDay);
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		const canonicalizedCalendar = canonicalizeCalendar(calendar);
		const y = toIntegerWithTruncation(referenceIsoYear);
		if (!isValidIsoDate(y, m, d)) {
			throw new RangeError();
		}
		createTemporalMonthDay(createIsoDateRecord(y, m, d), canonicalizedCalendar, this);
	}
	static from(item: unknown, options: unknown = undefined) {
		return toTemporalMonthDay(item, options);
	}
	get calendarId() {
		return getInternalSlotOrThrowForPlainMonthDay(this).$calendar;
	}
	get monthCode() {
		const slot = getInternalSlotOrThrowForPlainMonthDay(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$monthCode;
	}
	get day() {
		const slot = getInternalSlotOrThrowForPlainMonthDay(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$day;
	}
	with(temporalMonthDayLike: unknown, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainMonthDay(this);
		if (!isPartialTemporalObject(temporalMonthDayLike)) {
			throw new TypeError();
		}
		return createTemporalMonthDay(
			calendarMonthDayFromFields(
				slot.$calendar,
				calendarMergeFields(
					slot.$calendar,
					isoDateToFields(slot.$calendar, slot.$isoDate, MONTH_DAY),
					prepareCalendarFields(slot.$calendar, temporalMonthDayLike as object, [
						calendarFieldKeys.$year,
						calendarFieldKeys.$month,
						calendarFieldKeys.$monthCode,
						calendarFieldKeys.$day,
					]),
				),
				getTemporalOverflowOption(getOptionsObject(options)),
			),
			slot.$calendar,
		);
	}
	equals(other: unknown) {
		const slot = getInternalSlotOrThrowForPlainMonthDay(this);
		const otherSlot = getInternalSlotOrThrowForPlainMonthDay(toTemporalMonthDay(other));
		return (
			compareIsoDate(slot.$isoDate, otherSlot.$isoDate) === 0 &&
			calendarEquals(slot.$calendar, otherSlot.$calendar)
		);
	}
	toString(options: unknown = undefined) {
		return temporalMonthDayToString(
			getInternalSlotOrThrowForPlainMonthDay(this),
			getTemporalShowCalendarNameOption(getOptionsObject(options)),
		);
	}
	// oxlint-disable-next-line no-unused-vars
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		getInternalSlotOrThrowForPlainMonthDay(this);
		// TODO:
		return "";
	}
	toJSON() {
		return temporalMonthDayToString(
			getInternalSlotOrThrowForPlainMonthDay(this),
			showCalendarName.$auto,
		);
	}
	valueOf() {
		throw new TypeError();
	}
	toPlainDate(item: unknown) {
		const slot = getInternalSlotOrThrowForPlainMonthDay(this);
		if (!isObject(item)) {
			throw new TypeError();
		}
		return createTemporalDate(
			calendarDateFromFields(
				slot.$calendar,
				calendarMergeFields(
					slot.$calendar,
					isoDateToFields(slot.$calendar, slot.$isoDate, MONTH_DAY),
					prepareCalendarFields(slot.$calendar, item, [calendarFieldKeys.$year], []),
				),
				overflowConstrain,
			),
			slot.$calendar,
		);
	}
}

defineStringTag(PlainMonthDay.prototype, "Temporal.PlainMonthDay");
renameFunction(PlainMonthDay, "PlainMonthDay");
