import {
	applySignToDurationSlot,
	createTemporalDurationSlot,
	type DurationSlot,
} from "../Duration.ts";
import {
	createIsoDateRecord,
	createTemporalDate,
	getInternalSlotForPlainDate,
	getInternalSlotOrThrowForPlainDate,
	isPlainDate,
	type IsoDateRecord,
	type PlainDateSlot,
} from "../PlainDate.ts";
import {
	getInternalSlotForPlainDateTime,
	interpretTemporalDateTimeFields,
	isPlainDateTime,
	type IsoDateTimeRecord,
} from "../PlainDateTime.ts";
import { isPlainMonthDay } from "../PlainMonthDay.ts";
import { balanceTime, isPlainTime, type TimeRecord } from "../PlainTime.ts";
import { balanceIsoYearMonth, isPlainYearMonth } from "../PlainYearMonth.ts";
import {
	createTemporalZonedDateTime,
	getInternalSlotForZonedDateTime,
	getInternalSlotOrThrowForZonedDateTime,
	interpretISODateTimeOffset,
	isZonedDateTime,
	type ZonedDateTimeSlot,
} from "../ZonedDateTime.ts";
import { assert, assertNotUndefined } from "./assertion.ts";
import {
	calendarFieldKeys,
	calendarIsoToDate,
	canonicalizeCalendar,
	createEmptyCalendarFieldsRecord,
	getTemporalCalendarIdentifierWithIsoDefault,
	prepareCalendarFields,
	type CalendarFieldsRecord,
	type SupportedCalendars,
} from "./calendars.ts";
import { daysPer400Years, millisecondsPerDay } from "./constants.ts";
import {
	hasUtcOffsetSubMinuteParts,
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
import { getOption, toIntegerWithTruncation, toPrimitive, toString } from "./ecmascript.ts";
import {
	DATE,
	DATETIME,
	disambiguationCompatible,
	disambiguationEarlier,
	disambiguationLater,
	disambiguationReject,
	MINUTE,
	MONTH_DAY,
	offsetBehaviourExact,
	offsetBehaviourOption,
	offsetBehaviourWall,
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
	type OffsetBehaviour,
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
import { divFloor, isWithin, modFloor, type NumberSign } from "./math.ts";
import { createNullPrototypeObject, isObject } from "./object.ts";
import {
	roundExpand,
	roundHalfCeil,
	roundHalfEven,
	roundHalfExpand,
	roundHalfFloor,
	roundHalfTrunc,
} from "./rounding.ts";
import { asciiLowerCase, toZeroPaddedDecimalString } from "./string.ts";
import { utcEpochMilliseconds } from "./time.ts";
import {
	createOffsetCacheMap,
	parseTimeZoneIdentifier,
	toTemporalTimeZoneIdentifier,
	type TimeZoneIdentifierParseRecord,
} from "./timeZones.ts";
import {
	getUnitIndex,
	pluralUnitKeys,
	singularUnitKeys,
	type SingularDateUnitKey,
	type SingularTimeUnitKey,
	type SingularUnitKey,
} from "./unit.ts";
import { mapUnlessUndefined } from "./utils.ts";

/** `ISODateToEpochDays` (`month` is 0-indexed) */
export function isoDateToEpochDays(year: number, month: number, day: number): number {
	const balancedYearMonth = balanceIsoYearMonth(year, month + 1);

	// Gregorian calendar has 400 years cycle (146097 days).
	// In order to avoid `Date.UTC` quirks on 1 or 2 digit years
	// and handle extreme dates not supported by `Date`.
	return (
		Date.UTC((balancedYearMonth.$year % 400) - 400, balancedYearMonth.$month - 1, 0) /
			millisecondsPerDay +
		(Math.trunc(balancedYearMonth.$year / 400) + 1) * daysPer400Years +
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
	return getOption(options, "overflow", [overflowConstrain, overflowReject], overflowConstrain);
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

/** ``NegateRoundingMode`` */
function negateRoundingMode(roundingMode: RoundingMode): RoundingMode {
	// 3. If roundingMode is half-ceil, return half-floor.
	// 4. If roundingMode is half-floor, return half-ceil.
	// 5. Return roundingMode.
	if (roundingMode === roundingModeCeil) {
		return roundingModeFloor;
	}
	if (roundingMode === roundingModeFloor) {
		return roundingModeCeil;
	}
	if (roundingMode === roundingModeHalfCeil) {
		return roundingModeHalfFloor;
	}
	if (roundingMode === roundingModeHalfFloor) {
		return roundingModeHalfCeil;
	}
	return roundingMode;
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
	$unit: Exclude<SingularTimeUnitKey, "hour">;
	$increment: number;
}

/** `ToSecondsStringPrecisionRecord` */
export function toSecondsStringPrecisionRecord(
	smallestUnit: Exclude<SingularTimeUnitKey, "hour"> | undefined,
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
			$increment: 10 ** (3 - fractionalDigitCount),
		};
	}
	if (isWithin(fractionalDigitCount, 4, 6)) {
		return {
			$precision: fractionalDigitCount,
			$unit: "microsecond",
			$increment: 10 ** (6 - fractionalDigitCount),
		};
	}
	return {
		$precision: fractionalDigitCount,
		$unit: "nanosecond",
		$increment: 10 ** (9 - fractionalDigitCount),
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
	unitGroup: typeof TIME,
): asserts value is SingularTimeUnitKey | undefined;
export function validateTemporalUnitValue(
	value: SingularUnitKey | "auto" | undefined,
	unitGroup: typeof DATETIME,
): asserts value is SingularUnitKey | undefined;
export function validateTemporalUnitValue<E extends SingularUnitKey | "auto">(
	value: SingularUnitKey | "auto" | undefined,
	unitGroup: typeof TIME,
	extraValues?: E[],
): asserts value is E | SingularTimeUnitKey | undefined;
export function validateTemporalUnitValue(
	value: SingularUnitKey | "auto" | undefined,
	unitGroup: typeof DATE | typeof TIME | typeof DATETIME,
): asserts value is SingularUnitKey | undefined;
export function validateTemporalUnitValue(
	value: SingularUnitKey | "auto" | undefined,
	unitGroup: typeof DATE | typeof TIME | typeof DATETIME,
	extraValues?: (SingularUnitKey | "auto")[],
): asserts value is SingularUnitKey | "auto" | undefined;
export function validateTemporalUnitValue(
	value: SingularUnitKey | "auto" | undefined,
	unitGroup: typeof DATE | typeof TIME | typeof DATETIME,
	extraValues: (SingularUnitKey | "auto")[] = [],
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

type RelativeToOptionRecord =
	| {
			$plain: PlainDateSlot;
			$zoned?: undefined;
	  }
	| {
			$plain?: undefined;
			$zoned: ZonedDateTimeSlot;
	  }
	| {
			$plain?: undefined;
			$zoned?: undefined;
	  };

/** `GetTemporalRelativeToOption` */
export function getTemporalRelativeToOption(options: object): RelativeToOptionRecord {
	const value = (options as Record<string, unknown>)["relativeTo"];
	if (value === undefined) {
		return createNullPrototypeObject({});
	}
	let matchExactly = true;
	let offsetBehaviour: OffsetBehaviour = offsetBehaviourOption;
	let timeZone: string | undefined;
	let offsetString: string | undefined;
	let calendar: SupportedCalendars;
	let isoDate: IsoDateRecord;
	let time: TimeRecord | undefined;
	if (isObject(value)) {
		const zonedDateTimeSlot = getInternalSlotForZonedDateTime(value);
		if (zonedDateTimeSlot) {
			return createNullPrototypeObject({ $zoned: zonedDateTimeSlot });
		}
		const plainDateSlot = getInternalSlotForPlainDate(value);
		if (plainDateSlot) {
			return createNullPrototypeObject({ $plain: plainDateSlot });
		}
		const plainDateTimeSlot = getInternalSlotForPlainDateTime(value);
		if (plainDateTimeSlot) {
			return createNullPrototypeObject({
				$plain: getInternalSlotOrThrowForPlainDate(
					createTemporalDate(plainDateTimeSlot.$isoDateTime.$isoDate, plainDateTimeSlot.$calendar),
				),
			});
		}
		calendar = getTemporalCalendarIdentifierWithIsoDefault(value);
		const fields = prepareCalendarFields(
			calendar,
			value,
			[
				"year",
				"month",
				"monthCode",
				"day",
				"hour",
				"minute",
				"second",
				"millisecond",
				"microsecond",
				"nanosecond",
				"offset",
				"timeZone",
			],
			[],
		);
		const result = interpretTemporalDateTimeFields(calendar, fields, overflowConstrain);
		isoDate = result.$isoDate;
		time = result.$time;
		timeZone = fields.timeZone;
		offsetString = fields.offset;
		offsetBehaviour = offsetString ? offsetBehaviourOption : offsetBehaviourWall;
	} else {
		if (typeof value !== "string") {
			throw new TypeError();
		}
		const result = parseIsoDateTime(value, [
			temporalZonedDateTimeStringRegExp,
			temporalDateTimeStringRegExp,
		]);
		assert(result.$year !== undefined);
		offsetString = result.$timeZone.$offsetString;
		if (result.$timeZone.$timeZoneAnnotation) {
			timeZone = toTemporalTimeZoneIdentifier(result.$timeZone.$timeZoneAnnotation);
			offsetBehaviour = result.$timeZone.$z
				? offsetBehaviourExact
				: offsetString
					? offsetBehaviourOption
					: offsetBehaviourWall;
			matchExactly = offsetString !== undefined && hasUtcOffsetSubMinuteParts(offsetString);
		} else {
			timeZone = undefined;
		}
		calendar = canonicalizeCalendar(result.$calendar || "iso8601");
		isoDate = createIsoDateRecord(result.$year, result.$month, result.$day);
		time = result.$time;
	}
	if (!timeZone) {
		return createNullPrototypeObject({
			$plain: getInternalSlotOrThrowForPlainDate(createTemporalDate(isoDate, calendar)),
		});
	}
	const cache = createOffsetCacheMap();
	const offsetNs =
		offsetBehaviour === offsetBehaviourOption
			? parseDateTimeUtcOffset((assertNotUndefined(offsetString), offsetString))
			: 0;
	return createNullPrototypeObject({
		$zoned: getInternalSlotOrThrowForZonedDateTime(
			createTemporalZonedDateTime(
				interpretISODateTimeOffset(
					isoDate,
					time,
					offsetBehaviour,
					offsetNs,
					timeZone,
					disambiguationCompatible,
					offsetReject,
					matchExactly,
					cache,
				),
				timeZone,
				calendar,
				undefined,
				cache,
			),
		),
	});
}

/** `LargerOfTwoTemporalUnits` */
export function largerOfTwoTemporalUnits(
	u1: SingularUnitKey,
	u2: SingularUnitKey,
): SingularUnitKey {
	return getUnitIndex(u1) < getUnitIndex(u2) ? u1 : u2;
}

/** `IsCalendarUnit` */
export function isCalendarUnit(unit: SingularUnitKey): unit is "year" | "month" | "week" {
	return unit === "year" || unit === "month" || unit === "week";
}

/** alternative to `TemporalUnitCategory` */
export function isDateUnit(unit: SingularUnitKey): unit is SingularDateUnitKey {
	return isCalendarUnit(unit) || unit === "day";
}

/** `MaximumTemporalDurationRoundingIncrement` */
export function maximumTemporalDurationRoundingIncrement(
	unit: SingularUnitKey,
): number | undefined {
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
export function formatFractionalSeconds(subSecondNanoseconds: number, precision?: number): string {
	const fractionalDigits = toZeroPaddedDecimalString(subSecondNanoseconds, 9);
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
): string {
	const hh = toZeroPaddedDecimalString(hour, 2);
	const mm = toZeroPaddedDecimalString(minute, 2);
	if (precision === MINUTE) {
		return `${hh}:${mm}`;
	}
	return `${hh}:${mm}:${toZeroPaddedDecimalString(second, 2)}${formatFractionalSeconds(subSecondNanoseconds, precision)}`;
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
export function roundNumberToIncrement(
	x: number,
	increment: number,
	roundingMode: RoundingMode,
): number {
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

/** `ParseTemporalDurationString` */
export function parseTemporalDurationString(isoString: string): DurationSlot {
	/**
	 * * a fractional time unit should be in the end (and appears at most once)
	 * * date time separator "T" should be followed by time units
	 * * at least one of units should be present
	 */
	const invalidDurationRegExp = /[pt]$|[.,](\d{1,9})[hms]./;
	const durationRegExp =
		/^([+-]?)p(?:(\d+)y)?(?:(\d+)m)?(?:(\d+)w)?(?:(\d+)d)?(?:t(?:(\d+)(?:[.,](\d{1,9}))?h)?(?:(\d+)(?:[.,](\d{1,9}))?m)?(?:(\d+)(?:[.,](\d{1,9}))?s)?)?$/;

	isoString = asciiLowerCase(isoString);
	const result = isoString.match(durationRegExp);
	if (!result || invalidDurationRegExp.test(isoString)) {
		throw new RangeError();
	}
	assertNotUndefined(result[1]);
	const fracPart = balanceTime(
		0,
		0,
		0,
		0,
		0,
		toIntegerWithTruncation((result[7] || "").padEnd(9, "0")) * 3600 +
			toIntegerWithTruncation((result[9] || "").padEnd(9, "0")) * 60 +
			toIntegerWithTruncation((result[11] || "").padEnd(9, "0")),
	);
	return applySignToDurationSlot(
		createTemporalDurationSlot(
			toIntegerWithTruncation(result[2] || ""),
			toIntegerWithTruncation(result[3] || ""),
			toIntegerWithTruncation(result[4] || ""),
			toIntegerWithTruncation(result[5] || ""),
			toIntegerWithTruncation(result[6] || ""),
			toIntegerWithTruncation(result[8] || "") + fracPart.$minute,
			toIntegerWithTruncation(result[10] || "") + fracPart.$second,
			fracPart.$millisecond,
			fracPart.$microsecond,
			fracPart.$nanosecond,
		),
		toIntegerWithTruncation(`${result[1]}1`) as NumberSign,
	);
}

/** `ToOffsetString` */
export function toOffsetString(arg: unknown): string {
	const offset = toPrimitive(arg);
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

// 18. Return the Record { [[SmallestUnit]]: smallestUnit, [[LargestUnit]]: largestUnit, [[RoundingMode]]: roundingMode, [[RoundingIncrement]]: roundingIncrement,  }.
interface DifferenceSettings<Unit> {
	$smallestUnit: Unit;
	$largestUnit: Unit;
	$roundingMode: RoundingMode;
	$roundingIncrement: number;
}

type UnitType<UnitGroup> = UnitGroup extends typeof DATE
	? SingularDateUnitKey
	: UnitGroup extends typeof TIME
		? SingularTimeUnitKey
		: SingularUnitKey;

/** `GetDifferenceSettings` */
export function getDifferenceSettings<
	UnitGroup extends typeof DATE | typeof TIME | typeof DATETIME,
>(
	operationSign: 1 | -1,
	options: object,
	unitGroup: UnitGroup,
	disallowedUnits: SingularUnitKey[],
	fallbackSmallestUnit: SingularUnitKey,
	smallestLargestDefaultUnit: SingularUnitKey,
): DifferenceSettings<UnitType<UnitGroup>> {
	let largestUnit = getTemporalUnitValuedOption(options, "largestUnit", undefined) || "auto";
	const roundingIncrement = getRoundingIncrementOption(options);
	const roundingMode = getRoundingModeOption(options, roundingModeTrunc);
	const smallestUnit =
		getTemporalUnitValuedOption(options, "smallestUnit", undefined) || fallbackSmallestUnit;
	validateTemporalUnitValue(largestUnit, unitGroup, ["auto"]);
	if (disallowedUnits.includes(largestUnit as any)) {
		throw new RangeError();
	}
	validateTemporalUnitValue(smallestUnit, unitGroup);
	if (disallowedUnits.includes(smallestUnit as any)) {
		throw new RangeError();
	}
	const defaultLargestUnit = largerOfTwoTemporalUnits(smallestLargestDefaultUnit, smallestUnit);
	if (largestUnit === "auto") {
		largestUnit = defaultLargestUnit;
	}
	if (largerOfTwoTemporalUnits(largestUnit, smallestUnit) !== largestUnit) {
		throw new RangeError();
	}
	const maximum = maximumTemporalDurationRoundingIncrement(smallestUnit);
	if (maximum) {
		validateTemporalRoundingIncrement(roundingIncrement, maximum, false);
	}
	return {
		$smallestUnit: smallestUnit as UnitType<UnitGroup>,
		$largestUnit: largestUnit as UnitType<UnitGroup>,
		$roundingMode: operationSign === -1 ? negateRoundingMode(roundingMode) : roundingMode,
		$roundingIncrement: roundingIncrement,
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
