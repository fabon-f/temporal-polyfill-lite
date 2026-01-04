import { toIntegerIfIntegral } from "./internal/ecmascript.ts";
import { compare, divFloor, isWithin, modFloor, type NumberSign } from "./internal/math.ts";
import { defineStringTag } from "./internal/property.ts";

export interface TimeRecord {
	$hour: number;
	$minute: number;
	$second: number;
	$millisecond: number;
	$microsecond: number;
	$nanosecond: number;
	$days: number;
}

type TimeRecordTupleWithoutDays = [
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
];

const internalSlotBrand = /*#__PURE__*/ Symbol();

type PlainTimeSlot = TimeRecord & {
	[internalSlotBrand]: unknown;
};

const slots = new WeakMap<any, PlainTimeSlot>();

/** `CreateTimeRecord` */
export function createTimeRecord(
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
	deltaDays = 0,
): TimeRecord {
	return {
		$hour: hour,
		$minute: minute,
		$second: second,
		$millisecond: millisecond,
		$microsecond: microsecond,
		$nanosecond: nanosecond,
		$days: deltaDays,
	};
}

/** `MidnightTimeRecord` */
export function midnightTimeRecord(): TimeRecord {
	return createTimeRecord(0, 0, 0, 0, 0, 0);
}

/** `NoonTimeRecord` */
export function noonTimeRecord(): TimeRecord {
	return createTimeRecord(12, 0, 0, 0, 0, 0);
}

/** `IsValidTime` */
function isValidTime(
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
): boolean {
	return (
		isWithin(hour, 0, 23) &&
		isWithin(minute, 0, 59) &&
		isWithin(second, 0, 59) &&
		isWithin(millisecond, 0, 999) &&
		isWithin(microsecond, 0, 999) &&
		isWithin(nanosecond, 0, 999)
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
	microsecond += divFloor(nanosecond, 1000);
	millisecond += divFloor(microsecond, 1000);
	second += divFloor(millisecond, 1000);
	minute += divFloor(second, 60);
	hour += divFloor(minute, 60);
	return {
		$hour: modFloor(hour, 24),
		$minute: modFloor(minute, 60),
		$second: modFloor(second, 60),
		$millisecond: modFloor(millisecond, 1000),
		$microsecond: modFloor(microsecond, 1000),
		$nanosecond: modFloor(nanosecond, 1000),
		$days: divFloor(hour, 24),
	};
}

/** `CreateTemporalTime` */
function createTemporalTime(
	time: TimeRecord,
	instance = Object.create(PlainTime.prototype) as PlainTime,
): PlainTime {
	slots.set(instance, createPlainTimeSlot(time));
	return instance;
}

/** `CompareTimeRecord` */
export function compareTimeRecord(time1: TimeRecord, time2: TimeRecord): NumberSign {
	return (
		compare(time1.$hour, time2.$hour) ||
		compare(time1.$minute, time2.$minute) ||
		compare(time1.$second, time2.$second) ||
		compare(time1.$millisecond, time2.$millisecond) ||
		compare(time1.$microsecond, time2.$microsecond) ||
		compare(time1.$nanosecond, time2.$nanosecond)
	);
}

function createPlainTimeSlot(time: TimeRecord): PlainTimeSlot {
	return time as PlainTimeSlot;
}

function getInternalSlotOrThrowForPlainTime(plainTime: unknown): PlainTimeSlot {
	const slot = slots.get(plainTime);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
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
		const units = [hour, minute, second, millisecond, microsecond, nanosecond].map(
			toIntegerIfIntegral,
		) as TimeRecordTupleWithoutDays;
		if (!isValidTime(...units)) {
			throw new RangeError();
		}
		createTemporalTime(createTimeRecord(...units), this);
	}
	static from() {}
	static compare() {}
	get hour() {
		const slot = getInternalSlotOrThrowForPlainTime(this);
		return slot.$hour;
	}
	get minute() {
		const slot = getInternalSlotOrThrowForPlainTime(this);
		return slot.$minute;
	}
	get second() {
		const slot = getInternalSlotOrThrowForPlainTime(this);
		return slot.$second;
	}
	get millisecond() {
		const slot = getInternalSlotOrThrowForPlainTime(this);
		return slot.$millisecond;
	}
	get microsecond() {
		const slot = getInternalSlotOrThrowForPlainTime(this);
		return slot.$microsecond;
	}
	get nanosecond() {
		const slot = getInternalSlotOrThrowForPlainTime(this);
		return slot.$nanosecond;
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
