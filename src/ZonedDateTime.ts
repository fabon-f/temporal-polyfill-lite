import { createTemporalInstant, isValidEpochNanoseconds, roundTemporalInstant } from "./Instant.ts";
import {
	checkIsoDaysRange,
	getDirectionOption,
	getRoundingIncrementOption,
	getRoundingModeOption,
	getTemporalDisambiguationOption,
	getTemporalFractionalSecondDigitsOption,
	getTemporalOffsetOption,
	getTemporalOverflowOption,
	getTemporalShowCalendarNameOption,
	getTemporalShowOffsetOption,
	getTemporalShowTimeZoneNameOption,
	getTemporalUnitValuedOption,
	getUtcEpochNanoseconds,
	isoDateToFields,
	isPartialTemporalObject,
	maximumTemporalDurationRoundingIncrement,
	roundNumberToIncrement,
	toSecondsStringPrecisionRecord,
	validateTemporalRoundingIncrement,
	validateTemporalUnitValue,
} from "./internal/abstractOperations.ts";
import {
	calendarEquals,
	calendarFieldKeys,
	calendarIsoToDate,
	calendarMergeFields,
	canonicalizeCalendar,
	formatCalendarAnnotation,
	getTemporalCalendarIdentifierWithIsoDefault,
	prepareCalendarFields,
	toTemporalCalendarIdentifier,
	type CalendarDateRecord,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { nanosecondsPerHour, nanosecondsPerMinute } from "./internal/constants.ts";
import {
	hasUtcOffsetSubMinuteParts,
	parseDateTimeUtcOffset,
	parseIsoDateTime,
	temporalZonedDateTimeStringRegExp,
} from "./internal/dateTimeParser.ts";
import { getOptionsObject, getRoundToOptionsObject, toBigInt } from "./internal/ecmascript.ts";
import {
	DATE,
	disambiguationCompatible,
	MINUTE,
	offsetBehaviourExact,
	offsetBehaviourOption,
	offsetBehaviourWall,
	offsetIgnore,
	offsetPrefer,
	offsetReject,
	offsetUse,
	overflowReject,
	REQUIRED,
	roundingModeHalfExpand,
	roundingModeTrunc,
	showCalendarName,
	showOffsetOptions,
	START_OF_DAY,
	TIME,
	timeZoneNameOptions,
	type Disambiguation,
	type Offset,
	type OffsetBehaviour,
	type RoundingMode,
	type ShowCalendarName,
	type ShowOffsetOptions,
	type TimeZoneNameOptions,
} from "./internal/enum.ts";
import {
	addNanosecondsToEpochSeconds,
	compareEpochNanoseconds,
	convertEpochNanosecondsToBigInt,
	createEpochNanosecondsFromBigInt,
	differenceInNanosecondsNumber,
	epochMilliseconds,
	epochSeconds,
	type EpochNanoseconds,
} from "./internal/epochNanoseconds.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import {
	disambiguatePossibleEpochNanoseconds,
	formatDateTimeUtcOffsetRounded,
	formatOffsetTimeZoneIdentifier,
	formatUtcOffsetNanoseconds,
	getAvailableNamedTimeZoneIdentifier,
	getEpochNanosecondsFor,
	getIsoDateTimeFromOffsetNanoseconds,
	getIsoPartsFromEpoch,
	getOffsetNanosecondsFor,
	getPossibleEpochNanoseconds,
	getStartOfDay,
	getTimeZoneTransition,
	parseTimeZoneIdentifier,
	timeZoneEquals,
	toTemporalTimeZoneIdentifier,
} from "./internal/timeZones.ts";
import type { SingularUnitKey } from "./internal/unit.ts";
import { notImplementedYet } from "./internal/utils.ts";
import {
	addDaysToIsoDate,
	createIsoDateRecord,
	createTemporalDate,
	type IsoDateRecord,
} from "./PlainDate.ts";
import {
	balanceIsoDateTime,
	combineIsoDateAndTimeRecord,
	createTemporalDateTime,
	interpretTemporalDateTimeFields,
	isoDateTimeToString,
	roundIsoDateTime,
	type IsoDateTimeRecord,
} from "./PlainDateTime.ts";
import {
	createTemporalTime,
	getInternalSlotOrThrowForPlainTime,
	toTemporalTime,
	type TimeRecord,
} from "./PlainTime.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

