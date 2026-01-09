import { millisecondsPerDay, nanosecondsPerDay, nanosecondsPerMilliseconds } from "./constants.ts";
import { compare, divFloor, modFloor, type NumberSign } from "./math.ts";

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
