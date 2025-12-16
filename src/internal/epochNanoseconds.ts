import { nanosecondsPerMilliseconds } from "./constants.ts";
import { compare, divModFloor, type NumberSign } from "./math.ts";

const epochNanosecondsBrand = /*#__PURE__*/ Symbol();

/** remainder is always positive */
export type EpochNanoseconds = [milliseconds: number, remainderNanoseconds: number] & {
	[epochNanosecondsBrand]: unknown;
};

export function normalizeEpochNanoseconds(
	milliseconds: number,
	remainderNanoseconds: number,
): EpochNanoseconds {
	const [quotient, remainder] = divModFloor(remainderNanoseconds, nanosecondsPerMilliseconds);
	return [milliseconds + quotient, remainder] as EpochNanoseconds;
}

export function createEpochNanosecondsFromBigInt(epoch: bigint): EpochNanoseconds {
	return normalizeEpochNanoseconds(
		Number(epoch / BigInt(nanosecondsPerMilliseconds)),
		Number(epoch % BigInt(nanosecondsPerMilliseconds)),
	);
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
	return divModFloor(epoch[0], 1000)[0];
}
