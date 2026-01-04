import type { SupportedCalendars } from "./internal/calendars.ts";
import { defineStringTag } from "./internal/property.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

interface ZonedDateTimeSlot {
	$calendar: SupportedCalendars;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, ZonedDateTimeSlot>();

export function getInternalSlotForZonedDateTime(
	zonedDateTime: unknown,
): ZonedDateTimeSlot | undefined {
	return slots.get(zonedDateTime);
}

export function getInternalSlotOrThrowForZonedDateTime(zonedDateTime: unknown): ZonedDateTimeSlot {
	const slot = getInternalSlotForZonedDateTime(zonedDateTime);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

export function isZonedDateTime(item: unknown): boolean {
	return !!getInternalSlotForZonedDateTime(item);
}

export class ZonedDateTime {
	constructor() {}
	static from() {}
	static compare() {}
	get calendarId() {
		return undefined;
	}
	get timeZoneId() {
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
	get day() {
		return undefined;
	}
	get hour() {
		return undefined;
	}
	get minute() {
		return undefined;
	}
	get second() {
		return undefined;
	}
	get millisecond() {
		return undefined;
	}
	get microsecond() {
		return undefined;
	}
	get nanosecond() {
		return undefined;
	}
	get epochMilliseconds() {
		return undefined;
	}
	get epochNanoseconds() {
		return undefined;
	}
	get dayOfWeek() {
		return undefined;
	}
	get dayOfYear() {
		return undefined;
	}
	get weekOfYear() {
		return undefined;
	}
	get yearOfWeek() {
		return undefined;
	}
	get hoursInDay() {
		return undefined;
	}
	get daysInWeek() {
		return undefined;
	}
	get daysInMonth() {
		return undefined;
	}
	get daysInYear() {
		return undefined;
	}
	get monthsInYear() {
		return undefined;
	}
	get inLeapYear() {
		return undefined;
	}
	get offsetNanoseconds() {
		return undefined;
	}
	get offset() {
		return undefined;
	}
	with() {}
	withPlainTime() {}
	withTimeZone() {}
	withCalendar() {}
	add() {}
	subtract() {}
	until() {}
	since() {}
	round() {}
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
	startOfDay() {}
	getTimeZoneTransition() {}
	toInstant() {}
	toPlainDate() {}
	toPlainTime() {}
	toPlainDateTime() {}
}

defineStringTag(ZonedDateTime.prototype, "Temporal.ZonedDateTime");
