import { isoDateToEpochDays } from "./internal/abstractOperations.ts";
import { defineStringTag } from "./internal/property.ts";
import type { IsoDateRecord } from "./PlainDate.ts";
import { compareTimeRecord, midnightTimeRecord, type TimeRecord } from "./PlainTime.ts";

export interface IsoDateTimeRecord {
	$isoDate: IsoDateRecord;
	$time: TimeRecord;
}

/** `ISODateTimeWithinLimits` */
export function isoDateTimeWithinLimits(isoDateTime: IsoDateTimeRecord): boolean {
	const epochDays = isoDateToEpochDays(
		isoDateTime.$isoDate.$year,
		isoDateTime.$isoDate.$month - 1,
		isoDateTime.$isoDate.$day,
	);
	return (
		Math.abs(epochDays) <= 1e8 ||
		(epochDays === -100000001 && !!compareTimeRecord(isoDateTime.$time, midnightTimeRecord()))
	);
}

export class PlainDateTime {
	constructor() {}
	static from() {}
	static compare() {}
	get calendarId() {
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
