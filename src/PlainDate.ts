import { isoDateTimeWithinLimits } from "./PlainDateTime.ts";
import {
	isoDateToEpochDays,
	mathematicalInLeapYear,
	utcEpochMillisecondsToIsoDateTime,
} from "./utils/ao.ts";
import {
	assertCalendar,
	isoDayOfWeek,
	isoDayOfYear,
	isoDaysInMonth,
	isoWeekOfYear,
	monthToMonthCode,
} from "./utils/calendars.ts";
import { millisecondsPerDay } from "./utils/constants.ts";
import {
	getInternalSlotOrThrow,
	toIntegerWithTruncation,
} from "./utils/ecmascript.ts";
import { defineStringTag } from "./utils/property.ts";

export type ISODateRecord = [isoYear: number, isoMonth: number, isoDay: number];

type PlainDateSlot = [isoYear: number, isoMonth: number, isoDay: number] & {
	__plainDateSlot__: unknown;
};

/** `IsValidISODate` */
export function isValidISODate(
	year: number,
	month: number,
	day: number,
): boolean {
	return (
		month >= 1 && month <= 12 && day >= 1 && day <= isoDaysInMonth(year, month)
	);
}

/** `BalanceISODate` */
function balanceISODate(
	year: number,
	month: number,
	day: number,
): ISODateRecord {
	return utcEpochMillisecondsToIsoDateTime(
		isoDateToEpochDays(year, month, day) * millisecondsPerDay,
	)[0];
}

function createTemporalDateSlot(isoDate: ISODateRecord): PlainDateSlot {
	if (!isoDateWithinLimits(isoDate)) {
		throw new RangeError();
	}
	return isoDate as PlainDateSlot;
}

/** `CreateTemporalDate` */
function createTemporalDate(
	slot: PlainDateSlot,
	instance?: PlainDate,
): PlainDate {
	const plainDate =
		instance || (Object.create(PlainDate.prototype) as PlainDate);
	slots.set(plainDate, slot);
	return plainDate;
}

/** `ISODateWithinLimits` */
export function isoDateWithinLimits(isoDate: ISODateRecord): boolean {
	return isoDateTimeWithinLimits([isoDate, [0, 12, 0, 0, 0, 0, 0]]);
}

const slots = new WeakMap<PlainDate, PlainDateSlot>();

export class PlainDate {
	constructor(
		isoYear: unknown,
		isoMonth: unknown,
		isoDay: unknown,
		calendar: unknown = "iso8601",
	) {
		if (!new.target) {
			throw new TypeError();
		}
		const y = toIntegerWithTruncation(isoYear);
		const m = toIntegerWithTruncation(isoMonth);
		const d = toIntegerWithTruncation(isoDay);
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		assertCalendar(calendar);
		if (!isValidISODate(y, m, d)) {
			throw new RangeError();
		}
		createTemporalDate(createTemporalDateSlot([y, m, d]), this);
	}
	static from() {}
	static compare() {}
	get calendarId() {
		return "iso8601";
	}
	get era() {
		getInternalSlotOrThrow(slots, this);
		return undefined;
	}
	get eraYear() {
		getInternalSlotOrThrow(slots, this);
		return undefined;
	}
	get year() {
		return getInternalSlotOrThrow(slots, this)[0];
	}
	get month() {
		return getInternalSlotOrThrow(slots, this)[1];
	}
	get monthCode() {
		return monthToMonthCode(getInternalSlotOrThrow(slots, this)[1]);
	}
	get day() {
		return getInternalSlotOrThrow(slots, this)[2];
	}
	get dayOfWeek() {
		return isoDayOfWeek(getInternalSlotOrThrow(slots, this));
	}
	get dayOfYear() {
		return isoDayOfYear(getInternalSlotOrThrow(slots, this));
	}
	get weekOfYear() {
		return isoWeekOfYear(getInternalSlotOrThrow(slots, this))[1];
	}
	get yearOfWeek() {
		return isoWeekOfYear(getInternalSlotOrThrow(slots, this))[0];
	}
	get daysInWeek() {
		return 7;
	}
	get daysInMonth() {
		const slot = getInternalSlotOrThrow(slots, this);
		return isoDaysInMonth(slot[0], slot[1]);
	}
	get daysInYear() {
		return 365 + mathematicalInLeapYear(getInternalSlotOrThrow(slots, this)[0]);
	}
	get monthsInYear() {
		return 12;
	}
	get inLeapYear() {
		return !!mathematicalInLeapYear(getInternalSlotOrThrow(slots, this)[0]);
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
