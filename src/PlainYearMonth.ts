import { getTemporalOverflowOption } from "./internal/abstractOperations.ts";
import {
	calendarFieldKeys,
	calendarIsoToDate,
	calendarYearMonthFromFields,
	canonicalizeCalendar,
	getTemporalCalendarIdentifierWithIsoDefault,
	prepareCalendarFields,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { getOptionsObject, toIntegerWithTruncation } from "./internal/ecmascript.ts";
import { isWithin } from "./internal/math.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import {
	compareIsoDate,
	createIsoDateRecord,
	isValidIsoDate,
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
	// TODO
	throw new Error();
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
	static from() {}
	static compare() {}
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
	with() {}
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
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {
		throw new TypeError();
	}
	toPlainDate() {}
}

defineStringTag(PlainYearMonth.prototype, "Temporal.PlainYearMonth");
renameFunction(PlainYearMonth, "PlainYearMonth");
