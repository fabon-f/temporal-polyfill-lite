import { isObject } from "./utils/check.ts";
import {
	getInternalSlotOrThrow,
	toBigInt,
	toNumber,
	toPrimitiveAndAssertString,
} from "./utils/ecmascript.ts";
import {
	absEpoch,
	compareEpoch,
	type EpochNanoseconds,
	fromNativeBigInt,
	getEpochMilliseconds,
	toNativeBigInt,
} from "./utils/epochNano.ts";
import { defineStringTag } from "./utils/property.ts";
import { getEpochNanosecondsOfZonedDateTime } from "./ZonedDateTime.ts";

type InstantSlot = EpochNanoseconds & { __instantSlot__: unknown };

/** `IsValidEpochNanoseconds` */
function isValidEpochNanoseconds(epochNanoseconds: EpochNanoseconds) {
	return (
		compareEpoch(absEpoch(epochNanoseconds), [
			8.64e15, 0,
		] as EpochNanoseconds) !== 1
	);
}

function createTemporalInstantSlot(ns: EpochNanoseconds) {
	if (!isValidEpochNanoseconds(ns)) {
		throw new RangeError();
	}
	return ns as InstantSlot;
}

/** `CreateTemporalInstant` */
function createTemporalInstant(slot: InstantSlot, instance?: Instant): Instant {
	const instant = instance || (Object.create(Instant.prototype) as Instant);
	slots.set(instant, slot);
	return instant;
}

/** `ToTemporalInstant` */
function toTemporalInstantSlot(item: unknown): InstantSlot {
	if (isObject(item)) {
		const epochNanosecondsFromSlot =
			getEpochNanosecondsOfInstant(item) ||
			getEpochNanosecondsOfZonedDateTime(item);
		if (epochNanosecondsFromSlot) {
			return createTemporalInstantSlot(epochNanosecondsFromSlot);
		}
		item = toPrimitiveAndAssertString(item);
	}
	if (typeof item !== "string") {
		throw new TypeError();
	}
	// TODO: parse string
	return createTemporalInstantSlot([0, 0] as EpochNanoseconds);
}

function getEpochNanosecondsOfInstant(
	item: unknown,
): EpochNanoseconds | undefined {
	return slots.get(item as any);
}

const slots = new WeakMap<Instant, InstantSlot>();

export class Instant {
	constructor(epochNanoseconds: unknown) {
		if (!new.target) {
			throw new TypeError();
		}
		createTemporalInstant(
			createTemporalInstantSlot(fromNativeBigInt(toBigInt(epochNanoseconds))),
			this,
		);
	}
	static from(item: unknown) {
		return createTemporalInstant(toTemporalInstantSlot(item));
	}
	static fromEpochMilliseconds(epochMilliseconds: unknown) {
		return createTemporalInstant(
			createTemporalInstantSlot([
				toNumber(epochMilliseconds),
				0,
			] as EpochNanoseconds),
		);
	}
	static fromEpochNanoseconds(epochNanoseconds: unknown) {
		return createTemporalInstant(
			createTemporalInstantSlot(fromNativeBigInt(toBigInt(epochNanoseconds))),
		);
	}
	static compare(one: unknown, two: unknown) {
		return compareEpoch(toTemporalInstantSlot(one), toTemporalInstantSlot(two));
	}
	get epochMilliseconds() {
		return getEpochMilliseconds(getInternalSlotOrThrow(slots, this));
	}
	get epochNanoseconds() {
		return toNativeBigInt(getInternalSlotOrThrow(slots, this));
	}
	add() {}
	subtract() {}
	until() {}
	since() {}
	round() {}
	equals(other: unknown) {
		return (
			compareEpoch(
				getInternalSlotOrThrow(slots, this),
				toTemporalInstantSlot(other),
			) === 0
		);
	}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
	toZonedDateTimeISO() {}
}

defineStringTag(Instant.prototype, "Temporal.Instant");
