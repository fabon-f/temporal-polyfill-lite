import { roundNumberToIncrementAsIfPositive } from "./abstractOperations.ts";
import { millisecondsPerDay, nanosecondsPerDay, nanosecondsPerMilliseconds } from "./constants.ts";
import type { RoundingMode } from "./enum.ts";
import { compare, divFloor, modFloor, type NumberSign } from "./math.ts";
import { normalize as normalizeTimeDuration, type TimeDuration } from "./timeDuration.ts";

const epochNanosecondsBrand = /*#__PURE__*/ Symbol();

/** remainder is always positive */
export type EpochNanoseconds = [days: number, remainderNanoseconds: number] & {
	[epochNanosecondsBrand]: unknown;
};

export function normalizeEpochNanoseconds(
	days: number,
	remainderNanoseconds: number,
): EpochNanoseconds {
	return [
		days + divFloor(remainderNanoseconds, nanosecondsPerDay),
		modFloor(remainderNanoseconds, nanosecondsPerDay),
	] as EpochNanoseconds;
}

export function createEpochNanosecondsFromBigInt(epoch: bigint): EpochNanoseconds {
	return normalizeEpochNanoseconds(
		Number(epoch / BigInt(nanosecondsPerDay)),
		Number(epoch % BigInt(nanosecondsPerDay)),
	);
}

export function createEpochNanosecondsFromEpochMilliseconds(epoch: number): EpochNanoseconds {
	return normalizeEpochNanoseconds(
		divFloor(epoch, millisecondsPerDay),
		modFloor(epoch, millisecondsPerDay) * 1e6,
	);
}

export function createEpochNanosecondsFromEpochSeconds(epoch: number): EpochNanoseconds {
	return createEpochNanosecondsFromEpochMilliseconds(epoch * 1e3);
}

export function convertEpochNanosecondsToBigInt(epoch: EpochNanoseconds): bigint {
	return BigInt(epoch[0]) * BigInt(nanosecondsPerDay) + BigInt(epoch[1]);
}

export function compareEpochNanoseconds(a: EpochNanoseconds, b: EpochNanoseconds): NumberSign {
	return compare(a[0], b[0]) || compare(a[1], b[1]);
}

export function epochMilliseconds(epoch: EpochNanoseconds): number {
	return epoch[0] * millisecondsPerDay + divFloor(epoch[1], nanosecondsPerMilliseconds);
}

export function epochSeconds(epoch: EpochNanoseconds): number {
	return divFloor(epochMilliseconds(epoch), 1e3);
}

export function epochDaysAndRemainderNanoseconds(
	epoch: EpochNanoseconds,
): [epochDays: number, remainderNanoseconds: number] {
	return epoch;
}

export function addNanosecondsToEpochSeconds(
	epoch: EpochNanoseconds,
	delta: number,
): EpochNanoseconds {
	return normalizeEpochNanoseconds(epoch[0], epoch[1] + delta);
}

export function differenceEpochNanoseconds(
	epoch1: EpochNanoseconds,
	epoch2: EpochNanoseconds,
): TimeDuration {
	return normalizeTimeDuration(epoch2[0] - epoch1[0], epoch2[1] - epoch1[1]);
}

export function addTimeDurationToEpochNanoseconds(
	epoch: EpochNanoseconds,
	duration: TimeDuration,
): EpochNanoseconds {
	return normalizeEpochNanoseconds(epoch[0] + duration[0], epoch[1] + duration[1]);
}

export function roundEpochNanoseconds(
	epoch: EpochNanoseconds,
	roundingIncrementNanoseconds: number,
	roundingMode: RoundingMode,
) {
	return normalizeEpochNanoseconds(
		epoch[0],
		roundNumberToIncrementAsIfPositive(epoch[1], roundingIncrementNanoseconds, roundingMode),
	);
}
