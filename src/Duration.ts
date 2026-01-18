import { parseTemporalDurationString } from "./internal/abstractOperations.ts";
import { assert, assertNotUndefined } from "./internal/assertion.ts";
import { toIntegerIfIntegral } from "./internal/ecmascript.ts";
import type { RoundingMode } from "./internal/enum.ts";
import { differenceEpochNanoseconds, type EpochNanoseconds } from "./internal/epochNanoseconds.ts";
import type { NumberSign } from "./internal/math.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import {
	absTimeDuration,
	addDaysToTimeDuration,
	addNanosecondsToTimeDuration,
	compareTimeDuration,
	createTimeDurationFromMicroseconds,
	createTimeDurationFromMilliseconds,
	createTimeDurationFromNanoseconds,
	createTimeDurationFromSeconds,
	roundTimeDuration as roundTimeDurationOriginal,
	signTimeDuration,
	sumTimeDuration,
	timeDurationDaysAndRemainderNanoseconds,
	timeDurationToMicrosecondsNumber,
	timeDurationToMillisecondsNumber,
	timeDurationToNanosecondsNumber,
	timeDurationToSecondsNumber,
	type TimeDuration,
} from "./internal/timeDuration.ts";
import {
	nanosecondsForTimeUnit,
	pluralUnitKeys,
	singularUnitKeys,
	unitIndices,
	type SingularTimeUnitKey,
	type SingularUnitKey,
} from "./internal/unit.ts";
import { mapUnlessUndefined, notImplementedYet } from "./internal/utils.ts";

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

type TimeDurationTuple = [
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

export interface DateDurationRecord {
	$years: number;
	$months: number;
	$weeks: number;
	$days: number;
}

export interface InternalDurationRecord {
	$date: DateDurationRecord;
	$time: TimeDuration;
}

export type DurationSlot = DurationTuple & { [internalSlotBrand]: unknown };

const maxTimeDuration = addNanosecondsToTimeDuration(
	createTimeDurationFromSeconds(Number.MAX_SAFE_INTEGER),
	999999999,
);

const slots = new WeakMap<any, DurationSlot>();

/** `ZeroDateDuration` */
export function zeroDateDuration(): DateDurationRecord {
	return createDateDurationRecord(0, 0, 0, 0);
}

/** `ToInternalDurationRecord` */
export function toInternalDurationRecord(duration: DurationSlot): InternalDurationRecord {
	return combineDateAndTimeDuration(
		createDateDurationRecord(
			duration[unitIndices.$year],
			duration[unitIndices.$month],
			duration[unitIndices.$week],
			duration[unitIndices.$day],
		),
		timeDurationFromComponents(
			duration[unitIndices.$hour],
			duration[unitIndices.$minute],
			duration[unitIndices.$second],
			duration[unitIndices.$millisecond],
			duration[unitIndices.$microsecond],
			duration[unitIndices.$nanosecond],
		),
	);
}

/** `ToInternalDurationRecordWith24HourDays` */
export function toInternalDurationRecordWith24HourDays(
	duration: DurationSlot,
): InternalDurationRecord {
	// this AO shouldn't fail, so it's safe to change order of `createDateDurationRecord` and `add24HourDaysToTimeDuration`
	return combineDateAndTimeDuration(
		createDateDurationRecord(
			duration[unitIndices.$year],
			duration[unitIndices.$month],
			duration[unitIndices.$week],
			0,
		),
		add24HourDaysToTimeDuration(
			timeDurationFromComponents(...(duration.slice(unitIndices.$hour) as TimeDurationTuple)),
			duration[unitIndices.$day],
		),
	);
}

/** `ToDateDurationRecordWithoutTime` */
export function toDateDurationRecordWithoutTime(duration: DurationSlot): DateDurationRecord {
	const internalDuration = toInternalDurationRecordWith24HourDays(duration);
	return createDateDurationRecord(
		internalDuration.$date.$years,
		internalDuration.$date.$months,
		internalDuration.$date.$weeks,
		timeDurationDaysAndRemainderNanoseconds(internalDuration.$time)[0],
	);
}

/** `TemporalDurationFromInternal` */
export function temporalDurationFromInternal(
	internalDuration: InternalDurationRecord,
	largestUnit: SingularUnitKey,
): DurationSlot {
	const [days, ...timeUnits] = balanceTimeDuration(internalDuration.$time, largestUnit);
	return createTemporalDurationSlot(
		internalDuration.$date.$years,
		internalDuration.$date.$months,
		internalDuration.$date.$weeks,
		internalDuration.$date.$days + days,
		...timeUnits,
	);
}

/** `CreateDateDurationRecord` */
export function createDateDurationRecord(
	years: number,
	months: number,
	weeks: number,
	days: number,
): DateDurationRecord {
	if (!isValidDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0)) {
		throw new RangeError();
	}
	return {
		$years: years,
		$months: months,
		$weeks: weeks,
		$days: days,
	};
}

