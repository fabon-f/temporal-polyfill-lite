import {
	getRoundingIncrementOption,
	getRoundingModeOption,
	getTemporalDisambiguationOption,
	getTemporalOverflowOption,
	getTemporalUnitValuedOption,
	isoDateRecordToEpochDays,
	isoDateToFields,
	isPartialTemporalObject,
	maximumTemporalDurationRoundingIncrement,
	validateTemporalRoundingIncrement,
	validateTemporalUnitValue,
} from "./internal/abstractOperations.ts";
import {
	calendarDateFromFields,
	calendarEquals,
	calendarFieldKeys,
	calendarIsoToDate,
	calendarMergeFields,
	canonicalizeCalendar,
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
} from "./internal/ecmascript.ts";
import {
	date,
	required,
	startOfDay,
	time,
	type Overflow,
	type RoundingMode,
} from "./internal/enum.ts";
import type { NumberSign } from "./internal/math.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { getEpochNanosecondsFor, toTemporalTimeZoneIdentifier } from "./internal/timeZones.ts";
import type { SingularUnitKey } from "./internal/unit.ts";
import {
	addDaysToIsoDate,
	compareIsoDate,
	createIsoDateRecord,
	createTemporalDate,
	getInternalSlotOrThrowForPlainDate,
	isPlainDate,
	isValidIsoDate,
	type IsoDateRecord,
} from "./PlainDate.ts";
import {
	balanceTime,
	compareTimeRecord,
	createTemporalTime,
	createTimeRecord,
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
function toTemporalDateTime(item: unknown, options?: unknown) {
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
			item as Record<string, unknown>,
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
	if (typeof item !== "string") {
		throw new TypeError();
	}
	const result = parseIsoDateTime(item, [temporalDateTimeStringRegExp]);
	const calendar = canonicalizeCalendar(result.$calendar || "iso8601");
	getTemporalOverflowOption(getOptionsObject(options));
	return createTemporalDateTime(
		combineIsoDateAndTimeRecord(
			createIsoDateRecord(result.$year!, result.$month, result.$day),
			result.$time === startOfDay ? midnightTimeRecord() : result.$time,
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
		{
			...balancedTime,
			$days: 0,
		},
	);
}

/** `CreateTemporalDateTime` */
export function createTemporalDateTime(
	isoDateTime: IsoDateTimeRecord,
	calendar: SupportedCalendars,
	instance = Object.create(PlainDateTime.prototype) as PlainDateTime,
) {
	if (!isoDateTimeWithinLimits(isoDateTime)) {
		throw new RangeError();
	}
	const slot = createPlainDateTimeSlot(isoDateTime, calendar);
	slots.set(instance, slot);
	return instance;
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
	const time = roundTime(isoDateTime.$time, increment, unit, roundingMode);
	return combineIsoDateAndTimeRecord(addDaysToIsoDate(isoDateTime.$isoDate, time.$days), {
		...time,
		$days: 0,
	});
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
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		const canonicalizedCalendar = canonicalizeCalendar(calendar);
		if (!isValidIsoDate(...dateUnits) || !isValidTime(...timeUnits)) {
			throw new RangeError();
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
				...isoDateToFields(slot.$calendar, slot.$isoDateTime.$isoDate, date),
				hour: slot.$isoDateTime.$time.$hour,
				minute: slot.$isoDateTime.$time.$minute,
				second: slot.$isoDateTime.$time.$second,
				millisecond: slot.$isoDateTime.$time.$millisecond,
				microsecond: slot.$isoDateTime.$time.$microsecond,
				nanosecond: slot.$isoDateTime.$time.$nanosecond,
			},
			prepareCalendarFields(slot.$calendar, temporalDateTimeLike as Record<string, unknown>, [
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
	add() {}
	subtract() {}
	until() {}
	since() {}
	round(roundTo: unknown) {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		const roundToOptions = getRoundToOptionsObject(roundTo);
		const roundingIncrement = getRoundingIncrementOption(roundToOptions);
		const roundingMode = getRoundingModeOption(roundToOptions, "halfExpand");
		const smallestUnit = getTemporalUnitValuedOption(roundToOptions, "smallestUnit", required);
		validateTemporalUnitValue(smallestUnit, time, ["day"]);
		const maximum =
			smallestUnit === "day"
				? 1
				: maximumTemporalDurationRoundingIncrement(smallestUnit as SingularUnitKey)!;
		validateTemporalRoundingIncrement(roundingIncrement, maximum, smallestUnit === "day");
		return createTemporalDateTime(
			roundIsoDateTime(
				slot.$isoDateTime,
				roundingIncrement,
				smallestUnit as SingularUnitKey,
				roundingMode,
			),
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
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {
		throw new TypeError();
	}
	toZonedDateTime(temporalTimeZoneLike: unknown, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainDateTime(this);
		const timeZone = toTemporalTimeZoneIdentifier(temporalTimeZoneLike);
		const disambiguation = getTemporalDisambiguationOption(getOptionsObject(options));
		const cache = new Map<number, number>();
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
