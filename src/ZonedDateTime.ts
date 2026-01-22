import {
	createDateTimeFormat,
	formatDateTime,
	getInternalSlotOrThrowForDateTimeFormat,
} from "./DateTimeFormat.ts";
import {
	applySignToDurationSlot,
	combineDateAndTimeDuration,
	createTemporalDuration,
	createTemporalDurationSlot,
	dateDurationSign,
	Duration,
	roundRelativeDuration,
	temporalDurationFromInternal,
	timeDurationFromEpochNanosecondsDifference,
	timeDurationSign,
	toInternalDurationRecord,
	totalRelativeDuration,
	totalTimeDuration,
	toTemporalDuration,
	zeroDateDuration,
	type InternalDurationRecord,
} from "./Duration.ts";
import {
	addInstant,
	createTemporalInstant,
	differenceInstant,
	isValidEpochNanoseconds,
	roundTemporalInstant,
} from "./Instant.ts";
import {
	checkIsoDaysRange,
	getDifferenceSettings,
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
	isDateUnit,
	isoDateToFields,
	isPartialTemporalObject,
	largerOfTwoTemporalUnits,
	maximumTemporalDurationRoundingIncrement,
	roundNumberToIncrement,
	toSecondsStringPrecisionRecord,
	validateTemporalRoundingIncrement,
	validateTemporalUnitValue,
} from "./internal/abstractOperations.ts";
import { assert, assertNotUndefined } from "./internal/assertion.ts";
import {
	calendarDateAdd,
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
	DATETIME,
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
	TIME,
	timeZoneNameOptions,
	type Disambiguation,
	type Offset,
	type OffsetBehaviour,
	type Overflow,
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
	differenceEpochNanoseconds,
	epochMilliseconds,
	epochSeconds,
	type EpochNanoseconds,
} from "./internal/epochNanoseconds.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import {
	createTimeDurationFromSeconds,
	timeDurationToSubsecondsNumber,
} from "./internal/timeDuration.ts";
import {
	createOffsetCacheMap,
	disambiguatePossibleEpochNanoseconds,
	formatDateTimeUtcOffsetRounded,
	formatOffsetTimeZoneIdentifier,
	formatUtcOffsetNanoseconds,
	getAvailableNamedTimeZoneIdentifier,
	getEpochNanosecondsFor,
	getIsoDateTimeFromOffsetNanoseconds,
	getOffsetNanosecondsFor,
	getPossibleEpochNanoseconds,
	getStartOfDay,
	getTimeZoneTransition,
	parseTimeZoneIdentifier,
	timeZoneEquals,
	toTemporalTimeZoneIdentifier,
} from "./internal/timeZones.ts";
import type { SingularDateUnitKey, SingularTimeUnitKey, SingularUnitKey } from "./internal/unit.ts";
import {
	addDaysToIsoDate,
	compareIsoDate,
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
	isoDateTimeWithinLimits,
	roundIsoDateTime,
	type IsoDateTimeRecord,
} from "./PlainDateTime.ts";
import {
	createTemporalTime,
	differenceTime,
	getInternalSlotOrThrowForPlainTime,
	toTemporalTime,
	type TimeRecord,
} from "./PlainTime.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