/** `AdjustDateDurationRecord` */
export function adjustDateDurationRecord(
	dateDuration: DateDurationRecord,
	days: number,
	weeks = dateDuration.$weeks,
	months = dateDuration.$months,
): DateDurationRecord {
	return createDateDurationRecord(dateDuration.$years, months, weeks, days);
}

/** `CombineDateAndTimeDuration` */
export function combineDateAndTimeDuration(
	date: DateDurationRecord,
	time: TimeDuration,
): InternalDurationRecord {
	assert(dateDurationSign(date) * timeDurationSign(time) >= 0);
	return {
		$date: date,
		$time: time,
	};
}

/** `ToTemporalDuration` */
export function toTemporalDuration(item: unknown): DurationSlot {
	if (isDuration(item)) {
		return getInternalSlotOrThrowForDuration(item);
	}
	if (!isObject(item)) {
		if (typeof item !== "string") {
			throw new TypeError();
		}
		return parseTemporalDurationString(item);
	}
	return createTemporalDurationSlot(
		...(toTemporalPartialDurationRecord(item).map((v) => v || 0) as DurationTuple),
	);
}

/** `DurationSign` */
function durationSign(duration: DurationSlot): NumberSign {
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
	) as NumberSign;
}

/** `DateDurationSign` */
export function dateDurationSign(dateDuration: DateDurationRecord): NumberSign {
	return Math.sign(
		dateDuration.$years || dateDuration.$months || dateDuration.$weeks || dateDuration.$days,
	) as NumberSign;
}

/** `IsValidDuration` */
function isValidDuration(...units: DurationTuple): boolean {
	assert(units.every((v) => Number.isFinite(v)));
	const timeDurationAboveSecond =
		units[unitIndices.$day] * 86400 +
		units[unitIndices.$hour] * 3600 +
		units[unitIndices.$minute] * 60 +
		units[unitIndices.$second];
	return (
		(units.every((n) => n <= 0) || units.every((n) => n >= 0)) &&
		Math.abs(units[unitIndices.$year]) < 2 ** 32 &&
		Math.abs(units[unitIndices.$month]) < 2 ** 32 &&
		Math.abs(units[unitIndices.$week]) < 2 ** 32 &&
		// TODO: verify whether `isSafeInteger` guard is necessary or not
		Number.isSafeInteger(timeDurationAboveSecond) &&
		timeDurationWithinLimits(
			timeDurationFromComponents(
				units[unitIndices.$day] * 24 + units[unitIndices.$hour],
				units[unitIndices.$minute],
				units[unitIndices.$second],
				units[unitIndices.$millisecond],
				units[unitIndices.$microsecond],
				units[unitIndices.$nanosecond],
			),
		)
	);
}

