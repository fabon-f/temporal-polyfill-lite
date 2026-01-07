import { isValidEpochNanoseconds } from "./Instant.ts";
import { epochDaysToIsoDate } from "./internal/abstractOperations.ts";
import {
	calendarIsoToDate,
	canonicalizeCalendar,
	type CalendarDateRecord,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { toBigInt } from "./internal/ecmascript.ts";
import {
	convertEpochNanosecondsToBigInt,
	createEpochNanosecondsFromBigInt,
	epochDaysAndRemainderNanoseconds,
	epochMilliseconds,
	type EpochNanoseconds,
} from "./internal/epochNanoseconds.ts";
import { defineStringTag } from "./internal/property.ts";
import {
	formatOffsetTimeZoneIdentifier,
	getAvailableNamedTimeZoneIdentifier,
	getOffsetNanosecondsFor,
	parseTimeZoneIdentifier,
} from "./internal/timeZones.ts";
import { balanceIsoDateTime, type IsoDateTimeRecord } from "./PlainDateTime.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

interface ZonedDateTimeSlot {
	$epochNanoseconds: EpochNanoseconds;
	$timeZone: string;
	$calendar: SupportedCalendars;
	/** cached offset nanoseconds */
	$offsetNanoseconds?: number | undefined;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, ZonedDateTimeSlot>();

/** ` CreateTemporalZonedDateTime` */
function createTemporalZonedDateTime(
	epochNanoseconds: EpochNanoseconds,
	timeZone: string,
	calendar: SupportedCalendars,
	instance = Object.create(ZonedDateTime.prototype) as ZonedDateTime,
) {
	const slot = createInternalSlot(epochNanoseconds, timeZone, calendar);
	slots.set(instance, slot);
	return instance;
}

function createInternalSlot(
	epochNanoseconds: EpochNanoseconds,
	timeZone: string,
	calendar: SupportedCalendars,
	offsetNanoseconds?: number,
): ZonedDateTimeSlot {
	return {
		$epochNanoseconds: epochNanoseconds,
		$timeZone: timeZone,
		$calendar: calendar,
		$offsetNanoseconds: offsetNanoseconds,
	} as ZonedDateTimeSlot;
}

/** `GetOffsetNanosecondsFor` with caching */
function getOffsetNanosecondsForZonedDateTimeSlot(slot: ZonedDateTimeSlot): number {
	if (slot.$offsetNanoseconds !== undefined) {
		return slot.$offsetNanoseconds;
	}
	return (slot.$offsetNanoseconds = getOffsetNanosecondsFor(
		slot.$timeZone,
		slot.$epochNanoseconds,
	));
}

/** `GetISODateTimeFor` with caching */
export function getIsoDateTimeForZonedDateTimeSlot(slot: ZonedDateTimeSlot): IsoDateTimeRecord {
	const offsetNanoseconds = getOffsetNanosecondsForZonedDateTimeSlot(slot);
	// `GetISOPartsFromEpoch`
	const [epochDays, remainderNanoseconds] = epochDaysAndRemainderNanoseconds(
		slot.$epochNanoseconds,
	);
	const date = epochDaysToIsoDate(epochDays);
	return balanceIsoDateTime(
		date.$year,
		date.$month,
		date.$day,
		0,
		0,
		0,
		0,
		0,
		remainderNanoseconds + offsetNanoseconds,
	);
}

function calendarIsoToDateForZonedDateTimeSlot(slot: ZonedDateTimeSlot): CalendarDateRecord {
	return calendarIsoToDate(slot.$calendar, getIsoDateTimeForZonedDateTimeSlot(slot).$isoDate);
}

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
	constructor(epochNanoseconds: unknown, timeZone: unknown, calendar: unknown = "iso8601") {
		if (!new.target) {
			throw new TypeError();
		}
		const epoch = createEpochNanosecondsFromBigInt(toBigInt(epochNanoseconds));
		if (!isValidEpochNanoseconds(epoch)) {
			throw new RangeError();
		}
		if (typeof timeZone !== "string") {
			throw new TypeError();
		}
		const result = parseTimeZoneIdentifier(timeZone);
		const timeZoneString =
			result.$name !== undefined
				? getAvailableNamedTimeZoneIdentifier(result.$name)
				: formatOffsetTimeZoneIdentifier(result.$offsetMinutes);
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		createTemporalZonedDateTime(epoch, timeZoneString, canonicalizeCalendar(calendar), this);
	}
	static from() {}
	static compare() {}
	get calendarId() {
		return getInternalSlotOrThrowForZonedDateTime(this).$calendar;
	}
	get timeZoneId() {
		return getInternalSlotOrThrowForZonedDateTime(this).$timeZone;
	}
	get era() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$era;
	}
	get eraYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$eraYear;
	}
	get year() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$year;
	}
	get month() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$month;
	}
	get monthCode() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$monthCode;
	}
	get day() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$day;
	}
	get hour() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$hour;
	}
	get minute() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$minute;
	}
	get second() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$second;
	}
	get millisecond() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$millisecond;
	}
	get microsecond() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$microsecond;
	}
	get nanosecond() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$nanosecond;
	}
	get epochMilliseconds() {
		return epochMilliseconds(getInternalSlotOrThrowForZonedDateTime(this).$epochNanoseconds);
	}
	get epochNanoseconds() {
		return convertEpochNanosecondsToBigInt(
			getInternalSlotOrThrowForZonedDateTime(this).$epochNanoseconds,
		);
	}
	get dayOfWeek() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$dayOfWeek;
	}
	get dayOfYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$dayOfYear;
	}
	get weekOfYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$weekOfYear.$week;
	}
	get yearOfWeek() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$weekOfYear.$year;
	}
	get hoursInDay() {
		return undefined;
	}
	get daysInWeek() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$daysInWeek;
	}
	get daysInMonth() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$daysInMonth;
	}
	get daysInYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$daysInYear;
	}
	get monthsInYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$monthsInYear;
	}
	get inLeapYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$inLeapYear;
	}
	get offsetNanoseconds() {
		return getOffsetNanosecondsForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this));
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
