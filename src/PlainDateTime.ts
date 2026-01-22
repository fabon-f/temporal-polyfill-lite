import { createDateTimeFormat, formatDateTime } from "./DateTimeFormat.ts";
import {
	add24HourDaysToTimeDuration,
	adjustDateDurationRecord,
	applySignToDurationSlot,
	combineDateAndTimeDuration,
	createTemporalDuration,
	createTemporalDurationSlot,
	Duration,
	roundRelativeDuration,
	temporalDurationFromInternal,
	timeDurationSign,
	toInternalDurationRecordWith24HourDays,
	totalRelativeDuration,
	toTemporalDuration,
	zeroDateDuration,
	type InternalDurationRecord,
} from "./Duration.ts";
import {
	formatTimeString,
	getDifferenceSettings,
	getRoundingIncrementOption,
	getRoundingModeOption,
	getTemporalDisambiguationOption,
	getTemporalFractionalSecondDigitsOption,
	getTemporalOverflowOption,
	getTemporalShowCalendarNameOption,
	getTemporalUnitValuedOption,
	getUtcEpochNanoseconds,
	isoDateRecordToEpochDays,
	isoDateToFields,
	isPartialTemporalObject,
	largerOfTwoTemporalUnits,
	maximumTemporalDurationRoundingIncrement,
	toSecondsStringPrecisionRecord,
	validateTemporalRoundingIncrement,
	validateTemporalUnitValue,
} from "./internal/abstractOperations.ts";
import { assert, assertNotUndefined } from "./internal/assertion.ts";
import {
	calendarDateAdd,
	calendarDateFromFields,
	calendarDateUntil,
	calendarEquals,
	calendarFieldKeys,
	calendarIsoToDate,
	calendarMergeFields,
	canonicalizeCalendar,
	formatCalendarAnnotation,
	getTemporalCalendarIdentifierWithIsoDefault,
	prepareCalendarFields,
	toTemporalCalendarIdentifier,
	type CalendarFieldsRecord,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { parseIsoDateTime, temporalDateTimeStringRegExp } from "./internal/dateTimeParser.ts";
import {
	getOptionsObject,
	getRoundToOptionsObject,
	toIntegerWithTruncation,
	validateString,
} from "./internal/ecmascript.ts";
import {
	DATE,
	DATETIME,
	MINUTE,
	REQUIRED,
	roundingModeTrunc,
	showCalendarName,
	TIME,
	type Overflow,
	type RoundingMode,
	type ShowCalendarName,
} from "./internal/enum.ts";
import {
	calendarMismatch,
	invalidDateTime,
	invalidField,
	outOfBoundsDate,
} from "./internal/errorMessages.ts";
import type { NumberSign } from "./internal/math.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { toZeroPaddedDecimalString } from "./internal/string.ts";
import { createTimeDurationFromSeconds } from "./internal/timeDuration.ts";
import {
	createOffsetCacheMap,
	getEpochNanosecondsFor,
	toTemporalTimeZoneIdentifier,
} from "./internal/timeZones.ts";
import type { SingularUnitKey } from "./internal/unit.ts";
import {
	addDaysToIsoDate,
	compareIsoDate,
	createIsoDateRecord,
	createTemporalDate,
	getInternalSlotOrThrowForPlainDate,
	isPlainDate,
	isValidIsoDate,
	padIsoYear,
	type IsoDateRecord,
} from "./PlainDate.ts";
import {
	addTime,
	balanceTime,
	compareTimeRecord,
	createTemporalTime,
	createTimeRecord,
	differenceTime,
	isValidTime,
	midnightTimeRecord,
	regulateTime,
	roundTime,
	toTimeRecordOrMidnight,
	type TimeRecord,
} from "./PlainTime.ts";
import {
	createTemporalZonedDateTime,
	getInternalSlotOrThrowForZonedDateTime,
	getIsoDateTimeForZonedDateTimeSlot,
	isZonedDateTime,
} from "./ZonedDateTime.ts";

export interface IsoDateTimeRecord {
	$isoDate: IsoDateRecord;
	$time: TimeRecord;
}

const internalSlotBrand = /*#__PURE__*/ Symbol();
interface PlainDateTimeSlot {
	$isoDateTime: IsoDateTimeRecord;
	$calendar: SupportedCalendars;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, PlainDateTimeSlot>();

/** `CombineISODateAndTimeRecord` */
export function combineIsoDateAndTimeRecord(
	isoDate: IsoDateRecord,
	time: TimeRecord,
): IsoDateTimeRecord {
	return {
		$isoDate: isoDate,
		$time: time,
	};
}

/** `ISODateTimeWithinLimits` */
export function isoDateTimeWithinLimits(isoDateTime: IsoDateTimeRecord): boolean {
	const epochDays = isoDateRecordToEpochDays(isoDateTime.$isoDate);
	return (
		Math.abs(epochDays) <= 1e8 ||
		(epochDays === -100000001 && !!compareTimeRecord(isoDateTime.$time, midnightTimeRecord()))
	);
}

/** `InterpretTemporalDateTimeFields` */
export function interpretTemporalDateTimeFields(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateTimeRecord {
	return combineIsoDateAndTimeRecord(
		calendarDateFromFields(calendar, fields, overflow),
		regulateTime(
			fields[calendarFieldKeys.$hour]!,
			fields[calendarFieldKeys.$minute]!,
			fields[calendarFieldKeys.$second]!,
			fields[calendarFieldKeys.$millisecond]!,
			fields[calendarFieldKeys.$microsecond]!,
			fields[calendarFieldKeys.$nanosecond]!,
			overflow,
		),
	);
}

/** `ToTemporalDateTime` */
function toTemporalDateTime(item: unknown, options?: unknown): PlainDateTime {
	if (isObject(item)) {
		if (isPlainDateTime(item)) {
			getTemporalOverflowOption(getOptionsObject(options));
			const slot = getInternalSlotOrThrowForPlainDateTime(item);
			return createTemporalDateTime(slot.$isoDateTime, slot.$calendar);
		}
		if (isZonedDateTime(item)) {
			const slot = getInternalSlotOrThrowForZonedDateTime(item);
			getTemporalOverflowOption(getOptionsObject(options));
			return createTemporalDateTime(getIsoDateTimeForZonedDateTimeSlot(slot), slot.$calendar);
		}
		if (isPlainDate(item)) {
			getTemporalOverflowOption(getOptionsObject(options));
			const slot = getInternalSlotOrThrowForPlainDate(item);
			return createTemporalDateTime(
				combineIsoDateAndTimeRecord(slot.$isoDate, midnightTimeRecord()),
				slot.$calendar,
			);
		}
		const calendar = getTemporalCalendarIdentifierWithIsoDefault(item);
		const fields = prepareCalendarFields(
			calendar,
			item,
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
			],
			[],
		);
		const overflow = getTemporalOverflowOption(getOptionsObject(options));
		return createTemporalDateTime(
			interpretTemporalDateTimeFields(calendar, fields, overflow),
			calendar,
		);
	}
	validateString(item);
	const result = parseIsoDateTime(item, [temporalDateTimeStringRegExp]);
	assertNotUndefined(result.$year);
	const calendar = canonicalizeCalendar(result.$calendar || "iso8601");
	getTemporalOverflowOption(getOptionsObject(options));
	return createTemporalDateTime(
		combineIsoDateAndTimeRecord(
			createIsoDateRecord(result.$year, result.$month, result.$day),
			result.$time ?? midnightTimeRecord(),
		),
		calendar,
	);
}

/** `BalanceISODateTime` */
export function balanceIsoDateTime(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	second: number,
	milliseond: number,
	microsecond: number,
	nanosecond: number,
): IsoDateTimeRecord {
	const balancedTime = balanceTime(hour, minute, second, milliseond, microsecond, nanosecond);
	return combineIsoDateAndTimeRecord(
		addDaysToIsoDate(createIsoDateRecord(year, month, day), balancedTime.$days),
		balancedTime,
	);
}

/** `CreateTemporalDateTime` */
export function createTemporalDateTime(
	isoDateTime: IsoDateTimeRecord,
	calendar: SupportedCalendars,
	instance = Object.create(PlainDateTime.prototype) as PlainDateTime,
): PlainDateTime {
	if (!isoDateTimeWithinLimits(isoDateTime)) {
		throw new RangeError(outOfBoundsDate);
	}
	const slot = createPlainDateTimeSlot(isoDateTime, calendar);
	slots.set(instance, slot);
	return instance;
}

/** `ISODateTimeToString` */
export function isoDateTimeToString(
	isoDateTime: IsoDateTimeRecord,
	calendar: SupportedCalendars,
	precision: number | typeof MINUTE | undefined,
	showCalendar: ShowCalendarName,
): string {
	return `${padIsoYear(isoDateTime.$isoDate.$year)}-${toZeroPaddedDecimalString(isoDateTime.$isoDate.$month, 2)}-${toZeroPaddedDecimalString(isoDateTime.$isoDate.$day, 2)}T${formatTimeString(
		isoDateTime.$time.$hour,
		isoDateTime.$time.$minute,
		isoDateTime.$time.$second,
		isoDateTime.$time.$millisecond * 1e6 +
			isoDateTime.$time.$microsecond * 1e3 +
			isoDateTime.$time.$nanosecond,
		precision,
	)}${formatCalendarAnnotation(calendar, showCalendar)}`;
}

/** `CompareISODateTime` */
function compareIsoDateTime(
	isoDateTime1: IsoDateTimeRecord,
	isoDateTime2: IsoDateTimeRecord,
): NumberSign {
	return (
		compareIsoDate(isoDateTime1.$isoDate, isoDateTime2.$isoDate) ||
		compareTimeRecord(isoDateTime1.$time, isoDateTime2.$time)
	);
}

/** `RoundISODateTime` */
export function roundIsoDateTime(
	isoDateTime: IsoDateTimeRecord,
	increment: number,
	unit: SingularUnitKey,
	roundingMode: RoundingMode,
): IsoDateTimeRecord {
	assert(isoDateTimeWithinLimits(isoDateTime));
	const time = roundTime(isoDateTime.$time, increment, unit, roundingMode);
	return combineIsoDateAndTimeRecord(addDaysToIsoDate(isoDateTime.$isoDate, time.$days), time);
}

/** `DifferenceISODateTime` */
function differenceISODateTime(
	isoDateTime1: IsoDateTimeRecord,
	isoDateTime2: IsoDateTimeRecord,
	calendar: SupportedCalendars,
	largestUnit: SingularUnitKey,
): InternalDurationRecord {
	let timeDuration = differenceTime(isoDateTime1.$time, isoDateTime2.$time);
	const timeSign = timeDurationSign(timeDuration);
	let adjustedDate = isoDateTime2.$isoDate;
	if (timeSign === compareIsoDate(isoDateTime1.$isoDate, isoDateTime2.$isoDate)) {
		adjustedDate = addDaysToIsoDate(adjustedDate, timeSign);
		timeDuration = add24HourDaysToTimeDuration(timeDuration, -timeSign);
	}
	const dateLargestUnit = largerOfTwoTemporalUnits("day", largestUnit);
	assert(
		dateLargestUnit === "year" ||
			dateLargestUnit === "month" ||
			dateLargestUnit === "week" ||
			dateLargestUnit === "day",
	);
	const dateDifference = calendarDateUntil(
		calendar,
		isoDateTime1.$isoDate,
		adjustedDate,
		dateLargestUnit,
	);
	if (largestUnit !== dateLargestUnit) {
		timeDuration = add24HourDaysToTimeDuration(timeDuration, dateDifference.$days);
		dateDifference.$days = 0;
	}
	return combineDateAndTimeDuration(dateDifference, timeDuration);
}

/** `DifferencePlainDateTimeWithRounding` */
export function differencePlainDateTimeWithRounding(
	isoDateTime1: IsoDateTimeRecord,
	isoDateTime2: IsoDateTimeRecord,
	calendar: SupportedCalendars,
	largestUnit: SingularUnitKey,
	roundingIncrement: number,
	smallestUnit: SingularUnitKey,
	roundingMode: RoundingMode,
) {
	if (!compareIsoDateTime(isoDateTime1, isoDateTime2)) {
		return combineDateAndTimeDuration(zeroDateDuration(), createTimeDurationFromSeconds(0));
	}
	if (!isoDateTimeWithinLimits(isoDateTime1) || !isoDateTimeWithinLimits(isoDateTime2)) {
		throw new RangeError(outOfBoundsDate);
	}
	const diff = differenceISODateTime(isoDateTime1, isoDateTime2, calendar, largestUnit);
	if (smallestUnit === "nanosecond" && roundingIncrement === 1) {
		return diff;
	}
	return roundRelativeDuration(
		diff,
		getUtcEpochNanoseconds(isoDateTime1),
		getUtcEpochNanoseconds(isoDateTime2),
		isoDateTime1,
		undefined,
		calendar,
		largestUnit,
		roundingIncrement,
		smallestUnit,
		roundingMode,
	);
}
/** `DifferencePlainDateTimeWithTotal` */
export function differencePlainDateTimeWithTotal(
	isoDateTime1: IsoDateTimeRecord,
	isoDateTime2: IsoDateTimeRecord,
	calendar: SupportedCalendars,
	unit: SingularUnitKey,
): number {
	if (!compareIsoDateTime(isoDateTime1, isoDateTime2)) {
		return 0;
	}
	if (!isoDateTimeWithinLimits(isoDateTime1) || !isoDateTimeWithinLimits(isoDateTime2)) {
		throw new RangeError(outOfBoundsDate);
	}
	return totalRelativeDuration(
		differenceISODateTime(isoDateTime1, isoDateTime2, calendar, unit),
		getUtcEpochNanoseconds(isoDateTime1),
		getUtcEpochNanoseconds(isoDateTime2),
		isoDateTime1,
		undefined,
		calendar,
		unit,
	);
}

/** `DifferenceTemporalPlainDateTime` */
function differenceTemporalPlainDateTime(
	operationSign: 1 | -1,
	dateTime: PlainDateTimeSlot,
	other: unknown,
	options: unknown,
): Duration {
	const otherSlot = getInternalSlotOrThrowForPlainDateTime(toTemporalDateTime(other));
	if (!calendarEquals(dateTime.$calendar, otherSlot.$calendar)) {
		throw new RangeError(calendarMismatch);
	}
	const settings = getDifferenceSettings(
		operationSign,
		getOptionsObject(options),
		DATETIME,
		[],
		"nanosecond",
		"day",
	);
	if (!compareIsoDateTime(dateTime.$isoDateTime, otherSlot.$isoDateTime)) {
		return createTemporalDuration(createTemporalDurationSlot(0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
	}
	return createTemporalDuration(
		applySignToDurationSlot(
			temporalDurationFromInternal(
				differencePlainDateTimeWithRounding(
					dateTime.$isoDateTime,
					otherSlot.$isoDateTime,
					dateTime.$calendar,
					settings.$largestUnit,
					settings.$roundingIncrement,
					settings.$smallestUnit,
					settings.$roundingMode,
				),
				settings.$largestUnit,
			),
			operationSign,
		),
	);
}

/** `AddDurationToDateTime` */
function addDurationToDateTime(
	operationSign: 1 | -1,
	dateTime: PlainDateTimeSlot,
	temporalDurationLike: unknown,
	options: unknown,
): PlainDateTime {
	const duration = applySignToDurationSlot(toTemporalDuration(temporalDurationLike), operationSign);
	const overflow = getTemporalOverflowOption(getOptionsObject(options));
	const internalDuration = toInternalDurationRecordWith24HourDays(duration);
	const timeResult = addTime(dateTime.$isoDateTime.$time, internalDuration.$time);
	const dateDuration = adjustDateDurationRecord(internalDuration.$date, timeResult.$days);
	return createTemporalDateTime(
		combineIsoDateAndTimeRecord(
			calendarDateAdd(dateTime.$calendar, dateTime.$isoDateTime.$isoDate, dateDuration, overflow),
			timeResult,
		),
		dateTime.$calendar,
	);
}

function createPlainDateTimeSlot(
	isoDateTime: IsoDateTimeRecord,
	calendar: SupportedCalendars,
): PlainDateTimeSlot {
	return {
		$isoDateTime: isoDateTime,
		$calendar: calendar,
	} as PlainDateTimeSlot;
}

export function getInternalSlotForPlainDateTime(
	plainDateTime: unknown,
): PlainDateTimeSlot | undefined {
	return slots.get(plainDateTime);
}

export function getInternalSlotOrThrowForPlainDateTime(plainDateTime: unknown): PlainDateTimeSlot {
	const slot = getInternalSlotForPlainDateTime(plainDateTime);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

export function isPlainDateTime(item: unknown): boolean {
	return !!getInternalSlotForPlainDateTime(item);
}

export class PlainDateTime {
	constructor(
		isoYear: unknown,
		isoMonth: unknown,
		isoDay: unknown,
		hour: unknown = 0,
		minute: unknown = 0,
		second: unknown = 0,
		millisecond: unknown = 0,
		microsecond: unknown = 0,
		nanosecond: unknown = 0,
		calendar: unknown = "iso8601",
	) {
		if (!new.target) {
			throw new TypeError();
		}
		const dateUnits = [isoYear, isoMonth, isoDay].map(toIntegerWithTruncation) as [
			number,
			number,
			number,
		];
		const timeUnits = [hour, minute, second, millisecond, microsecond, nanosecond].map(
			toIntegerWithTruncation,
		) as [number, number, number, number, number, number];
		validateString(calendar);
		const canonicalizedCalendar = canonicalizeCalendar(calendar);
		if (!isValidIsoDate(...dateUnits) || !isValidTime(...timeUnits)) {
			throw new RangeError(invalidDateTime);
		}
		createTemporalDateTime(
			combineIsoDateAndTimeRecord(
				createIsoDateRecord(...dateUnits),
				createTimeRecord(...timeUnits),
			),
			canonicalizedCalendar,
			this,
		);
	}
	static from(item: unknown, options: unknown = undefined) {
		return toTemporalDateTime(item, options);
	}
	static compare(one: unknown, two: unknown) {
		return compareIsoDateTime(
			getInternalSlotOrThrowForPlainDateTime(toTemporalDateTime(one)).$isoDateTime,
			getInternalSlotOrThrowForPlainDateTime(toTemporalDateTime(two)).$isoDateTime,
		);
	}
	get calendarId() {
		return getInternalSlotOrThrowForPlainDateTime(this).$calendar;
	}
	get era() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$era;
	}
	get eraYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$eraYear;
	}
	get year() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$year;
	}
	get month() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$month;
	}
	get monthCode() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$monthCode;
	}
	get day() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$day;
	}
	get hour() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$hour;
	}
	get minute() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$minute;
	}
	get second() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$second;
	}
	get millisecond() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$millisecond;
	}
	get microsecond() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$microsecond;
	}
	get nanosecond() {
		return getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time.$nanosecond;
	}
	get dayOfWeek() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$dayOfWeek;
	}
	get dayOfYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$dayOfYear;
	}
	get weekOfYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$weekOfYear.$week;
	}
	get yearOfWeek() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$weekOfYear.$year;
	}
	get daysInWeek() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$daysInWeek;
	}
	get daysInMonth() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$daysInMonth;
	}
	get daysInYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$daysInYear;
	}
	get monthsInYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$monthsInYear;
	}
	get inLeapYear() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDateTime.$isoDate).$inLeapYear;
	}
	with(temporalDateTimeLike: unknown, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		if (!isPartialTemporalObject(temporalDateTimeLike)) {
			throw new TypeError();
		}
		// « year, month, month-code, day », « hour, minute, second, millisecond, microsecond, nanosecond »
		const fields = calendarMergeFields(
			slot.$calendar,
			{
				...isoDateToFields(slot.$calendar, slot.$isoDateTime.$isoDate, DATE),
				hour: slot.$isoDateTime.$time.$hour,
				minute: slot.$isoDateTime.$time.$minute,
				second: slot.$isoDateTime.$time.$second,
				millisecond: slot.$isoDateTime.$time.$millisecond,
				microsecond: slot.$isoDateTime.$time.$microsecond,
				nanosecond: slot.$isoDateTime.$time.$nanosecond,
			},
			prepareCalendarFields(slot.$calendar, temporalDateTimeLike as object, [
				calendarFieldKeys.$year,
				calendarFieldKeys.$month,
				calendarFieldKeys.$monthCode,
				calendarFieldKeys.$day,
				calendarFieldKeys.$hour,
				calendarFieldKeys.$minute,
				calendarFieldKeys.$second,
				calendarFieldKeys.$millisecond,
				calendarFieldKeys.$microsecond,
				calendarFieldKeys.$nanosecond,
			]),
		);
		return createTemporalDateTime(
			interpretTemporalDateTimeFields(
				slot.$calendar,
				fields,
				getTemporalOverflowOption(getOptionsObject(options)),
			),
			slot.$calendar,
		);
	}
	withPlainTime(plainTimeLike: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return createTemporalDateTime(
			combineIsoDateAndTimeRecord(
				slot.$isoDateTime.$isoDate,
				toTimeRecordOrMidnight(plainTimeLike),
			),
			slot.$calendar,
		);
	}
	withCalendar(calendarLike: unknown) {
		return createTemporalDateTime(
			getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime,
			toTemporalCalendarIdentifier(calendarLike),
		);
	}
	add(temporalDurationLike: unknown, options: unknown = undefined) {
		return addDurationToDateTime(
			1,
			getInternalSlotOrThrowForPlainDateTime(this),
			temporalDurationLike,
			options,
		);
	}
	subtract(temporalDurationLike: unknown, options: unknown = undefined) {
		return addDurationToDateTime(
			-1,
			getInternalSlotOrThrowForPlainDateTime(this),
			temporalDurationLike,
			options,
		);
	}
	until(other: unknown, options: unknown = undefined) {
		return differenceTemporalPlainDateTime(
			1,
			getInternalSlotOrThrowForPlainDateTime(this),
			other,
			options,
		);
	}
	since(other: unknown, options: unknown = undefined) {
		return differenceTemporalPlainDateTime(
			-1,
			getInternalSlotOrThrowForPlainDateTime(this),
			other,
			options,
		);
	}
	round(roundTo: unknown) {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		const roundToOptions = getRoundToOptionsObject(roundTo);
		const roundingIncrement = getRoundingIncrementOption(roundToOptions);
		const roundingMode = getRoundingModeOption(roundToOptions, "halfExpand");
		const smallestUnit = getTemporalUnitValuedOption(roundToOptions, "smallestUnit", REQUIRED);
		validateTemporalUnitValue(smallestUnit, TIME, ["day"]);
		const maximum =
			smallestUnit === "day" ? 1 : maximumTemporalDurationRoundingIncrement(smallestUnit);
		assertNotUndefined(maximum);
		validateTemporalRoundingIncrement(roundingIncrement, maximum, smallestUnit === "day");
		return createTemporalDateTime(
			roundIsoDateTime(slot.$isoDateTime, roundingIncrement, smallestUnit, roundingMode),
			slot.$calendar,
		);
	}
	equals(other: unknown) {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		const otherSlot = getInternalSlotOrThrowForPlainDateTime(toTemporalDateTime(other));
		return (
			!compareIsoDateTime(slot.$isoDateTime, otherSlot.$isoDateTime) &&
			calendarEquals(slot.$calendar, otherSlot.$calendar)
		);
	}
	toString(options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		const resolvedOptions = getOptionsObject(options);
		const showCalendar = getTemporalShowCalendarNameOption(resolvedOptions);
		const digits = getTemporalFractionalSecondDigitsOption(resolvedOptions);
		const roundingMode = getRoundingModeOption(resolvedOptions, roundingModeTrunc);
		const smallestUnit = getTemporalUnitValuedOption(resolvedOptions, "smallestUnit", undefined);
		validateTemporalUnitValue(smallestUnit, TIME);
		if (smallestUnit === "hour") {
			throw new RangeError(invalidField("smallestUnit"));
		}
		const record = toSecondsStringPrecisionRecord(smallestUnit, digits);
		const result = roundIsoDateTime(
			slot.$isoDateTime,
			record.$increment,
			record.$unit,
			roundingMode,
		);
		if (!isoDateTimeWithinLimits(result)) {
			throw new RangeError(outOfBoundsDate);
		}
		return isoDateTimeToString(result, slot.$calendar, record.$precision, showCalendar);
	}
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		getInternalSlotOrThrowForPlainDateTime(this);
		return formatDateTime(createDateTimeFormat(locales, options, DATETIME), this);
	}
	toJSON() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return isoDateTimeToString(
			slot.$isoDateTime,
			slot.$calendar,
			undefined,
			showCalendarName.$auto,
		);
	}
	valueOf() {
		throw new TypeError();
	}
	toZonedDateTime(temporalTimeZoneLike: unknown, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		const timeZone = toTemporalTimeZoneIdentifier(temporalTimeZoneLike);
		const disambiguation = getTemporalDisambiguationOption(getOptionsObject(options));
		const cache = createOffsetCacheMap();
		return createTemporalZonedDateTime(
			getEpochNanosecondsFor(timeZone, slot.$isoDateTime, disambiguation, cache),
			timeZone,
			slot.$calendar,
			undefined,
			cache,
		);
	}
	toPlainDate() {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		return createTemporalDate(slot.$isoDateTime.$isoDate, slot.$calendar);
	}
	toPlainTime() {
		return createTemporalTime(getInternalSlotOrThrowForPlainDateTime(this).$isoDateTime.$time);
	}
}

defineStringTag(PlainDateTime.prototype, "Temporal.PlainDateTime");
renameFunction(PlainDateTime, "PlainDateTime");
