import { isPlainDate, type IsoDateRecord } from "../PlainDate.ts";
import { isPlainDateTime, type IsoDateTimeRecord } from "../PlainDateTime.ts";
import { isPlainMonthDay } from "../PlainMonthDay.ts";
import { isPlainTime } from "../PlainTime.ts";
import { isPlainYearMonth } from "../PlainYearMonth.ts";
import { isZonedDateTime } from "../ZonedDateTime.ts";
import {
	calendarFieldKeys,
	calendarIsoToDate,
	createEmptyCalendarFieldsRecord,
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
import { getOption, toIntegerWithTruncation, ToPrimitive, toString } from "./ecmascript.ts";
import {
	DATE,
	DATETIME,
	disambiguationCompatible,
	disambiguationEarlier,
	disambiguationLater,
	disambiguationReject,
	MINUTE,
	MONTH_DAY,
	offsetIgnore,
	offsetPrefer,
	offsetReject,
	offsetUse,
	overflowConstrain,
	overflowReject,
	REQUIRED,
	roundingModeCeil,
	roundingModeExpand,
	roundingModeFloor,
	roundingModeHalfCeil,
	roundingModeHalfEven,
	roundingModeHalfExpand,
	roundingModeHalfFloor,
	roundingModeHalfTrunc,
	roundingModeTrunc,
	showCalendarName,
	showOffsetOptions,
	TIME,
	timeZoneNameOptions,
	YEAR_MONTH,
	type Disambiguation,
	type Offset,
	type Overflow,
	type RoundingMode,
	type ShowCalendarName,
	type ShowOffsetOptions,
	type TimeZoneNameOptions,
} from "./enum.ts";
import {
	addNanosecondsToEpochSeconds,
	createEpochNanosecondsFromEpochMilliseconds,
	type EpochNanoseconds,
} from "./epochNanoseconds.ts";
import { divFloor, isWithin, modFloor } from "./math.ts";
import { isObject } from "./object.ts";
import {
	roundExpand,
	roundHalfCeil,
	roundHalfEven,
	roundHalfExpand,
	roundHalfFloor,
	roundHalfTrunc,
} from "./rounding.ts";
import { ToZeroPaddedDecimalString } from "./string.ts";
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

/** `CheckISODaysRange` */
export function checkIsoDaysRange(isoDate: IsoDateRecord) {
	if (Math.abs(isoDateToEpochDays(isoDate.$year, isoDate.$month - 1, isoDate.$day)) > 1e8) {
		throw new RangeError();
	}
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

/** `GetTemporalShowCalendarNameOption` */
export function getTemporalShowCalendarNameOption(options: object): ShowCalendarName {
	return getOption(
		options,
		"calendarName",
		[
			showCalendarName.$auto,
			showCalendarName.$always,
			showCalendarName.$never,
			showCalendarName.$critical,
		],
		showCalendarName.$auto,
	);
}

/** `GetTemporalShowTimeZoneNameOption` */
export function getTemporalShowTimeZoneNameOption(options: object): TimeZoneNameOptions {
	return getOption(
		options,
		"timeZoneName",
		[timeZoneNameOptions.$auto, timeZoneNameOptions.$never, timeZoneNameOptions.$critical],
		timeZoneNameOptions.$auto,
	);
}

/** `GetTemporalShowOffsetOption` */
export function getTemporalShowOffsetOption(options: object): ShowOffsetOptions {
	return getOption(
		options,
		"offset",
		[showOffsetOptions.$auto, showOffsetOptions.$never],
		showOffsetOptions.$auto,
	);
}

/** `GetDirectionOption` */
export function getDirectionOption(options: object): "next" | "previous" {
	return getOption(options, "direction", ["next", "previous"], REQUIRED);
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

/** `GetTemporalFractionalSecondDigitsOption` */
export function getTemporalFractionalSecondDigitsOption(options: object): number | undefined {
	const digitsValue = (options as Record<string, unknown>)["fractionalSecondDigits"];
	if (digitsValue === undefined) {
		return undefined;
	}
	if (typeof digitsValue !== "number") {
		if (toString(digitsValue) !== "auto") {
			throw new RangeError();
		}
		return;
	}
	if (!Number.isFinite(digitsValue) || isNaN(digitsValue)) {
		throw new RangeError();
	}
	const digitCount = Math.floor(digitsValue);
	if (digitCount < 0 || digitCount > 9) {
		throw new RangeError();
	}
	return digitCount;
}

interface PrecisionRecord {
	$precision: number | typeof MINUTE | undefined;
	$unit: SingularUnitKey;
	$increment: number;
}

/** `ToSecondsStringPrecisionRecord` */
export function toSecondsStringPrecisionRecord(
	smallestUnit: SingularUnitKey | undefined,
	fractionalDigitCount: number | undefined,
): PrecisionRecord {
	if (smallestUnit !== undefined) {
		return {
			$precision:
				smallestUnit === "minute"
					? MINUTE
					: smallestUnit === "second"
						? 0
						: smallestUnit === "millisecond"
							? 3
							: smallestUnit === "microsecond"
								? 6
								: 9,
			$unit: smallestUnit,
			$increment: 1,
		};
	}
	if (fractionalDigitCount === undefined) {
		return {
			$precision: undefined,
			$unit: "nanosecond",
			$increment: 1,
		};
	}
	if (fractionalDigitCount === 0) {
		return {
			$precision: 0,
			$unit: "second",
			$increment: 1,
		};
	}
	if (isWithin(fractionalDigitCount, 1, 3)) {
		return {
			$precision: fractionalDigitCount,
			$unit: "millisecond",
			$increment: Math.pow(10, 3 - fractionalDigitCount),
		};
	}
	if (isWithin(fractionalDigitCount, 4, 6)) {
		return {
			$precision: fractionalDigitCount,
			$unit: "microsecond",
			$increment: Math.pow(10, 6 - fractionalDigitCount),
		};
	}
	return {
		$precision: fractionalDigitCount,
		$unit: "nanosecond",
		$increment: Math.pow(10, 9 - fractionalDigitCount),
	};
}

/** `GetTemporalUnitValuedOption` */
export function getTemporalUnitValuedOption(
	options: object,
	key: string,
	defaultValue: typeof REQUIRED,
): SingularUnitKey | "auto";
export function getTemporalUnitValuedOption(
	options: object,
	key: string,
	defaultValue: undefined,
): SingularUnitKey | "auto" | undefined;
export function getTemporalUnitValuedOption(
	options: object,
	key: string,
	defaultValue: typeof REQUIRED | undefined,
) {
	const allowedStrings = [...singularUnitKeys, ...pluralUnitKeys, "auto"];
	return mapUnlessUndefined(getOption(options, key, allowedStrings, defaultValue), (s) =>
		s.replace(/s$/, ""),
	);
}

/** `ValidateTemporalUnitValue` */
export function validateTemporalUnitValue(
	value: SingularUnitKey | "auto" | undefined,
	unitGroup: typeof DATE | typeof TIME | typeof DATETIME,
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
	if ((index <= dayIndex && unitGroup === TIME) || (index > dayIndex && unitGroup === DATE)) {
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

/** `FormatFractionalSeconds` */
function formatFractionalSeconds(subSecondNanoseconds: number, precision?: number): string {
	const fractionalDigits = ToZeroPaddedDecimalString(subSecondNanoseconds, 9);
	if (precision === undefined) {
		if (subSecondNanoseconds === 0) {
			return "";
		}
		return `.${fractionalDigits.replace(/0*$/, "")}`;
	}
	if (precision === 0) {
		return "";
	}
	return `.${fractionalDigits.slice(0, precision)}`;
}

/** `FormatTimeString` */
export function formatTimeString(
	hour: number,
	minute: number,
	second: number,
	subSecondNanoseconds: number,
	precision?: typeof MINUTE | number,
) {
	const hh = ToZeroPaddedDecimalString(hour, 2);
	const mm = ToZeroPaddedDecimalString(minute, 2);
	if (precision === MINUTE) {
		return `${hh}:${mm}`;
	}
	return `${hh}:${mm}:${ToZeroPaddedDecimalString(second, 2)}${formatFractionalSeconds(subSecondNanoseconds, precision)}`;
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
	type: typeof DATE | typeof YEAR_MONTH | typeof MONTH_DAY,
): CalendarFieldsRecord {
	const date = calendarIsoToDate(calendar, isoDate);
	return {
		...createEmptyCalendarFieldsRecord(),
		[calendarFieldKeys.$year]: type === MONTH_DAY ? undefined : date.$year,
		[calendarFieldKeys.$monthCode]: date.$monthCode,
		[calendarFieldKeys.$day]: type === YEAR_MONTH ? undefined : date.$day,
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
