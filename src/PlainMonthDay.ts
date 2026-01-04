import type { SupportedCalendars } from "./internal/calendars.ts";
import { defineStringTag } from "./internal/property.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();
interface PlainMonthDaySlot {
	$calendar: SupportedCalendars;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, PlainMonthDaySlot>();

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
	constructor() {}
	static from() {}
	get calendarId() {
		return undefined;
	}
	get monthCode() {
		return undefined;
	}
	get day() {
		return undefined;
	}
	with() {}
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
	toPlainDate() {}
}

defineStringTag(PlainMonthDay.prototype, "Temporal.PlainMonthDay");
