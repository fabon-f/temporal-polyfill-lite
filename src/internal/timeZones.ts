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
	checkIsoDaysRange,
	epochDaysToIsoDate,
	formatTimeString,
	getUtcEpochNanoseconds,
	parseTemporalTimeZoneString,
	roundNumberToIncrement,
} from "./abstractOperations.ts";
import { assert, assertNotUndefined } from "./assertion.ts";
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

export function createOffsetCacheMap(
	epochNanoseconds?: EpochNanoseconds | undefined,
	offsetNanoseconds?: number | undefined,
): Map<number, number> {
	return new Map(
		epochNanoseconds !== undefined && offsetNanoseconds !== undefined
			? [[clampEpochSecond(epochSeconds(epochNanoseconds)), offsetNanoseconds]]
			: [],
	);
}

function clampEpochSecond(epochSecond: number): number {
	// avoid CE / BCE confusion while retrieving offset info, clamp to 1653 BC (no offset transition in pre-modern years)
	return clamp(epochSecond, -1e10, Infinity);
}

function getNamedTimeZoneOffsetNanosecondsForEpochSecond(
	timeZone: string,
	epochSecond: number,
	offsetCacheMap?: Map<number, number>,
): number {
	if (timeZone === "UTC") {
		return 0;
	}
	const clampedEpochSecond = clampEpochSecond(epochSecond);

	const cachedOffsetNanoseconds = offsetCacheMap && offsetCacheMap.get(clampedEpochSecond);
	if (cachedOffsetNanoseconds !== undefined) {
		return cachedOffsetNanoseconds;
	}

	const parts = getFormatterForTimeZone(timeZone).formatToParts(clampedEpochSecond * 1000);
	const units = ["year", "month", "day", "hour", "minute", "second"].map((unit) =>
		toIntegerIfIntegral(parts.find((p) => p.type === unit)!.value),
	) as [number, number, number, number, number, number];
	const offsetNanoseconds =
		(utcEpochMilliseconds(...units) - clampedEpochSecond * 1000) * nanosecondsPerMilliseconds;
	if (offsetCacheMap) {
		offsetCacheMap.set(clampedEpochSecond, offsetNanoseconds);
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
	offsetCacheMap: Map<number, number>,
): number {
	const startOffset = getNamedTimeZoneOffsetNanosecondsForEpochSecond(
		timeZone,
		startEpochSecond,
		offsetCacheMap,
	);
	// left: always same offset to `start`
	// right: always different offset to `start` (same to `end`)
	let left = startEpochSecond;
	let right = endEpochSecond;
	while (right - left > 1) {
		const mid = Math.floor((right + left) / 2);
		if (
			getNamedTimeZoneOffsetNanosecondsForEpochSecond(timeZone, mid, offsetCacheMap) === startOffset
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
	offsetCacheMap: Map<number, number>,
): EpochNanoseconds | null {
	endEpochSeconds = clamp(endEpochSeconds, -8.64e12, 8.64e12);
	// 48 hours for the initial scan
	let window = secondsPerDay * 2 * direction;
	let currentStart = startEpochSeconds;
	let currentEnd = startEpochSeconds + window;
	while ((endEpochSeconds - currentEnd) * direction > 0) {
		if (
			getNamedTimeZoneOffsetNanosecondsForEpochSecond(timeZone, currentStart) !==
			getNamedTimeZoneOffsetNanosecondsForEpochSecond(timeZone, currentEnd)
		) {
			const transition =
				direction > 0
					? bisectOffsetTransition(timeZone, currentStart, currentEnd, offsetCacheMap)
					: bisectOffsetTransition(timeZone, currentEnd, currentStart, offsetCacheMap);
			return createEpochNanosecondsFromEpochSeconds(transition);
		}
		window = adjustWindowForEpoch(currentStart) * direction;
		currentStart = currentEnd;
		currentEnd = clamp(currentEnd + window, -8.64e12, 8.64e12);
	}
	return null;
}

export function getTimeZoneTransition(
	timeZone: string,
	epoch: EpochNanoseconds,
	direction: -1 | 1,
	offsetCacheMap: Map<number, number>,
): EpochNanoseconds | null {
	if (timeZone === "UTC" || !parseTimeZoneIdentifier(timeZone).$name) {
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
				searchTimeZoneTransition(
					timeZone,
					start,
					start - secondsPerDay * 365,
					direction,
					offsetCacheMap,
				) || searchTimeZoneTransition(timeZone, upperLimit, lowerLimit, direction, offsetCacheMap)
			);
		}
		return searchTimeZoneTransition(timeZone, start, lowerLimit, direction, offsetCacheMap);
	}
	if (start > upperLimit) {
		return searchTimeZoneTransition(
			timeZone,
			start,
			start + secondsPerDay * 365,
			direction,
			offsetCacheMap,
		);
	}
	return searchTimeZoneTransition(timeZone, start, upperLimit, direction, offsetCacheMap);
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
	const [epochDays, remainderNanoseconds] = epochDaysAndRemainderNanoseconds(epochNanoseconds);
	assert(isWithin(remainderNanoseconds, 0, nanosecondsPerDay - 1));
	return combineIsoDateAndTimeRecord(
		epochDaysToIsoDate(epochDays),
		balanceTime(0, 0, 0, 0, 0, remainderNanoseconds),
	);
}

/** `FormatOffsetTimeZoneIdentifier` */
export function formatOffsetTimeZoneIdentifier(offsetMinutes: number): string {
	const abs = Math.abs(offsetMinutes);
	return `${offsetMinutes < 0 ? "-" : "+"}${formatTimeString(divFloor(abs, 60), modFloor(abs, 60), 0, 0, MINUTE)}`;
}

/** `FormatUTCOffsetNanoseconds` */
export function formatUtcOffsetNanoseconds(offsetNanoseconds: number): string {
	const abs = Math.abs(offsetNanoseconds);
	const second = modFloor(divFloor(abs, 1e9), 60);
	const nanosecond = modFloor(abs, 1e9);
	return `${offsetNanoseconds < 0 ? "-" : "+"}${formatTimeString(
		divFloor(abs, nanosecondsPerHour),
		modFloor(divFloor(abs, nanosecondsPerMinute), 60),
		second,
		nanosecond,
		second === 0 && nanosecond === 0 ? MINUTE : undefined,
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
	if (result.$name === undefined) {
		return formatOffsetTimeZoneIdentifier(result.$offsetMinutes);
	}
	return getAvailableNamedTimeZoneIdentifier(result.$name);
}

/** `GetOffsetNanosecondsFor` */
export function getOffsetNanosecondsFor(
	timeZone: string,
	epoch: EpochNanoseconds,
	offsetCacheMap?: Map<number, number>,
): number {
	const result = parseTimeZoneIdentifier(timeZone);
	return result.$name === undefined
		? result.$offsetMinutes * nanosecondsPerMinute
		: getNamedTimeZoneOffsetNanosecondsForEpochSecond(
				result.$name,
				epochSeconds(epoch),
				offsetCacheMap,
			);
}

/** `GetEpochNanosecondsFor` */
export function getEpochNanosecondsFor(
	timeZone: string,
	isoDateTime: IsoDateTimeRecord,
	disambiguation: Disambiguation,
	offsetCacheMap?: Map<number, number>,
): EpochNanoseconds {
	return disambiguatePossibleEpochNanoseconds(
		getPossibleEpochNanoseconds(timeZone, isoDateTime, offsetCacheMap),
		timeZone,
		isoDateTime,
		disambiguation,
		offsetCacheMap,
	);
}

/** `DisambiguatePossibleEpochNanoseconds` */
export function disambiguatePossibleEpochNanoseconds(
	possibleEpochNs: EpochNanoseconds[],
	timeZone: string,
	isoDateTime: IsoDateTimeRecord,
	disambiguation: Disambiguation,
	offsetCacheMap?: Map<number, number>,
): EpochNanoseconds {
	if (possibleEpochNs.length === 1) {
		assertNotUndefined(possibleEpochNs[0]);
		return possibleEpochNs[0];
	}
	if (disambiguation === disambiguationReject) {
		throwRangeError(ambiguousTime);
	}
	const isForwardTransition = possibleEpochNs.length === 0;

	// We are not sure whether handling of dates near boundary is correct here
	// TODO: verify
	possibleEpochNs = getNamedTimeZoneEpochCandidates(timeZone, isoDateTime, offsetCacheMap);
	for (const epoch of possibleEpochNs) {
		validateEpochNanoseconds(epoch);
	}
	if (disambiguation === disambiguationCompatible) {
		return isForwardTransition ? possibleEpochNs[1]! : possibleEpochNs[0]!;
	}
	if (disambiguation === disambiguationLater) {
		return possibleEpochNs[1]!;
	}
	return possibleEpochNs[0]!;
}

/** `GetPossibleEpochNanoseconds` */
export function getPossibleEpochNanoseconds(
	timeZone: string,
	isoDateTime: IsoDateTimeRecord,
	offsetCacheMap?: Map<number, number>,
): EpochNanoseconds[] {
	let possibleEpochNanoseconds: EpochNanoseconds[];
	const parsedTimeZone = parseTimeZoneIdentifier(timeZone);
	if (parsedTimeZone.$offsetMinutes !== undefined) {
		const balanced = balanceIsoDateTime(
			isoDateTime.$isoDate.$year,
			isoDateTime.$isoDate.$month,
			isoDateTime.$isoDate.$day,
			isoDateTime.$time.$hour,
			isoDateTime.$time.$minute - parsedTimeZone.$offsetMinutes,
			isoDateTime.$time.$second,
			isoDateTime.$time.$millisecond,
			isoDateTime.$time.$microsecond,
			isoDateTime.$time.$nanosecond,
		);
		checkIsoDaysRange(balanced.$isoDate);
		possibleEpochNanoseconds = [getUtcEpochNanoseconds(balanced)];
	} else {
		possibleEpochNanoseconds = getNamedTimeZoneEpochNanoseconds(
			parsedTimeZone.$name,
			isoDateTime,
			offsetCacheMap,
		);
	}
	return possibleEpochNanoseconds.map(validateEpochNanoseconds);
}

/** `GetStartOfDay` */
export function getStartOfDay(
	timeZone: string,
	isoDate: IsoDateRecord,
	offsetCacheMap: Map<number, number>,
): EpochNanoseconds {
	const isoDateTime = combineIsoDateAndTimeRecord(isoDate, midnightTimeRecord());
	const possibleEpochNs = getPossibleEpochNanoseconds(timeZone, isoDateTime, offsetCacheMap);
	if (possibleEpochNs[0]) {
		return possibleEpochNs[0];
	}
	return getTimeZoneTransition(
		timeZone,
		getNamedTimeZoneEpochCandidates(timeZone, isoDateTime, offsetCacheMap)[0]!,
		1,
		offsetCacheMap,
	)!;
}

/** `TimeZoneEquals` */
export function timeZoneEquals(one: string, two: string): boolean {
	if (one === two) {
		return true;
	}
	const id1 = parseTimeZoneIdentifier(one);
	const id2 = parseTimeZoneIdentifier(two);
	if (id1.$offsetMinutes === undefined && id2.$offsetMinutes === undefined) {
		return (
			getFormatterForTimeZone(id1.$name).resolvedOptions().timeZone ===
			getFormatterForTimeZone(id2.$name).resolvedOptions().timeZone
		);
	}
	return id1.$offsetMinutes === id2.$offsetMinutes;
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
	return /^[+-]/.test(identifier)
		? {
				$offsetMinutes: parseDateTimeUtcOffset(identifier) / nanosecondsPerMinute,
			}
		: { $name: identifier };
}

/** `GetNamedTimeZoneEpochNanoseconds` */
function getNamedTimeZoneEpochNanoseconds(
	timeZone: string,
	isoDateTime: IsoDateTimeRecord,
	offsetCacheMap?: Map<number, number>,
): EpochNanoseconds[] {
	const utcEpoch = getUtcEpochNanoseconds(isoDateTime);
	return getNamedTimeZoneEpochCandidates(timeZone, isoDateTime, offsetCacheMap).filter(
		(epoch) =>
			!compareEpochNanoseconds(
				addNanosecondsToEpochSeconds(
					epoch,
					getOffsetNanosecondsFor(timeZone, epoch, offsetCacheMap),
				),
				utcEpoch,
			),
	);
}

function getNamedTimeZoneEpochCandidates(
	timeZone: string,
	isoDateTime: IsoDateTimeRecord,
	offsetCacheMap?: Map<number, number>,
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
		offsetCacheMap,
	);
	const offsetNanoseconds2 = getOffsetNanosecondsFor(
		timeZone,
		clampEpochNanoseconds(
			addNanosecondsToEpochSeconds(utcEpoch, millisecondsPerDay * nanosecondsPerMilliseconds),
		),
		offsetCacheMap,
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
