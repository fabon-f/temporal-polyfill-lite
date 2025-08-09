import { type ISODateRecord, isValidISODate } from "./PlainDate.ts";
import { isValidTime, type TimeRecord } from "./PlainTime.ts";
import { isoDateToEpochDays, mathematicalInLeapYear } from "./utils/ao.ts";
import {
	assertCalendar,
	isoDayOfWeek,
	isoDayOfYear,
	isoDaysInMonth,
	isoWeekOfYear,
	monthToMonthCode,
} from "./utils/calendars.ts";
import {
	getInternalSlotOrThrow,
	toIntegerWithTruncation,
} from "./utils/ecmascript.ts";
import { defineStringTag } from "./utils/property.ts";

type ISODateTimeRecord = [ISODateRecord, TimeRecord];
type PlainDateTimeSlot = ISODateTimeRecord & { __plainDateTimeSlot__: unknown };

/** `ISODateTimeWithinLimits` */
export function isoDateTimeWithinLimits(isoDateTime: ISODateTimeRecord) {
	const epochDays = isoDateToEpochDays(...isoDateTime[0]);
	// -100000000 < x < 100000000, or (x = -1e8-1 && time is not zero)
	return (
		Math.abs(epochDays) <= 1e8 ||
		(epochDays === -1e8 - 1 && isoDateTime[1].some((v) => v !== 0))
	);
}

/** part of `CreateTemporalDateTime` */
function createTemporalDateTimeSlot(record: ISODateTimeRecord) {
	if (!isoDateTimeWithinLimits(record)) {
		throw new RangeError();
	}
	return record as PlainDateTimeSlot;
}

/** part of `CreateTemporalDateTime` */
function createTemporalDateTime(
	slot: PlainDateTimeSlot,
	instance?: PlainDateTime,
): PlainDateTime {
	const plainDateTime =
		instance || (Object.create(PlainDateTime.prototype) as PlainDateTime);
	slots.set(plainDateTime, slot);
	return plainDateTime;
}

const slots = new WeakMap<PlainDateTime, PlainDateTimeSlot>();

export class PlainDateTime {
	constructor(
		isoYear: unknown,
		isoMonth: unknown,
		isoDay: unknown,
		hour: unknown = 0,
		minute: unknown = 0,
		second: unknown = 0,
		millisecond: unknown = 0,
		microsecond: unknown = 0,
		nanosecond: unknown = 0,
		calendar: unknown = "iso8601",
	) {
		if (!new.target) {
			throw new TypeError();
		}
		const record: ISODateTimeRecord = [
			[
				toIntegerWithTruncation(isoYear),
				toIntegerWithTruncation(isoMonth),
				toIntegerWithTruncation(isoDay),
			],
			[
				0,
				toIntegerWithTruncation(hour),
				toIntegerWithTruncation(minute),
				toIntegerWithTruncation(second),
				toIntegerWithTruncation(millisecond),
				toIntegerWithTruncation(microsecond),
				toIntegerWithTruncation(nanosecond),
			],
		];
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		assertCalendar(calendar);
		if (!isValidISODate(...record[0]) || !isValidTime(...record[1])) {
			throw new RangeError();
		}
		createTemporalDateTime(createTemporalDateTimeSlot(record), this);
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
		return getInternalSlotOrThrow(slots, this)[0][0];
	}
	get month() {
		return getInternalSlotOrThrow(slots, this)[0][1];
	}
	get monthCode() {
		return monthToMonthCode(getInternalSlotOrThrow(slots, this)[0][1]);
	}
	get day() {
		return getInternalSlotOrThrow(slots, this)[0][2];
	}
	get hour() {
		return getInternalSlotOrThrow(slots, this)[1][1];
	}
	get minute() {
		return getInternalSlotOrThrow(slots, this)[1][2];
	}
	get second() {
		return getInternalSlotOrThrow(slots, this)[1][3];
	}
	get millisecond() {
		return getInternalSlotOrThrow(slots, this)[1][4];
	}
	get microsecond() {
		return getInternalSlotOrThrow(slots, this)[1][5];
	}
	get nanosecond() {
		return getInternalSlotOrThrow(slots, this)[1][6];
	}
	get dayOfWeek() {
		return isoDayOfWeek(getInternalSlotOrThrow(slots, this)[0]);
	}
	get dayOfYear() {
		return isoDayOfYear(getInternalSlotOrThrow(slots, this)[0]);
	}
	get weekOfYear() {
		return isoWeekOfYear(getInternalSlotOrThrow(slots, this)[0])[1];
	}
	get yearOfWeek() {
		return isoWeekOfYear(getInternalSlotOrThrow(slots, this)[0])[0];
	}
	get daysInWeek() {
		return 7;
	}
	get daysInMonth() {
		const slot = getInternalSlotOrThrow(slots, this);
		return isoDaysInMonth(slot[0][0], slot[0][1]);
	}
	get daysInYear() {
		return (
			365 + mathematicalInLeapYear(getInternalSlotOrThrow(slots, this)[0][0])
		);
	}
	get monthsInYear() {
		return 12;
	}
	get inLeapYear() {
		return !!mathematicalInLeapYear(getInternalSlotOrThrow(slots, this)[0][0]);
	}
	with() {}
	withPlainTime() {}
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
	toZonedDateTime() {}
	toPlainDate() {}
	toPlainTime() {}
}

defineStringTag(PlainDateTime.prototype, "Temporal.PlainDateTime");
