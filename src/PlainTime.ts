import {
	getRoundingIncrementOption,
	getRoundingModeOption,
	getTemporalOverflowOption,
	getTemporalUnitValuedOption,
	maximumTemporalDurationRoundingIncrement,
	roundNumberToIncrement,
	validateTemporalRoundingIncrement,
	validateTemporalUnitValue,
} from "./internal/abstractOperations.ts";
import {
	isAmbiguousTemporalTimeString,
	parseIsoDateTime,
	temporalTimeStringRegExp,
} from "./internal/dateTimeParser.ts";
import {
	getOptionsObject,
	getRoundToOptionsObject,
	toIntegerIfIntegral,
	toIntegerWithTruncation,
} from "./internal/ecmascript.ts";
import {
	overflowConstrain,
	required,
	roundingModeHalfExpand,
	time,
	type Overflow,
	type RoundingMode,
} from "./internal/enum.ts";
import {
	singularUnitKeys,
	timeUnitLengths,
	unitIndices,
	type SingularUnitKey,
} from "./internal/unit.ts";
import { clamp, compare, divFloor, isWithin, modFloor, type NumberSign } from "./internal/math.ts";
import { createNullPrototypeObject, isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { getInternalSlotOrThrowForPlainDateTime, isPlainDateTime } from "./PlainDateTime.ts";
import {
	getInternalSlotOrThrowForZonedDateTime,
	getIsoDateTimeForZonedDateTimeSlot,
	isZonedDateTime,
} from "./ZonedDateTime.ts";

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

/** `ToTemporalTime` */
export function toTemporalTime(item: unknown, options?: unknown) {
	if (isObject(item)) {
		if (isPlainTime(item)) {
			getTemporalOverflowOption(getOptionsObject(options));
			return createTemporalTime(getInternalSlotOrThrowForPlainTime(item));
		}
		if (isPlainDateTime(item)) {
			getTemporalOverflowOption(getOptionsObject(options));
			return createTemporalTime(getInternalSlotOrThrowForPlainDateTime(item).$isoDateTime.$time);
		}
		if (isZonedDateTime(item)) {
			getTemporalOverflowOption(getOptionsObject(options));
			return createTemporalTime(
				getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(item)).$time,
			);
		}
		const fields = toTemporalTimeRecord(item);
		const overflow = getTemporalOverflowOption(getOptionsObject(options));
		return createTemporalTime(
			regulateTime(
				fields.hour,
				fields.minute,
				fields.second,
				fields.millisecond,
				fields.microsecond,
				fields.nanosecond,
				overflow,
			),
		);
	}
	if (typeof item !== "string") {
		throw new TypeError();
	}
	const result = parseIsoDateTime(item, [temporalTimeStringRegExp]);
	if (isAmbiguousTemporalTimeString(item)) {
		throw new RangeError();
	}
	getTemporalOverflowOption(getOptionsObject(options));
	return createTemporalTime(result.$time as TimeRecord);
}

/** `ToTimeRecordOrMidnight` */
export function toTimeRecordOrMidnight(item: unknown): TimeRecord {
	return item === undefined
		? midnightTimeRecord()
		: getInternalSlotOrThrowForPlainTime(toTemporalTime(item));
}

/** `RegulateTime` */
export function regulateTime(
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
	overflow: Overflow,
) {
	if (overflow === overflowConstrain) {
		return createTimeRecord(
			clamp(hour, 0, 23),
			clamp(minute, 0, 59),
			clamp(second, 0, 59),
			clamp(millisecond, 0, 999),
			clamp(microsecond, 0, 999),
			clamp(nanosecond, 0, 999),
		);
	}
	if (!isValidTime(hour, minute, second, millisecond, microsecond, nanosecond)) {
		throw new RangeError();
	}
	return createTimeRecord(hour, minute, second, millisecond, microsecond, nanosecond);
}

