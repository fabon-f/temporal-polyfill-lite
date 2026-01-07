import type { IsoDateRecord } from "../PlainDate.ts";
import type { IsoDateTimeRecord } from "../PlainDateTime.ts";
import { daysPer400Years, millisecondsPerDay } from "./constants.ts";
import {
	isTimeZoneIdentifier,
	parseDateTimeUtcOffset,
	parseIsoDateTime,
	temporalDateTimeStringRegExp,
	temporalInstantStringRegExp,
	temporalMonthDayStringRegExp,
	temporalTimeStringRegExp,
	temporalYearMonthStringRegExp,
	temporalZonedDateTimeStringRegExp,
} from "./dateTimeParser.ts";
import { getOption, ToPrimitive } from "./ecmascript.ts";
import {
	disambiguationCompatible,
	disambiguationEarlier,
	disambiguationLater,
	disambiguationReject,
	offsetIgnore,
	offsetPrefer,
	offsetReject,
	offsetUse,
	overflowConstrain,
	overflowReject,
	type Disambiguation,
	type Offset,
	type Overflow,
} from "./enum.ts";
import {
	addNanosecondsToEpochSeconds,
	createEpochNanosecondsFromEpochMilliseconds,
	type EpochNanoseconds,
} from "./epochNanoseconds.ts";
import { divFloor, modFloor } from "./math.ts";
import { utcEpochMilliseconds } from "./time.ts";
import { parseTimeZoneIdentifier, type TimeZoneIdentifierParseRecord } from "./timeZones.ts";

/** `ISODateToEpochDays` (`month` is 0-indexed) */
export function isoDateToEpochDays(year: number, month: number, day: number): number {
	year += divFloor(month, 12);

	// Gregorian calendar has 400 years cycle (146097 days).
	// In order to avoid `Date.UTC` quirks on 1 or 2 digit years
	// and handle extreme dates not supported by `Date`.
	return (
		Date.UTC((year % 400) - 400, modFloor(month, 12), 0) / millisecondsPerDay +
		(Math.trunc(year / 400) + 1) * daysPer400Years +
		day
	);
}

export function isoDateRecordToEpochDays(isoDate: IsoDateRecord): number {
	return isoDateToEpochDays(isoDate.$year, isoDate.$month - 1, isoDate.$day);
}

export function mathematicalDaysInYear(year: number): number {
	return 365 + mathematicalInLeapYear(year);
}

export function mathematicalInLeapYear(year: number): number {
	// https://codegolf.stackexchange.com/questions/50798/is-it-a-leap-year
	return +!(year % (year % 25 ? 4 : 16));
}

/** `GetTemporalOverflowOption` */
export function getTemporalOverflowOption(options: object): Overflow {
	return getOption(
		options as Record<string, unknown>,
		"overflow",
		[overflowConstrain, overflowReject],
		overflowConstrain,
	);
}

/** `GetTemporalDisambiguationOption` */
export function getTemporalDisambiguationOption(options: object): Disambiguation {
	return getOption(
		options,
		"disambiguation",
		[disambiguationCompatible, disambiguationEarlier, disambiguationLater, disambiguationReject],
		disambiguationCompatible,
	);
}

/** `GetTemporalOffsetOption` */
export function getTemporalOffsetOption(options: object, fallback: Offset): Offset {
	return getOption(
		options,
		"offset",
		[offsetPrefer, offsetUse, offsetIgnore, offsetReject],
		fallback,
	);
}

/** `ParseTemporalTimeZoneString` */
export function parseTemporalTimeZoneString(timeZoneString: string): TimeZoneIdentifierParseRecord {
	if (isTimeZoneIdentifier(timeZoneString)) {
		return parseTimeZoneIdentifier(timeZoneString);
	}
	const timeZone = parseIsoDateTime(timeZoneString, [
		temporalZonedDateTimeStringRegExp,
		temporalDateTimeStringRegExp,
		temporalInstantStringRegExp,
		temporalTimeStringRegExp,
		temporalMonthDayStringRegExp,
		temporalYearMonthStringRegExp,
	]).$timeZone;
	const timeZoneId =
		timeZone.$timeZoneAnnotation || (timeZone.$z && "UTC") || timeZone.$offsetString;
	if (!timeZoneId) {
		throw new RangeError();
	}
	return parseTimeZoneIdentifier(timeZoneId);
}

/** `ToOffsetString` */
export function toOffsetString(arg: unknown): string {
	const offset = ToPrimitive(arg);
	if (typeof offset !== "string") {
		throw new TypeError();
	}
	parseDateTimeUtcOffset(offset);
	return offset;
}

/** `GetUTCEpochNanoseconds` */
export function getUtcEpochNanoseconds(isoDateTime: IsoDateTimeRecord): EpochNanoseconds {
	return addNanosecondsToEpochSeconds(
		createEpochNanosecondsFromEpochMilliseconds(
			utcEpochMilliseconds(
				isoDateTime.$isoDate.$year,
				isoDateTime.$isoDate.$month,
				isoDateTime.$isoDate.$day,
				isoDateTime.$time.$hour,
				isoDateTime.$time.$minute,
				isoDateTime.$time.$second,
				isoDateTime.$time.$millisecond,
			),
		),
		isoDateTime.$time.$microsecond * 1e3 + isoDateTime.$time.$nanosecond,
	);
}

export function epochDaysToIsoDate(epochDays: number): IsoDateRecord {
	const date = new Date(modFloor(epochDays, daysPer400Years) * millisecondsPerDay);
	return {
		$year: date.getUTCFullYear() + divFloor(epochDays, daysPer400Years) * 400,
		$month: date.getUTCMonth() + 1,
		$day: date.getUTCDate(),
	};
}
