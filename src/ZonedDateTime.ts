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
	validateEpochNanoseconds,
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
	isoDateTimeToFields,
	largerOfTwoTemporalUnits,
	maximumTemporalDurationRoundingIncrement,
	roundNumberToIncrement,
	toSecondsStringPrecisionRecord,
	validatePartialTemporalObject,
	validateTemporalRoundingIncrement,
	validateTemporalUnitValue,
} from "./internal/abstractOperations.ts";
import { assert, assertIsoDaysRange, assertNotUndefined } from "./internal/assertion.ts";
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
import {
	getOptionsObject,
	getRoundToOptionsObject,
	toBigInt,
	validateString,
} from "./internal/ecmascript.ts";
import {
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
import {
	calendarMismatch,
	forbiddenValueOf,
	invalidField,
	invalidMethodCall,
	offsetMismatch,
	timeZoneMismatch,
	undefinedArgument,
} from "./internal/errorMessages.ts";
import { createNullPrototypeObject, isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import {
	createTimeDurationFromSeconds,
	timeDurationToSubsecondsNumber,
} from "./internal/timeDuration.ts";
import {
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
	getTimeZoneOffsetNanosecondsForEpochSecondFromCache,
	getTimeZoneTransition,
	parseTimeZoneIdentifier,
	timeZoneEquals,
	toTemporalTimeZoneIdentifier,
} from "./internal/timeZones.ts";
import { Unit } from "./internal/unit.ts";
import { throwRangeError, throwTypeError } from "./internal/utils.ts";
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
	roundIsoDateTime,
	validateIsoDateTime,
	type IsoDateTimeRecord,
} from "./PlainDateTime.ts";
import {
	createTemporalTime,
	differenceTime,
	toTemporalTime,
	type TimeRecord,
} from "./PlainTime.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();

export interface ZonedDateTimeSlot {
	$epochNanoseconds: EpochNanoseconds;
	$timeZone: string;
	$calendar: SupportedCalendars;
	/** cached offset nanoseconds */
	$offsetNanoseconds: number | undefined;
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
): EpochNanoseconds {
	if (time === undefined) {
		assert(offsetBehaviour === offsetBehaviourWall);
		assert(offsetNanoseconds === 0);
		return getStartOfDay(timeZone, isoDate);
	}
	const isoDateTime = combineIsoDateAndTimeRecord(isoDate, time);
	if (
		offsetBehaviour === offsetBehaviourWall ||
		(offsetBehaviour === offsetBehaviourOption && offsetOption == offsetIgnore)
	) {
		return getEpochNanosecondsFor(timeZone, isoDateTime, disambiguation);
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
		assertIsoDaysRange(balanced.$isoDate);
		return validateEpochNanoseconds(getUtcEpochNanoseconds(balanced));
	}
	assert(offsetOption === offsetPrefer || offsetOption === offsetReject);
	// `checkIsoDaysRange` isn't an assertion here
	// cf. https://github.com/tc39/proposal-temporal/pull/3014#issuecomment-3856086253
	checkIsoDaysRange(isoDate);
	const possibleEpochNs = getPossibleEpochNanoseconds(timeZone, isoDateTime);
	for (const candidate of possibleEpochNs) {
		const candidateOffset = getOffsetNanosecondsFor(timeZone, candidate);
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
		throwRangeError(offsetMismatch);
	}
	return disambiguatePossibleEpochNanoseconds(
		possibleEpochNs,
		timeZone,
		isoDateTime,
		disambiguation,
	);
}

/** `ToTemporalZonedDateTime` */
function toTemporalZonedDateTime(item: unknown, options?: unknown): ZonedDateTimeSlot {
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
			return getInternalSlotOrThrowForZonedDateTime(item);
		}
		calendar = getTemporalCalendarIdentifierWithIsoDefault(item);
		const fields = prepareCalendarFields(
			calendar,
			item,
			[
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
				calendarFieldKeys.$timeZone,
			],
			[calendarFieldKeys.$timeZone],
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
		validateString(item);
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
	const epoch = interpretISODateTimeOffset(
		isoDate,
		time,
		offsetBehaviour,
		offsetNanoseconds,
		timeZone,
		disambiguation,
		offsetOption,
		matchExactly,
	);
	return createZonedDateTimeSlot(epoch, timeZone, calendar);
}

/** ` CreateTemporalZonedDateTime` */
export function createTemporalZonedDateTime(
	epochNanoseconds: EpochNanoseconds,
	timeZone: string,
	calendar: SupportedCalendars,
	instance?: ZonedDateTime,
): ZonedDateTime {
	assert(isValidEpochNanoseconds(epochNanoseconds));
	return createTemporalZonedDateTimeFromSlot(
		createZonedDateTimeSlot(
			epochNanoseconds,
			timeZone,
			calendar,
			getTimeZoneOffsetNanosecondsForEpochSecondFromCache(timeZone, epochSeconds(epochNanoseconds)),
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
	unit: Exclude<Unit.Time, Unit.Hour> = Unit.Nanosecond,
	roundingMode: RoundingMode = roundingModeTrunc,
): string {
	const epoch = roundTemporalInstant(slot.$epochNanoseconds, increment, unit, roundingMode);
	const offsetNanoseconds =
		epochSeconds(epoch) === epochSeconds(slot.$epochNanoseconds)
			? getOffsetNanosecondsForZonedDateTimeSlot(slot)
			: getOffsetNanosecondsFor(slot.$timeZone, epoch);
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
	zonedDateTimeSlot: ZonedDateTimeSlot,
	duration: InternalDurationRecord,
	overflow: Overflow,
): EpochNanoseconds {
	if (dateDurationSign(duration.$date) === 0) {
		return addInstant(zonedDateTimeSlot.$epochNanoseconds, duration.$time);
	}
	const isoDateTime = getIsoDateTimeForZonedDateTimeSlot(zonedDateTimeSlot);
	return addInstant(
		getEpochNanosecondsFor(
			zonedDateTimeSlot.$timeZone,
			validateIsoDateTime(
				combineIsoDateAndTimeRecord(
					calendarDateAdd(
						zonedDateTimeSlot.$calendar,
						isoDateTime.$isoDate,
						duration.$date,
						overflow,
					),
					isoDateTime.$time,
				),
			),
			disambiguationCompatible,
		),
		duration.$time,
	);
}

/** `DifferenceZonedDateTime` */
function differenceZonedDateTime(
	slot1: ZonedDateTimeSlot,
	slot2: ZonedDateTimeSlot,
	largestUnit: Unit,
): InternalDurationRecord {
	const sign = compareEpochNanoseconds(slot1.$epochNanoseconds, slot2.$epochNanoseconds);
	if (!sign) {
		return combineDateAndTimeDuration(zeroDateDuration(), createTimeDurationFromSeconds(0));
	}
	assert(timeZoneEquals(slot1.$timeZone, slot2.$timeZone));
	const startDateTime = getIsoDateTimeForZonedDateTimeSlot(slot1);
	const endDateTime = getIsoDateTimeForZonedDateTimeSlot(slot2);
	if (!compareIsoDate(startDateTime.$isoDate, endDateTime.$isoDate)) {
		return combineDateAndTimeDuration(
			zeroDateDuration(),
			timeDurationFromEpochNanosecondsDifference(slot2.$epochNanoseconds, slot1.$epochNanoseconds),
		);
	}
	assert(calendarEquals(slot1.$calendar, slot2.$calendar));
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
			slot2.$epochNanoseconds,
			getEpochNanosecondsFor(slot1.$timeZone, intermediateDateTime, disambiguationCompatible),
		);
		if (timeDurationSign(timeDuration) !== sign) {
			break;
		}
	}
	assertNotUndefined(intermediateDateTime);
	return combineDateAndTimeDuration(
		calendarDateUntil(
			slot1.$calendar,
			startDateTime.$isoDate,
			intermediateDateTime.$isoDate,
			largerOfTwoTemporalUnits(largestUnit, Unit.Day) as Unit.Date,
		),
		timeDuration,
	);
}

/** `DifferenceZonedDateTimeWithRounding` */
export function differenceZonedDateTimeWithRounding(
	slot1: ZonedDateTimeSlot,
	slot2: ZonedDateTimeSlot,
	largestUnit: Unit,
	roundingIncrement: number,
	smallestUnit: Unit,
	roundingMode: RoundingMode,
): InternalDurationRecord {
	if (!isDateUnit(largestUnit)) {
		assert(!isDateUnit(smallestUnit));
		return differenceInstant(
			slot1.$epochNanoseconds,
			slot2.$epochNanoseconds,
			roundingIncrement,
			smallestUnit,
			roundingMode,
		);
	}
	const difference = differenceZonedDateTime(slot1, slot2, largestUnit);
	if (smallestUnit === Unit.Nanosecond && roundingIncrement === 1) {
		return difference;
	}

	return roundRelativeDuration(
		difference,
		slot1.$epochNanoseconds,
		slot2.$epochNanoseconds,
		getIsoDateTimeForZonedDateTimeSlot(slot1),
		slot1.$timeZone,
		slot1.$calendar,
		largestUnit,
		roundingIncrement,
		smallestUnit,
		roundingMode,
	);
}

/** `DifferenceZonedDateTimeWithTotal` */
export function differenceZonedDateTimeWithTotal(
	slot1: ZonedDateTimeSlot,
	slot2: ZonedDateTimeSlot,
	unit: Unit,
) {
	if (!isDateUnit(unit)) {
		return totalTimeDuration(
			timeDurationFromEpochNanosecondsDifference(slot2.$epochNanoseconds, slot1.$epochNanoseconds),
			unit,
		);
	}

	return totalRelativeDuration(
		differenceZonedDateTime(slot1, slot2, unit),
		slot1.$epochNanoseconds,
		slot2.$epochNanoseconds,
		getIsoDateTimeForZonedDateTimeSlot(slot1),
		slot1.$timeZone,
		slot1.$calendar,
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
	const otherSlot = toTemporalZonedDateTime(other);
	if (!calendarEquals(zonedDateTime.$calendar, otherSlot.$calendar)) {
		throwRangeError(calendarMismatch);
	}
	const settings = getDifferenceSettings(
		operationSign,
		getOptionsObject(options),
		DATETIME,
		[],
		Unit.Nanosecond,
		Unit.Hour,
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
		throwRangeError(timeZoneMismatch);
	}
	if (!compareEpochNanoseconds(zonedDateTime.$epochNanoseconds, otherSlot.$epochNanoseconds)) {
		return createTemporalDuration(createTemporalDurationSlot([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
	}
	return createTemporalDuration(
		applySignToDurationSlot(
			temporalDurationFromInternal(
				differenceZonedDateTimeWithRounding(
					zonedDateTime,
					otherSlot,
					settings.$largestUnit,
					settings.$roundingIncrement,
					settings.$smallestUnit,
					settings.$roundingMode,
				),
				Unit.Hour,
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
	return createTemporalZonedDateTime(
		addZonedDateTime(
			zonedDateTime,
			toInternalDurationRecord(
				applySignToDurationSlot(toTemporalDuration(temporalDurationLike), operationSign),
			),
			getTemporalOverflowOption(getOptionsObject(options)),
		),
		zonedDateTime.$timeZone,
		zonedDateTime.$calendar,
	);
}

/** `GetOffsetNanosecondsFor` with caching */
function getOffsetNanosecondsForZonedDateTimeSlot(slot: ZonedDateTimeSlot): number {
	return (slot.$offsetNanoseconds ??= getOffsetNanosecondsFor(
		slot.$timeZone,
		slot.$epochNanoseconds,
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
		throwTypeError(invalidMethodCall);
	}
	return slot;
}

export function isZonedDateTime(item: unknown): boolean {
	return !!getInternalSlotForZonedDateTime(item);
}

export class ZonedDateTime {
	constructor(epochNanoseconds: unknown, timeZone: unknown, calendar: unknown = "iso8601") {
		const epoch = validateEpochNanoseconds(
			createEpochNanosecondsFromBigInt(toBigInt(epochNanoseconds)),
		);
		validateString(timeZone);
		const result = parseTimeZoneIdentifier(timeZone);
		const timeZoneString = result.$name
			? getAvailableNamedTimeZoneIdentifier(result.$name)
			: (assertNotUndefined(result.$offsetMinutes),
				formatOffsetTimeZoneIdentifier(result.$offsetMinutes));
		validateString(calendar);
		createTemporalZonedDateTime(epoch, timeZoneString, canonicalizeCalendar(calendar), this);
	}
	static from(item: unknown, options: unknown = undefined) {
		return createTemporalZonedDateTimeFromSlot(toTemporalZonedDateTime(item, options));
	}
	static compare(one: unknown, two: unknown) {
		return compareEpochNanoseconds(
			toTemporalZonedDateTime(one).$epochNanoseconds,
			toTemporalZonedDateTime(two).$epochNanoseconds,
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
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const today = getIsoDateTimeForZonedDateTimeSlot(slot).$isoDate;

		return (
			timeDurationToSubsecondsNumber(
				differenceEpochNanoseconds(
					getStartOfDay(slot.$timeZone, today),
					getStartOfDay(slot.$timeZone, addDaysToIsoDate(today, 1)),
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
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		validatePartialTemporalObject(temporalZonedDateTimeLike);
		const offsetNanoseconds = getOffsetNanosecondsForZonedDateTimeSlot(slot);
		const isoDateTime = getIsoDateTimeForZonedDateTimeSlot(slot);
		const fields = calendarMergeFields(
			slot.$calendar,
			createNullPrototypeObject({
				...isoDateTimeToFields(slot.$calendar, isoDateTime),
				[calendarFieldKeys.$offset]: formatUtcOffsetNanoseconds(offsetNanoseconds),
			}),
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
			),
			slot.$timeZone,
			slot.$calendar,
		);
	}
	withPlainTime(plainTimeLike: unknown = undefined) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const isoDateTime = getIsoDateTimeForZonedDateTimeSlot(slot);
		if (plainTimeLike === undefined) {
			return createTemporalZonedDateTime(
				getStartOfDay(slot.$timeZone, isoDateTime.$isoDate),
				slot.$timeZone,
				slot.$calendar,
			);
		}
		return createTemporalZonedDateTime(
			getEpochNanosecondsFor(
				slot.$timeZone,
				combineIsoDateAndTimeRecord(isoDateTime.$isoDate, toTemporalTime(plainTimeLike)),
				disambiguationCompatible,
			),
			slot.$timeZone,
			slot.$calendar,
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
		validateTemporalUnitValue(smallestUnit, TIME, [Unit.Day]);
		const maximum =
			smallestUnit === Unit.Day ? 1 : maximumTemporalDurationRoundingIncrement(smallestUnit);
		validateTemporalRoundingIncrement(roundingIncrement, maximum, smallestUnit === Unit.Day);
		if (smallestUnit === Unit.Nanosecond && roundingIncrement === 1) {
			return createTemporalZonedDateTimeFromSlot(slot);
		}
		const isoDateTime = getIsoDateTimeForZonedDateTimeSlot(slot);

		if (smallestUnit === Unit.Day) {
			const startOfDay = getStartOfDay(slot.$timeZone, isoDateTime.$isoDate);
			const startOfNextDay = getStartOfDay(
				slot.$timeZone,
				addDaysToIsoDate(isoDateTime.$isoDate, 1),
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
			),
			slot.$timeZone,
			slot.$calendar,
		);
	}
	equals(other: unknown) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const otherSlot = toTemporalZonedDateTime(other);
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
		if (smallestUnit === Unit.Hour) {
			throwRangeError(invalidField("smallestUnit"));
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
			throwRangeError(calendarMismatch);
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
		throwTypeError(forbiddenValueOf);
	}
	startOfDay() {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		return createTemporalZonedDateTime(
			getStartOfDay(slot.$timeZone, getIsoDateTimeForZonedDateTimeSlot(slot).$isoDate),
			slot.$timeZone,
			slot.$calendar,
		);
	}
	getTimeZoneTransition(directionParam: unknown) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		if (directionParam === undefined) {
			throwTypeError(undefinedArgument);
		}
		const direction = getDirectionOption(
			typeof directionParam === "string"
				? { direction: directionParam }
				: getOptionsObject(directionParam),
		);
		const transition = getTimeZoneTransition(
			slot.$timeZone,
			slot.$epochNanoseconds,
			direction === "next" ? 1 : -1,
		);
		if (transition === null) {
			return null;
		}
		return createTemporalZonedDateTime(transition, slot.$timeZone, slot.$calendar);
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
