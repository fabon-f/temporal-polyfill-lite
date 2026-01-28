import { createDateTimeFormat, formatDateTime } from "./DateTimeFormat.ts";
import {
	applySignToDurationSlot,
	combineDateAndTimeDuration,
	createTemporalDuration,
	defaultTemporalLargestUnit,
	Duration,
	roundTimeDuration,
	temporalDurationFromInternal,
	timeDurationFromEpochNanosecondsDifference,
	toInternalDurationRecordWith24HourDays,
	toTemporalDuration,
	zeroDateDuration,
	type InternalDurationRecord,
} from "./Duration.ts";
import {
	checkIsoDaysRange,
	getDifferenceSettings,
	getRoundingIncrementOption,
	getRoundingModeOption,
	getTemporalFractionalSecondDigitsOption,
	getTemporalUnitValuedOption,
	getUtcEpochNanoseconds,
	isDateUnit,
	toSecondsStringPrecisionRecord,
	validateTemporalRoundingIncrement,
	validateTemporalUnitValue,
} from "./internal/abstractOperations.ts";
import { assert, assertNotUndefined } from "./internal/assertion.ts";
import {
	parseDateTimeUtcOffset,
	parseIsoDateTime,
	temporalInstantStringRegExp,
} from "./internal/dateTimeParser.ts";
import {
	getOptionsObject,
	getRoundToOptionsObject,
	toBigInt,
	toIntegerIfIntegral,
	toPrimitive,
	validateString,
} from "./internal/ecmascript.ts";
import {
	DATETIME,
	MINUTE,
	REQUIRED,
	roundingModeHalfExpand,
	roundingModeTrunc,
	showCalendarName,
	TIME,
	type RoundingMode,
} from "./internal/enum.ts";
import {
	addTimeDurationToEpochNanoseconds,
	compareEpochNanoseconds,
	convertEpochNanosecondsToBigInt,
	createEpochNanosecondsFromBigInt,
	createEpochNanosecondsFromEpochMilliseconds,
	epochMilliseconds,
	roundEpochNanoseconds,
	type EpochNanoseconds,
} from "./internal/epochNanoseconds.ts";
import {
	durationWithDateUnit,
	invalidField,
	invalidMethodCall,
	outOfBoundsDate,
} from "./internal/errorMessages.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import type { TimeDuration } from "./internal/timeDuration.ts";
import {
	formatDateTimeUtcOffsetRounded,
	getIsoDateTimeFromOffsetNanoseconds,
	getOffsetNanosecondsFor,
	toTemporalTimeZoneIdentifier,
} from "./internal/timeZones.ts";
import { nanosecondsForTimeUnit, timeUnitLengths, Unit } from "./internal/unit.ts";
import { balanceIsoDateTime, isoDateTimeToString } from "./PlainDateTime.ts";
import { createTemporalZonedDateTime, getInternalSlotForZonedDateTime } from "./ZonedDateTime.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

interface InstantSlot {
	$epochNanoseconds: EpochNanoseconds;
	[internalSlotBrand]: unknown;
}

const minEpochNanoseconds = createEpochNanosecondsFromEpochMilliseconds(-8.64e15);
const maxEpochNanoseconds = createEpochNanosecondsFromEpochMilliseconds(8.64e15);

const slots = new WeakMap<any, InstantSlot>();

/** `IsValidEpochNanoseconds` */
export function isValidEpochNanoseconds(epochNanoseconds: EpochNanoseconds): boolean {
	return (
		compareEpochNanoseconds(minEpochNanoseconds, epochNanoseconds) *
			compareEpochNanoseconds(maxEpochNanoseconds, epochNanoseconds) <=
		0
	);
}

/** `CreateTemporalInstant` */
export function createTemporalInstant(
	epochNanoseconds: EpochNanoseconds,
	instance = Object.create(Instant.prototype) as Instant,
): Instant {
	assert(isValidEpochNanoseconds(epochNanoseconds));
	const slot = createInternalSlot(epochNanoseconds);
	slots.set(instance, slot);
	return instance;
}

/** `ToTemporalInstant` */
function toTemporalInstant(item: unknown): Instant {
	if (isObject(item)) {
		const slot = getInternalSlotForInstant(item) || getInternalSlotForZonedDateTime(item);
		if (slot) {
			return createTemporalInstant(slot.$epochNanoseconds);
		}
		item = toPrimitive(item);
	}
	validateString(item);
	const parsed = parseIsoDateTime(item, [temporalInstantStringRegExp]);
	assert(parsed.$timeZone.$z || parsed.$timeZone.$offsetString !== undefined);
	const offsetNanoseconds = parsed.$timeZone.$z
		? 0
		: parseDateTimeUtcOffset(parsed.$timeZone.$offsetString!);
	assert(parsed.$time !== undefined);
	assertNotUndefined(parsed.$year);
	const time = parsed.$time;
	const balanced = balanceIsoDateTime(
		parsed.$year,
		parsed.$month,
		parsed.$day,
		time.$hour,
		time.$minute,
		time.$second,
		time.$millisecond,
		time.$microsecond,
		time.$nanosecond - offsetNanoseconds,
	);
	checkIsoDaysRange(balanced.$isoDate);
	const epoch = getUtcEpochNanoseconds(balanced);
	if (!isValidEpochNanoseconds(epoch)) {
		throw new RangeError(outOfBoundsDate);
	}
	return createTemporalInstant(epoch);
}

