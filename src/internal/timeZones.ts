import { OriginalDateTimeFormat } from "../DateTimeFormat.ts";
import { clampEpochNanoseconds, validateEpochNanoseconds } from "../Instant.ts";
import { type IsoDateRecord } from "../PlainDate.ts";
import {
	balanceIsoDateTime,
	combineIsoDateAndTimeRecord,
	type IsoDateTimeRecord,
} from "../PlainDateTime.ts";
import { balanceTime, midnightTimeRecord } from "../PlainTime.ts";
import { getInternalSlotOrThrowForZonedDateTime, isZonedDateTime } from "../ZonedDateTime.ts";
import {
	epochDaysToIsoDate,
	formatTimeString,
	getUtcEpochNanoseconds,
	parseTemporalTimeZoneString,
	roundNumberToIncrement,
} from "./abstractOperations.ts";
import { assert, assertIsoDaysRange, assertNotUndefined } from "./assertion.ts";
import { createLruCache, type LruCacheMap } from "./cacheMap.ts";
import {
	millisecondsPerDay,
	nanosecondsPerDay,
	nanosecondsPerHour,
	nanosecondsPerMilliseconds,
	nanosecondsPerMinute,
	secondsPerDay,
} from "./constants.ts";
import { isTimeZoneIdentifier, parseDateTimeUtcOffset } from "./dateTimeParser.ts";
import { toIntegerIfIntegral, validateString } from "./ecmascript.ts";
import {
	disambiguationCompatible,
	disambiguationLater,
	disambiguationReject,
	MINUTE,
	roundingModeHalfExpand,
	type Disambiguation,
} from "./enum.ts";
import {
	addNanosecondsToEpochSeconds,
	compareEpochNanoseconds,
	createEpochNanosecondsFromEpochSeconds,
	epochDaysAndRemainderNanoseconds,
	epochSeconds,
	type EpochNanoseconds,
} from "./epochNanoseconds.ts";
import { ambiguousTime, invalidTimeZone } from "./errorMessages.ts";
import { clamp, divFloor, isWithin, modFloor } from "./math.ts";
import { createNullPrototypeObject } from "./object.ts";
import { asciiCapitalize, asciiLowerCase, asciiUpperCase } from "./string.ts";
import { utcEpochMilliseconds } from "./time.ts";
import { throwRangeError } from "./utils.ts";

const intlCache = createNullPrototypeObject({}) as Record<string, Intl.DateTimeFormat>;
const timeZoneCache = createNullPrototypeObject({}) as Record<string, LruCacheMap<number, number>>;

function clampEpochSecond(epochSecond: number): number {
	// avoid CE / BCE confusion while retrieving offset info, clamp to 1653 BC (no offset transition in pre-modern years)
	return clamp(epochSecond, -1e10, Infinity);
}

export function getTimeZoneOffsetNanosecondsForEpochSecondFromCache(
	timeZone: string,
	epochSeconds: number,
): number | undefined {
	return timeZoneCache[timeZone] && timeZoneCache[timeZone].$get(clampEpochSecond(epochSeconds));
}

function getNamedTimeZoneOffsetNanosecondsForEpochSecond(
	timeZone: string,
	epochSecond: number,
	stopUpdateCache?: boolean,
): number {
	if (timeZone === "UTC") {
		return 0;
	}
	const clampedEpochSecond = clampEpochSecond(epochSecond);

	const cache = (timeZoneCache[timeZone] ||= createLruCache(5000));
	const cachedOffsetNanoseconds = cache.$get(clampedEpochSecond);
	if (cachedOffsetNanoseconds !== undefined) {
		return cachedOffsetNanoseconds;
	}

	const parts = getFormatterForTimeZone(timeZone).formatToParts(clampedEpochSecond * 1000);
	const units = ["year", "month", "day", "hour", "minute", "second"].map((unit) =>
		toIntegerIfIntegral(parts.find((p) => p.type === unit)!.value),
	) as [number, number, number, number, number, number];
	const offsetNanoseconds =
		(utcEpochMilliseconds(...units) - clampedEpochSecond * 1000) * nanosecondsPerMilliseconds;
	if (!stopUpdateCache) {
		cache.$set(clampedEpochSecond, offsetNanoseconds);
	}
	return offsetNanoseconds;
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
): number {
	const startOffset = getNamedTimeZoneOffsetNanosecondsForEpochSecond(timeZone, startEpochSecond);
	// left: always same offset to `start`
	// right: always different offset to `start` (same to `end`)
	let left = startEpochSecond;
	let right = endEpochSecond;
	for (; right - left > 1; ) {
		const mid = Math.floor((right + left) / 2);
		// cache only few seconds around the result
		if (
			getNamedTimeZoneOffsetNanosecondsForEpochSecond(timeZone, mid, right - left > 3) ===
			startOffset
		) {
			left = mid;
		} else {
			right = mid;
		}
	}
	return right;
}

