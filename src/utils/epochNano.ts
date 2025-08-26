// alternative representation of epoch nanoseconds

import { compareNumber } from "./math.ts";

/**
 * `milliseconds` and `restNanoseconds` has same sign
 */
export type EpochNanoseconds = [
	milliseconds: number,
	remainderNanoseconds: number,
] & { __epochNanoseconds__: unknown };

export function fromNativeBigInt(n: bigint) {
	return [Number(n / BigInt(1e6)), Number(n % BigInt(1e6))] as EpochNanoseconds;
}

export function toNativeBigInt(n: EpochNanoseconds) {
	return BigInt(n[0]) * BigInt(1e6) + BigInt(n[1]);
}

export function normalizeEpoch(milliseconds: number, nanoseconds: number) {
	milliseconds += Math.trunc(nanoseconds / 1e6);
	nanoseconds = nanoseconds % 1e6;

	const sign = Math.sign(milliseconds);
	if (sign * Math.sign(nanoseconds) === -1) {
		// sign mismatch
		milliseconds -= sign;
		nanoseconds += sign * 1e6;
	}
	return [milliseconds, nanoseconds] as EpochNanoseconds;
}

export function absEpoch(n: EpochNanoseconds) {
	return [Math.abs(n[0]), Math.abs(n[1])] as EpochNanoseconds;
}

export function compareEpoch(x: EpochNanoseconds, y: EpochNanoseconds) {
	return compareNumber(x[0], y[0]) || compareNumber(x[1], y[1]);
}

export function getEpochMilliseconds(ns: EpochNanoseconds) {
	return ns[0] - (ns[1] < 0 ? 1 : 0);
}

export function getPositiveRemainderNanoseconds(ns: EpochNanoseconds) {
	const nanosec = ns[1] < 0 ? 1e6 + ns[1] : ns[1];
	return [Math.floor(nanosec / 1e3), nanosec % 1e3] as [number, number];
}

export function addNanosecondsToEpoch(
	epoch: EpochNanoseconds,
	nanoseconds: number,
) {
	return normalizeEpoch(epoch[0], epoch[1] + nanoseconds);
}
