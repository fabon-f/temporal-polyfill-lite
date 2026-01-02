import { canonicalizeCalendar, isoDaysInMonth } from "./internal/calendars.ts";
import { toIntegerIfIntegral } from "./internal/ecmascript.ts";
import { isWithin } from "./internal/math.ts";
import { defineStringTag } from "./internal/property.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

interface IsoDateRecord {
	$year: number;
	$month: number;
	$day: number;
}

interface PlainDateSlot {
	$isoDate: IsoDateRecord;
	$calendar: string;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, PlainDateSlot>();

/** `CreateISODateRecord` */
function createIsoDateRecord(year: number, month: number, day: number): IsoDateRecord {
	return {
		$year: year,
		$month: month,
		$day: day,
	};
}

/** `CreateTemporalDate` */
function createTemporalDate(
	date: IsoDateRecord,
	calendar: string,
	instance = Object.create(PlainDate.prototype) as PlainDate,
): PlainDate {
	const slot = createPlainDateSlot(date, calendar);
	slots.set(instance, slot);
	return instance;
}

/** `IsValidISODate` */
function isValidIsoDate(year: number, month: number, day: number): boolean {
	return isWithin(month, 1, 12) && isWithin(day, 1, isoDaysInMonth(year, month));
}

function getInternalSlotOrThrowForPlainDate(plainDate: unknown): PlainDateSlot {
	const slot = slots.get(plainDate);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

function createPlainDateSlot(date: IsoDateRecord, calendar: string): PlainDateSlot {
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
		const y = toIntegerIfIntegral(isoYear);
		const m = toIntegerIfIntegral(isoMonth);
		const d = toIntegerIfIntegral(isoDay);
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		const canonicalizedCalendar = canonicalizeCalendar(calendar);
		if (!isValidIsoDate(y, m, d)) {
			throw new RangeError();
		}
		createTemporalDate(createIsoDateRecord(y, m, d), canonicalizedCalendar, this);
	}
	static from() {}
	static compare() {}
	get calendarId() {
		return getInternalSlotOrThrowForPlainDate(this).$calendar;
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
	toPlainYearMonth() {}
	toPlainMonthDay() {}
	add() {}
	subtract() {}
	with() {}
	withCalendar() {}
	until() {}
	since() {}
	equals() {}
	toPlainDateTime() {}
	toZonedDateTime() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
}

defineStringTag(PlainDate.prototype, "Temporal.PlainDate");
