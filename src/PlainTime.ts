import {
	getInternalSlotOrThrow,
	toIntegerWithTruncation,
} from "./utils/ecmascript.ts";
import { mod } from "./utils/math.ts";
import { defineStringTag } from "./utils/property.ts";

const slots = new WeakMap<PlainTime, PlainTimeSlot>();

export type TimeRecord = [
	/** overflow days, usually 0 */
	day: number,
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
];

export type PlainTimeSlot = TimeRecord & { __plainTimeSlot__: unknown };

export function createTemporalTimeSlot(fields: TimeRecord) {
	if (isValidTime(...fields)) {
		throw new RangeError();
	}
	return fields as PlainTimeSlot;
}

function createTemporalTime(
	slot: PlainTimeSlot,
	instance?: PlainTime,
): PlainTime {
	const plainTime =
		instance || (Object.create(PlainTime.prototype) as PlainTime);
	slots.set(plainTime, slot);
	return plainTime;
}

/** `IsValidTime` */
export function isValidTime(
	_: unknown,
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
) {
	return (
		hour >= 0 &&
		hour < 24 &&
		minute >= 0 &&
		minute < 60 &&
		second >= 0 &&
		second < 60 &&
		millisecond >= 0 &&
		millisecond < 1000 &&
		microsecond >= 0 &&
		microsecond < 1000 &&
		nanosecond >= 0 &&
		nanosecond < 1000
	);
}

/** `BalanceTime` */
export function balanceTime(
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
): TimeRecord {
	microsecond += Math.floor(nanosecond / 1000);
	millisecond += Math.floor(microsecond / 1000);
	second += Math.floor(millisecond / 1000);
	minute += Math.floor(second / 60);
	hour += Math.floor(minute / 60);
	return [
		Math.floor(hour / 24),
		mod(hour, 24),
		mod(minute, 60),
		mod(second, 60),
		mod(millisecond, 1000),
		mod(microsecond, 1000),
		mod(nanosecond, 1000),
	];
}

export function midnightRecord(): TimeRecord {
	return [0, 0, 0, 0, 0, 0, 0];
}

export function sliceTimePart(record: TimeRecord) {
	return record.slice(1) as [number, number, number, number, number, number];
}

export function sliceTimeLargerThanMilliseconds(record: TimeRecord) {
	return record.slice(1, 5) as [number, number, number, number];
}

export class PlainTime {
	constructor(
		hour: unknown = 0,
		minute: unknown = 0,
		second: unknown = 0,
		millisecond: unknown = 0,
		microsecond: unknown = 0,
		nanosecond: unknown = 0,
	) {
		if (!new.target) {
			throw new TypeError();
		}
		createTemporalTime(
			createTemporalTimeSlot([
				0,
				toIntegerWithTruncation(hour),
				toIntegerWithTruncation(minute),
				toIntegerWithTruncation(second),
				toIntegerWithTruncation(millisecond),
				toIntegerWithTruncation(microsecond),
				toIntegerWithTruncation(nanosecond),
			]),
			this,
		);
	}
	static from() {}
	static compare() {}
	get hour() {
		return getInternalSlotOrThrow(slots, this)[1];
	}
	get minute() {
		return getInternalSlotOrThrow(slots, this)[2];
	}
	get second() {
		return getInternalSlotOrThrow(slots, this)[3];
	}
	get millisecond() {
		return getInternalSlotOrThrow(slots, this)[4];
	}
	get microsecond() {
		return getInternalSlotOrThrow(slots, this)[5];
	}
	get nanosecond() {
		return getInternalSlotOrThrow(slots, this)[6];
	}
	add() {}
	subtract() {}
	with() {}
	until() {}
	since() {}
	round() {}
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
}

defineStringTag(PlainTime.prototype, "Temporal.PlainTime");