/** `IsValidTime` */
export function isValidTime(
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
export function createTemporalTime(
	time: TimeRecord,
	instance = Object.create(PlainTime.prototype) as PlainTime,
): PlainTime {
	slots.set(instance, createPlainTimeSlot(time));
	return instance;
}

interface TemporalTimeLikeRecord {
	hour: number;
	minute: number;
	second: number;
	millisecond: number;
	microsecond: number;
	nanosecond: number;
}

function toTemporalTimeRecord(item: object, partial: true): Partial<TemporalTimeLikeRecord>;
function toTemporalTimeRecord(item: object, partial?: false): TemporalTimeLikeRecord;
function toTemporalTimeRecord(item: object, partial = false) {
	const record = Object.create(null);
	let any = false;
	for (const property of ["hour", "microsecond", "millisecond", "minute", "nanosecond", "second"]) {
		const value = (item as Record<string, unknown>)[property];
		if (value !== undefined) {
			any = true;
			record[property] = toIntegerWithTruncation(value);
		} else if (!partial) {
			record[property] = 0;
		}
	}
	if (!any) {
		throw new TypeError();
	}
	return record;
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

/** `RoundTime` */
export function roundTime(
	time: TimeRecord,
	increment: number,
	unit: SingularUnitKey,
	roundingMode: RoundingMode,
): TimeRecord {
	const unitIndex = singularUnitKeys.indexOf(unit);
	const values = [
		time.$hour,
		time.$minute,
		time.$second,
		time.$millisecond,
		time.$microsecond,
		time.$nanosecond,
	];
	let quantity = 0;
	for (
		let i = unitIndex === unitIndices.$day ? unitIndices.$hour : unitIndex;
		i <= unitIndices.$nanosecond;
		i++
	) {
		quantity += timeUnitLengths[i - 3]! * values[i - 4]!;
	}
	const unitLength = timeUnitLengths[unitIndex - 3]!;
	const result =
		roundNumberToIncrement(quantity, increment * unitLength, roundingMode) / unitLength;
	if (unitIndex === unitIndices.$day) {
		return createTimeRecord(0, 0, 0, 0, 0, 0, result);
	}
	return balanceTime(
		// @ts-expect-error
		...values.slice(0, unitIndex - unitIndices.$hour),
		result,
		...Array.from({ length: unitIndices.$nanosecond - unitIndex }, () => 0),
	);
}

function createPlainTimeSlot(time: TimeRecord): PlainTimeSlot {
	return time as PlainTimeSlot;
}

export function getInternalSlotOrThrowForPlainTime(plainTime: unknown): PlainTimeSlot {
	const slot = slots.get(plainTime);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

function isPlainTime(item: unknown) {
	return slots.has(item);
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
	static from(item: unknown, options: unknown = undefined) {
		return toTemporalTime(item, options);
	}
	static compare(one: unknown, two: unknown) {
		return compareTimeRecord(
			getInternalSlotOrThrowForPlainTime(toTemporalTime(one)),
			getInternalSlotOrThrowForPlainTime(toTemporalTime(two)),
		);
	}
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
	round(roundTo: unknown) {
		const slot = getInternalSlotOrThrowForPlainTime(this);
		const roundToOptions = getRoundToOptionsObject(roundTo);
		const roundingIncrement = getRoundingIncrementOption(roundToOptions);
		const roundingMode = getRoundingModeOption(roundToOptions, roundingModeHalfExpand);
		const smallestUnit = getTemporalUnitValuedOption(roundToOptions, "smallestUnit", required);
		validateTemporalUnitValue(smallestUnit, time);
		const maximum = maximumTemporalDurationRoundingIncrement(smallestUnit as SingularUnitKey)!;
		validateTemporalRoundingIncrement(roundingIncrement, maximum, false);
		return createTemporalTime(
			roundTime(slot, roundingIncrement, smallestUnit as SingularUnitKey, roundingMode),
		);
	}
	equals(other: unknown) {
		return !compareTimeRecord(
			getInternalSlotOrThrowForPlainTime(this),
			getInternalSlotOrThrowForPlainTime(toTemporalTime(other)),
		);
	}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {
		throw new TypeError();
	}
}

defineStringTag(PlainTime.prototype, "Temporal.PlainTime");
renameFunction(PlainTime, "PlainTime");
