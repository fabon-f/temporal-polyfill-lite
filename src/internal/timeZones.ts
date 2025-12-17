import { OriginalDateTimeFormat } from "../DateTimeFormat.ts";
import { millisecondsPerDay, nanosecondsPerMilliseconds, secondsPerDay } from "./constants.ts";
import { toIntegerIfIntegral } from "./ecmascript.ts";
import {
	addNanosecondsToEpochSeconds,
	createEpochNanosecondsFromEpochSeconds,
	epochSeconds,
	type EpochNanoseconds,
} from "./epochNanoseconds.ts";
import { clamp } from "./math.ts";
import { asciiCapitalize, asciiLowerCase, asciiUpperCase } from "./string.ts";
import { utcEpochMilliseconds } from "./time.ts";

const intlCache = Object.create(null) as Record<string, Intl.DateTimeFormat>;

function getOffsetNanosecondsForEpochSecond(timeZone: string, epochSecond: number) {
	if (timeZone === "UTC") {
		return 0;
	}
	// avoid CE / BCE confusion, clamp to 1653 BC (no offset transition in pre-modern years)
	const clampedEpoch = clamp(epochSecond * 1000, -1e13, Infinity);
	const parts = getFormatterForTimeZone(timeZone).formatToParts(clampedEpoch);
	const units = ["year", "month", "day", "hour", "minute", "second"].map((unit) =>
		toIntegerIfIntegral(parts.find((p) => p.type === unit)!.value),
	) as [number, number, number, number, number, number];
	return (utcEpochMilliseconds(...units) - clampedEpoch) * nanosecondsPerMilliseconds;
}

/** `GetOffsetNanosecondsFor` */
export function getOffsetNanosecondsFor(timeZone: string, epoch: EpochNanoseconds) {
	return getOffsetNanosecondsForEpochSecond(timeZone, epochSeconds(epoch));
}

function getFormatterForTimeZone(timeZone: string): Intl.DateTimeFormat {
	return (intlCache[timeZone] ||= new OriginalDateTimeFormat("en-u-hc-h23", {
		timeZone,
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
	}));
}

/** assumption: different offset between start and end */
function bisectOffsetTransition(
	timeZone: string,
	startEpochSecond: number,
	endEpochSecond: number,
) {
	const startOffset = getOffsetNanosecondsForEpochSecond(timeZone, startEpochSecond);
	// left: always same offset to `start`
	// right: always different offset to `start` (same to `end`)
	let left = startEpochSecond;
	let right = endEpochSecond;
	while (right - left > 1) {
		const mid = Math.floor((right + left) / 2);
		if (getOffsetNanosecondsForEpochSecond(timeZone, mid) === startOffset) {
			left = mid;
		} else {
			right = mid;
		}
	}
	return right;
}

function adjustWindowForEpoch(epochSecond: number) {
	if (epochSecond < -850000000) {
		// shortest interval of offset transition recorded in tz database before 1943-01-25 is 513 hours (DST in Hawaii in 1933)
		return secondsPerDay * 21;
	}
	if (epochSecond > -770000000 && epochSecond < 960000000) {
		// from 1945-08-08 to 2000-06-03, ditto
		return secondsPerDay * 16;
	}
	return secondsPerDay * 6.5;
}

/** supports reversed range (start > end) */
function searchTimeZoneTransition(
	timeZone: string,
	startEpochSeconds: number,
	endEpochSeconds: number,
	direction: -1 | 1,
) {
	// 48 hours for the initial scan
	let window = secondsPerDay * 2 * direction;
	let currentStart = startEpochSeconds;
	let currentEnd = startEpochSeconds + window;
	while ((endEpochSeconds - currentEnd) * direction > 0) {
		if (
			getOffsetNanosecondsForEpochSecond(timeZone, currentStart) !==
			getOffsetNanosecondsForEpochSecond(timeZone, currentEnd)
		) {
			const transition =
				direction > 0
					? bisectOffsetTransition(timeZone, currentStart, currentEnd)
					: bisectOffsetTransition(timeZone, currentEnd, currentStart);
			return createEpochNanosecondsFromEpochSeconds(transition);
		}
		window = adjustWindowForEpoch(currentStart) * direction;
		currentStart = currentEnd;
		currentEnd += window;
	}
	return null;
}

export function getTimeZoneTransition(
	timeZone: string,
	epoch: EpochNanoseconds,
	direction: -1 | 1,
): EpochNanoseconds | null {
	if (timeZone === "UTC") {
		return null;
	}
	// corresponds to 1843-03-31T16:53:20Z, before the first offset transition recorded in tz database (1845-01-01)
	const lowerLimit = -4e9;
	const upperLimit = Math.floor((Date.now() + millisecondsPerDay * 3650) / 1000);
	const start = clamp(
		epochSeconds(addNanosecondsToEpochSeconds(epoch, direction > 0 ? 0 : -1)),
		lowerLimit,
		Infinity,
	);
	if (direction === -1) {
		if (start === lowerLimit) {
			return null;
		}
		if (start > upperLimit) {
			return (
				searchTimeZoneTransition(timeZone, start, start - secondsPerDay * 365, direction) ||
				searchTimeZoneTransition(timeZone, upperLimit, lowerLimit, direction)
			);
		}
		return searchTimeZoneTransition(timeZone, start, lowerLimit, direction);
	}
	if (start > upperLimit) {
		return searchTimeZoneTransition(timeZone, start, start + secondsPerDay * 365, direction);
	}
	return searchTimeZoneTransition(timeZone, start, upperLimit, direction);
}

/** normalize upper/lower case of IANA time zone IDs */
export function normalizeIanaTimeZoneId(id: string) {
	return asciiLowerCase(id).replace(/[^/]+/g, (part) => {
		if (/^(?!etc|yap).{1,3}$|\d/.test(part)) {
			return asciiUpperCase(part);
		}
		return part.replace(/baja|mc|comod|[a-z]+/g, (word) => {
			if (/^(su|gb|nz|in|chat)$/.test(word)) {
				return asciiUpperCase(word);
			}
			if (/^(of|au|es)$/.test(word)) {
				return word;
			}
			return asciiCapitalize(word).replace(/du(?=r)|n(?=or)|i(?=slan)/, asciiUpperCase);
		});
	});
}
