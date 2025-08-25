import { isValidEpochNanoseconds } from "./Instant.ts";
import { assertCalendar } from "./utils/calendars.ts";
import { getInternalSlotOrThrow, toBigInt } from "./utils/ecmascript.ts";
import { type EpochNanoseconds, fromNativeBigInt } from "./utils/epochNano.ts";
import { defineStringTag } from "./utils/property.ts";
import {
	formatUTCOffsetNanoseconds,
	getAvailableNamedTimeZoneIdentifier,
	parseTimeZoneIdentifier,
} from "./utils/timezones.ts";

const slots = new WeakMap<ZonedDateTime, ZonedDateTimeSlot>();

type ZonedDateTimeSlot = [
	epochNanoseconds: EpochNanoseconds,
	timeZone: string,
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
