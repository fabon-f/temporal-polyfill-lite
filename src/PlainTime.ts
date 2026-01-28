import {
	formatTimeString,
	getDifferenceSettings,
	getRoundingIncrementOption,
	getRoundingModeOption,
	getTemporalFractionalSecondDigitsOption,
	getTemporalOverflowOption,
	getTemporalUnitValuedOption,
	isCalendarUnit,
	isPartialTemporalObject,
	maximumTemporalDurationRoundingIncrement,
	roundNumberToIncrement,
	toSecondsStringPrecisionRecord,
	validateTemporalRoundingIncrement,
	validateTemporalUnitValue,
} from "./internal/abstractOperations.ts";
import { parseIsoDateTime, temporalTimeStringRegExp } from "./internal/dateTimeParser.ts";
import {
	getOptionsObject,
	getRoundToOptionsObject,
	toIntegerWithTruncation,
	validateString,
} from "./internal/ecmascript.ts";
import {
	MINUTE,
	overflowConstrain,
	REQUIRED,
	roundingModeHalfExpand,
	roundingModeTrunc,
	TIME,
	type Overflow,
	type RoundingMode,
} from "./internal/enum.ts";
import { getIndexFromUnit, timeUnitLengths, Unit, unitIndices } from "./internal/unit.ts";
import { clamp, compare, divFloor, isWithin, modFloor, type NumberSign } from "./internal/math.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { getInternalSlotOrThrowForPlainDateTime, isPlainDateTime } from "./PlainDateTime.ts";
import {
	getInternalSlotOrThrowForZonedDateTime,
	getIsoDateTimeForZonedDateTimeSlot,
	isZonedDateTime,
} from "./ZonedDateTime.ts";
import { calendarFieldKeys } from "./internal/calendars.ts";
import {
	timeDurationDaysAndRemainderNanoseconds,
	type TimeDuration,
} from "./internal/timeDuration.ts";
import { assert, assertNotUndefined } from "./internal/assertion.ts";
import {
	applySignToDurationSlot,
	combineDateAndTimeDuration,
	createTemporalDuration,
	roundTimeDuration,
	temporalDurationFromInternal,
	timeDurationFromComponents,
	toInternalDurationRecord,
	toTemporalDuration,
	zeroDateDuration,
} from "./Duration.ts";
import { createDateTimeFormat, formatDateTime } from "./DateTimeFormat.ts";
import { invalidDateTime, invalidField, invalidMethodCall } from "./internal/errorMessages.ts";
import { withArray } from "./internal/utils.ts";

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
	assert(isValidTime(hour, minute, second, millisecond, microsecond, nanosecond));
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

/** `DifferenceTime` */
export function differenceTime(time1: TimeRecord, time2: TimeRecord): TimeDuration {
	return timeDurationFromComponents(
		time2.$hour - time1.$hour,
		time2.$minute - time1.$minute,
		time2.$second - time1.$second,
		time2.$millisecond - time1.$millisecond,
		time2.$microsecond - time1.$microsecond,
		time2.$nanosecond - time1.$nanosecond,
	);
}