interface ZonedDateTimeSlot {
	$epochNanoseconds: EpochNanoseconds;
	$timeZone: string;
	$calendar: SupportedCalendars;
	/** cached offset nanoseconds */
	$offsetNanoseconds?: number | undefined;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, ZonedDateTimeSlot>();

/** `InterpretISODateTimeOffset` */
function interpretISODateTimeOffset(
	isoDate: IsoDateRecord,
	time: typeof START_OF_DAY | TimeRecord,
	offsetBehaviour: OffsetBehaviour,
	offsetNanoseconds: number,
	timeZone: string,
	disambiguation: Disambiguation,
	offsetOption: Offset,
	matchExactly: boolean,
	offsetCacheMap: Map<number, number>,
): EpochNanoseconds {
	if (time === START_OF_DAY) {
		return getStartOfDay(timeZone, isoDate, offsetCacheMap);
	}
	const isoDateTime = combineIsoDateAndTimeRecord(isoDate, time);
	if (
		offsetBehaviour === offsetBehaviourWall ||
		(offsetBehaviour === offsetBehaviourOption && offsetOption == offsetIgnore)
	) {
		return getEpochNanosecondsFor(timeZone, isoDateTime, disambiguation, offsetCacheMap);
	}
	if (
		offsetBehaviour === offsetBehaviourExact ||
		(offsetBehaviour === offsetBehaviourOption && offsetOption == offsetUse)
	) {
		const balanced = balanceIsoDateTime(
			isoDateTime.$isoDate.$year,
			isoDateTime.$isoDate.$month,
			isoDateTime.$isoDate.$day,
			isoDateTime.$time.$hour,
			isoDateTime.$time.$minute,
			isoDateTime.$time.$second,
			isoDateTime.$time.$millisecond,
			isoDateTime.$time.$microsecond,
			isoDateTime.$time.$nanosecond - offsetNanoseconds,
		);
		checkIsoDaysRange(balanced.$isoDate);
		const epoch = getUtcEpochNanoseconds(balanced);
		if (!isValidEpochNanoseconds(epoch)) {
			throw new RangeError();
		}
		return epoch;
	}
	checkIsoDaysRange(isoDate);
	const possibleEpochNs = getPossibleEpochNanoseconds(timeZone, isoDateTime, offsetCacheMap);
	for (const candidate of possibleEpochNs) {
		const candidateOffset = getOffsetNanosecondsFor(timeZone, candidate, offsetCacheMap);
		if (candidateOffset === offsetNanoseconds) {
			return candidate;
		}
		if (
			!matchExactly &&
			roundNumberToIncrement(candidateOffset, nanosecondsPerMinute, roundingModeHalfExpand) ===
				offsetNanoseconds
		) {
			return candidate;
		}
	}
	if (offsetOption === offsetReject) {
		throw new RangeError();
	}
	return disambiguatePossibleEpochNanoseconds(
		possibleEpochNs,
		timeZone,
		isoDateTime,
		disambiguation,
		offsetCacheMap,
	);
}

/** `ToTemporalZonedDateTime` */
function toTemporalZonedDateTime(item: unknown, options?: unknown) {
	let timeZone: string;
	let offsetString: string | undefined;
	let hasUtcDesignator = false;
	let disambiguation: Disambiguation;
	let offsetOption: Offset;
	let calendar: SupportedCalendars;
	let matchExactly = true;
	let isoDate: IsoDateRecord;
	let time: typeof START_OF_DAY | TimeRecord;
	if (isObject(item)) {
		if (isZonedDateTime(item)) {
			const resolvedOptions = getOptionsObject(options);
			getTemporalDisambiguationOption(resolvedOptions);
			getTemporalOffsetOption(resolvedOptions, overflowReject);
			getTemporalOverflowOption(resolvedOptions);
			return createTemporalZonedDateTimeFromSlot(getInternalSlotOrThrowForZonedDateTime(item));
		}
		calendar = getTemporalCalendarIdentifierWithIsoDefault(item);
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
				"offset",
				"timeZone",
			],
			["timeZone"],
		);
		timeZone = fields.timeZone!;
		offsetString = fields.offset;
		const resolvedOptions = getOptionsObject(options);
		disambiguation = getTemporalDisambiguationOption(resolvedOptions);
		offsetOption = getTemporalOffsetOption(resolvedOptions, overflowReject);
		const overflow = getTemporalOverflowOption(resolvedOptions);
		const result = interpretTemporalDateTimeFields(calendar, fields, overflow);
		isoDate = result.$isoDate;
		time = result.$time;
	} else {
		if (typeof item !== "string") {
			throw new TypeError();
		}
		const result = parseIsoDateTime(item, [temporalZonedDateTimeStringRegExp]);
		timeZone = toTemporalTimeZoneIdentifier(result.$timeZone.$timeZoneAnnotation);
		offsetString = result.$timeZone.$offsetString;
		hasUtcDesignator = result.$timeZone.$z;
		calendar = canonicalizeCalendar(result.$calendar || "iso8601");
		matchExactly = false;
		if (offsetString !== undefined) {
			matchExactly = hasUtcOffsetSubMinuteParts(offsetString);
		}
		const resolvedOptions = getOptionsObject(options);
		disambiguation = getTemporalDisambiguationOption(resolvedOptions);
		offsetOption = getTemporalOffsetOption(resolvedOptions, overflowReject);
		getTemporalOverflowOption(resolvedOptions);
		isoDate = createIsoDateRecord(result.$year!, result.$month, result.$day);
		time = result.$time;
	}
	const offsetBehaviour = hasUtcDesignator
		? offsetBehaviourExact
		: offsetString === undefined
			? offsetBehaviourWall
			: offsetBehaviourOption;
	const offsetNanoseconds =
		offsetBehaviour === offsetBehaviourOption ? parseDateTimeUtcOffset(offsetString!) : 0;
	const cache = new Map<number, number>();
	const epoch = interpretISODateTimeOffset(
		isoDate,
		time,
		offsetBehaviour,
		offsetNanoseconds,
		timeZone,
		disambiguation,
		offsetOption,
		matchExactly,
		cache,
	);
	return createTemporalZonedDateTime(epoch, timeZone, calendar, undefined, cache);
}

