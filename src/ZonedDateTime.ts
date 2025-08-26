import { isValidEpochNanoseconds } from "./Instant.ts";
import type { ISODateTimeRecord } from "./PlainDateTime.ts";
import {
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
import { getInternalSlotOrThrow, toBigInt } from "./utils/ecmascript.ts";
import {
	addNanosecondsToEpoch,
	type EpochNanoseconds,
	fromNativeBigInt,
	getEpochMilliseconds,
	getPositiveRemainderNanoseconds,
	toNativeBigInt,
} from "./utils/epochNano.ts";
import { defineStringTag } from "./utils/property.ts";
import {
	formatUTCOffsetNanoseconds,
	getAvailableNamedTimeZoneIdentifier,
	getOffsetNanosecondsFor,
	parseTimeZoneIdentifier,
} from "./utils/timezones.ts";

const slots = new WeakMap<ZonedDateTime, ZonedDateTimeSlot>();

type ZonedDateTimeSlot = [
	epochNanoseconds: EpochNanoseconds,
	timeZone: string,
	/** lazy evaluation, `undefined` unless needed */
	offsetNanoseconds: number | undefined,
] & { __zonedDateTimeSlot__: unknown };

export function getEpochNanosecondsOfZonedDateTime(
	item: unknown,
): EpochNanoseconds | undefined {
	const slot = slots.get(item as any);
	return slot ? slot[0] : undefined;
}

function createTemporalZonedDateTimeSlot(
	epoch: EpochNanoseconds,
	timeZone: string,
	offsetNanoseconds?: number | undefined,
) {
	return [epoch, timeZone, offsetNanoseconds] as ZonedDateTimeSlot;
}

/** `CreateTemporalZonedDateTime` */
function createTemporalZonedDateTime(
	slot: ZonedDateTimeSlot,
	instance?: ZonedDateTime,
) {
	const zonedDateTime =
		instance || (Object.create(ZonedDateTime.prototype) as ZonedDateTime);
	slots.set(zonedDateTime, slot);
	return zonedDateTime;
}

function getOffsetNanosecondsForSlot(slot: ZonedDateTimeSlot) {
	// biome-ignore lint/suspicious/noAssignInExpressions: code golf
	return (slot[2] ||= getOffsetNanosecondsFor(slot[1], slot[0]));
}

/** alternative to `GetISODateTimeFor` */
function getISODateTimeForSlot(slot: ZonedDateTimeSlot): ISODateTimeRecord {
	const localEpoch = addNanosecondsToEpoch(
		slot[0],
		getOffsetNanosecondsForSlot(slot),
	);
	const [date, time] = utcEpochMillisecondsToIsoDateTime(
		getEpochMilliseconds(localEpoch),
	);
	return [date, [0, ...time, ...getPositiveRemainderNanoseconds(localEpoch)]];
}

export class ZonedDateTime {
	constructor(
		epochNanoseconds: unknown,
		timeZone: unknown,
		calendar: unknown = "iso8601",
	) {
		if (!new.target) {
			throw new TypeError();
		}
		const epoch = fromNativeBigInt(toBigInt(epochNanoseconds));
		if (!isValidEpochNanoseconds(epoch)) {
			throw new RangeError();
		}
		if (typeof timeZone !== "string") {
			throw new TypeError();
		}
		const tz = parseTimeZoneIdentifier(timeZone);
		let normalizedTimeZone: string;
		let offsetNanoseconds: number | undefined;
		if (typeof tz === "string") {
			normalizedTimeZone = getAvailableNamedTimeZoneIdentifier(tz);
		} else {
			offsetNanoseconds = tz;
			normalizedTimeZone = formatUTCOffsetNanoseconds(tz);
		}
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		assertCalendar(calendar);
		createTemporalZonedDateTime(
			createTemporalZonedDateTimeSlot(
				epoch,
				normalizedTimeZone,
				offsetNanoseconds,
			),
			this,
		);
	}
	static from() {}
	static compare() {}
	get calendarId() {
		return "iso8601";
	}
	get timeZoneId() {
		return getInternalSlotOrThrow(slots, this)[1];
	}
	get era() {
		return undefined;
	}
	get eraYear() {
		return undefined;
	}
	get year() {
		return getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[0][0];
	}
	get month() {
		return getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[0][1];
	}
	get monthCode() {
		return monthToMonthCode(
			getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[0][1],
		);
	}
	get day() {
		return getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[0][2];
	}
	get hour() {
		return getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[1][1];
	}
	get minute() {
		return getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[1][2];
	}
	get second() {
		return getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[1][3];
	}
	get millisecond() {
		return getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[1][4];
	}
	get microsecond() {
		return getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[1][5];
	}
	get nanosecond() {
		return getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[1][6];
	}
	get epochMilliseconds() {
		return getEpochMilliseconds(getInternalSlotOrThrow(slots, this)[0]);
	}
	get epochNanoseconds() {
		return toNativeBigInt(getInternalSlotOrThrow(slots, this)[0]);
	}
	get dayOfWeek() {
		return isoDayOfWeek(
			getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[0],
		);
	}
	get dayOfYear() {
		return isoDayOfYear(
			getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[0],
		);
	}
	get weekOfYear() {
		return isoWeekOfYear(
			getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[0],
		)[1];
	}
	get yearOfWeek() {
		return isoWeekOfYear(
			getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[0],
		)[0];
	}
	get hoursInDay() {
		return undefined;
	}
	get daysInWeek() {
		return 7;
	}
	get daysInMonth() {
		const [year, month] = getISODateTimeForSlot(
			getInternalSlotOrThrow(slots, this),
		)[0];
		return isoDaysInMonth(year, month);
	}
	get daysInYear() {
		return mathematicalDaysInYear(
			getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[0][0],
		);
	}
	get monthsInYear() {
		return 12;
	}
	get inLeapYear() {
		return !!mathematicalInLeapYear(
			getISODateTimeForSlot(getInternalSlotOrThrow(slots, this))[0][0],
		);
	}
	get offsetNanoseconds() {
		return getOffsetNanosecondsForSlot(getInternalSlotOrThrow(slots, this));
	}
	get offset() {
		return formatUTCOffsetNanoseconds(
			getOffsetNanosecondsForSlot(getInternalSlotOrThrow(slots, this)),
		);
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