/** `DefaultTemporalLargestUnit` */
export function defaultTemporalLargestUnit(duration: DurationSlot): SingularUnitKey {
	const unit = singularUnitKeys[(duration.findIndex((v) => v !== 0) + 10) % 10];
	assertNotUndefined(unit);
	return unit;
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
export function createTemporalDurationSlot(
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
export function createTemporalDuration(
	slot: DurationSlot,
	instance = Object.create(Duration.prototype) as Duration,
): Duration {
	slots.set(instance, slot);
	return instance;
}

/** `CreateNegatedTemporalDuration` */
function createNegatedTemporalDurationSlot(duration: DurationSlot): DurationSlot {
	return applySignToDurationSlot(duration, -1);
}

/** `TimeDurationFromComponents` */
export function timeDurationFromComponents(
	hours: number,
	minutes: number,
	seconds: number,
	milliseconds: number,
	microseconds: number,
	nanoseconds: number,
): TimeDuration {
	return sumTimeDuration([
		createTimeDurationFromSeconds(hours * 3600 + minutes * 60 + seconds),
		createTimeDurationFromMilliseconds(milliseconds),
		createTimeDurationFromMicroseconds(microseconds),
		createTimeDurationFromNanoseconds(nanoseconds),
	]);
}

/** `Add24HourDaysToTimeDuration` */
function add24HourDaysToTimeDuration(d: TimeDuration, days: number): TimeDuration {
	const result = addDaysToTimeDuration(d, days);
	if (compareTimeDuration(result, maxTimeDuration) === 1) {
		throw new RangeError();
	}
	return result;
}

/** `TimeDurationFromEpochNanosecondsDifference` */
export function timeDurationFromEpochNanosecondsDifference(
	one: EpochNanoseconds,
	two: EpochNanoseconds,
): TimeDuration {
	const result = differenceEpochNanoseconds(two, one);
	assert(timeDurationWithinLimits(result));
	return result;
}

/** `RoundTimeDurationToIncrement` */
function roundTimeDurationToIncrement(
	d: TimeDuration,
	increment: number,
	roundingMode: RoundingMode,
): TimeDuration {
	const rounded = roundTimeDurationOriginal(d, increment, roundingMode);
	if (!timeDurationWithinLimits(rounded)) {
		throw new RangeError();
	}
	return rounded;
}

/** `TimeDurationSign` */
const timeDurationSign = signTimeDuration;

/** `RoundTimeDuration` */
export function roundTimeDuration(
	timeDuration: TimeDuration,
	increment: number,
	unit: SingularTimeUnitKey,
	roundingMode: RoundingMode,
): TimeDuration {
	return roundTimeDurationToIncrement(
		timeDuration,
		nanosecondsForTimeUnit(unit) * increment,
		roundingMode,
	);
}

function isDuration(duration: unknown): boolean {
	return slots.has(duration);
}

function getInternalSlotOrThrowForDuration(duration: unknown): DurationSlot {
	const slot = slots.get(duration);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

export function applySignToDurationSlot(duration: DurationSlot, sign: NumberSign): DurationSlot {
	return createTemporalDurationSlot(...(duration.map((v) => v * sign + 0) as DurationTuple));
}

function timeDurationWithinLimits(d: TimeDuration): boolean {
	return compareTimeDuration(absTimeDuration(d), maxTimeDuration) !== 1;
}

function balanceTimeDuration(
	d: TimeDuration,
	largestUnit: SingularUnitKey,
): [days: number, ...TimeDurationTuple] {
	const nanoseconds = timeDurationDaysAndRemainderNanoseconds(d)[1];
	const remNanoseconds = (nanoseconds % 1000) + 0;
	const remMicroseconds = (Math.trunc(nanoseconds / 1e3) % 1000) + 0;
	const remMilliseconds = (Math.trunc(nanoseconds / 1e6) % 1000) + 0;
	const seconds = timeDurationToSecondsNumber(d);
	const remSeconds = (seconds % 60) + 0;
	const minutes = Math.trunc(seconds / 60) + 0;
	const remMinutes = (minutes % 60) + 0;
	const hours = Math.trunc(minutes / 60) + 0;
	const remHours = (hours % 24) + 0;
	const days = Math.trunc(hours / 24) + 0;

	if (largestUnit === "nanosecond") {
		return [0, 0, 0, 0, 0, 0, timeDurationToNanosecondsNumber(d)];
	}
	if (largestUnit === "microsecond") {
		return [0, 0, 0, 0, 0, timeDurationToMicrosecondsNumber(d), remNanoseconds];
	}
	if (largestUnit === "millisecond") {
		return [0, 0, 0, 0, timeDurationToMillisecondsNumber(d), remMicroseconds, remNanoseconds];
	}
	if (largestUnit === "second") {
		return [0, 0, 0, seconds, remMilliseconds, remMicroseconds, remNanoseconds];
	}
	if (largestUnit === "minute") {
		return [0, 0, minutes, remSeconds, remMilliseconds, remMicroseconds, remNanoseconds];
	}
	if (largestUnit === "hour") {
		return [0, hours, remMinutes, remSeconds, remMilliseconds, remMicroseconds, remNanoseconds];
	}
	return [days, remHours, remMinutes, remSeconds, remMilliseconds, remMicroseconds, remNanoseconds];
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
	static compare() {
		notImplementedYet();
	}
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
				...(toTemporalPartialDurationRecord(temporalDurationLike).map(
					(v, i) => v ?? thisSlot[i]!,
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
	add() {
		notImplementedYet();
	}
	subtract() {
		notImplementedYet();
	}
	round() {
		notImplementedYet();
	}
	total() {
		notImplementedYet();
	}
	toString() {
		notImplementedYet();
	}
	toJSON() {
		notImplementedYet();
	}
	// oxlint-disable-next-line no-unused-vars
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		getInternalSlotOrThrowForDuration(this);
		// TODO
		return "";
	}
	valueOf() {
		throw new TypeError();
	}
}

defineStringTag(Duration.prototype, "Temporal.Duration");
renameFunction(Duration, "Duration");
