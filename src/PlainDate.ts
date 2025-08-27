import {
	getISODateTimeOfPlainDateTime,
	isoDateTimeWithinLimits,
} from "./PlainDateTime.ts";
import {
	isoDateToEpochDays,
	mathematicalDaysInYear,
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
import { isObject } from "./utils/check.ts";
import { millisecondsPerDay } from "./utils/constants.ts";
import {
	getInternalSlotOrThrow,
	toIntegerWithTruncation,
} from "./utils/ecmascript.ts";
import {
	parseISODateTime,
	temporalDateTimeString,
} from "./utils/iso_parser.ts";
import { compareNumber } from "./utils/math.ts";
import { defineStringTag } from "./utils/property.ts";
import { getISODateTimeOfZonedDateTime } from "./ZonedDateTime.ts";

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
export function balanceISODate(
	year: number,
	month: number,
	day: number,
): ISODateRecord {
	return utcEpochMillisecondsToIsoDateTime(
		isoDateToEpochDays(year, month, day) * millisecondsPerDay,
	)[0];
}

function toTemporalDate(item: unknown, options?: unknown): PlainDateSlot {
	if (isObject(item)) {
		const plainDateSlotForItem = slots.get(item as any);
		if (plainDateSlotForItem) {
			// TODO:
			// i. Let resolvedOptions be ? GetOptionsObject(options).
			// ii. Perform ? GetTemporalOverflowOption(resolvedOptions).
			return plainDateSlotForItem;
		}
		const dateTimeRecord =
			getISODateTimeOfZonedDateTime(item) ||
			getISODateTimeOfPlainDateTime(item);
		if (dateTimeRecord) {
			// TODO:
			// i. Let resolvedOptions be ? GetOptionsObject(options).
			// ii. Perform ? GetTemporalOverflowOption(resolvedOptions).
			return createTemporalDateSlot(dateTimeRecord[0]);
		}
		// TODO:
	}
	if (typeof item !== "string") {
		throw new TypeError();
	}
	const [date, _1, _2, calendar = "iso8601"] = parseISODateTime(item, [
		temporalDateTimeString,
	]);
	assertCalendar(calendar);
	// TODO:
	// 8. Let resolvedOptions be ? GetOptionsObject(options).
	// 9. Perform ? GetTemporalOverflowOption(resolvedOptions).
	return createTemporalDateSlot(date);
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

function compareISODate(date1: ISODateRecord, date2: ISODateRecord) {
	return compareNumber(
		isoDateToEpochDays(...date1),
		isoDateToEpochDays(...date2),
	);
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
	static from(item: unknown, options?: unknown) {
		return createTemporalDate(toTemporalDate(item, options));
	}
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
		return mathematicalDaysInYear(getInternalSlotOrThrow(slots, this)[0]);
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
	equals(other: unknown) {
		const slot = getInternalSlotOrThrow(slots, this);
		const otherSlot = toTemporalDate(other);
		return compareISODate(slot, otherSlot) === 0;
	}
	toPlainDateTime() {}
	toZonedDateTime() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
}

defineStringTag(PlainDate.prototype, "Temporal.PlainDate");
