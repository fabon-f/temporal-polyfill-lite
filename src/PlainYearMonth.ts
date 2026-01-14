import {
	getTemporalOverflowOption,
	getTemporalShowCalendarNameOption,
	isoDateToFields,
	isPartialTemporalObject,
} from "./internal/abstractOperations.ts";
import {
	calendarDateFromFields,
	calendarFieldKeys,
	calendarIsoToDate,
	calendarMergeFields,
	calendarYearMonthFromFields,
	canonicalizeCalendar,
	formatCalendarAnnotation,
	getTemporalCalendarIdentifierWithIsoDefault,
	prepareCalendarFields,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { parseIsoDateTime, temporalYearMonthStringRegExp } from "./internal/dateTimeParser.ts";
import { getOptionsObject, toIntegerWithTruncation } from "./internal/ecmascript.ts";
import {
	overflowConstrain,
	showCalendarName,
	YEAR_MONTH,
	type ShowCalendarName,
} from "./internal/enum.ts";
import { isWithin } from "./internal/math.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { ToZeroPaddedDecimalString } from "./internal/string.ts";
import {
	compareIsoDate,
	createIsoDateRecord,
	createTemporalDate,
	isValidIsoDate,
	padIsoYear,
	type IsoDateRecord,
} from "./PlainDate.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();
interface PlainYearMonthSlot {
	$isoDate: IsoDateRecord;
	$calendar: SupportedCalendars;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, PlainYearMonthSlot>();

/** `ToTemporalYearMonth` */
function toTemporalYearMonth(item: unknown, options?: unknown) {
	if (isObject(item)) {
		const slot = getInternalSlotForPlainYearMonth(item);
		if (slot) {
			getTemporalOverflowOption(getOptionsObject(options));
			return createTemporalYearMonth(slot.$isoDate, slot.$calendar);
		}
		const calendar = getTemporalCalendarIdentifierWithIsoDefault(item);
		const fields = prepareCalendarFields(
			calendar,
			item as Record<string, unknown>,
			[calendarFieldKeys.$year, calendarFieldKeys.$month, calendarFieldKeys.$monthCode],
			[],
		);
		return createTemporalYearMonth(
			calendarYearMonthFromFields(
				calendar,
				fields,
				getTemporalOverflowOption(getOptionsObject(options)),
			),
			calendar,
		);
	}
	if (typeof item !== "string") {
		throw new TypeError();
	}
	const result = parseIsoDateTime(item, [temporalYearMonthStringRegExp]);
	const calendar = canonicalizeCalendar(result.$calendar || "iso8601");
	getTemporalOverflowOption(getOptionsObject(options));
	const isoDate = createIsoDateRecord(result.$year!, result.$month, result.$day);
	if (!isoYearMonthWithinLimits(isoDate)) {
		throw new RangeError();
	}
	return createTemporalYearMonth(
		calendarYearMonthFromFields(
			calendar,
			isoDateToFields(calendar, isoDate, YEAR_MONTH),
			overflowConstrain,
		),
		calendar,
	);
}

/** `ISOYearMonthWithinLimits` */
export function isoYearMonthWithinLimits(isoDate: IsoDateRecord): boolean {
	return (
		isWithin(isoDate.$year, -271821, 275760) &&
		(isoDate.$year !== -271821 || isoDate.$month >= 4) &&
		(isoDate.$year !== 275760 || isoDate.$month <= 9)
	);
}

/** `CreateTemporalYearMonth` */
export function createTemporalYearMonth(
	isoDate: IsoDateRecord,
	calendar: SupportedCalendars,
	instance = Object.create(PlainYearMonth.prototype) as PlainYearMonth,
) {
	if (!isoYearMonthWithinLimits(isoDate)) {
		throw new RangeError();
	}
	slots.set(instance, createPlainYearMonthSlot(isoDate, calendar));
	return instance;
}

/** `TemporalYearMonthToString` */
function temporalYearMonthToString(
	yearMonthSlot: PlainYearMonthSlot,
	showCalendar: ShowCalendarName,
) {
	let result = `${padIsoYear(yearMonthSlot.$isoDate.$year)}-${ToZeroPaddedDecimalString(yearMonthSlot.$isoDate.$month, 2)}`;
	if (
		showCalendar === showCalendarName.$always ||
		showCalendar === showCalendarName.$critical ||
		yearMonthSlot.$calendar !== "iso8601"
	) {
		result = `${result}-${ToZeroPaddedDecimalString(yearMonthSlot.$isoDate.$day, 2)}`;
	}
	return result + formatCalendarAnnotation(yearMonthSlot.$calendar, showCalendar);
}

function createPlainYearMonthSlot(
	isoDate: IsoDateRecord,
	calendar: SupportedCalendars,
): PlainYearMonthSlot {
	return {
		$isoDate: isoDate,
		$calendar: calendar,
	} as PlainYearMonthSlot;
}

export function getInternalSlotForPlainYearMonth(
	plainDateTime: unknown,
): PlainYearMonthSlot | undefined {
	return slots.get(plainDateTime);
}

function getInternalSlotOrThrowForPlainYearMonth(plainDateTime: unknown): PlainYearMonthSlot {
	const slot = getInternalSlotForPlainYearMonth(plainDateTime);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

export function isPlainYearMonth(item: unknown): boolean {
	return !!getInternalSlotForPlainYearMonth(item);
}

export class PlainYearMonth {
	constructor(
		isoYear: unknown,
		isoMonth: unknown,
		calendar: unknown = "iso8601",
		referenceIsoDay: unknown = 1,
	) {
		if (!new.target) {
			throw new TypeError();
		}
		const y = toIntegerWithTruncation(isoYear);
		const m = toIntegerWithTruncation(isoMonth);
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		const canonicalizedCalendar = canonicalizeCalendar(calendar);
		const ref = toIntegerWithTruncation(referenceIsoDay);
		if (!isValidIsoDate(y, m, ref)) {
			throw new RangeError();
		}
		createTemporalYearMonth(createIsoDateRecord(y, m, ref), canonicalizedCalendar, this);
	}
	static from(item: unknown, options: unknown = undefined) {
		return toTemporalYearMonth(item, options);
	}
	static compare(one: unknown, two: unknown) {
		return compareIsoDate(
			getInternalSlotOrThrowForPlainYearMonth(toTemporalYearMonth(one)).$isoDate,
			getInternalSlotOrThrowForPlainYearMonth(toTemporalYearMonth(two)).$isoDate,
		);
	}
	get calendarId() {
		return getInternalSlotOrThrowForPlainYearMonth(this).$calendar;
	}
	get era() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$era;
	}
	get eraYear() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$eraYear;
	}
	get year() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$year;
	}
	get month() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$month;
	}
	get monthCode() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$monthCode;
	}
	get daysInYear() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$daysInYear;
	}
	get daysInMonth() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$daysInMonth;
	}
	get monthsInYear() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$monthsInYear;
	}
	get inLeapYear() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$inLeapYear;
	}
	with(temporalYearMonthLike: unknown, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		if (!isPartialTemporalObject(temporalYearMonthLike)) {
			throw new TypeError();
		}
		const fields = calendarMergeFields(
			slot.$calendar,
			isoDateToFields(slot.$calendar, slot.$isoDate, YEAR_MONTH),
			prepareCalendarFields(slot.$calendar, temporalYearMonthLike as Record<string, unknown>, [
				calendarFieldKeys.$year,
				calendarFieldKeys.$month,
				calendarFieldKeys.$monthCode,
			]),
		);
		return createTemporalYearMonth(
			calendarYearMonthFromFields(
				slot.$calendar,
				fields,
				getTemporalOverflowOption(getOptionsObject(options)),
			),
			slot.$calendar,
		);
	}
	add() {}
	subtract() {}
	until() {}
	since() {}
	equals(other: unknown) {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		const otherSlot = getInternalSlotOrThrowForPlainYearMonth(toTemporalYearMonth(other));
		return (
			compareIsoDate(slot.$isoDate, otherSlot.$isoDate) === 0 &&
			slot.$calendar === otherSlot.$calendar
		);
	}
	toString(options: unknown = undefined) {
		return temporalYearMonthToString(
			getInternalSlotOrThrowForPlainYearMonth(this),
			getTemporalShowCalendarNameOption(getOptionsObject(options)),
		);
	}
	toLocaleString(locale: unknown = undefined, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		// TODO
		return "";
	}
	toJSON() {
		return temporalYearMonthToString(
			getInternalSlotOrThrowForPlainYearMonth(this),
			showCalendarName.$auto,
		);
	}
	valueOf() {
		throw new TypeError();
	}
	toPlainDate(item: unknown) {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		if (!isObject(item)) {
			throw new TypeError();
		}
		return createTemporalDate(
			calendarDateFromFields(
				slot.$calendar,
				calendarMergeFields(
					slot.$calendar,
					isoDateToFields(slot.$calendar, slot.$isoDate, YEAR_MONTH),
					prepareCalendarFields(
						slot.$calendar,
						item as Record<string, unknown>,
						[calendarFieldKeys.$day],
						[],
					),
				),
				overflowConstrain,
			),
			slot.$calendar,
		);
	}
}

defineStringTag(PlainYearMonth.prototype, "Temporal.PlainYearMonth");
renameFunction(PlainYearMonth, "PlainYearMonth");