/** ` CreateTemporalZonedDateTime` */
export function createTemporalZonedDateTime(
	epochNanoseconds: EpochNanoseconds,
	timeZone: string,
	calendar: SupportedCalendars,
	instance = Object.create(ZonedDateTime.prototype) as ZonedDateTime,
	offsetCacheMap?: Map<number, number>,
): ZonedDateTime {
	return createTemporalZonedDateTimeFromSlot(
		createZonedDateTimeSlot(
			epochNanoseconds,
			timeZone,
			calendar,
			offsetCacheMap && offsetCacheMap.get(epochSeconds(epochNanoseconds)),
		),
		instance,
	);
}

export function createZonedDateTimeSlot(
	epochNanoseconds: EpochNanoseconds,
	timeZone: string,
	calendar: SupportedCalendars,
	offsetNanoseconds?: number,
): ZonedDateTimeSlot {
	return {
		$epochNanoseconds: epochNanoseconds,
		$timeZone: timeZone,
		$calendar: calendar,
		$offsetNanoseconds: offsetNanoseconds,
	} as ZonedDateTimeSlot;
}

/** `TemporalZonedDateTimeToString` */
function temporalZonedDateTimeToString(
	slot: ZonedDateTimeSlot,
	precision: number | typeof MINUTE | undefined,
	showCalendar: ShowCalendarName,
	showTimeZone: TimeZoneNameOptions,
	showOffset: ShowOffsetOptions,
	increment = 1,
	unit: SingularUnitKey = "nanosecond",
	roundingMode: RoundingMode = roundingModeTrunc,
) {
	const epoch = roundTemporalInstant(slot.$epochNanoseconds, increment, unit, roundingMode);
	const offsetNanoseconds = getOffsetNanosecondsFor(slot.$timeZone, epoch);
	return (
		isoDateTimeToString(
			getIsoDateTimeFromOffsetNanoseconds(epoch, offsetNanoseconds),
			"iso8601",
			precision,
			showCalendarName.$never,
		) +
		(showOffset === showOffsetOptions.$never
			? ""
			: formatDateTimeUtcOffsetRounded(offsetNanoseconds)) +
		(showTimeZone === timeZoneNameOptions.$never
			? ""
			: `[${showTimeZone === timeZoneNameOptions.$critical ? "!" : ""}${slot.$timeZone}]`) +
		formatCalendarAnnotation(slot.$calendar, showCalendar)
	);
}

