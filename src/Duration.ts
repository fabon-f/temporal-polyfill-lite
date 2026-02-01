import {
	formatFractionalSeconds,
	getRoundingIncrementOption,
	getRoundingModeOption,
	getTemporalFractionalSecondDigitsOption,
	getTemporalRelativeToOption,
	getTemporalUnitValuedOption,
	getUtcEpochNanoseconds,
	isCalendarUnit,
	isDateUnit,
	isoDateRecordToEpochDays,
	largerOfTwoTemporalUnits,
	maximumTemporalDurationRoundingIncrement,
	parseTemporalDurationString,
	roundNumberToIncrement,
	toSecondsStringPrecisionRecord,
	validateTemporalRoundingIncrement,
	validateTemporalUnitValue,
} from "./internal/abstractOperations.ts";
import { assert, assertUnitIndex } from "./internal/assertion.ts";
import {
	calendarDateAdd,
	calendarDateUntil,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import {
	getOptionsObject,
	getRoundToOptionsObject,
	toIntegerIfIntegral,
	toString,
	validateString,
} from "./internal/ecmascript.ts";
import {
	DATETIME,
	disambiguationCompatible,
	MINUTE,
	overflowConstrain,
	REQUIRED,
	roundingModeHalfExpand,
	roundingModeTrunc,
	TIME,
	type RoundingMode,
} from "./internal/enum.ts";
import {
	addTimeDurationToEpochNanoseconds,
	compareEpochNanoseconds,
	differenceEpochNanoseconds,
	type EpochNanoseconds,
} from "./internal/epochNanoseconds.ts";
import {
	disallowedUnit,
	durationWithDateUnit,
	invalidDuration,
	invalidMethodCall,
	invalidLargestAndSmallestUnitOptions,
	missingField,
	outOfBoundsDuration,
} from "./internal/errorMessages.ts";
import { sign, type NumberSign } from "./internal/math.ts";
import { createNullPrototypeObject, isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import {
	absTimeDuration,
	addDaysToTimeDuration,
	addNanosecondsToTimeDuration,
	addTimeDuration,
	compareTimeDuration,
	createTimeDurationFromMicroseconds,
	createTimeDurationFromMilliseconds,
	createTimeDurationFromNanoseconds,
	createTimeDurationFromSeconds,
	divideTimeDurationToFloatingPoint,
	getApproximateRatioOfTimeDurationsForRounding,
	negateTimeDuration,
	roundTimeDurationByDays,
	roundTimeDuration as roundTimeDurationOriginal,
	signTimeDuration,
	timeDurationDaysAndRemainderNanoseconds,
	timeDurationToSecondsNumber,
	timeDurationToSubsecondsNumber,
	type TimeDuration,
} from "./internal/timeDuration.ts";
import { createOffsetCacheMap, getEpochNanosecondsFor } from "./internal/timeZones.ts";
import {
	getIndexFromUnit,
	getUnitFromIndex,
	nanosecondsForTimeUnit,
	pluralUnitKeys,
	Unit,
	unitIndices,
	type PluralUnitKey,
} from "./internal/unit.ts";
import {
	mapUnlessUndefined,
	throwRangeError,
	throwTypeError,
	withArray,
} from "./internal/utils.ts";
import { addDaysToIsoDate, type PlainDateSlot } from "./PlainDate.ts";
import {
	combineIsoDateAndTimeRecord,
	differencePlainDateTimeWithRounding,
	differencePlainDateTimeWithTotal,
	type IsoDateTimeRecord,
} from "./PlainDateTime.ts";
import { addTime, midnightTimeRecord } from "./PlainTime.ts";
import {
	addZonedDateTime,
	differenceZonedDateTimeWithRounding,
	differenceZonedDateTimeWithTotal,
} from "./ZonedDateTime.ts";

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
	createTimeDurationFromSeconds(2 ** 53 - 1),
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
export function toInternalDurationRecordWith24HourDays([
	year,
	month,
	week,
	day,
	...timeUnits
]: DurationSlot): InternalDurationRecord {
	// this AO shouldn't fail, so it's safe to change order of `createDateDurationRecord` and `add24HourDaysToTimeDuration`
	return combineDateAndTimeDuration(
		createDateDurationRecord(year, month, week, 0),
		add24HourDaysToTimeDuration(
			timeDurationFromComponents(...(timeUnits as TimeDurationTuple)),
			day,
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
	largestUnit: Unit,
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
	validateDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
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
		validateString(item);
		return parseTemporalDurationString(item);
	}
	return createTemporalDurationSlot(
		...(toTemporalPartialDurationRecord(item).map((v) => v || 0) as DurationTuple),
	);
}

/** `DurationSign` */
export function durationSign(duration: DurationSlot): NumberSign {
	return sign(duration.find((v) => v !== 0) || 0);
}

/** `DateDurationSign` */
export function dateDurationSign(dateDuration: DateDurationRecord): NumberSign {
	return sign(
		dateDuration.$years || dateDuration.$months || dateDuration.$weeks || dateDuration.$days,
	);
}

/** `InternalDurationSign` */
function internalDurationSign(internalDuration: InternalDurationRecord): NumberSign {
	return dateDurationSign(internalDuration.$date) || timeDurationSign(internalDuration.$time);
}

/** `IsValidDuration` + throwing `RangeError` */
function validateDuration(...units: DurationTuple): void {
	assert(units.every((v) => Number.isFinite(v)));
	if (units.some((n) => n < 0) && units.some((n) => n > 0)) {
		throwRangeError(invalidDuration);
	}
	if (
		!(
			units.every((v) => Math.abs(v) < 1e25) && // reject extreme numbers first to avoid Infinity / NaN
			Math.abs(units[unitIndices.$year]) < 2 ** 32 &&
			Math.abs(units[unitIndices.$month]) < 2 ** 32 &&
			Math.abs(units[unitIndices.$week]) < 2 ** 32
		)
	) {
		throwRangeError(outOfBoundsDuration);
	}
	validateTimeDurationRange(
		timeDurationFromComponents(
			units[unitIndices.$day] * 24 + units[unitIndices.$hour],
			units[unitIndices.$minute],
			units[unitIndices.$second],
			units[unitIndices.$millisecond],
			units[unitIndices.$microsecond],
			units[unitIndices.$nanosecond],
		),
	);
}

/** `DefaultTemporalLargestUnit` */
export function defaultTemporalLargestUnit(duration: DurationSlot): Unit {
	const index = (duration.findIndex((v) => v !== 0) + 10) % 10;
	assertUnitIndex(index);
	return getUnitFromIndex(index);
}

/** `ToTemporalPartialDurationRecord` */
function toTemporalPartialDurationRecord(temporalDurationLike: unknown): PartialDurationRecord {
	if (!isObject(temporalDurationLike)) {
		throwTypeError();
	}
	const unitsByAlphabeticalOrder = ([3, 4, 8, 7, 5, 1, 9, 6, 2, 0] as const).map((i) =>
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
		throwTypeError();
	}
	return [9, 5, 8, 0, 1, 4, 7, 3, 2, 6].map(
		(i) => unitsByAlphabeticalOrder[i],
	) as PartialDurationRecord;
}

/** part of `CreateTemporalDuration` */
export function createTemporalDurationSlot(...units: DurationTuple): DurationSlot {
	validateDuration(...units);
	return units as DurationSlot;
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
	return addTimeDuration(
		addTimeDuration(
			addTimeDuration(
				createTimeDurationFromSeconds(hours * 3600 + minutes * 60 + seconds),
				createTimeDurationFromMilliseconds(milliseconds),
			),
			createTimeDurationFromMicroseconds(microseconds),
		),
		createTimeDurationFromNanoseconds(nanoseconds),
	);
}

/** `Add24HourDaysToTimeDuration` */
export function add24HourDaysToTimeDuration(d: TimeDuration, days: number): TimeDuration {
	return validateTimeDurationRange(addDaysToTimeDuration(d, days));
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
	return validateTimeDurationRange(roundTimeDurationOriginal(d, increment, roundingMode));
}

/** `TimeDurationSign` */
export const timeDurationSign = signTimeDuration;

/** `DateDurationDays` */
function dateDurationDays(dateDuration: DateDurationRecord, plainRelativeTo: PlainDateSlot) {
	const yearsMonthsWeeksDuration = adjustDateDurationRecord(dateDuration, 0);
	if (!dateDurationSign(dateDuration)) {
		return dateDuration.$days;
	}
	return (
		dateDuration.$days +
		isoDateRecordToEpochDays(
			calendarDateAdd(
				plainRelativeTo.$calendar,
				plainRelativeTo.$isoDate,
				yearsMonthsWeeksDuration,
				overflowConstrain,
			),
		) -
		isoDateRecordToEpochDays(plainRelativeTo.$isoDate)
	);
}

/** `RoundTimeDuration` */
export function roundTimeDuration(
	timeDuration: TimeDuration,
	increment: number,
	unit: Unit.Time,
	roundingMode: RoundingMode,
): TimeDuration {
	return roundTimeDurationToIncrement(
		timeDuration,
		nanosecondsForTimeUnit(unit) * increment,
		roundingMode,
	);
}

/** `TotalTimeDuration` */
export function totalTimeDuration(timeDuration: TimeDuration, unit: Unit.Time | Unit.Day): number {
	return divideTimeDurationToFloatingPoint(timeDuration, nanosecondsForTimeUnit(unit));
}

interface NudgeWindowRecord {
	$r1: number;
	$r2: number;
	$startEpochNs: EpochNanoseconds;
	$endEpochNs: EpochNanoseconds;
	$startDuration: DateDurationRecord;
	$endDuration: DateDurationRecord;
}

/** `ComputeNudgeWindow` */
function computeNudgeWindow(
	sign: 1 | -1,
	duration: InternalDurationRecord,
	originEpochNs: EpochNanoseconds,
	isoDateTime: IsoDateTimeRecord,
	timeZone: string | undefined,
	calendar: SupportedCalendars,
	increment: number,
	unit: Unit.Date,
	additionalShift: boolean,
): NudgeWindowRecord {
	let r1: number;
	let r2: number;
	let startDuration: DateDurationRecord;
	let endDuration: DateDurationRecord;
	if (unit === Unit.Year) {
		r1 =
			roundNumberToIncrement(duration.$date.$years, increment, roundingModeTrunc) +
			(additionalShift ? increment * sign : 0);
		r2 = r1 + increment * sign;
		startDuration = createDateDurationRecord(r1, 0, 0, 0);
		endDuration = createDateDurationRecord(r2, 0, 0, 0);
	} else if (unit === Unit.Month) {
		r1 =
			roundNumberToIncrement(duration.$date.$months, increment, roundingModeTrunc) +
			(additionalShift ? increment * sign : 0);
		r2 = r1 + increment * sign;
		startDuration = adjustDateDurationRecord(duration.$date, 0, 0, r1);
		endDuration = adjustDateDurationRecord(duration.$date, 0, 0, r2);
	} else if (unit === Unit.Week) {
		const weeksStart = calendarDateAdd(
			calendar,
			isoDateTime.$isoDate,
			adjustDateDurationRecord(duration.$date, 0, 0),
			overflowConstrain,
		);
		r1 = roundNumberToIncrement(
			duration.$date.$weeks +
				calendarDateUntil(
					calendar,
					weeksStart,
					addDaysToIsoDate(weeksStart, duration.$date.$days),
					Unit.Week,
				).$weeks,
			increment,
			roundingModeTrunc,
		);
		r2 = r1 + increment * sign;
		startDuration = adjustDateDurationRecord(duration.$date, 0, r1);
		endDuration = adjustDateDurationRecord(duration.$date, 0, r2);
	} else {
		r1 = roundNumberToIncrement(duration.$date.$days, increment, roundingModeTrunc);
		r2 = r1 + increment * sign;
		startDuration = adjustDateDurationRecord(duration.$date, r1);
		endDuration = adjustDateDurationRecord(duration.$date, r2);
	}
	let startEpochNs: EpochNanoseconds;
	if (r1 === 0) {
		startEpochNs = originEpochNs;
	} else {
		const startDateTime = combineIsoDateAndTimeRecord(
			calendarDateAdd(calendar, isoDateTime.$isoDate, startDuration, overflowConstrain),
			isoDateTime.$time,
		);
		startEpochNs = timeZone
			? getEpochNanosecondsFor(timeZone, startDateTime, disambiguationCompatible)
			: getUtcEpochNanoseconds(startDateTime);
	}
	const endDateTime = combineIsoDateAndTimeRecord(
		calendarDateAdd(calendar, isoDateTime.$isoDate, endDuration, overflowConstrain),
		isoDateTime.$time,
	);
	const endEpochNs = timeZone
		? getEpochNanosecondsFor(timeZone, endDateTime, disambiguationCompatible)
		: getUtcEpochNanoseconds(endDateTime);
	return {
		$r1: r1,
		$r2: r2,
		$startEpochNs: startEpochNs,
		$endEpochNs: endEpochNs,
		$startDuration: startDuration,
		$endDuration: endDuration,
	};
}

interface DurationNudgeResultRecord {
	$duration: InternalDurationRecord;
	$nudgedEpochNs: EpochNanoseconds;
	$didExpandCalendarUnit: boolean;
}

/** `NudgeToCalendarUnit` */
function nudgeToCalendarUnit(
	sign: 1 | -1,
	duration: InternalDurationRecord,
	originEpochNs: EpochNanoseconds,
	destEpochNs: EpochNanoseconds,
	isoDateTime: IsoDateTimeRecord,
	timeZone: string | undefined,
	calendar: SupportedCalendars,
	increment: number,
	unit: Unit.Date,
	roundingMode: RoundingMode,
): { $nudgeResult: DurationNudgeResultRecord; $total: number } {
	let didExpandCalendarUnit = false;
	let nudgeWindow = computeNudgeWindow(
		sign,
		duration,
		originEpochNs,
		isoDateTime,
		timeZone,
		calendar,
		increment,
		unit,
		false,
	);
	if (
		compareEpochNanoseconds(nudgeWindow.$startEpochNs, destEpochNs) *
			compareEpochNanoseconds(nudgeWindow.$endEpochNs, destEpochNs) >
		0
	) {
		nudgeWindow = computeNudgeWindow(
			sign,
			duration,
			originEpochNs,
			isoDateTime,
			timeZone,
			calendar,
			increment,
			unit,
			true,
		);
		didExpandCalendarUnit = true;
	}
	const d1 = differenceEpochNanoseconds(nudgeWindow.$startEpochNs, destEpochNs);
	const d2 = differenceEpochNanoseconds(nudgeWindow.$startEpochNs, nudgeWindow.$endEpochNs);
	let resultDuration = nudgeWindow.$startDuration;
	let nudgedEpochNs = nudgeWindow.$startEpochNs;
	if (
		roundNumberToIncrement(
			nudgeWindow.$r1 +
				getApproximateRatioOfTimeDurationsForRounding(d1, d2, sign) * increment * sign,
			increment,
			roundingMode,
		) === nudgeWindow.$r2
	) {
		didExpandCalendarUnit = true;
		resultDuration = nudgeWindow.$endDuration;
		nudgedEpochNs = nudgeWindow.$endEpochNs;
	}
	return {
		$nudgeResult: {
			$duration: combineDateAndTimeDuration(resultDuration, createTimeDurationFromSeconds(0)),
			$nudgedEpochNs: nudgedEpochNs,
			$didExpandCalendarUnit: didExpandCalendarUnit,
		},
		// `total` is only used when `increment` is 1.
		// TODO: investigate the way to achive better precision
		$total:
			nudgeWindow.$r1 +
			(divideTimeDurationToFloatingPoint(d1, 1e9) / divideTimeDurationToFloatingPoint(d2, 1e9)) *
				increment *
				sign,
	};
}

/** `NudgeToZonedTime` */
function nudgeToZonedTime(
	sign: 1 | -1,
	duration: InternalDurationRecord,
	isoDateTime: IsoDateTimeRecord,
	timeZone: string,
	calendar: SupportedCalendars,
	increment: number,
	unit: Unit.Time,
	roundingMode: RoundingMode,
): DurationNudgeResultRecord {
	const start = calendarDateAdd(calendar, isoDateTime.$isoDate, duration.$date, overflowConstrain);
	const startDateTime = combineIsoDateAndTimeRecord(start, isoDateTime.$time);
	const endDateTime = combineIsoDateAndTimeRecord(addDaysToIsoDate(start, sign), isoDateTime.$time);
	const startEpochNs = getEpochNanosecondsFor(timeZone, startDateTime, disambiguationCompatible);
	const endEpochNs = getEpochNanosecondsFor(timeZone, endDateTime, disambiguationCompatible);
	const daySpan = timeDurationFromEpochNanosecondsDifference(endEpochNs, startEpochNs);
	assert(timeDurationSign(daySpan) === sign);
	const unitLength = nanosecondsForTimeUnit(unit);
	let roundedTimeDuration = roundTimeDurationToIncrement(
		duration.$time,
		increment * unitLength,
		roundingMode,
	);
	const beyondDaySpan = addTimeDuration(roundedTimeDuration, negateTimeDuration(daySpan));
	let didRoundBeyondDay = false;
	let dayDelta = 0;
	let nudgedEpochNs: EpochNanoseconds;
	if (timeDurationSign(beyondDaySpan) !== -sign) {
		didRoundBeyondDay = true;
		dayDelta = sign;
		roundedTimeDuration = roundTimeDurationToIncrement(
			beyondDaySpan,
			increment * unitLength,
			roundingMode,
		);
		nudgedEpochNs = addTimeDurationToEpochNanoseconds(endEpochNs, roundedTimeDuration);
	} else {
		nudgedEpochNs = addTimeDurationToEpochNanoseconds(endEpochNs, roundedTimeDuration);
	}
	const resultDuration = combineDateAndTimeDuration(
		adjustDateDurationRecord(duration.$date, duration.$date.$days + dayDelta),
		roundedTimeDuration,
	);
	return {
		$duration: resultDuration,
		$nudgedEpochNs: nudgedEpochNs,
		$didExpandCalendarUnit: didRoundBeyondDay,
	};
}

/** `NudgeToDayOrTime` */
function nudgeToDayOrTime(
	duration: InternalDurationRecord,
	destEpochNs: EpochNanoseconds,
	largestUnit: Unit,
	increment: number,
	smallestUnit: Unit.Time | Unit.Day,
	roundingMode: RoundingMode,
): DurationNudgeResultRecord {
	const timeDuration = add24HourDaysToTimeDuration(duration.$time, duration.$date.$days);
	const roundedTime =
		smallestUnit === Unit.Day
			? roundTimeDurationByDays(timeDuration, increment, roundingMode)
			: roundTimeDurationToIncrement(
					timeDuration,
					nanosecondsForTimeUnit(smallestUnit) * increment,
					roundingMode,
				);
	const roundedWholeDays = timeDurationDaysAndRemainderNanoseconds(roundedTime)[0];
	const [days, remainder] = isDateUnit(largestUnit)
		? [
				roundedWholeDays,
				addTimeDuration(
					roundedTime,
					timeDurationFromComponents(-roundedWholeDays * 24, 0, 0, 0, 0, 0),
				),
			]
		: [0, roundedTime];
	return {
		$duration: combineDateAndTimeDuration(
			adjustDateDurationRecord(duration.$date, days),
			remainder,
		),
		$nudgedEpochNs: addTimeDurationToEpochNanoseconds(
			destEpochNs,
			addTimeDuration(roundedTime, negateTimeDuration(timeDuration)),
		),
		$didExpandCalendarUnit:
			sign(roundedWholeDays - timeDurationDaysAndRemainderNanoseconds(timeDuration)[0]) ===
			timeDurationSign(timeDuration),
	};
}

/** `BubbleRelativeDuration */
function bubbleRelativeDuration(
	sign: 1 | -1,
	duration: InternalDurationRecord,
	nudgedEpochNs: EpochNanoseconds,
	isoDateTime: IsoDateTimeRecord,
	timeZone: string | undefined,
	calendar: SupportedCalendars,
	largestUnit: Unit,
	smallestUnit: Unit.Date,
): InternalDurationRecord {
	if (smallestUnit === largestUnit) {
		return duration;
	}
	const largestUnitIndex = getIndexFromUnit(largestUnit);
	const smallestUnitIndex = getIndexFromUnit(smallestUnit);
	let endDuration: DateDurationRecord;
	for (let unitIndex = smallestUnitIndex - 1; unitIndex >= largestUnitIndex; unitIndex--) {
		if (unitIndex !== unitIndices.$week || largestUnitIndex === unitIndices.$week) {
			if (unitIndex === unitIndices.$year) {
				endDuration = createDateDurationRecord(duration.$date.$years + sign, 0, 0, 0);
			} else if (unitIndex === unitIndices.$month) {
				endDuration = adjustDateDurationRecord(duration.$date, 0, 0, duration.$date.$months + sign);
			} else {
				endDuration = adjustDateDurationRecord(duration.$date, 0, duration.$date.$weeks + sign);
			}
			const endDateTime = combineIsoDateAndTimeRecord(
				calendarDateAdd(calendar, isoDateTime.$isoDate, endDuration, overflowConstrain),
				isoDateTime.$time,
			);
			const endEpochNs = timeZone
				? getEpochNanosecondsFor(timeZone, endDateTime, disambiguationCompatible)
				: getUtcEpochNanoseconds(endDateTime);
			if (timeDurationSign(differenceEpochNanoseconds(endEpochNs, nudgedEpochNs)) !== -sign) {
				duration = combineDateAndTimeDuration(endDuration, createTimeDurationFromSeconds(0));
			} else {
				break;
			}
		}
	}
	return duration;
}

/** `RoundRelativeDuration` */
export function roundRelativeDuration(
	duration: InternalDurationRecord,
	originEpochNs: EpochNanoseconds,
	destEpochNs: EpochNanoseconds,
	isoDateTime: IsoDateTimeRecord,
	timeZone: string | undefined,
	calendar: SupportedCalendars,
	largestUnit: Unit,
	increment: number,
	smallestUnit: Unit,
	roundingMode: RoundingMode,
): InternalDurationRecord {
	const sign = internalDurationSign(duration) || 1;
	const nudgeResult =
		isCalendarUnit(smallestUnit) || (timeZone && smallestUnit === Unit.Day)
			? nudgeToCalendarUnit(
					sign,
					duration,
					originEpochNs,
					destEpochNs,
					isoDateTime,
					timeZone,
					calendar,
					increment,
					smallestUnit,
					roundingMode,
				).$nudgeResult
			: timeZone
				? (assert(smallestUnit !== Unit.Day),
					nudgeToZonedTime(
						sign,
						duration,
						isoDateTime,
						timeZone,
						calendar,
						increment,
						smallestUnit,
						roundingMode,
					))
				: nudgeToDayOrTime(
						duration,
						destEpochNs,
						largestUnit,
						increment,
						smallestUnit,
						roundingMode,
					);
	if (nudgeResult.$didExpandCalendarUnit && smallestUnit !== Unit.Week) {
		return bubbleRelativeDuration(
			sign,
			nudgeResult.$duration,
			nudgeResult.$nudgedEpochNs,
			isoDateTime,
			timeZone,
			calendar,
			largestUnit,
			largerOfTwoTemporalUnits(smallestUnit, Unit.Day) as Unit.Date,
		);
	}
	return nudgeResult.$duration;
}

/** `TotalRelativeDuration` */
export function totalRelativeDuration(
	duration: InternalDurationRecord,
	originEpochNs: EpochNanoseconds,
	destEpochNs: EpochNanoseconds,
	isoDateTime: IsoDateTimeRecord,
	timeZone: string | undefined,
	calendar: SupportedCalendars,
	unit: Unit,
): number {
	if (isCalendarUnit(unit) || (timeZone && unit === Unit.Day)) {
		return nudgeToCalendarUnit(
			internalDurationSign(duration) || 1,
			duration,
			originEpochNs,
			destEpochNs,
			isoDateTime,
			timeZone,
			calendar,
			1,
			unit,
			roundingModeTrunc,
		).$total;
	}
	return totalTimeDuration(add24HourDaysToTimeDuration(duration.$time, duration.$date.$days), unit);
}

/** `TemporalDurationToString` */
function temporalDurationToString(duration: DurationSlot, precision?: number | undefined): string {
	const sign = durationSign(duration);
	duration = applySignToDurationSlot(duration, sign);
	const secondsDuration = timeDurationFromComponents(
		0,
		0,
		duration[unitIndices.$second],
		duration[unitIndices.$millisecond],
		duration[unitIndices.$microsecond],
		duration[unitIndices.$nanosecond],
	);
	const [, , , seconds, milliseconds, microseconds, nanoseconds] = balanceTimeDuration(
		secondsDuration,
		Unit.Second,
	);
	const [yearPart, monthPart, weekPart, dayPart, hourPart, minutePart] = [
		"Y",
		"M",
		"W",
		"D",
		"H",
		"M",
	].map((designator, index) => (duration[index] ? `${duration[index]}${designator}` : "")) as [
		string,
		string,
		string,
		string,
		string,
		string,
	];
	const time = [
		hourPart,
		minutePart,
		timeDurationSign(secondsDuration) ||
		largerOfTwoTemporalUnits(defaultTemporalLargestUnit(duration), Unit.Second) === Unit.Second ||
		precision !== undefined
			? `${toString(seconds)}${formatFractionalSeconds(milliseconds * 1e6 + microseconds * 1e3 + nanoseconds, precision)}S`
			: "",
	].join("");
	return `${sign < 0 ? "-" : ""}P${[yearPart, monthPart, weekPart, dayPart].join("")}${time === "" ? "" : `T${time}`}`;
}

/** `AddDurations` */
function addDurations(operationSign: 1 | -1, duration: DurationSlot, other: unknown): Duration {
	const otherSlot = applySignToDurationSlot(toTemporalDuration(other), operationSign);
	const largestUnit = largerOfTwoTemporalUnits(
		defaultTemporalLargestUnit(duration),
		defaultTemporalLargestUnit(otherSlot),
	);
	if (isCalendarUnit(largestUnit)) {
		throwRangeError(durationWithDateUnit(largestUnit));
	}
	return createTemporalDuration(
		temporalDurationFromInternal(
			combineDateAndTimeDuration(
				zeroDateDuration(),
				addTimeDuration(
					toInternalDurationRecordWith24HourDays(duration).$time,
					toInternalDurationRecordWith24HourDays(otherSlot).$time,
				),
			),
			largestUnit,
		),
	);
}

function isDuration(duration: unknown): boolean {
	return slots.has(duration);
}

function getInternalSlotOrThrowForDuration(duration: unknown): DurationSlot {
	const slot = slots.get(duration);
	if (!slot) {
		throwTypeError(invalidMethodCall);
	}
	return slot;
}

export function applySignToDurationSlot(duration: DurationSlot, sign: NumberSign): DurationSlot {
	return createTemporalDurationSlot(...(duration.map((v) => v * sign + 0) as DurationTuple));
}

function timeDurationWithinLimits(d: TimeDuration): boolean {
	return compareTimeDuration(absTimeDuration(d), maxTimeDuration) !== 1;
}

function validateTimeDurationRange(d: TimeDuration): TimeDuration {
	if (!timeDurationWithinLimits(d)) {
		throwRangeError(outOfBoundsDuration);
	}
	return d;
}

function balanceTimeDuration(
	d: TimeDuration,
	largestUnit: Unit,
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

	if (largestUnit === Unit.Nanosecond) {
		return [0, 0, 0, 0, 0, 0, timeDurationToSubsecondsNumber(d, -9)];
	}
	if (largestUnit === Unit.Microsecond) {
		return [0, 0, 0, 0, 0, timeDurationToSubsecondsNumber(d, -6), remNanoseconds];
	}
	if (largestUnit === Unit.Millisecond) {
		return [0, 0, 0, 0, timeDurationToSubsecondsNumber(d, -3), remMicroseconds, remNanoseconds];
	}
	if (largestUnit === Unit.Second) {
		return [0, 0, 0, seconds, remMilliseconds, remMicroseconds, remNanoseconds];
	}
	if (largestUnit === Unit.Minute) {
		return [0, 0, minutes, remSeconds, remMilliseconds, remMicroseconds, remNanoseconds];
	}
	if (largestUnit === Unit.Hour) {
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
	static compare(one: unknown, two: unknown, options: unknown = undefined) {
		const slot1 = toTemporalDuration(one);
		const slot2 = toTemporalDuration(two);
		const relativeToRecord = getTemporalRelativeToOption(getOptionsObject(options));
		if (slot1.every((v, i) => slot2[i] === v)) {
			return 0;
		}
		const largestUnit1 = defaultTemporalLargestUnit(slot1);
		const largestUnit2 = defaultTemporalLargestUnit(slot2);
		const duration1 = toInternalDurationRecord(slot1);
		const duration2 = toInternalDurationRecord(slot2);
		if (relativeToRecord.$zoned && (isDateUnit(largestUnit1) || isDateUnit(largestUnit2))) {
			const cache = createOffsetCacheMap();
			return compareEpochNanoseconds(
				addZonedDateTime(
					relativeToRecord.$zoned.$epochNanoseconds,
					relativeToRecord.$zoned.$timeZone,
					relativeToRecord.$zoned.$calendar,
					duration1,
					overflowConstrain,
					cache,
				),
				addZonedDateTime(
					relativeToRecord.$zoned.$epochNanoseconds,
					relativeToRecord.$zoned.$timeZone,
					relativeToRecord.$zoned.$calendar,
					duration2,
					overflowConstrain,
					cache,
				),
			);
		}
		let days1: number;
		let days2: number;
		if (isCalendarUnit(largestUnit1) || isCalendarUnit(largestUnit2)) {
			if (!relativeToRecord.$plain) {
				throwRangeError(missingField("relativeTo"));
			}
			days1 = dateDurationDays(duration1.$date, relativeToRecord.$plain);
			days2 = dateDurationDays(duration2.$date, relativeToRecord.$plain);
		} else {
			days1 = slot1[unitIndices.$day];
			days2 = slot2[unitIndices.$day];
		}
		return compareTimeDuration(
			add24HourDaysToTimeDuration(duration1.$time, days1),
			add24HourDaysToTimeDuration(duration2.$time, days2),
		);
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
				...(withArray(
					toTemporalPartialDurationRecord(temporalDurationLike),
					thisSlot,
				) as DurationTuple),
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
	add(other: unknown) {
		return addDurations(1, getInternalSlotOrThrowForDuration(this), other);
	}
	subtract(other: unknown) {
		return addDurations(-1, getInternalSlotOrThrowForDuration(this), other);
	}
	round(roundTo: unknown) {
		const durationSlot = getInternalSlotOrThrowForDuration(this);
		const options = getRoundToOptionsObject(roundTo);
		let largestUnit = getTemporalUnitValuedOption(options, "largestUnit", undefined);
		const relativeToRecord = getTemporalRelativeToOption(options);
		const roundingIncrement = getRoundingIncrementOption(options);
		const roundingMode = getRoundingModeOption(options, roundingModeHalfExpand);
		let smallestUnit = getTemporalUnitValuedOption(options, "smallestUnit", undefined);
		validateTemporalUnitValue(smallestUnit, DATETIME);
		const smallestUnitPresent = smallestUnit !== undefined;
		smallestUnit ??= Unit.Nanosecond;
		const existingLargestUnit = defaultTemporalLargestUnit(durationSlot);
		const defaultLargestUnit = largerOfTwoTemporalUnits(existingLargestUnit, smallestUnit);
		const largestUnitPresent = largestUnit !== undefined;
		if (largestUnit === undefined || largestUnit === "auto") {
			largestUnit = defaultLargestUnit;
		}
		if (
			(!smallestUnitPresent && !largestUnitPresent) ||
			largerOfTwoTemporalUnits(largestUnit, smallestUnit) !== largestUnit
		) {
			throwRangeError(invalidLargestAndSmallestUnitOptions);
		}
		if (!isDateUnit(smallestUnit)) {
			validateTemporalRoundingIncrement(
				roundingIncrement,
				maximumTemporalDurationRoundingIncrement(smallestUnit),
				false,
			);
		}
		if (roundingIncrement > 1 && largestUnit !== smallestUnit && isDateUnit(smallestUnit)) {
			throwRangeError(invalidLargestAndSmallestUnitOptions);
		}
		if (relativeToRecord.$zoned) {
			return createTemporalDuration(
				temporalDurationFromInternal(
					differenceZonedDateTimeWithRounding(
						relativeToRecord.$zoned.$epochNanoseconds,
						addZonedDateTime(
							relativeToRecord.$zoned.$epochNanoseconds,
							relativeToRecord.$zoned.$timeZone,
							relativeToRecord.$zoned.$calendar,
							toInternalDurationRecord(durationSlot),
							overflowConstrain,
						),
						relativeToRecord.$zoned.$timeZone,
						relativeToRecord.$zoned.$calendar,
						largestUnit,
						roundingIncrement,
						smallestUnit,
						roundingMode,
					),
					isDateUnit(largestUnit) ? Unit.Hour : largestUnit,
				),
			);
		}
		if (relativeToRecord.$plain) {
			const internalDuration = toInternalDurationRecordWith24HourDays(durationSlot);
			const targetTime = addTime(midnightTimeRecord(), internalDuration.$time);
			return createTemporalDuration(
				temporalDurationFromInternal(
					differencePlainDateTimeWithRounding(
						combineIsoDateAndTimeRecord(relativeToRecord.$plain.$isoDate, midnightTimeRecord()),
						combineIsoDateAndTimeRecord(
							calendarDateAdd(
								relativeToRecord.$plain.$calendar,
								relativeToRecord.$plain.$isoDate,
								adjustDateDurationRecord(internalDuration.$date, targetTime.$days),
								overflowConstrain,
							),
							targetTime,
						),
						relativeToRecord.$plain.$calendar,
						largestUnit,
						roundingIncrement,
						smallestUnit,
						roundingMode,
					),
					largestUnit,
				),
			);
		}
		if (isCalendarUnit(existingLargestUnit) || isCalendarUnit(largestUnit)) {
			throwRangeError(missingField("relativeTo"));
		}
		assert(!isCalendarUnit(smallestUnit));
		const internalDuration = toInternalDurationRecordWith24HourDays(durationSlot);
		return createTemporalDuration(
			temporalDurationFromInternal(
				smallestUnit === Unit.Day
					? combineDateAndTimeDuration(
							createDateDurationRecord(
								0,
								0,
								0,
								timeDurationDaysAndRemainderNanoseconds(
									roundTimeDurationByDays(internalDuration.$time, roundingIncrement, roundingMode),
								)[0],
							),
							createTimeDurationFromSeconds(0),
						)
					: combineDateAndTimeDuration(
							zeroDateDuration(),
							roundTimeDuration(
								internalDuration.$time,
								roundingIncrement,
								smallestUnit,
								roundingMode,
							),
						),
				largestUnit,
			),
		);
	}
	total(totalOf: unknown) {
		const duration = getInternalSlotOrThrowForDuration(this);
		if (totalOf === undefined) {
			throwTypeError();
		}
		const totalOfOptions =
			typeof totalOf === "string"
				? createNullPrototypeObject({ unit: totalOf })
				: getOptionsObject(totalOf);
		const relativeToRecord = getTemporalRelativeToOption(totalOfOptions);
		const unit = getTemporalUnitValuedOption(totalOfOptions, "unit", REQUIRED);
		validateTemporalUnitValue(unit, DATETIME);
		if (relativeToRecord.$zoned) {
			return differenceZonedDateTimeWithTotal(
				relativeToRecord.$zoned.$epochNanoseconds,
				addZonedDateTime(
					relativeToRecord.$zoned.$epochNanoseconds,
					relativeToRecord.$zoned.$timeZone,
					relativeToRecord.$zoned.$calendar,
					toInternalDurationRecord(duration),
					overflowConstrain,
				),
				relativeToRecord.$zoned.$timeZone,
				relativeToRecord.$zoned.$calendar,
				unit,
			);
		}
		if (relativeToRecord.$plain) {
			const internalDuration = toInternalDurationRecordWith24HourDays(duration);
			const targetTime = addTime(midnightTimeRecord(), internalDuration.$time);
			return differencePlainDateTimeWithTotal(
				combineIsoDateAndTimeRecord(relativeToRecord.$plain.$isoDate, midnightTimeRecord()),
				combineIsoDateAndTimeRecord(
					calendarDateAdd(
						relativeToRecord.$plain.$calendar,
						relativeToRecord.$plain.$isoDate,
						adjustDateDurationRecord(internalDuration.$date, targetTime.$days),
						overflowConstrain,
					),
					targetTime,
				),
				relativeToRecord.$plain.$calendar,
				unit,
			);
		}
		if (isCalendarUnit(defaultTemporalLargestUnit(duration)) || isCalendarUnit(unit)) {
			throwRangeError(missingField("relativeTo"));
		}
		return totalTimeDuration(toInternalDurationRecordWith24HourDays(duration).$time, unit);
	}
	toString(options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForDuration(this);
		const resolvedOptions = getOptionsObject(options);
		const digits = getTemporalFractionalSecondDigitsOption(resolvedOptions);
		const roundingMode = getRoundingModeOption(resolvedOptions, roundingModeTrunc);
		const smallestUnit = getTemporalUnitValuedOption(resolvedOptions, "smallestUnit", undefined);
		validateTemporalUnitValue(smallestUnit, TIME);
		if (smallestUnit === Unit.Hour || smallestUnit === Unit.Minute) {
			throwRangeError(disallowedUnit(smallestUnit));
		}
		const precisionRecord = toSecondsStringPrecisionRecord(smallestUnit, digits);
		assert(precisionRecord.$precision !== MINUTE);
		if (precisionRecord.$unit === Unit.Nanosecond && precisionRecord.$increment === 1) {
			return temporalDurationToString(slot, precisionRecord.$precision);
		}
		const internalDuration = toInternalDurationRecord(slot);
		return temporalDurationToString(
			temporalDurationFromInternal(
				combineDateAndTimeDuration(
					internalDuration.$date,
					roundTimeDuration(
						internalDuration.$time,
						precisionRecord.$increment,
						precisionRecord.$unit,
						roundingMode,
					),
				),
				largerOfTwoTemporalUnits(defaultTemporalLargestUnit(slot), Unit.Second),
			),
			precisionRecord.$precision,
		);
	}
	toJSON() {
		return temporalDurationToString(getInternalSlotOrThrowForDuration(this));
	}
	toLocaleString(locales: unknown = undefined, options: unknown = undefined): string {
		const slot = getInternalSlotOrThrowForDuration(this);
		const record: Partial<Record<PluralUnitKey, number>> = createNullPrototypeObject({});
		pluralUnitKeys.map((k, i) => {
			record[k] = slot[i]!;
		});
		return new Intl.DurationFormat(locales, options).format(record);
	}
	valueOf() {
		throwTypeError();
	}
}

defineStringTag(Duration.prototype, "Temporal.Duration");
renameFunction(Duration, "Duration");