/** `AddInstant` */
export function addInstant(
	epochNanoseconds: EpochNanoseconds,
	timeDuration: TimeDuration,
): EpochNanoseconds {
	const result = addTimeDurationToEpochNanoseconds(epochNanoseconds, timeDuration);
	if (!isValidEpochNanoseconds(result)) {
		throw new RangeError(outOfBoundsDate);
	}
	return result;
}

/** `DifferenceInstant` */
export function differenceInstant(
	ns1: EpochNanoseconds,
	ns2: EpochNanoseconds,
	roundingIncrement: number,
	smallestUnit: Unit.Time,
	roundingMode: RoundingMode,
): InternalDurationRecord {
	return combineDateAndTimeDuration(
		zeroDateDuration(),
		roundTimeDuration(
			timeDurationFromEpochNanosecondsDifference(ns2, ns1),
			roundingIncrement,
			smallestUnit,
			roundingMode,
		),
	);
}

/** `RoundTemporalInstant` */
export function roundTemporalInstant(
	ns: EpochNanoseconds,
	increment: number,
	unit: Unit,
	roundingMode: RoundingMode,
): EpochNanoseconds {
	assert(!isDateUnit(unit));
	return roundEpochNanoseconds(ns, increment * nanosecondsForTimeUnit(unit), roundingMode);
}

/** `TemporalInstantToString` */
function temporalInstantToString(
	epoch: EpochNanoseconds,
	timeZone: string | undefined,
	precision?: number | typeof MINUTE,
): string {
	const outputTimeZone = timeZone === undefined ? "UTC" : timeZone;
	const offsetNanoseconds = getOffsetNanosecondsFor(outputTimeZone, epoch);
	return `${isoDateTimeToString(
		getIsoDateTimeFromOffsetNanoseconds(epoch, offsetNanoseconds),
		"iso8601",
		precision,
		showCalendarName.$never,
	)}${timeZone === undefined ? "Z" : formatDateTimeUtcOffsetRounded(offsetNanoseconds)}`;
}

/** `DifferenceTemporalInstant` */
function differenceTemporalInstant(
	operationSign: 1 | -1,
	instant: InstantSlot,
	other: unknown,
	options: unknown,
): Duration {
	const otherSlot = getInternalSlotOrThrowForInstant(toTemporalInstant(other));
	const settings = getDifferenceSettings(
		operationSign,
		getOptionsObject(options),
		TIME,
		[],
		Unit.Nanosecond,
		Unit.Second,
	);
	return createTemporalDuration(
		applySignToDurationSlot(
			temporalDurationFromInternal(
				differenceInstant(
					instant.$epochNanoseconds,
					otherSlot.$epochNanoseconds,
					settings.$roundingIncrement,
					settings.$smallestUnit,
					settings.$roundingMode,
				),
				settings.$largestUnit,
			),
			operationSign,
		),
	);
}

/** `AddDurationToInstant` */
function addDurationToInstant(
	operationSign: 1 | -1,
	instant: InstantSlot,
	temporalDurationLike: unknown,
): Instant {
	const duration = applySignToDurationSlot(toTemporalDuration(temporalDurationLike), operationSign);
	if (isDateUnit(defaultTemporalLargestUnit(duration))) {
		throw new RangeError(durationWithDateUnit(defaultTemporalLargestUnit(duration)));
	}
	return createTemporalInstant(
		addInstant(instant.$epochNanoseconds, toInternalDurationRecordWith24HourDays(duration).$time),
	);
}

function getInternalSlotForInstant(instant: unknown): InstantSlot | undefined {
	return slots.get(instant);
}

export function getInternalSlotOrThrowForInstant(instant: unknown): InstantSlot {
	const slot = getInternalSlotForInstant(instant);
	if (!slot) {
		throw new TypeError(invalidMethodCall);
	}
	return slot;
}

export function isInstant(value: unknown) {
	return slots.has(value);
}

function createInternalSlot(epoch: EpochNanoseconds): InstantSlot {
	return {
		$epochNanoseconds: epoch,
	} as InstantSlot;
}

export function clampEpochNanoseconds(epoch: EpochNanoseconds) {
	return compareEpochNanoseconds(epoch, maxEpochNanoseconds) > 0
		? maxEpochNanoseconds
		: compareEpochNanoseconds(epoch, minEpochNanoseconds) < 0
			? minEpochNanoseconds
			: epoch;
}

