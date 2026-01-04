import { toBigInt, toNumber } from "./internal/ecmascript.ts";
import {
	compareEpochNanoseconds,
	convertEpochNanosecondsToBigInt,
	createEpochNanosecondsFromBigInt,
	createEpochNanosecondsFromEpochMilliseconds,
	epochMilliseconds,
	type EpochNanoseconds,
} from "./internal/epochNanoseconds.ts";
import { defineStringTag } from "./internal/property.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

interface InstantSlot {
	$epochNanoseconds: EpochNanoseconds;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, InstantSlot>();

/** `IsValidEpochNanoseconds` */
function isValidEpochNanoseconds(epochNanoseconds: EpochNanoseconds): boolean {
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

function getInternalSlotOrThrowForInstant(instant: unknown): InstantSlot {
	const slot = slots.get(instant);
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
	static from() {}
	static fromEpochMilliseconds(epochMilliseconds: unknown) {
		const epoch = createEpochNanosecondsFromEpochMilliseconds(toNumber(epochMilliseconds));
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
		createTemporalInstant(epoch);
	}
	static compare() {}
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
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
	toZonedDateTimeISO() {}
}

defineStringTag(Instant.prototype, "Temporal.Instant");