export interface ZonedDateTimeSlot {
	$epochNanoseconds: EpochNanoseconds;
	$timeZone: string;
	$calendar: SupportedCalendars;
	/** cached offset nanoseconds */
	$offsetNanoseconds?: number | undefined;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, ZonedDateTimeSlot>();

/** `InterpretISODateTimeOffset` */
export function interpretISODateTimeOffset(
	isoDate: IsoDateRecord,
	time: TimeRecord | undefined,
	offsetBehaviour: OffsetBehaviour,
	offsetNanoseconds: number,
	timeZone: string,
	disambiguation: Disambiguation,
	offsetOption: Offset,
	matchExactly: boolean,
	offsetCacheMap: Map<number, number>,
): EpochNanoseconds {
	if (time === undefined) {
		assert(offsetBehaviour === offsetBehaviourWall);
		assert(offsetNanoseconds === 0);
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
	assert(offsetOption === offsetPrefer || offsetOption === offsetReject);
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
function toTemporalZonedDateTime(item: unknown, options?: unknown): ZonedDateTime {
	let timeZone: string;
	let offsetString: string | undefined;
	let hasUtcDesignator = false;
	let disambiguation: Disambiguation;
	let offsetOption: Offset;
	let calendar: SupportedCalendars;
	let matchExactly = true;
	let isoDate: IsoDateRecord;
	let time: TimeRecord | undefined;
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
				"offset",
				"timeZone",
			],
			["timeZone"],
		);
		assertNotUndefined(fields.timeZone);
		timeZone = fields.timeZone;
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
		assertNotUndefined(result.$year);
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
		isoDate = createIsoDateRecord(result.$year, result.$month, result.$day);
		time = result.$time;
	}
	const offsetBehaviour = hasUtcDesignator
		? offsetBehaviourExact
		: offsetString === undefined
			? offsetBehaviourWall
			: offsetBehaviourOption;
	const offsetNanoseconds =
		offsetBehaviour === offsetBehaviourOption ? parseDateTimeUtcOffset(offsetString!) : 0;
	const cache = createOffsetCacheMap();
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
	assert(isValidEpochNanoseconds(epochNanoseconds));
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
	unit: Exclude<SingularTimeUnitKey, "hour"> = "nanosecond",
	roundingMode: RoundingMode = roundingModeTrunc,
): string {
	const epoch = roundTemporalInstant(slot.$epochNanoseconds, increment, unit, roundingMode);
	const offsetNanoseconds = getOffsetNanosecondsFor(slot.$timeZone, epoch);
	return `${isoDateTimeToString(
		getIsoDateTimeFromOffsetNanoseconds(epoch, offsetNanoseconds),
		"iso8601",
		precision,
		showCalendarName.$never,
	)}${
		showOffset === showOffsetOptions.$never ? "" : formatDateTimeUtcOffsetRounded(offsetNanoseconds)
	}${
		showTimeZone === timeZoneNameOptions.$never
			? ""
			: `[${showTimeZone === timeZoneNameOptions.$critical ? "!" : ""}${slot.$timeZone}]`
	}${formatCalendarAnnotation(slot.$calendar, showCalendar)}`;
}

/** `AddZonedDateTime` */
export function addZonedDateTime(
	epochNanoseconds: EpochNanoseconds,
	timeZone: string,
	calendar: SupportedCalendars,
	duration: InternalDurationRecord,
	overflow: Overflow,
	offsetCacheMap?: Map<number, number>,
): EpochNanoseconds {
	if (dateDurationSign(duration.$date) === 0) {
		return addInstant(epochNanoseconds, duration.$time);
	}
	const isoDateTime = getIsoDateTimeFromOffsetNanoseconds(
		epochNanoseconds,
		getOffsetNanosecondsFor(timeZone, epochNanoseconds, offsetCacheMap),
	);
	const intermediateDateTime = combineIsoDateAndTimeRecord(
		calendarDateAdd(calendar, isoDateTime.$isoDate, duration.$date, overflow),
		isoDateTime.$time,
	);
	if (!isoDateTimeWithinLimits(intermediateDateTime)) {
		throw new RangeError();
	}
	return addInstant(
		getEpochNanosecondsFor(
			timeZone,
			intermediateDateTime,
			disambiguationCompatible,
			offsetCacheMap,
		),
		duration.$time,
	);
}

/** `DifferenceZonedDateTime` */
function differenceZonedDateTime(
	ns1: EpochNanoseconds,
	ns2: EpochNanoseconds,
	timeZone: string,
	calendar: SupportedCalendars,
	largestUnit: SingularUnitKey,
	offsetCacheMap?: Map<number, number>,
): InternalDurationRecord {
	const sign = compareEpochNanoseconds(ns1, ns2);
	if (!sign) {
		return combineDateAndTimeDuration(zeroDateDuration(), createTimeDurationFromSeconds(0));
	}
	const startDateTime = getIsoDateTimeFromOffsetNanoseconds(
		ns1,
		getOffsetNanosecondsFor(timeZone, ns1, offsetCacheMap),
	);
	const endDateTime = getIsoDateTimeFromOffsetNanoseconds(
		ns2,
		getOffsetNanosecondsFor(timeZone, ns2, offsetCacheMap),
	);
	if (!compareIsoDate(startDateTime.$isoDate, endDateTime.$isoDate)) {
		return combineDateAndTimeDuration(
			zeroDateDuration(),
			timeDurationFromEpochNanosecondsDifference(ns2, ns1),
		);
	}
	let timeDuration = differenceTime(startDateTime.$time, endDateTime.$time);
	let intermediateDateTime: IsoDateTimeRecord | undefined;
	for (
		let dayCorrection = timeDurationSign(timeDuration) === sign ? 1 : 0;
		dayCorrection <= (3 - sign) / 2;
		dayCorrection++
	) {
		intermediateDateTime = combineIsoDateAndTimeRecord(
			addDaysToIsoDate(endDateTime.$isoDate, dayCorrection * sign),
			startDateTime.$time,
		);
		timeDuration = timeDurationFromEpochNanosecondsDifference(
			ns2,
			getEpochNanosecondsFor(
				timeZone,
				intermediateDateTime,
				disambiguationCompatible,
				offsetCacheMap,
			),
		);
		if (timeDurationSign(timeDuration) !== sign) {
			break;
		}
	}
	assertNotUndefined(intermediateDateTime);
	return combineDateAndTimeDuration(
		calendarDateUntil(
			calendar,
			startDateTime.$isoDate,
			intermediateDateTime.$isoDate,
			largerOfTwoTemporalUnits(largestUnit, "day") as SingularDateUnitKey,
		),
		timeDuration,
	);
}

