import {
	checkIsoDaysRange,
	getRoundingIncrementOption,
	getRoundingModeOption,
	getTemporalFractionalSecondDigitsOption,
	getTemporalUnitValuedOption,
	getUtcEpochNanoseconds,
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
	ToPrimitive,
} from "./internal/ecmascript.ts";
import {
	MINUTE,
	REQUIRED,
	roundingModeHalfExpand,
	roundingModeTrunc,
	showCalendarName,
	START_OF_DAY,
	TIME,
	type RoundingMode,
} from "./internal/enum.ts";
import {
	compareEpochNanoseconds,
	convertEpochNanosecondsToBigInt,
	createEpochNanosecondsFromBigInt,
	createEpochNanosecondsFromEpochMilliseconds,
	epochMilliseconds,
	roundEpochNanoseconds,
	type EpochNanoseconds,
} from "./internal/epochNanoseconds.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import {
	formatUtcOffsetNanoseconds,
	getIsoDateTimeFromOffsetNanoseconds,
	getOffsetNanosecondsFor,
	toTemporalTimeZoneIdentifier,
} from "./internal/timeZones.ts";
import { nanosecondsForTimeUnit, timeUnitLengths, type SingularUnitKey } from "./internal/unit.ts";
import { notImplementedYet } from "./internal/utils.ts";
import { balanceIsoDateTime, isoDateTimeToString } from "./PlainDateTime.ts";
import { createTemporalZonedDateTime, getInternalSlotForZonedDateTime } from "./ZonedDateTime.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

interface InstantSlot {
	$epochNanoseconds: EpochNanoseconds;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, InstantSlot>();

/** `IsValidEpochNanoseconds` */
export function isValidEpochNanoseconds(epochNanoseconds: EpochNanoseconds): boolean {
	return (
		compareEpochNanoseconds(
			createEpochNanosecondsFromEpochMilliseconds(8.64e15),
			epochNanoseconds,
		) *
			compareEpochNanoseconds(
				createEpochNanosecondsFromEpochMilliseconds(-8.64e15),
				epochNanoseconds,
			) <=
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
		item = ToPrimitive(item);
	}
	if (typeof item !== "string") {
		throw new TypeError();
	}
	const parsed = parseIsoDateTime(item, [temporalInstantStringRegExp]);
	assert(parsed.$timeZone.$z || parsed.$timeZone.$offsetString !== undefined);
	const offsetNanoseconds = parsed.$timeZone.$z
		? 0
		: parseDateTimeUtcOffset(parsed.$timeZone.$offsetString!);
	assert(parsed.$time !== START_OF_DAY);
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
		throw new RangeError();
	}
	return createTemporalInstant(epoch);
}

/** `RoundTemporalInstant` */
export function roundTemporalInstant(
	ns: EpochNanoseconds,
	increment: number,
	unit: SingularUnitKey,
	roundingMode: RoundingMode,
): EpochNanoseconds {
	assert(unit !== "year" && unit !== "month" && unit !== "week" && unit !== "day");
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
	)}${timeZone === undefined ? "Z" : formatUtcOffsetNanoseconds(offsetNanoseconds)}`;
}

function getInternalSlotForInstant(instant: unknown): InstantSlot | undefined {
	return slots.get(instant);
}

function getInternalSlotOrThrowForInstant(instant: unknown): InstantSlot {
	const slot = getInternalSlotForInstant(instant);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

function createInternalSlot(epoch: EpochNanoseconds): InstantSlot {
	return {
		$epochNanoseconds: epoch,
	} as InstantSlot;
}

export class Instant {
	constructor(epochNanoseconds: unknown) {
		if (!new.target) {
			throw new TypeError();
		}
		const epoch = createEpochNanosecondsFromBigInt(toBigInt(epochNanoseconds));
		if (!isValidEpochNanoseconds(epoch)) {
			throw new RangeError();
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
			throw new RangeError();
		}
		return createTemporalInstant(epoch);
	}
	static fromEpochNanoseconds(epochNanoseconds: unknown) {
		const epoch = createEpochNanosecondsFromBigInt(toBigInt(epochNanoseconds));
		if (!isValidEpochNanoseconds(epoch)) {
			throw new RangeError();
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
	add() {
		notImplementedYet();
	}
	subtract() {
		notImplementedYet();
	}
	until() {
		notImplementedYet();
	}
	since() {
		notImplementedYet();
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
		if (smallestUnit === "hour") {
			throw new RangeError();
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
	// oxlint-disable-next-line no-unused-vars
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		getInternalSlotOrThrowForInstant(this);
		// TODO
		return "";
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