/** `GetOffsetNanosecondsFor` with caching */
export function getOffsetNanosecondsForZonedDateTimeSlot(
	slot: ZonedDateTimeSlot,
	cacheMap?: Map<number, number>,
): number {
	if (slot.$offsetNanoseconds !== undefined) {
		return slot.$offsetNanoseconds;
	}
	return (slot.$offsetNanoseconds = getOffsetNanosecondsFor(
		slot.$timeZone,
		slot.$epochNanoseconds,
		cacheMap,
	));
}

/** `GetISODateTimeFor` with caching */
export function getIsoDateTimeForZonedDateTimeSlot(slot: ZonedDateTimeSlot): IsoDateTimeRecord {
	return getIsoDateTimeFromOffsetNanoseconds(
		slot.$epochNanoseconds,
		getOffsetNanosecondsForZonedDateTimeSlot(slot),
	);
}

function createTemporalZonedDateTimeFromSlot(
	slot: ZonedDateTimeSlot,
	instance = Object.create(ZonedDateTime.prototype) as ZonedDateTime,
): ZonedDateTime {
	slots.set(instance, slot);
	return instance;
}

function calendarIsoToDateForZonedDateTimeSlot(slot: ZonedDateTimeSlot): CalendarDateRecord {
	return calendarIsoToDate(slot.$calendar, getIsoDateTimeForZonedDateTimeSlot(slot).$isoDate);
}

export function getInternalSlotForZonedDateTime(
	zonedDateTime: unknown,
): ZonedDateTimeSlot | undefined {
	return slots.get(zonedDateTime);
}