/** `DifferenceZonedDateTimeWithRounding` */
export function differenceZonedDateTimeWithRounding(
	ns1: EpochNanoseconds,
	ns2: EpochNanoseconds,
	timeZone: string,
	calendar: SupportedCalendars,
	largestUnit: SingularUnitKey,
	roundingIncrement: number,
	smallestUnit: SingularUnitKey,
	roundingMode: RoundingMode,
	offsetCacheMap?: Map<number, number>,
): InternalDurationRecord {
	if (!isDateUnit(largestUnit)) {
		assert(!isDateUnit(smallestUnit));
		return differenceInstant(ns1, ns2, roundingIncrement, smallestUnit, roundingMode);
	}
	const difference = differenceZonedDateTime(ns1, ns2, timeZone, calendar, largestUnit);
	if (smallestUnit === "nanosecond" && roundingIncrement === 1) {
		return difference;
	}

	return roundRelativeDuration(
		difference,
		ns1,
		ns2,
		getIsoDateTimeFromOffsetNanoseconds(
			ns1,
			getOffsetNanosecondsFor(timeZone, ns1, offsetCacheMap),
		),
		timeZone,
		calendar,
		largestUnit,
		roundingIncrement,
		smallestUnit,
		roundingMode,
	);
}

/** `DifferenceZonedDateTimeWithTotal` */
export function differenceZonedDateTimeWithTotal(
	ns1: EpochNanoseconds,
	ns2: EpochNanoseconds,
	timeZone: string,
	calendar: SupportedCalendars,
	unit: SingularUnitKey,
) {
	if (!isDateUnit(unit)) {
		return totalTimeDuration(timeDurationFromEpochNanosecondsDifference(ns2, ns1), unit);
	}

	return totalRelativeDuration(
		differenceZonedDateTime(ns1, ns2, timeZone, calendar, unit),
		ns1,
		ns2,
		getIsoDateTimeFromOffsetNanoseconds(ns1, getOffsetNanosecondsFor(timeZone, ns1)),
		timeZone,
		calendar,
		unit,
	);
}

