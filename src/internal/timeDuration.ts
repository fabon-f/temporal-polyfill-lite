import { roundNumberToIncrement } from "./abstractOperations.ts";
import { assert } from "./assertion.ts";
import {
	microsecondsPerDay,
	millisecondsPerDay,
	nanosecondsPerDay,
	secondsPerDay,
} from "./constants.ts";
import type { RoundingMode } from "./enum.ts";
import { compareEpochNanoseconds, normalizeEpochNanoseconds } from "./epochNanoseconds.ts";
import { fusedMultiplyAddPow10, type NumberSign } from "./math.ts";

const timeDurationBrand = /*#__PURE__*/ Symbol();

/** `days` and remainder have same sign */
export type TimeDuration = [days: number, remainderNanoseconds: number] & {
	[timeDurationBrand]: unknown;
};

export function normalize(days: number, nanoseconds: number): TimeDuration {
	const [d, n] = normalizeEpochNanoseconds(days, nanoseconds);
	return (d < 0 && n > 0 ? [d + 1, n - nanosecondsPerDay] : [d, n]) as TimeDuration;
}

export function createTimeDurationFromSeconds(sec: number): TimeDuration {
	return normalize(Math.trunc(sec / secondsPerDay), (sec % secondsPerDay) * 1e9);
}

export function createTimeDurationFromNanoseconds(nanosec: number): TimeDuration {
	// `Math.trunc(nanosec / nanosecondsPerDay)` can return wrong result for unsafe integer due to floating-point precision.
	// `(nanosec - nanosec % nanosecondsPerDay) / nanosecondsPerDay` can be slightly larger or smaller than "actual" integer,
	// but `nanosecondsPerDay` is large enough compared to maximum ulp (unit in the last place) in valid duration range (2 ** 30),
	// so calling `Math.round` can return precise integer.
	return normalize(
		Math.round((nanosec - (nanosec % nanosecondsPerDay)) / nanosecondsPerDay),
		nanosec % nanosecondsPerDay,
	);
}

export function createTimeDurationFromMicroseconds(microsec: number): TimeDuration {
	// same to `createTimeDurationFromNanoseconds` (8.64e10 is large enough than maximum ulp `2 ** 20`)
	return normalize(
		Math.round((microsec - (microsec % microsecondsPerDay)) / microsecondsPerDay),
		(microsec % microsecondsPerDay) * 1e3,
	);
}

export function createTimeDurationFromMilliseconds(millisec: number): TimeDuration {
	return normalize(
		Math.trunc(millisec / millisecondsPerDay),
		(millisec % millisecondsPerDay) * 1e6,
	);
}

export function addNanosecondsToTimeDuration(
	duration: TimeDuration,
	nanoseconds: number,
): TimeDuration {
	return normalize(duration[0], duration[1] + nanoseconds);
}

export function addDaysToTimeDuration(duration: TimeDuration, days: number): TimeDuration {
	return normalize(duration[0] + days, duration[1]);
}

export function addTimeDuration(one: TimeDuration, two: TimeDuration): TimeDuration {
	return normalize(one[0] + two[0], one[1] + two[1]);
}

export function sumTimeDuration(timeDurations: TimeDuration[]): TimeDuration {
	return timeDurations.reduce(addTimeDuration);
}

export function absTimeDuration(timeDuration: TimeDuration): TimeDuration {
	return normalize(Math.abs(timeDuration[0]), Math.abs(timeDuration[1]));
}

// @ts-expect-error
export const compareTimeDuration = compareEpochNanoseconds as (
	a: TimeDuration,
	b: TimeDuration,
) => NumberSign;

/** `TimeDurationSign` */
export function signTimeDuration(timeDuration: TimeDuration): NumberSign {
	return compareTimeDuration(timeDuration, [0, 0] as TimeDuration);
}

export function timeDurationDaysAndRemainderNanoseconds(
	timeDuration: TimeDuration,
): [days: number, nanoseconds: number] {
	return timeDuration;
}

export function timeDurationToNanosecondsNumber(timeDuration: TimeDuration): number {
	return fusedMultiplyAddPow10(
		timeDuration[0] * 864 + Math.trunc(timeDuration[1] / 1e11),
		11,
		timeDuration[1] % 1e11,
	);
}

export function timeDurationToMicrosecondsNumber(timeDuration: TimeDuration): number {
	return fusedMultiplyAddPow10(
		timeDuration[0] * 864 + Math.trunc(timeDuration[1] / 1e11),
		8,
		Math.trunc(timeDuration[1] / 1e3) % 1e8,
	);
}

export function timeDurationToMillisecondsNumber(timeDuration: TimeDuration): number {
	return fusedMultiplyAddPow10(
		timeDuration[0] * 864 + Math.trunc(timeDuration[1] / 1e11),
		5,
		Math.trunc(timeDuration[1] / 1e6) % 1e5,
	);
}

export function timeDurationToSecondsNumber(timeDuration: TimeDuration): number {
	return timeDuration[0] * secondsPerDay + Math.trunc(timeDuration[1] / 1e9);
}

export function roundTimeDuration(
	timeDuration: TimeDuration,
	roundingIncrementNanoseconds: number,
	roundingMode: RoundingMode,
): TimeDuration {
	return normalize(
		timeDuration[0],
		roundNumberToIncrement(timeDuration[1], roundingIncrementNanoseconds, roundingMode),
	);
}

/** `divisor` should be factor of 8.64e13 (nanoseconds per day) */
export function divModTruncTimeDuration(
	timeDuration: TimeDuration,
	divisor: number,
): [div: number, mod: number] {
	assert(nanosecondsPerDay % divisor === 0);
	return [(nanosecondsPerDay / divisor) * timeDuration[0] + 0, (timeDuration[1] % divisor) + 0];
}
