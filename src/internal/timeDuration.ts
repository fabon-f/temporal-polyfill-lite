import { millisecondsPerDay, nanosecondsPerDay, secondsPerDay } from "./constants.ts";
import { compareEpochNanoseconds, normalizeEpochNanoseconds } from "./epochNanoseconds.ts";
import { truncateDigits, type NumberSign } from "./math.ts";

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
	return [Math.trunc(sec / secondsPerDay) + 0, (sec % secondsPerDay) * 1e9 + 0] as TimeDuration;
}

export function createTimeDurationFromNanoseconds(nanosec: number): TimeDuration {
	// `Math.trunc(nanosec / nanosecondsPerDay)` can return wrong result for unsafe integer due to floating-point precision
	return addNanosecondsToTimeDuration(
		createTimeDurationFromSeconds(truncateDigits(nanosec, 9)),
		nanosec % 1e9,
	);
}

export function createTimeDurationFromMicroseconds(microsec: number): TimeDuration {
	return addNanosecondsToTimeDuration(
		createTimeDurationFromSeconds(truncateDigits(microsec, 6)),
		(microsec % 1e6) * 1e3,
	);
}

export function createTimeDurationFromMilliseconds(millisec: number): TimeDuration {
	return [
		Math.trunc(millisec / millisecondsPerDay) + 0,
		(millisec % millisecondsPerDay) * 1e6 + 0,
	] as TimeDuration;
}

export function addNanosecondsToTimeDuration(
	duration: TimeDuration,
	nanoseconds: number,
): TimeDuration {
	return normalize(duration[0], duration[1] + nanoseconds);
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

export function timeDurationDaysAndRemainderNanoseconds(
	timeDuration: TimeDuration,
): [days: number, nanoseconds: number] {
	return timeDuration;
}

/** be careful with unsafe integers */
export function timeDurationToNanosecondsNumber(timeDuration: TimeDuration): number {
	return timeDuration[0] * nanosecondsPerDay + timeDuration[1];
}