/** `DifferenceTemporalZonedDateTime` */
function differenceTemporalZonedDateTime(
	operationSign: 1 | -1,
	zonedDateTime: ZonedDateTimeSlot,
	other: unknown,
	options: unknown,
): Duration {
	const otherSlot = getInternalSlotOrThrowForZonedDateTime(toTemporalZonedDateTime(other));
	if (!calendarEquals(zonedDateTime.$calendar, otherSlot.$calendar)) {
		throw new RangeError();
	}
	const settings = getDifferenceSettings(
		operationSign,
		getOptionsObject(options),
		DATETIME,
		[],
		"nanosecond",
		"hour",
	);
	if (!isDateUnit(settings.$largestUnit)) {
		assert(!isDateUnit(settings.$smallestUnit));
		return createTemporalDuration(
			applySignToDurationSlot(
				temporalDurationFromInternal(
					differenceInstant(
						zonedDateTime.$epochNanoseconds,
						otherSlot.$epochNanoseconds,
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
	if (!timeZoneEquals(zonedDateTime.$timeZone, otherSlot.$timeZone)) {
		throw new RangeError();
	}
	if (!compareEpochNanoseconds(zonedDateTime.$epochNanoseconds, otherSlot.$epochNanoseconds)) {
		return createTemporalDuration(createTemporalDurationSlot(0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
	}
	return createTemporalDuration(
		applySignToDurationSlot(
			temporalDurationFromInternal(
				differenceZonedDateTimeWithRounding(
					zonedDateTime.$epochNanoseconds,
					otherSlot.$epochNanoseconds,
					zonedDateTime.$timeZone,
					zonedDateTime.$calendar,
					settings.$largestUnit,
					settings.$roundingIncrement,
					settings.$smallestUnit,
					settings.$roundingMode,
				),
				"hour",
			),
			operationSign,
		),
	);
}

/** `AddDurationToZonedDateTime` */
function addDurationToZonedDateTime(
	operationSign: 1 | -1,
	zonedDateTime: ZonedDateTimeSlot,
	temporalDurationLike: unknown,
	options: unknown,
): ZonedDateTime {
	const duration = applySignToDurationSlot(toTemporalDuration(temporalDurationLike), operationSign);
	const overflow = getTemporalOverflowOption(getOptionsObject(options));
	const cache = createOffsetCacheMap(
		zonedDateTime.$epochNanoseconds,
		zonedDateTime.$offsetNanoseconds,
	);
	return createTemporalZonedDateTime(
		addZonedDateTime(
			zonedDateTime.$epochNanoseconds,
			zonedDateTime.$timeZone,
			zonedDateTime.$calendar,
			toInternalDurationRecord(duration),
			overflow,
			cache,
		),
		zonedDateTime.$timeZone,
		zonedDateTime.$calendar,
		undefined,
		cache,
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
		const cache = createOffsetCacheMap();
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const today = getIsoDateTimeForZonedDateTimeSlot(slot).$isoDate;

		return (
			timeDurationToSubsecondsNumber(
				differenceEpochNanoseconds(
					getStartOfDay(slot.$timeZone, today, cache),
					getStartOfDay(slot.$timeZone, addDaysToIsoDate(today, 1), cache),
				),
				-9,
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
		const cache = createOffsetCacheMap();

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
			prepareCalendarFields(slot.$calendar, temporalZonedDateTimeLike as object, [
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
		const cache = createOffsetCacheMap();
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
	add(temporalDurationLike: unknown, options: unknown = undefined) {
		return addDurationToZonedDateTime(
			1,
			getInternalSlotOrThrowForZonedDateTime(this),
			temporalDurationLike,
			options,
		);
	}
	subtract(temporalDurationLike: unknown, options: unknown = undefined) {
		return addDurationToZonedDateTime(
			-1,
			getInternalSlotOrThrowForZonedDateTime(this),
			temporalDurationLike,
			options,
		);
	}
	until(other: unknown, options: unknown = undefined) {
		return differenceTemporalZonedDateTime(
			1,
			getInternalSlotOrThrowForZonedDateTime(this),
			other,
			options,
		);
	}
	since(other: unknown, options: unknown = undefined) {
		return differenceTemporalZonedDateTime(
			-1,
			getInternalSlotOrThrowForZonedDateTime(this),
			other,
			options,
		);
	}
	round(roundTo: unknown) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const roundToOptions = getRoundToOptionsObject(roundTo);
		const roundingIncrement = getRoundingIncrementOption(roundToOptions);
		const roundingMode = getRoundingModeOption(roundToOptions, "halfExpand");
		const smallestUnit = getTemporalUnitValuedOption(roundToOptions, "smallestUnit", REQUIRED);
		validateTemporalUnitValue(smallestUnit, TIME, ["day"]);
		const maximum =
			smallestUnit === "day" ? 1 : maximumTemporalDurationRoundingIncrement(smallestUnit);
		assertNotUndefined(maximum);
		validateTemporalRoundingIncrement(roundingIncrement, maximum, smallestUnit === "day");
		const isoDateTime = getIsoDateTimeForZonedDateTimeSlot(slot);

		const cache = createOffsetCacheMap();
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
						timeDurationToSubsecondsNumber(
							differenceEpochNanoseconds(startOfDay, slot.$epochNanoseconds),
							-9,
						),
						timeDurationToSubsecondsNumber(
							differenceEpochNanoseconds(startOfDay, startOfNextDay),
							-9,
						),
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
			smallestUnit,
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
		const smallestUnit = getTemporalUnitValuedOption(resolvedOptions, "smallestUnit", undefined);
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
		const dtf = createDateTimeFormat(locales, options, DATETIME, slot.$timeZone);
		const dtfSlot = getInternalSlotOrThrowForDateTimeFormat(dtf);
		if (
			slot.$calendar !== "iso8601" &&
			!calendarEquals(slot.$calendar, dtfSlot.$originalOptions.calendar as SupportedCalendars)
		) {
			throw new RangeError();
		}
		return formatDateTime(dtf, createTemporalInstant(slot.$epochNanoseconds));
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
		const cache = createOffsetCacheMap();
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
		const cache = createOffsetCacheMap();
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
