import {
	getInternalSlotOrThrow,
	toIntegerIfIntegral,
} from "./utils/ecmascript.js";
import { defineStringTag } from "./utils/property.js";

type DurationRecord = [
	years: number,
	months: number,
	weeks: number,
	days: number,
	hours: number,
	minutes: number,
	seconds: number,
	milliseconds: number,
	microseconds: number,
	nanoseconds: number,
];

type DurationSlot = DurationRecord & { __durationSlot__: unknown };

/** `DurationSign` */
const durationSign = (record: number[]): 1 | 0 | -1 => {
	return Math.sign(record.find((v) => v !== 0) ?? 0) as 1 | 0 | -1;
};

export function isDurationSignValid(record: DurationRecord): boolean {
	const signs = record.map(Math.sign);
	return !(signs.includes(-1) && signs.includes(1));
}

/** `IsValidDuration` */
function isValidDuration(...record: DurationRecord): boolean {
	if (!isDurationSignValid(record) || !record.every(Number.isFinite)) {
		return false;
	}
	if (
		Math.abs(record[0]) >= 2 ** 32 ||
		Math.abs(record[1]) >= 2 ** 32 ||
		Math.abs(record[2]) >= 2 ** 32
	) {
		return false;
	}
	const totalSec =
		record[3] * 86400 +
		record[4] * 3600 +
		record[5] * 60 +
		record[6] +
		Math.trunc(record[7] / 1e3) +
		Math.trunc(record[8] / 1e6) +
		Math.trunc(record[9] / 1e9) +
		Math.trunc(
			((record[7] % 1e3) * 1e6 + (record[8] % 1e6) * 1e3 + (record[9] % 1e9)) /
				1e9,
		);
	return Number.isSafeInteger(totalSec);
}

/** part of `CreateTemporalDuration` */
function createTemporalDurationSlot(...record: DurationRecord): DurationSlot {
	if (!isValidDuration(...record)) {
		throw new RangeError();
	}
	return record as DurationSlot;
}

/** part of `CreateTemporalDuration` */
function createTemporalDuration(
	slot: DurationSlot,
	instance?: Duration,
): Duration {
	const duration = instance ?? (Object.create(Duration.prototype) as Duration);
	slots.set(duration, slot);
	return duration;
}

/** `CreateNegatedTemporalDuration` */
const createNegatedTemporalDurationSlot = (
	record: DurationSlot,
): DurationSlot => {
	// avoid -0
	return record.map((v) => 0 - v) as DurationSlot;
};

const slots = new WeakMap<Duration, DurationSlot>();

export class Duration {
	constructor(
		years: unknown = 0,
		months: unknown = 0,
		weeks: unknown = 0,
		days: unknown = 0,
		hours: unknown = 0,
		minutes: unknown = 0,
		seconds: unknown = 0,
		milliseconds: unknown = 0,
		microseconds: unknown = 0,
		nanoseconds: unknown = 0,
	) {
		if (!new.target) {
			throw new TypeError();
		}
		const slot = createTemporalDurationSlot(
			toIntegerIfIntegral(years),
			toIntegerIfIntegral(months),
			toIntegerIfIntegral(weeks),
			toIntegerIfIntegral(days),
			toIntegerIfIntegral(hours),
			toIntegerIfIntegral(minutes),
			toIntegerIfIntegral(seconds),
			toIntegerIfIntegral(milliseconds),
			toIntegerIfIntegral(microseconds),
			toIntegerIfIntegral(nanoseconds),
		);
		createTemporalDuration(slot, this);
	}
	static from() {}
	static compare() {}
	get years() {
		return getInternalSlotOrThrow(slots, this)[0];
	}
	get months() {
		return getInternalSlotOrThrow(slots, this)[1];
	}
	get weeks() {
		return getInternalSlotOrThrow(slots, this)[2];
	}
	get days() {
		return getInternalSlotOrThrow(slots, this)[3];
	}
	get hours() {
		return getInternalSlotOrThrow(slots, this)[4];
	}
	get minutes() {
		return getInternalSlotOrThrow(slots, this)[5];
	}
	get seconds() {
		return getInternalSlotOrThrow(slots, this)[6];
	}
	get milliseconds() {
		return getInternalSlotOrThrow(slots, this)[7];
	}
	get microseconds() {
		return getInternalSlotOrThrow(slots, this)[8];
	}
	get nanoseconds() {
		return getInternalSlotOrThrow(slots, this)[9];
	}
	get sign() {
		return durationSign(getInternalSlotOrThrow(slots, this));
	}
	get blank() {
		return durationSign(getInternalSlotOrThrow(slots, this)) === 0;
	}
	with() {}
	negated() {
		return createTemporalDuration(
			createNegatedTemporalDurationSlot(getInternalSlotOrThrow(slots, this)),
		);
	}
	abs() {
		return createTemporalDuration(
			getInternalSlotOrThrow(slots, this).map(Math.abs) as DurationSlot,
		);
	}
	add() {}
	subtract() {}
	round() {}
	total() {}
	toString() {}
	toJSON() {}
	toLocaleString() {}
	valueOf() {
		throw new TypeError();
	}
}

defineStringTag(Duration.prototype, "Temporal.Duration");
