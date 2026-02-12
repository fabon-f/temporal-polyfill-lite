import { createDateTimeFormat, formatDateTime } from "./DateTimeFormat.ts";
import {
	getTemporalOverflowOption,
	getTemporalShowCalendarNameOption,
	isoDateToFields,
	validatePartialTemporalObject,
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
import {
	getOptionsObject,
	toIntegerWithTruncation,
	validateString,
} from "./internal/ecmascript.ts";
import {
	DATE,
	MONTH_DAY,
	overflowConstrain,
	showCalendarName,
	type ShowCalendarName,
} from "./internal/enum.ts";
import {
	forbiddenValueOf,
	invalidDateTime,
	invalidMethodCall,
	notObject,
} from "./internal/errorMessages.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { toZeroPaddedDecimalString } from "./internal/string.ts";
import { throwRangeError, throwTypeError } from "./internal/utils.ts";
import {
	compareIsoDate,
	createIsoDateRecord,
	createTemporalDate,
	isValidIsoDate,
	padIsoYear,
	validateIsoDate,
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
function toTemporalMonthDay(item: unknown, options?: unknown): PlainMonthDay {
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
	validateString(item);
	const result = parseIsoDateTime(item, [temporalMonthDayStringRegExp]);
	const calendar = canonicalizeCalendar(result.$calendar || "iso8601");
	getTemporalOverflowOption(getOptionsObject(options));
	if (calendar === "iso8601") {
		assertNotUndefined(result.$day);
		return createTemporalMonthDay(createIsoDateRecord(1972, result.$month, result.$day), calendar);
	}
	assertNotUndefined(result.$year);
	return createTemporalMonthDay(
		calendarMonthDayFromFields(
			calendar,
			isoDateToFields(
				calendar,
				validateIsoDate(createIsoDateRecord(result.$year, result.$month, result.$day)),
				MONTH_DAY,
			),
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
	slots.set(instance, {
		$isoDate: validateIsoDate(isoDate),
		$calendar: calendar,
	} as PlainMonthDaySlot);
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

export function getInternalSlotForPlainMonthDay(
	plainDateTime: unknown,
): PlainMonthDaySlot | undefined {
	return slots.get(plainDateTime);
}

function getInternalSlotOrThrowForPlainMonthDay(plainDateTime: unknown): PlainMonthDaySlot {
	const slot = getInternalSlotForPlainMonthDay(plainDateTime);
	if (!slot) {
		throwTypeError(invalidMethodCall);
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
		const m = toIntegerWithTruncation(isoMonth);
		const d = toIntegerWithTruncation(isoDay);
		validateString(calendar);
		const canonicalizedCalendar = canonicalizeCalendar(calendar);
		const y = toIntegerWithTruncation(referenceIsoYear);
		if (!isValidIsoDate(y, m, d)) {
			throwRangeError(invalidDateTime);
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
		validatePartialTemporalObject(temporalMonthDayLike);
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
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		getInternalSlotOrThrowForPlainMonthDay(this);
		return formatDateTime(createDateTimeFormat(locales, options, DATE), this);
	}
	toJSON() {
		return temporalMonthDayToString(
			getInternalSlotOrThrowForPlainMonthDay(this),
			showCalendarName.$auto,
		);
	}
	valueOf() {
		throwTypeError(forbiddenValueOf);
	}
	toPlainDate(item: unknown) {
		const slot = getInternalSlotOrThrowForPlainMonthDay(this);
		if (!isObject(item)) {
			throwTypeError(notObject(item));
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
