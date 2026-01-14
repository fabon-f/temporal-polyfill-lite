import { isPlainDate, type IsoDateRecord } from "../PlainDate.ts";
import { isPlainDateTime, type IsoDateTimeRecord } from "../PlainDateTime.ts";
import { isPlainMonthDay } from "../PlainMonthDay.ts";
import { isPlainTime } from "../PlainTime.ts";
import { isPlainYearMonth } from "../PlainYearMonth.ts";
import { isZonedDateTime } from "../ZonedDateTime.ts";
import {
	calendarIsoToDate,
	type CalendarFieldsRecord,
	type SupportedCalendars,
} from "./calendars.ts";
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
import { getOption, toIntegerWithTruncation, ToPrimitive } from "./ecmascript.ts";
import {
	date,
	dateTime,
	disambiguationCompatible,
	disambiguationEarlier,
	disambiguationLater,
	disambiguationReject,
	monthDay,
	offsetIgnore,
	offsetPrefer,
	offsetReject,
	offsetUse,
	overflowConstrain,
	overflowReject,
	required,
	roundingModeCeil,
	roundingModeExpand,
	roundingModeFloor,
	roundingModeHalfCeil,
	roundingModeHalfEven,
	roundingModeHalfExpand,
	roundingModeHalfFloor,
	roundingModeHalfTrunc,
	roundingModeTrunc,
	time,
	yearMonth,
	type Disambiguation,
	type Offset,
	type Overflow,
	type RoundingMode,
} from "./enum.ts";
import {
	addNanosecondsToEpochSeconds,
	createEpochNanosecondsFromEpochMilliseconds,
	type EpochNanoseconds,
} from "./epochNanoseconds.ts";
import { divFloor, modFloor } from "./math.ts";
import { isObject } from "./object.ts";
import {
	roundExpand,
	roundHalfCeil,
	roundHalfEven,
	roundHalfExpand,
	roundHalfFloor,
	roundHalfTrunc,
} from "./rounding.ts";
import { utcEpochMilliseconds } from "./time.ts";
import { parseTimeZoneIdentifier, type TimeZoneIdentifierParseRecord } from "./timeZones.ts";
import { pluralUnitKeys, singularUnitKeys, type SingularUnitKey } from "./unit.ts";
import { mapUnlessUndefined } from "./utils.ts";

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

/** `GetDirectionOption` */
export function getDirectionOption(options: object): "next" | "previous" {
	return getOption(options, "direction", ["next", "previous"], required);
}

/** `ValidateTemporalRoundingIncrement` */
export function validateTemporalRoundingIncrement(
	increment: number,
	dividend: number,
	inclusive: boolean,
) {
	const maximum = inclusive ? dividend : dividend - 1;
	if (increment > maximum || dividend % increment !== 0) {
		throw new RangeError();
	}
}

/** `GetTemporalUnitValuedOption` */
export function getTemporalUnitValuedOption(
	options: object,
	key: string,
	defaultValue: typeof required,
): SingularUnitKey | "auto";
export function getTemporalUnitValuedOption(
	options: object,
	key: string,
	defaultValue: undefined,
): SingularUnitKey | "auto" | undefined;
export function getTemporalUnitValuedOption(
	options: object,
	key: string,
	defaultValue: typeof required | undefined,
) {
	const allowedStrings = [...singularUnitKeys, ...pluralUnitKeys, "auto"];
	return mapUnlessUndefined(getOption(options, key, allowedStrings, defaultValue), (s) =>
		s.replace(/s$/, ""),
	);
}

/** `ValidateTemporalUnitValue` */
export function validateTemporalUnitValue(
	value: SingularUnitKey | "auto" | undefined,
	unitGroup: typeof date | typeof time | typeof dateTime,
	extraValues: string[] = [],
) {
	if (value === undefined || extraValues.includes(value)) {
		return;
	}
	if (value === "auto") {
		throw new RangeError();
	}
	const index = singularUnitKeys.indexOf(value);
	const dayIndex = singularUnitKeys.indexOf("day");
	if ((index <= dayIndex && unitGroup === time) || (index > dayIndex && unitGroup === date)) {
		throw new RangeError();
	}
}