export function getInternalSlotOrThrowForZonedDateTime(zonedDateTime: unknown): ZonedDateTimeSlot {
	const slot = getInternalSlotForZonedDateTime(zonedDateTime);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

export function isZonedDateTime(item: unknown): boolean {
	return !!getInternalSlotForZonedDateTime(item);
}

export class ZonedDateTime {
	constructor(epochNanoseconds: unknown, timeZone: unknown, calendar: unknown = "iso8601") {
		if (!new.target) {
			throw new TypeError();
		}
		const epoch = createEpochNanosecondsFromBigInt(toBigInt(epochNanoseconds));
		if (!isValidEpochNanoseconds(epoch)) {
			throw new RangeError();
		}
		if (typeof timeZone !== "string") {
			throw new TypeError();
		}
		const result = parseTimeZoneIdentifier(timeZone);
		const timeZoneString =
			result.$name !== undefined
				? getAvailableNamedTimeZoneIdentifier(result.$name)
				: formatOffsetTimeZoneIdentifier(result.$offsetMinutes);
		if (typeof calendar !== "string") {
			throw new TypeError();
		}
		createTemporalZonedDateTime(epoch, timeZoneString, canonicalizeCalendar(calendar), this);
	}
	static from(item: unknown, options: unknown = undefined) {
		return toTemporalZonedDateTime(item, options);
	}
	static compare(one: unknown, two: unknown) {
		return compareEpochNanoseconds(
			getInternalSlotOrThrowForZonedDateTime(toTemporalZonedDateTime(one)).$epochNanoseconds,
			getInternalSlotOrThrowForZonedDateTime(toTemporalZonedDateTime(two)).$epochNanoseconds,
		);
	}
	get calendarId() {
		return getInternalSlotOrThrowForZonedDateTime(this).$calendar;
	}
	get timeZoneId() {
		return getInternalSlotOrThrowForZonedDateTime(this).$timeZone;
	}
	get era() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$era;
	}
	get eraYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$eraYear;
	}
	get year() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$year;
	}
	get month() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$month;
	}
	get monthCode() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$monthCode;
	}
	get day() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$day;
	}
	get hour() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$hour;
	}
	get minute() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$minute;
	}
	get second() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$second;
	}
	get millisecond() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$millisecond;
	}
	get microsecond() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$microsecond;
	}
	get nanosecond() {
		return getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time
			.$nanosecond;
	}
	get epochMilliseconds() {
		return epochMilliseconds(getInternalSlotOrThrowForZonedDateTime(this).$epochNanoseconds);
	}
	get epochNanoseconds() {
		return convertEpochNanosecondsToBigInt(
			getInternalSlotOrThrowForZonedDateTime(this).$epochNanoseconds,
		);
	}
	get dayOfWeek() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$dayOfWeek;
	}
	get dayOfYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$dayOfYear;
	}
	get weekOfYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$weekOfYear.$week;
	}
	get yearOfWeek() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$weekOfYear.$year;
	}
	get hoursInDay() {
		const cache = new Map<number, number>();
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const today = getIsoDateTimeForZonedDateTimeSlot(slot).$isoDate;
		return (
			differenceInNanosecondsNumber(
				getStartOfDay(slot.$timeZone, addDaysToIsoDate(today, 1), cache),
				getStartOfDay(slot.$timeZone, today, cache),
			) / nanosecondsPerHour
		);
	}
	get daysInWeek() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$daysInWeek;
	}
	get daysInMonth() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$daysInMonth;
	}
	get daysInYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$daysInYear;
	}
	get monthsInYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$monthsInYear;
	}
	get inLeapYear() {
		return calendarIsoToDateForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this))
			.$inLeapYear;
	}
	get offsetNanoseconds() {
		return getOffsetNanosecondsForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this));
	}
	get offset() {
		return formatUtcOffsetNanoseconds(
			getOffsetNanosecondsForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)),
		);
	}
	with(temporalZonedDateTimeLike: unknown, options: unknown = undefined) {
		const cache = new Map<number, number>();

		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		if (!isPartialTemporalObject(temporalZonedDateTimeLike)) {
			throw new TypeError();
		}
		const offsetNanoseconds = getOffsetNanosecondsForZonedDateTimeSlot(slot);
		const isoDateTime = getIsoDateTimeForZonedDateTimeSlot(slot);
		const fields = calendarMergeFields(
			slot.$calendar,
			{
				...isoDateToFields(slot.$calendar, isoDateTime.$isoDate, DATE),
				[calendarFieldKeys.$hour]: isoDateTime.$time.$hour,
				[calendarFieldKeys.$minute]: isoDateTime.$time.$minute,
				[calendarFieldKeys.$second]: isoDateTime.$time.$second,
				[calendarFieldKeys.$millisecond]: isoDateTime.$time.$millisecond,
				[calendarFieldKeys.$microsecond]: isoDateTime.$time.$microsecond,
				[calendarFieldKeys.$nanosecond]: isoDateTime.$time.$nanosecond,
				[calendarFieldKeys.$offset]: formatUtcOffsetNanoseconds(offsetNanoseconds),
			},
			prepareCalendarFields(slot.$calendar, temporalZonedDateTimeLike as Record<string, unknown>, [
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
				calendarFieldKeys.$offset,
			]),
		);
		const resolvedOptions = getOptionsObject(options);
		const disambiguation = getTemporalDisambiguationOption(resolvedOptions);
		const offset = getTemporalOffsetOption(resolvedOptions, offsetPrefer);
		const overflow = getTemporalOverflowOption(resolvedOptions);
		const dateTimeResult = interpretTemporalDateTimeFields(slot.$calendar, fields, overflow);
		return createTemporalZonedDateTime(
			interpretISODateTimeOffset(
				dateTimeResult.$isoDate,
				dateTimeResult.$time,
				offsetBehaviourOption,
				parseDateTimeUtcOffset(fields[calendarFieldKeys.$offset]!),
				slot.$timeZone,
				disambiguation,
				offset,
				true,
				cache,
			),
			slot.$timeZone,
			slot.$calendar,
			undefined,
			cache,
		);
	}
	withPlainTime(plainTimeLike: unknown = undefined) {
		const cache = new Map<number, number>();
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const isoDateTime = getIsoDateTimeForZonedDateTimeSlot(slot);
		if (plainTimeLike === undefined) {
			return createTemporalZonedDateTime(
				getStartOfDay(slot.$timeZone, isoDateTime.$isoDate, cache),
				slot.$timeZone,
				slot.$calendar,
				undefined,
				cache,
			);
		}
		return createTemporalZonedDateTime(
			getEpochNanosecondsFor(
				slot.$timeZone,
				combineIsoDateAndTimeRecord(
					isoDateTime.$isoDate,
					getInternalSlotOrThrowForPlainTime(toTemporalTime(plainTimeLike)),
				),
				disambiguationCompatible,
				cache,
			),
			slot.$timeZone,
			slot.$calendar,
			undefined,
			cache,
		);
	}
	withTimeZone(timeZoneLike: unknown) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		return createTemporalZonedDateTime(
			slot.$epochNanoseconds,
			toTemporalTimeZoneIdentifier(timeZoneLike),
			slot.$calendar,
		);
	}
	withCalendar(calendarLike: unknown) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		return createTemporalZonedDateTime(
			slot.$epochNanoseconds,
			slot.$timeZone,
			toTemporalCalendarIdentifier(calendarLike),
		);
	}
	add() {
		notImplementedYet();
	}
	subtract() {
		notImplementedYet();
	}
	until() {
		notImplementedYet();
	}
	since() {
		notImplementedYet();
	}
	round(roundTo: unknown) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const roundToOptions = getRoundToOptionsObject(roundTo);
		const roundingIncrement = getRoundingIncrementOption(roundToOptions);
		const roundingMode = getRoundingModeOption(roundToOptions, "halfExpand");
		const smallestUnit = getTemporalUnitValuedOption(roundToOptions, "smallestUnit", REQUIRED);
		validateTemporalUnitValue(smallestUnit, TIME, ["day"]);
		const maximum =
			smallestUnit === "day"
				? 1
				: maximumTemporalDurationRoundingIncrement(smallestUnit as SingularUnitKey)!;
		validateTemporalRoundingIncrement(roundingIncrement, maximum, smallestUnit === "day");
		const isoDateTime = getIsoDateTimeForZonedDateTimeSlot(slot);

		const cache = new Map<number, number>();
		if (smallestUnit === "day") {
			const startOfDay = getStartOfDay(slot.$timeZone, isoDateTime.$isoDate, cache);
			const startOfNextDay = getStartOfDay(
				slot.$timeZone,
				addDaysToIsoDate(isoDateTime.$isoDate, 1),
				cache,
			);
			return createTemporalZonedDateTime(
				addNanosecondsToEpochSeconds(
					startOfDay,
					roundNumberToIncrement(
						differenceInNanosecondsNumber(slot.$epochNanoseconds, startOfDay),
						differenceInNanosecondsNumber(startOfNextDay, startOfDay),
						roundingMode,
					),
				),
				slot.$timeZone,
				slot.$calendar,
				undefined,
				cache,
			);
		}
		const roundResult = roundIsoDateTime(
			isoDateTime,
			roundingIncrement,
			smallestUnit as SingularUnitKey,
			roundingMode,
		);
		const offsetNanoseconds = getOffsetNanosecondsForZonedDateTimeSlot(slot);
		return createTemporalZonedDateTime(
			interpretISODateTimeOffset(
				roundResult.$isoDate,
				roundResult.$time,
				offsetBehaviourOption,
				offsetNanoseconds,
				slot.$timeZone,
				disambiguationCompatible,
				offsetPrefer,
				true,
				cache,
			),
			slot.$timeZone,
			slot.$calendar,
			undefined,
			cache,
		);
	}
	equals(other: unknown) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const otherSlot = getInternalSlotOrThrowForZonedDateTime(toTemporalZonedDateTime(other));
		return (
			!compareEpochNanoseconds(slot.$epochNanoseconds, otherSlot.$epochNanoseconds) &&
			timeZoneEquals(slot.$timeZone, otherSlot.$timeZone) &&
			calendarEquals(slot.$calendar, otherSlot.$calendar)
		);
	}
	toString(options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const resolvedOptions = getOptionsObject(options);
		const showCalendar = getTemporalShowCalendarNameOption(resolvedOptions);
		const digits = getTemporalFractionalSecondDigitsOption(resolvedOptions);
		const showOffset = getTemporalShowOffsetOption(resolvedOptions);
		const roundingMode = getRoundingModeOption(resolvedOptions, roundingModeTrunc);
		const smallestUnit = getTemporalUnitValuedOption(
			resolvedOptions,
			"smallestUnit",
			undefined,
		) as SingularUnitKey;
		const showTimeZone = getTemporalShowTimeZoneNameOption(resolvedOptions);
		validateTemporalUnitValue(smallestUnit, TIME);
		if (smallestUnit === "hour") {
			throw new RangeError();
		}
		const precisionRecord = toSecondsStringPrecisionRecord(smallestUnit, digits);
		return temporalZonedDateTimeToString(
			slot,
			precisionRecord.$precision,
			showCalendar,
			showTimeZone,
			showOffset,
			precisionRecord.$increment,
			precisionRecord.$unit,
			roundingMode,
		);
	}
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		// TODO
		return "";
	}
	toJSON() {
		return temporalZonedDateTimeToString(
			getInternalSlotOrThrowForZonedDateTime(this),
			undefined,
			showCalendarName.$auto,
			timeZoneNameOptions.$auto,
			showOffsetOptions.$auto,
		);
	}
	valueOf() {
		throw new TypeError();
	}
	startOfDay() {
		const cache = new Map<number, number>();
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		return createTemporalZonedDateTime(
			getStartOfDay(slot.$timeZone, getIsoDateTimeForZonedDateTimeSlot(slot).$isoDate, cache),
			slot.$timeZone,
			slot.$calendar,
			undefined,
			cache,
		);
	}
	getTimeZoneTransition(directionParam: unknown) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		if (directionParam === undefined) {
			throw new TypeError();
		}
		const direction = getDirectionOption(
			typeof directionParam === "string"
				? { direction: directionParam }
				: getOptionsObject(directionParam),
		);
		const cache = new Map<number, number>();
		const transition = getTimeZoneTransition(
			slot.$timeZone,
			slot.$epochNanoseconds,
			direction === "next" ? 1 : -1,
			cache,
		);
		if (transition === null) {
			return null;
		}
		return createTemporalZonedDateTime(
			transition,
			slot.$timeZone,
			slot.$calendar,
			undefined,
			cache,
		);
	}
	toInstant() {
		return createTemporalInstant(getInternalSlotOrThrowForZonedDateTime(this).$epochNanoseconds);
	}
	toPlainDate() {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		return createTemporalDate(getIsoDateTimeForZonedDateTimeSlot(slot).$isoDate, slot.$calendar);
	}
	toPlainTime() {
		return createTemporalTime(
			getIsoDateTimeForZonedDateTimeSlot(getInternalSlotOrThrowForZonedDateTime(this)).$time,
		);
	}
	toPlainDateTime() {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		return createTemporalDateTime(getIsoDateTimeForZonedDateTimeSlot(slot), slot.$calendar);
	}
}

defineStringTag(ZonedDateTime.prototype, "Temporal.ZonedDateTime");
renameFunction(ZonedDateTime, "ZonedDateTime");
