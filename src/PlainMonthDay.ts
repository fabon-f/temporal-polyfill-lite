import {
	calendarIsoToDate,
	canonicalizeCalendar,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { toIntegerWithTruncation } from "./internal/ecmascript.ts";
import { defineStringTag } from "./internal/property.ts";
import {
	createIsoDateRecord,
	isoDateWithinLimits,
	isValidIsoDate,
	type IsoDateRecord,
} from "./PlainDate.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();
interface PlainMonthDaySlot {
	$isoDate: IsoDateRecord;
	$calendar: SupportedCalendars;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, PlainMonthDaySlot>();

/** `CreateTemporalMonthDay` */
function createTemporalMonthDay(
	isoDate: IsoDateRecord,
	calendar: SupportedCalendars,
	instance = Object.create(PlainMonthDay.prototype) as PlainMonthDay,
) {
	if (!isoDateWithinLimits(isoDate)) {
		throw new RangeError();
	}
	slots.set(instance, createPlainMonthDaySlot(isoDate, calendar));
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
	static from() {}
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
	with() {}
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {
		throw new TypeError();
	}
	toPlainDate() {}
}

defineStringTag(PlainMonthDay.prototype, "Temporal.PlainMonthDay");