/** `MaximumTemporalDurationRoundingIncrement` */
export function maximumTemporalDurationRoundingIncrement(unit: SingularUnitKey) {
	return {
		year: undefined,
		month: undefined,
		week: undefined,
		day: undefined,
		hour: 24,
		minute: 60,
		second: 60,
		millisecond: 1000,
		microsecond: 1000,
		nanosecond: 1000,
	}[unit];
}

/** `IsPartialTemporalObject` */
export function isPartialTemporalObject(value: unknown): boolean {
	return (
		isObject(value) &&
		!(
			isPlainDate(value) ||
			isPlainDateTime(value) ||
			isPlainMonthDay(value) ||
			isPlainTime(value) ||
			isPlainYearMonth(value) ||
			isZonedDateTime(value)
		) &&
		(value as Record<string, unknown>)["calendar"] === undefined &&
		(value as Record<string, unknown>)["timeZone"] === undefined
	);
}

const roundingFunctions: Record<RoundingMode, (num: number) => number> = {
	[roundingModeCeil]: Math.ceil,
	[roundingModeFloor]: Math.floor,
	[roundingModeExpand]: roundExpand,
	[roundingModeTrunc]: Math.trunc,
	[roundingModeHalfCeil]: roundHalfCeil,
	[roundingModeHalfFloor]: roundHalfFloor,
	[roundingModeHalfExpand]: roundHalfExpand,
	[roundingModeHalfTrunc]: roundHalfTrunc,
	[roundingModeHalfEven]: roundHalfEven,
};

const roundingFunctionsAsIfPositive: Record<RoundingMode, (num: number) => number> = {
	[roundingModeCeil]: Math.ceil,
	[roundingModeFloor]: Math.floor,
	[roundingModeExpand]: Math.ceil,
	[roundingModeTrunc]: Math.floor,
	[roundingModeHalfCeil]: roundHalfCeil,
	[roundingModeHalfFloor]: roundHalfFloor,
	[roundingModeHalfExpand]: roundHalfCeil,
	[roundingModeHalfTrunc]: roundHalfFloor,
	[roundingModeHalfEven]: roundHalfEven,
};

/** `RoundNumberToIncrement` */
export function roundNumberToIncrement(x: number, increment: number, roundingMode: RoundingMode) {
	return roundingFunctions[roundingMode](x / increment) * increment;
}

/** `RoundNumberToIncrementAsIfPositive` */
export function roundNumberToIncrementAsIfPositive(
	x: number,
	increment: number,
	roundingMode: RoundingMode,
): number {
	return roundingFunctionsAsIfPositive[roundingMode](x / increment) * increment;
}

/** `GetRoundingModeOption` */
export function getRoundingModeOption(options: object, fallback: RoundingMode): RoundingMode {
	return getOption(
		options,
		"roundingMode",
		[
			roundingModeCeil,
			roundingModeFloor,
			roundingModeExpand,
			roundingModeTrunc,
			roundingModeHalfCeil,
			roundingModeHalfFloor,
			roundingModeHalfExpand,
			roundingModeHalfTrunc,
			roundingModeHalfEven,
		],
		fallback,
	);
}

/** `GetRoundingIncrementOption` */
export function getRoundingIncrementOption(options: object): number {
	const value = (options as Record<string, unknown>)["roundingIncrement"];
	const integerIncrement = value === undefined ? 1 : toIntegerWithTruncation(value);
	if (integerIncrement < 1 || integerIncrement > 1e9) {
		throw new RangeError();
	}
	return integerIncrement;
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

/** `ISODateToFields` */
export function isoDateToFields(
	calendar: SupportedCalendars,
	isoDate: IsoDateRecord,
	type: typeof date | typeof yearMonth | typeof monthDay,
): CalendarFieldsRecord {
	const date = calendarIsoToDate(calendar, isoDate);
	return {
		year: type === monthDay ? undefined : date.$year,
		monthCode: date.$monthCode,
		day: type === yearMonth ? undefined : date.$day,
	};
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
