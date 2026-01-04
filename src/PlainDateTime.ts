import { isoDateRecordToEpochDays } from "./internal/abstractOperations.ts";
import {
	calendarIsoToDate,
	canonicalizeCalendar,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { toIntegerWithTruncation } from "./internal/ecmascript.ts";
import { defineStringTag } from "./internal/property.ts";
import {
	balanceIsoDate,
	createIsoDateRecord,
	isValidIsoDate,
	type IsoDateRecord,
} from "./PlainDate.ts";
import {
	balanceTime,
	compareTimeRecord,
	createTimeRecord,
	isValidTime,
	midnightTimeRecord,
	type TimeRecord,
} from "./PlainTime.ts";

export interface IsoDateTimeRecord {
	$isoDate: IsoDateRecord;
	$time: TimeRecord;
}

const internalSlotBrand = /*#__PURE__*/ Symbol();
interface PlainDateTimeSlot {
	$isoDateTime: IsoDateTimeRecord;
	$calendar: SupportedCalendars;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, PlainDateTimeSlot>();

/** `ISODateTimeWithinLimits` */
export function isoDateTimeWithinLimits(isoDateTime: IsoDateTimeRecord): boolean {
	const epochDays = isoDateRecordToEpochDays(isoDateTime.$isoDate);
	return (
		Math.abs(epochDays) <= 1e8 ||
		(epochDays === -100000001 && !!compareTimeRecord(isoDateTime.$time, midnightTimeRecord()))
	);
}

/** `BalanceISODateTime` */
export function balanceIsoDateTime(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	second: number,
	milliseond: number,
	microsecond: number,
	nanosecond: number,
): IsoDateTimeRecord {
	const balancedTime = balanceTime(hour, minute, second, milliseond, microsecond, nanosecond);
	return {
		$isoDate: balanceIsoDate(year, month, day + balancedTime.$days),
		$time: {
			...balancedTime,
			$days: 0,
		},
	};
}

/** `CreateTemporalDateTime` */
function createTemporalDateTime(
	isoDateTime: IsoDateTimeRecord,
	calendar: SupportedCalendars,
	instance = Object.create(PlainDateTime.prototype) as PlainDateTime,
) {
	if (!isoDateTimeWithinLimits(isoDateTime)) {
		throw new RangeError();
	}
	const slot = createPlainDateTimeSlot(isoDateTime, calendar);
	slots.set(instance, slot);
	return instance;
}

function createPlainDateTimeSlot(
	isoDateTime: IsoDateTimeRecord,
	calendar: SupportedCalendars,
): PlainDateTimeSlot {
	return {
		$isoDateTime: isoDateTime,
		$calendar: calendar,
	} as PlainDateTimeSlot;
}

export function getInternalSlotForPlainDateTime(
	plainDateTime: unknown,
): PlainDateTimeSlot | undefined {
	return slots.get(plainDateTime);
}

function getInternalSlotOrThrowForPlainDateTime(plainDateTime: unknown): PlainDateTimeSlot {
	const slot = getInternalSlotForPlainDateTime(plainDateTime);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

export function isPlainDateTime(item: unknown): boolean {
	return !!getInternalSlotForPlainDateTime(item);
}

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
		const dateUnits = [isoYear, isoMonth, isoDay].map(toIntegerWithTruncation) as [
			number,
			number,
			number,
		];
		const timeUnits = [hour, minute, second, millisecond, microsecond, nanosecond].map(
			toIntegerWithTruncation,
		) as [number, number, number, number, number, number];
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		const canonicalizedCalendar = canonicalizeCalendar(calendar);
		if (!isValidIsoDate(...dateUnits) || !isValidTime(...timeUnits)) {
			throw new RangeError();
		}
		createTemporalDateTime(
			{ $isoDate: createIsoDateRecord(...dateUnits), $time: createTimeRecord(...timeUnits) },
			canonicalizedCalendar,
			this,
		);
	}
	static from() {}
	static compare() {}
	get calendarId() {
		return getInternalSlotOrThrowForPlainDateTime(this).$calendar;
	}
	get era() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$era;
	}
	get eraYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$eraYear;
	}
	get year() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$year;
	}
	get month() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$month;
	}
	get monthCode() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$monthCode;
	}
	get day() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$day;
	}
	get hour() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$hour;
	}
	get minute() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$minute;
	}
	get second() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$second;
	}
	get millisecond() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$millisecond;
	}
	get microsecond() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$microsecond;
	}
	get nanosecond() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$nanosecond;
	}
	get dayOfWeek() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$dayOfWeek;
	}
	get dayOfYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$dayOfYear;
	}
	get weekOfYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$weekOfYear.$week;
	}
	get yearOfWeek() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$weekOfYear.$year;
	}
	get daysInWeek() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$daysInWeek;
	}
	get daysInMonth() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$daysInMonth;
	}
	get daysInYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$daysInYear;
	}
	get monthsInYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$monthsInYear;
	}
	get inLeapYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$inLeapYear;
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
