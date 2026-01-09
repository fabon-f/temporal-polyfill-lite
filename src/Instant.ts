import { getUtcEpochNanoseconds } from "./internal/abstractOperations.ts";
import {
	parseDateTimeUtcOffset,
	parseIsoDateTime,
	temporalInstantStringRegExp,
} from "./internal/dateTimeParser.ts";
import { toBigInt, toIntegerIfIntegral, ToPrimitive } from "./internal/ecmascript.ts";
import { startOfDay } from "./internal/enum.ts";
import {
	compareEpochNanoseconds,
	convertEpochNanosecondsToBigInt,
	createEpochNanosecondsFromBigInt,
	createEpochNanosecondsFromEpochMilliseconds,
	epochMilliseconds,
	type EpochNanoseconds,
} from "./internal/epochNanoseconds.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { toTemporalTimeZoneIdentifier } from "./internal/timeZones.ts";
import { isoDateWithinLimits } from "./PlainDate.ts";
import { balanceIsoDateTime } from "./PlainDateTime.ts";
import { midnightTimeRecord } from "./PlainTime.ts";
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
) {
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
	const offsetNanoseconds = parsed.$timeZone.$z
		? 0
		: parseDateTimeUtcOffset(parsed.$timeZone.$offsetString!);
	const time = parsed.$time === startOfDay ? midnightTimeRecord() : parsed.$time;
	const balanced = balanceIsoDateTime(
		parsed.$year!,
		parsed.$month,
		parsed.$day,
		time.$hour,
		time.$minute,
		time.$second,
		time.$millisecond,
		time.$microsecond,
		time.$nanosecond - offsetNanoseconds,
	);
	if (!isoDateWithinLimits(balanced.$isoDate)) {
		throw new RangeError();
	}
	const epoch = getUtcEpochNanoseconds(balanced);
	if (!isValidEpochNanoseconds(epoch)) {
		throw new RangeError();
	}
	return createTemporalInstant(epoch);
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
	add() {}
	subtract() {}
	until() {}
	since() {}
	round() {}
	equals(other: unknown) {
		return !compareEpochNanoseconds(
			getInternalSlotOrThrowForInstant(this).$epochNanoseconds,
			getInternalSlotOrThrowForInstant(toTemporalInstant(other)).$epochNanoseconds,
		);
	}
	toString() {}
	toLocaleString() {}
	toJSON() {}
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
