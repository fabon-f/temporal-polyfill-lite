import { compare, divModFloor, type NumberSign } from "./math.ts";

const epochNanosecondsBrand = /*#__PURE__*/ Symbol();

export const msInNs = 1e6;

/** remainder is always positive */
export type EpochNanoseconds = [milliseconds: number, remainderNanoseconds: number] & {
	[epochNanosecondsBrand]: unknown;
};

export function normalizeEpochNanoseconds(
	milliseconds: number,
	remainderNanoseconds: number,
): EpochNanoseconds {
	const [quotient, remainder] = divModFloor(remainderNanoseconds, msInNs);
	return [milliseconds + quotient, remainder] as EpochNanoseconds;
}

export function createEpochNanosecondsFromBigInt(epoch: bigint): EpochNanoseconds {
	return normalizeEpochNanoseconds(Number(epoch / BigInt(msInNs)), Number(epoch % BigInt(msInNs)));
}

export function convertEpochNanosecondsToBigInt(epoch: EpochNanoseconds): bigint {
	return BigInt(epoch[0]) * BigInt(msInNs) + BigInt(epoch[1]);
}

export function compareEpochNanoseconds(a: EpochNanoseconds, b: EpochNanoseconds): NumberSign {
	return compare(a[0], b[0]) || compare(a[1], b[1]);
}
