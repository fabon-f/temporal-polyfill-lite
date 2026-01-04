import type { SupportedCalendars } from "./internal/calendars.ts";
import { defineStringTag } from "./internal/property.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();
interface PlainYearMonthSlot {
	$calendar: SupportedCalendars;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, PlainYearMonthSlot>();

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
	constructor() {}
	static from() {}
	static compare() {}
	get calendarId() {
		return undefined;
	}
	get era() {
		return undefined;
	}
	get eraYear() {
		return undefined;
	}
	get year() {
		return undefined;
	}
	get month() {
		return undefined;
	}
	get monthCode() {
		return undefined;
	}
	get daysInYear() {
		return undefined;
	}
	get daysInMonth() {
		return undefined;
	}
	get monthsInYear() {
		return undefined;
	}
	get inLeapYear() {
		return undefined;
	}
	with() {}
	add() {}
	subtract() {}
	until() {}
	since() {}
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
	toPlainDate() {}
}

defineStringTag(PlainYearMonth.prototype, "Temporal.PlainYearMonth");