/** `ToTemporalTime` */
export function toTemporalTime(item: unknown, options?: unknown): PlainTime {
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
		return createTemporalTime(
			regulateTime(
				...toTemporalTimeRecord(item),
				getTemporalOverflowOption(getOptionsObject(options)),
			),
		);
	}
	validateString(item);
	const result = parseIsoDateTime(item, [temporalTimeStringRegExp]);
	assert(result.$time !== undefined);
	getTemporalOverflowOption(getOptionsObject(options));
	return createTemporalTime(result.$time);
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
): TimeRecord {
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
		throw new RangeError(invalidDateTime);
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

type TemporalTimeLikeRecord = [
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
];

type PartialTemporalTimeLikeRecord = [
	hour: number | undefined,
	minute: number | undefined,
	second: number | undefined,
	millisecond: number | undefined,
	microsecond: number | undefined,
	nanosecond: number | undefined,
];

function toTemporalTimeRecord(item: object, partial: true): PartialTemporalTimeLikeRecord;
function toTemporalTimeRecord(item: object, partial?: false): TemporalTimeLikeRecord;
function toTemporalTimeRecord(item: object, partial = false) {
	let any = false;
	const timeUnitsByAlphabeticalOrder = [
		calendarFieldKeys.$hour,
		calendarFieldKeys.$microsecond,
		calendarFieldKeys.$millisecond,
		calendarFieldKeys.$minute,
		calendarFieldKeys.$nanosecond,
		calendarFieldKeys.$second,
	].map((property) => {
		const value = (item as Record<string, unknown>)[property];
		if (value !== undefined) {
			any = true;
			return toIntegerWithTruncation(value);
		} else {
			return partial ? undefined : 0;
		}
	});
	if (!any) {
		throw new TypeError();
	}
	return [0, 3, 5, 2, 1, 4].map((i) => timeUnitsByAlphabeticalOrder[i]);
}

/** `TimeRecordToString` */
function timeRecordToString(time: TimeRecord, precision?: number | typeof MINUTE): string {
	return formatTimeString(
		time.$hour,
		time.$minute,
		time.$second,
		time.$millisecond * 1e6 + time.$microsecond * 1e3 + time.$nanosecond,
		precision,
	);
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

export function addTime(time: TimeRecord, timeDuration: TimeDuration): TimeRecord {
	const daysAndNanoseconds = timeDurationDaysAndRemainderNanoseconds(timeDuration);
	const result = balanceTime(
		time.$hour,
		time.$minute,
		time.$second,
		time.$millisecond,
		time.$microsecond,
		time.$nanosecond + daysAndNanoseconds[1],
	);
	result.$days += daysAndNanoseconds[0];
	return result;
}

/** `RoundTime` */
export function roundTime(
	time: TimeRecord,
	increment: number,
	unit: Unit,
	roundingMode: RoundingMode,
): TimeRecord {
	assert(!isCalendarUnit(unit));
	const unitIndex = getIndexFromUnit(unit);
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

/** `DifferenceTemporalPlainTime` */
function differenceTemporalPlainTime(
	operationSign: 1 | -1,
	temporalTime: PlainTimeSlot,
	other: unknown,
	options: unknown,
) {
	const otherTime = getInternalSlotOrThrowForPlainTime(toTemporalTime(other));
	const settings = getDifferenceSettings(
		operationSign,
		getOptionsObject(options),
		TIME,
		[],
		Unit.Nanosecond,
		Unit.Hour,
	);
	return createTemporalDuration(
		applySignToDurationSlot(
			temporalDurationFromInternal(
				combineDateAndTimeDuration(
					zeroDateDuration(),
					roundTimeDuration(
						differenceTime(temporalTime, otherTime),
						settings.$roundingIncrement,
						settings.$smallestUnit,
						settings.$roundingMode,
					),
				),
				settings.$largestUnit,
			),
			operationSign,
		),
	);
}

/** `AddDurationToTime` */
function addDurationToTime(
	operationSign: 1 | -1,
	temporalTime: PlainTimeSlot,
	temporalDurationLike: unknown,
): PlainTime {
	return createTemporalTime(
		addTime(
			temporalTime,
			toInternalDurationRecord(
				applySignToDurationSlot(toTemporalDuration(temporalDurationLike), operationSign),
			).$time,
		),
	);
}

function createPlainTimeSlot(time: TimeRecord): PlainTimeSlot {
	return time as PlainTimeSlot;
}

export function getInternalSlotOrThrowForPlainTime(plainTime: unknown): PlainTimeSlot {
	const slot = slots.get(plainTime);
	if (!slot) {
		throw new TypeError(invalidMethodCall);
	}
	return slot;
}

export function getInternalSlotForPlainTime(plainTime: unknown): PlainTimeSlot | undefined {
	return slots.get(plainTime);
}

export function isPlainTime(item: unknown): boolean {
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
		const units = [hour, minute, second, millisecond, microsecond, nanosecond].map(
			toIntegerWithTruncation,
		) as TimeRecordTupleWithoutDays;
		if (!isValidTime(...units)) {
			throw new RangeError(invalidDateTime);
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
	add(temporalDurationLike: unknown) {
		return addDurationToTime(1, getInternalSlotOrThrowForPlainTime(this), temporalDurationLike);
	}
	subtract(temporalDurationLike: unknown) {
		return addDurationToTime(-1, getInternalSlotOrThrowForPlainTime(this), temporalDurationLike);
	}
	with(temporalTimeLike: unknown, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainTime(this);
		if (!isPartialTemporalObject(temporalTimeLike)) {
			throw new TypeError();
		}
		return createTemporalTime(
			regulateTime(
				...(withArray(toTemporalTimeRecord(temporalTimeLike as object, true), [
					slot.$hour,
					slot.$minute,
					slot.$second,
					slot.$millisecond,
					slot.$microsecond,
					slot.$nanosecond,
				]) as [number, number, number, number, number, number]),
				getTemporalOverflowOption(getOptionsObject(options)),
			),
		);
	}
	until(other: unknown, options: unknown = undefined) {
		return differenceTemporalPlainTime(1, getInternalSlotOrThrowForPlainTime(this), other, options);
	}
	since(other: unknown, options: unknown = undefined) {
		return differenceTemporalPlainTime(
			-1,
			getInternalSlotOrThrowForPlainTime(this),
			other,
			options,
		);
	}
	round(roundTo: unknown) {
		const slot = getInternalSlotOrThrowForPlainTime(this);
		const roundToOptions = getRoundToOptionsObject(roundTo);
		const roundingIncrement = getRoundingIncrementOption(roundToOptions);
		const roundingMode = getRoundingModeOption(roundToOptions, roundingModeHalfExpand);
		const smallestUnit = getTemporalUnitValuedOption(roundToOptions, "smallestUnit", REQUIRED);
		validateTemporalUnitValue(smallestUnit, TIME);
		const maximum = maximumTemporalDurationRoundingIncrement(smallestUnit);
		assertNotUndefined(maximum);
		validateTemporalRoundingIncrement(roundingIncrement, maximum, false);
		return createTemporalTime(roundTime(slot, roundingIncrement, smallestUnit, roundingMode));
	}
	equals(other: unknown) {
		return !compareTimeRecord(
			getInternalSlotOrThrowForPlainTime(this),
			getInternalSlotOrThrowForPlainTime(toTemporalTime(other)),
		);
	}
	toString(options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainTime(this);
		const resolvedOptions = getOptionsObject(options);
		const digits = getTemporalFractionalSecondDigitsOption(resolvedOptions);
		const roundingMode = getRoundingModeOption(resolvedOptions, roundingModeTrunc);
		const smallestUnit = getTemporalUnitValuedOption(resolvedOptions, "smallestUnit", undefined);
		validateTemporalUnitValue(smallestUnit, TIME);
		if (smallestUnit === Unit.Hour) {
			throw new RangeError(invalidField("smallestUnit"));
		}
		const record = toSecondsStringPrecisionRecord(smallestUnit, digits);
		return timeRecordToString(
			roundTime(slot, record.$increment, record.$unit, roundingMode),
			record.$precision,
		);
	}
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		getInternalSlotOrThrowForPlainTime(this);
		return formatDateTime(createDateTimeFormat(locales, options, TIME), this);
	}
	toJSON() {
		return timeRecordToString(getInternalSlotOrThrowForPlainTime(this), undefined);
	}
	valueOf() {
		throw new TypeError();
	}
}

defineStringTag(PlainTime.prototype, "Temporal.PlainTime");
renameFunction(PlainTime, "PlainTime");