function adjustWindowForEpoch(epochSecond: number): number {
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
): EpochNanoseconds | null {
	endEpochSeconds = clamp(endEpochSeconds, -8.64e12, 8.64e12);
	for (
		let window = secondsPerDay * 2 * direction,
			currentStart = startEpochSeconds,
			currentEnd = startEpochSeconds + window;
		(endEpochSeconds - currentEnd) * direction > 0;
		window = adjustWindowForEpoch(currentStart) * direction,
			currentStart = currentEnd,
			currentEnd = clamp(currentEnd + window, -8.64e12, 8.64e12)
	) {
		if (
			getNamedTimeZoneOffsetNanosecondsForEpochSecond(timeZone, currentStart, true) !==
			getNamedTimeZoneOffsetNanosecondsForEpochSecond(timeZone, currentEnd, true)
		) {
			const transition =
				direction > 0
					? bisectOffsetTransition(timeZone, currentStart, currentEnd)
					: bisectOffsetTransition(timeZone, currentEnd, currentStart);
			return createEpochNanosecondsFromEpochSeconds(transition);
		}
	}
	return null;
}

export function getTimeZoneTransition(
	timeZone: string,
	epoch: EpochNanoseconds,
	direction: -1 | 1,
): EpochNanoseconds | null {
	if (timeZone === "UTC" || isOffsetTimeZoneIdentifier(timeZone)) {
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
export function normalizeIanaTimeZoneId(id: string): string {
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

export function rejectNonIanaTimeZoneId(id: string) {
	if (/^(?![cemw]et|[emh]st|prc|ro[ck]|uct|utc|gmt)[a-z]{3}$|systemv|^us.*w$/i.test(id)) {
		throwRangeError(invalidTimeZone(id));
	}
}

/** `GetAvailableNamedTimeZoneIdentifier` + throwing `RangeError` */
export function getAvailableNamedTimeZoneIdentifier(timeZone: string): string {
	timeZone = normalizeIanaTimeZoneId(timeZone);
	rejectNonIanaTimeZoneId(timeZone);
	getFormatterForTimeZone(timeZone);
	return timeZone;
}

/** `GetISOPartsFromEpoch` */
function getIsoPartsFromEpoch(epochNanoseconds: EpochNanoseconds): IsoDateTimeRecord {
	const daysAndNanoseconds = epochDaysAndRemainderNanoseconds(epochNanoseconds);
	assert(isWithin(daysAndNanoseconds[1], 0, nanosecondsPerDay - 1));
	return combineIsoDateAndTimeRecord(
		epochDaysToIsoDate(daysAndNanoseconds[0]),
		balanceTime(0, 0, 0, 0, 0, daysAndNanoseconds[1]),
	);
}

/** `FormatOffsetTimeZoneIdentifier` */
export function formatOffsetTimeZoneIdentifier(offsetMinutes: number): string {
	return formatUtcOffsetNanoseconds(offsetMinutes * nanosecondsPerMinute);
}

/** `FormatUTCOffsetNanoseconds` */
export function formatUtcOffsetNanoseconds(offsetNanoseconds: number): string {
	const abs = Math.abs(offsetNanoseconds);
	// this polyfill assumes that there are no sub-second offsets
	assert(abs % 1e9 === 0);
	return `${offsetNanoseconds < 0 ? "-" : "+"}${formatTimeString(
		divFloor(abs, nanosecondsPerHour),
		modFloor(divFloor(abs, nanosecondsPerMinute), 60),
		modFloor(divFloor(abs, 1e9), 60),
		0,
		abs % nanosecondsPerMinute ? undefined : MINUTE,
	)}`;
}

/** `FormatDateTimeUTCOffsetRounded` */
export function formatDateTimeUtcOffsetRounded(offsetNanoseconds: number): string {
	return formatOffsetTimeZoneIdentifier(
		roundNumberToIncrement(offsetNanoseconds, nanosecondsPerMinute, roundingModeHalfExpand) /
			nanosecondsPerMinute,
	);
}

/** `ToTemporalTimeZoneIdentifier` */
export function toTemporalTimeZoneIdentifier(temporalTimeZoneLike: unknown): string {
	if (isZonedDateTime(temporalTimeZoneLike)) {
		return getInternalSlotOrThrowForZonedDateTime(temporalTimeZoneLike).$timeZone;
	}
	validateString(temporalTimeZoneLike);
	const result = parseTemporalTimeZoneString(temporalTimeZoneLike);
	if (result.$name) {
		return getAvailableNamedTimeZoneIdentifier(result.$name);
	}
	assertNotUndefined(result.$offsetMinutes);
	return formatOffsetTimeZoneIdentifier(result.$offsetMinutes);
}

/** `GetOffsetNanosecondsFor` */
export function getOffsetNanosecondsFor(timeZone: string, epoch: EpochNanoseconds): number {
	return isOffsetTimeZoneIdentifier(timeZone)
		? parseDateTimeUtcOffset(timeZone)
		: getNamedTimeZoneOffsetNanosecondsForEpochSecond(timeZone, epochSeconds(epoch));
}

/** `GetEpochNanosecondsFor` */
export function getEpochNanosecondsFor(
	timeZone: string,
	isoDateTime: IsoDateTimeRecord,
	disambiguation: Disambiguation,
): EpochNanoseconds {
	return disambiguatePossibleEpochNanoseconds(
		getPossibleEpochNanoseconds(timeZone, isoDateTime),
		timeZone,
		isoDateTime,
		disambiguation,
	);
}

/** `DisambiguatePossibleEpochNanoseconds` */
export function disambiguatePossibleEpochNanoseconds(
	possibleEpochNs: EpochNanoseconds[],
	timeZone: string,
	isoDateTime: IsoDateTimeRecord,
	disambiguation: Disambiguation,
): EpochNanoseconds {
	if (possibleEpochNs.length === 1) {
		assertNotUndefined(possibleEpochNs[0]);
		return possibleEpochNs[0];
	}
	assert(possibleEpochNs.length === 0 || possibleEpochNs.length === 2);
	if (disambiguation === disambiguationReject) {
		throwRangeError(ambiguousTime);
	}

	// We are not sure whether handling of dates near boundary is correct here
	// TODO: verify
	const candidates = getNamedTimeZoneEpochCandidates(timeZone, isoDateTime).map(
		validateEpochNanoseconds,
	);
	assert(candidates.length === 2);
	const epoch =
		candidates[
			disambiguation === disambiguationCompatible
				? +!possibleEpochNs[0]
				: +(disambiguation === disambiguationLater)
		];
	assertNotUndefined(epoch);
	return epoch;
}

/** `GetPossibleEpochNanoseconds` */
export function getPossibleEpochNanoseconds(
	timeZone: string,
	isoDateTime: IsoDateTimeRecord,
): EpochNanoseconds[] {
	if (isOffsetTimeZoneIdentifier(timeZone)) {
		const balanced = balanceIsoDateTime(
			isoDateTime.$isoDate.$year,
			isoDateTime.$isoDate.$month,
			isoDateTime.$isoDate.$day,
			isoDateTime.$time.$hour,
			isoDateTime.$time.$minute,
			isoDateTime.$time.$second,
			isoDateTime.$time.$millisecond,
			isoDateTime.$time.$microsecond,
			isoDateTime.$time.$nanosecond - parseDateTimeUtcOffset(timeZone),
		);
		assertIsoDaysRange(balanced.$isoDate);
		return [validateEpochNanoseconds(getUtcEpochNanoseconds(balanced))];
	} else {
		return getNamedTimeZoneEpochNanoseconds(timeZone, isoDateTime).map(validateEpochNanoseconds);
	}
}

/** `GetStartOfDay` */
export function getStartOfDay(timeZone: string, isoDate: IsoDateRecord): EpochNanoseconds {
	const isoDateTime = combineIsoDateAndTimeRecord(isoDate, midnightTimeRecord());
	const possibleEarlierEpochNs = getPossibleEpochNanoseconds(timeZone, isoDateTime)[0];
	if (possibleEarlierEpochNs) {
		// backward transition or no transition
		return possibleEarlierEpochNs;
	}
	// cf. https://github.com/tc39/proposal-temporal/issues/2910
	const disambiguatedEpochs = getNamedTimeZoneEpochCandidates(timeZone, isoDateTime);
	assert(disambiguatedEpochs.length === 2);
	return createEpochNanosecondsFromEpochSeconds(
		bisectOffsetTransition(
			timeZone,
			...(disambiguatedEpochs.map(epochSeconds) as [number, number]),
		),
	);
}

/** `TimeZoneEquals` */
export function timeZoneEquals(one: string, two: string): boolean {
	return (
		one === two ||
		(!isOffsetTimeZoneIdentifier(one) &&
			!isOffsetTimeZoneIdentifier(two) &&
			getFormatterForTimeZone(one).resolvedOptions().timeZone ===
				getFormatterForTimeZone(two).resolvedOptions().timeZone)
	);
}

export type TimeZoneIdentifierParseRecord =
	| {
			$name: string;
			$offsetMinutes?: undefined;
	  }
	| {
			$name?: undefined;
			$offsetMinutes: number;
	  };

/** `ParseTimeZoneIdentifier` */
export function parseTimeZoneIdentifier(identifier: string): TimeZoneIdentifierParseRecord {
	if (!isTimeZoneIdentifier(identifier)) {
		throwRangeError(invalidTimeZone(identifier));
	}
	return createNullPrototypeObject(
		isOffsetTimeZoneIdentifier(identifier)
			? {
					$offsetMinutes: parseDateTimeUtcOffset(identifier) / nanosecondsPerMinute,
				}
			: { $name: identifier },
	);
}

/** `GetNamedTimeZoneEpochNanoseconds` */
function getNamedTimeZoneEpochNanoseconds(
	timeZone: string,
	isoDateTime: IsoDateTimeRecord,
): EpochNanoseconds[] {
	return getNamedTimeZoneEpochCandidates(timeZone, isoDateTime).filter(
		(epoch) =>
			!compareEpochNanoseconds(
				addNanosecondsToEpochSeconds(epoch, getOffsetNanosecondsFor(timeZone, epoch)),
				getUtcEpochNanoseconds(isoDateTime),
			),
	);
}

/** `IsOffsetTimeZoneIdentifier` */
export function isOffsetTimeZoneIdentifier(identifier: string) {
	assert(isTimeZoneIdentifier(identifier));
	return /^[+-]/.test(identifier);
}

function getNamedTimeZoneEpochCandidates(
	timeZone: string,
	isoDateTime: IsoDateTimeRecord,
): EpochNanoseconds[] {
	const utcEpoch = getUtcEpochNanoseconds(isoDateTime);
	if (timeZone === "UTC") {
		return [utcEpoch];
	}
	// clamp to upper limit (+275760-09-13T00:00:00Z) to avoid error in `getOffsetNanosecondsFor`
	const offsetNanoseconds1 = getOffsetNanosecondsFor(
		timeZone,
		clampEpochNanoseconds(
			addNanosecondsToEpochSeconds(utcEpoch, -millisecondsPerDay * nanosecondsPerMilliseconds),
		),
	);
	const offsetNanoseconds2 = getOffsetNanosecondsFor(
		timeZone,
		clampEpochNanoseconds(
			addNanosecondsToEpochSeconds(utcEpoch, millisecondsPerDay * nanosecondsPerMilliseconds),
		),
	);
	const epoch1 = addNanosecondsToEpochSeconds(utcEpoch, -offsetNanoseconds1);
	const epoch2 = addNanosecondsToEpochSeconds(utcEpoch, -offsetNanoseconds2);
	if (offsetNanoseconds1 === offsetNanoseconds2) {
		return [epoch1];
	}
	return [epoch1, epoch2].sort(compareEpochNanoseconds);
}

export function getIsoDateTimeFromOffsetNanoseconds(
	epoch: EpochNanoseconds,
	offsetNanoseconds: number,
): IsoDateTimeRecord {
	return getIsoPartsFromEpoch(addNanosecondsToEpochSeconds(epoch, offsetNanoseconds));
}
