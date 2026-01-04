import { nanosecondsPerMilliseconds } from "./constants.ts";
import { compare, divFloor, modFloor, type NumberSign } from "./math.ts";

const epochNanosecondsBrand = /*#__PURE__*/ Symbol();

/** remainder is always positive */
export type EpochNanoseconds = [milliseconds: number, remainderNanoseconds: number] & {
	[epochNanosecondsBrand]: unknown;
};

export function normalizeEpochNanoseconds(
	milliseconds: number,
	remainderNanoseconds: number,
): EpochNanoseconds {
	return [
		milliseconds + divFloor(remainderNanoseconds, nanosecondsPerMilliseconds),
		modFloor(remainderNanoseconds, nanosecondsPerMilliseconds),
	] as EpochNanoseconds;
}

export function createEpochNanosecondsFromBigInt(epoch: bigint): EpochNanoseconds {
	return normalizeEpochNanoseconds(
		Number(epoch / BigInt(nanosecondsPerMilliseconds)),
		Number(epoch % BigInt(nanosecondsPerMilliseconds)),
	);
}

export function createEpochNanosecondsFromEpochMilliseconds(epoch: number): EpochNanoseconds {
	return normalizeEpochNanoseconds(epoch, 0);
}

export function createEpochNanosecondsFromEpochSeconds(epoch: number): EpochNanoseconds {
	return normalizeEpochNanoseconds(epoch * 1000, 0);
}

export function convertEpochNanosecondsToBigInt(epoch: EpochNanoseconds): bigint {
	return BigInt(epoch[0]) * BigInt(nanosecondsPerMilliseconds) + BigInt(epoch[1]);
}

export function compareEpochNanoseconds(a: EpochNanoseconds, b: EpochNanoseconds): NumberSign {
	return compare(a[0], b[0]) || compare(a[1], b[1]);
}

export function epochMilliseconds(epoch: EpochNanoseconds): number {
	return epoch[0];
}

export function epochSeconds(epoch: EpochNanoseconds): number {
	return divFloor(epoch[0], 1000);
}

export function addNanosecondsToEpochSeconds(
	epoch: EpochNanoseconds,
	delta: number,
): EpochNanoseconds {
	return normalizeEpochNanoseconds(epoch[0], epoch[1] + delta);
}