export class Instant {
	constructor(epochNanoseconds: unknown) {
		const epoch = createEpochNanosecondsFromBigInt(toBigInt(epochNanoseconds));
		if (!isValidEpochNanoseconds(epoch)) {
			throw new RangeError(outOfBoundsDate);
		}
		createTemporalInstant(epoch, this);
	}
	static from(item: unknown) {
		return toTemporalInstant(item);
	}
	static fromEpochMilliseconds(epochMilliseconds: unknown) {
		const epoch = createEpochNanosecondsFromEpochMilliseconds(
			toIntegerIfIntegral(epochMilliseconds),
		);
		if (!isValidEpochNanoseconds(epoch)) {
			throw new RangeError(outOfBoundsDate);
		}
		return createTemporalInstant(epoch);
	}
	static fromEpochNanoseconds(epochNanoseconds: unknown) {
		const epoch = createEpochNanosecondsFromBigInt(toBigInt(epochNanoseconds));
		if (!isValidEpochNanoseconds(epoch)) {
			throw new RangeError(outOfBoundsDate);
		}
		return createTemporalInstant(epoch);
	}
	static compare(one: unknown, two: unknown) {
		return compareEpochNanoseconds(
			getInternalSlotOrThrowForInstant(toTemporalInstant(one)).$epochNanoseconds,
			getInternalSlotOrThrowForInstant(toTemporalInstant(two)).$epochNanoseconds,
		);
	}
	get epochMilliseconds() {
		return epochMilliseconds(getInternalSlotOrThrowForInstant(this).$epochNanoseconds);
	}
	get epochNanoseconds() {
		return convertEpochNanosecondsToBigInt(
			getInternalSlotOrThrowForInstant(this).$epochNanoseconds,
		);
	}
	add(temporalDurationLike: unknown) {
		return addDurationToInstant(1, getInternalSlotOrThrowForInstant(this), temporalDurationLike);
	}
	subtract(temporalDurationLike: unknown) {
		return addDurationToInstant(-1, getInternalSlotOrThrowForInstant(this), temporalDurationLike);
	}
	until(other: unknown, options: unknown = undefined) {
		return differenceTemporalInstant(1, getInternalSlotOrThrowForInstant(this), other, options);
	}
	since(other: unknown, options: unknown = undefined) {
		return differenceTemporalInstant(-1, getInternalSlotOrThrowForInstant(this), other, options);
	}
	round(roundTo: unknown) {
		const slot = getInternalSlotOrThrowForInstant(this);
		const roundToOptions = getRoundToOptionsObject(roundTo);
		const roundingIncrement = getRoundingIncrementOption(roundToOptions);
		const roundingMode = getRoundingModeOption(roundToOptions, roundingModeHalfExpand);
		const smallestUnit = getTemporalUnitValuedOption(roundToOptions, "smallestUnit", REQUIRED);
		validateTemporalUnitValue(smallestUnit, TIME);
		const maximum = timeUnitLengths[0] / nanosecondsForTimeUnit(smallestUnit);
		validateTemporalRoundingIncrement(roundingIncrement, maximum, true);
		return createTemporalInstant(
			roundTemporalInstant(slot.$epochNanoseconds, roundingIncrement, smallestUnit, roundingMode),
		);
	}
	equals(other: unknown) {
		return !compareEpochNanoseconds(
			getInternalSlotOrThrowForInstant(this).$epochNanoseconds,
			getInternalSlotOrThrowForInstant(toTemporalInstant(other)).$epochNanoseconds,
		);
	}
	toString(options: unknown = undefined) {
		let timeZone: string | undefined;
		const slot = getInternalSlotOrThrowForInstant(this);
		const resolvedOptions = getOptionsObject(options);
		const digits = getTemporalFractionalSecondDigitsOption(resolvedOptions);
		const roundingMode = getRoundingModeOption(resolvedOptions, roundingModeTrunc);
		const smallestUnit = getTemporalUnitValuedOption(resolvedOptions, "smallestUnit", undefined);
		const rawTz = (resolvedOptions as Record<string, unknown>)["timeZone"];
		validateTemporalUnitValue(smallestUnit, TIME);
		if (smallestUnit === Unit.Hour) {
			throw new RangeError(invalidField("smallestUnit"));
		}
		if (rawTz !== undefined) {
			timeZone = toTemporalTimeZoneIdentifier(rawTz);
		}
		const precisionRecord = toSecondsStringPrecisionRecord(smallestUnit, digits);
		// `createTemporalInstant` doesn't do any validations, so we can directly pass epoch to `TemporalInstantToString`
		return temporalInstantToString(
			roundTemporalInstant(
				slot.$epochNanoseconds,
				precisionRecord.$increment,
				precisionRecord.$unit,
				roundingMode,
			),
			timeZone,
			precisionRecord.$precision,
		);
	}
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		getInternalSlotOrThrowForInstant(this);
		return formatDateTime(createDateTimeFormat(locales, options, DATETIME), this);
	}
	toJSON() {
		return temporalInstantToString(
			getInternalSlotOrThrowForInstant(this).$epochNanoseconds,
			undefined,
		);
	}
	valueOf() {
		throw new TypeError();
	}
	toZonedDateTimeISO(timeZone: unknown) {
		return createTemporalZonedDateTime(
			getInternalSlotOrThrowForInstant(this).$epochNanoseconds,
			toTemporalTimeZoneIdentifier(timeZone),
			"iso8601",
		);
	}
}

defineStringTag(Instant.prototype, "Temporal.Instant");
renameFunction(Instant, "Instant");
