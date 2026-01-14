import { toIntegerIfIntegral } from "./internal/ecmascript.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import {
	absTimeDuration,
	compareTimeDuration,
	createTimeDurationFromMicroseconds,
	createTimeDurationFromMilliseconds,
	createTimeDurationFromNanoseconds,
	createTimeDurationFromSeconds,
	sumTimeDuration,
} from "./internal/timeDuration.ts";
import {
	pluralUnitKeys,
	singularUnitKeys,
	unitIndices,
	type SingularUnitKey,
} from "./internal/unit.ts";
import { mapUnlessUndefined } from "./internal/utils.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

type DurationTuple = [
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

type PartialDurationRecord = [
	years: number | undefined,
	months: number | undefined,
	weeks: number | undefined,
	days: number | undefined,
	hours: number | undefined,
	minutes: number | undefined,
	seconds: number | undefined,
	milliseconds: number | undefined,
	microseconds: number | undefined,
	nanoseconds: number | undefined,
];

type DurationSlot = DurationTuple & { [internalSlotBrand]: unknown };

const slots = new WeakMap<any, DurationSlot>();

/** `ToTemporalDuration` */
function toTemporalDuration(item: unknown): DurationSlot {
	if (isDuration(item)) {
		return getInternalSlotOrThrowForDuration(item);
	}
	if (!isObject(item)) {
		if (typeof item === "string") {
			// TODO
		}
		throw new TypeError();
	}
	return createTemporalDurationSlot(
		...(toTemporalPartialDurationRecord(item).map((v) => v || 0) as DurationTuple),
	);
}

/** `DurationSign` */
function durationSign(duration: DurationSlot) {
	return Math.sign(
		duration[unitIndices.$year] ||
			duration[unitIndices.$month] ||
			duration[unitIndices.$week] ||
			duration[unitIndices.$day] ||
			duration[unitIndices.$hour] ||
			duration[unitIndices.$minute] ||
			duration[unitIndices.$second] ||
			duration[unitIndices.$millisecond] ||
			duration[unitIndices.$microsecond] ||
			duration[unitIndices.$nanosecond],
	);
}

/** `IsValidDuration` */
function isValidDuration(...units: DurationTuple): boolean {
	const timeDurationAboveSecond =
		units[unitIndices.$day] * 86400 +
		units[unitIndices.$hour] * 3600 +
		units[unitIndices.$minute] * 60 +
		units[unitIndices.$second];
	return (
		(units.every((n) => n <= 0) || units.every((n) => n >= 0)) &&
		Math.abs(units[unitIndices.$year]) < Math.pow(2, 32) &&
		Math.abs(units[unitIndices.$month]) < Math.pow(2, 32) &&
		Math.abs(units[unitIndices.$week]) < Math.pow(2, 32) &&
		Number.isSafeInteger(timeDurationAboveSecond) &&
		compareTimeDuration(
			absTimeDuration(
				sumTimeDuration([
					createTimeDurationFromSeconds(timeDurationAboveSecond),
					createTimeDurationFromMilliseconds(units[7]),
					createTimeDurationFromMicroseconds(units[8]),
					createTimeDurationFromNanoseconds(units[9]),
				]),
			),
			createTimeDurationFromSeconds(Number.MAX_SAFE_INTEGER),
		) <= 0
	);
}

/** `DefaultTemporalLargestUnit` */
function defaultTemporalLargestUnit(duration: DurationSlot): SingularUnitKey {
	return singularUnitKeys[(duration.findIndex((v) => v !== 0) + 10) % 10]!;
}

/** `ToTemporalPartialDurationRecord` */
function toTemporalPartialDurationRecord(temporalDurationLike: unknown): PartialDurationRecord {
	if (!isObject(temporalDurationLike)) {
		throw new TypeError();
	}
	const unitsByAlphabeticalOrder = [
		unitIndices.$day,
		unitIndices.$hour,
		unitIndices.$microsecond,
		unitIndices.$millisecond,
		unitIndices.$minute,
		unitIndices.$month,
		unitIndices.$nanosecond,
		unitIndices.$second,
		unitIndices.$week,
		unitIndices.$year,
	].map((i) =>
		mapUnlessUndefined(
			(temporalDurationLike as Record<string, unknown>)[pluralUnitKeys[i]],
			toIntegerIfIntegral,
		),
	) as [
		number | undefined,
		number | undefined,
		number | undefined,
		number | undefined,
		number | undefined,
		number | undefined,
		number | undefined,
		number | undefined,
		number | undefined,
		number | undefined,
	];
	if (unitsByAlphabeticalOrder.every((v) => v === undefined)) {
		throw new TypeError();
	}
	return [9, 5, 8, 0, 1, 4, 7, 3, 2, 6].map(
		(i) => unitsByAlphabeticalOrder[i],
	) as PartialDurationRecord;
}

/** part of `CreateTemporalDuration` */
function createTemporalDurationSlot(
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
): DurationSlot {
	if (
		!isValidDuration(
			years,
			months,
			weeks,
			days,
			hours,
			minutes,
			seconds,
			milliseconds,
			microseconds,
			nanoseconds,
		)
	) {
		throw new RangeError();
	}
	return [
		years,
		months,
		weeks,
		days,
		hours,
		minutes,
		seconds,
		milliseconds,
		microseconds,
		nanoseconds,
	] as DurationSlot;
}

/** part of `CreateTemporalDuration` */
function createTemporalDuration(
	slot: DurationSlot,
	instance = Object.create(Duration.prototype) as Duration,
): Duration {
	slots.set(instance, slot);
	return instance;
}

/** `CreateNegatedTemporalDuration` */
function createNegatedTemporalDurationSlot(duration: DurationSlot): DurationSlot {
	return createTemporalDurationSlot(...(duration.map((v) => 0 - v) as DurationTuple));
}

function isDuration(duration: unknown) {
	return slots.has(duration);
}

function getInternalSlotOrThrowForDuration(duration: unknown): DurationSlot {
	const slot = slots.get(duration);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

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
		createTemporalDuration(
			createTemporalDurationSlot(
				...([
					years,
					months,
					weeks,
					days,
					hours,
					minutes,
					seconds,
					milliseconds,
					microseconds,
					nanoseconds,
				].map(toIntegerIfIntegral) as DurationTuple),
			),
			this,
		);
	}
	static from(item: unknown) {
		return createTemporalDuration(toTemporalDuration(item));
	}
	static compare() {}
	get years() {
		return getInternalSlotOrThrowForDuration(this)[unitIndices.$year];
	}
	get months() {
		return getInternalSlotOrThrowForDuration(this)[unitIndices.$month];
	}
	get weeks() {
		return getInternalSlotOrThrowForDuration(this)[unitIndices.$week];
	}
	get days() {
		return getInternalSlotOrThrowForDuration(this)[unitIndices.$day];
	}
	get hours() {
		return getInternalSlotOrThrowForDuration(this)[unitIndices.$hour];
	}
	get minutes() {
		return getInternalSlotOrThrowForDuration(this)[unitIndices.$minute];
	}
	get seconds() {
		return getInternalSlotOrThrowForDuration(this)[unitIndices.$second];
	}
	get milliseconds() {
		return getInternalSlotOrThrowForDuration(this)[unitIndices.$millisecond];
	}
	get microseconds() {
		return getInternalSlotOrThrowForDuration(this)[unitIndices.$microsecond];
	}
	get nanoseconds() {
		return getInternalSlotOrThrowForDuration(this)[unitIndices.$nanosecond];
	}
	get sign() {
		return durationSign(getInternalSlotOrThrowForDuration(this));
	}
	get blank() {
		return durationSign(getInternalSlotOrThrowForDuration(this)) === 0;
	}
	with(temporalDurationLike: unknown) {
		const thisSlot = getInternalSlotOrThrowForDuration(this);
		return createTemporalDuration(
			createTemporalDurationSlot(
				...(toTemporalPartialDurationRecord(temporalDurationLike).map((v, i) =>
					v === undefined ? thisSlot[i]! : v,
				) as [number, number, number, number, number, number, number, number, number, number]),
			),
		);
	}
	negated() {
		return createTemporalDuration(
			createNegatedTemporalDurationSlot(getInternalSlotOrThrowForDuration(this)),
		);
	}
	abs() {
		return createTemporalDuration(
			createTemporalDurationSlot(
				...(getInternalSlotOrThrowForDuration(this).map(Math.abs) as DurationTuple),
			),
		);
	}
	add() {}
	subtract() {}
	round() {}
	total() {}
	toString() {}
	toJSON() {}
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForDuration(this);
		// TODO
		return "";
	}
	valueOf() {
		throw new TypeError();
	}
}

defineStringTag(Duration.prototype, "Temporal.Duration");
renameFunction(Duration, "Duration");
