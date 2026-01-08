import { createTemporalInstant, isValidEpochNanoseconds } from "./Instant.ts";
import {
	epochDaysToIsoDate,
	getDirectionOption,
	getTemporalDisambiguationOption,
	getTemporalOffsetOption,
	getTemporalOverflowOption,
	getUtcEpochNanoseconds,
} from "./internal/abstractOperations.ts";
import {
	calendarEquals,
	calendarIsoToDate,
	canonicalizeCalendar,
	getTemporalCalendarIdentifierWithIsoDefault,
	prepareCalendarFields,
	toTemporalCalendarIdentifier,
	type CalendarDateRecord,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import {
	hasUtcOffsetSubMinuteParts,
	parseDateTimeUtcOffset,
	parseIsoDateTime,
	temporalZonedDateTimeStringRegExp,
} from "./internal/dateTimeParser.ts";
import { getOptionsObject, toBigInt } from "./internal/ecmascript.ts";
import {
	disambiguationCompatible,
	offsetBehaviourExact,
	offsetBehaviourOption,
	offsetBehaviourWall,
	offsetIgnore,
	offsetReject,
	offsetUse,
	overflowReject,
	startOfDay,
	type Disambiguation,
	type Offset,
	type OffsetBehaviour,
} from "./internal/enum.ts";
import {
	compareEpochNanoseconds,
	convertEpochNanosecondsToBigInt,
	createEpochNanosecondsFromBigInt,
	epochDaysAndRemainderNanoseconds,
	epochMilliseconds,
	epochSeconds,
	type EpochNanoseconds,
} from "./internal/epochNanoseconds.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag } from "./internal/property.ts";
import {
	disambiguatePossibleEpochNanoseconds,
	formatOffsetTimeZoneIdentifier,
	getAvailableNamedTimeZoneIdentifier,
	getEpochNanosecondsFor,
	getOffsetNanosecondsFor,
	getPossibleEpochNanoseconds,
	getStartOfDay,
	getTimeZoneTransition,
	parseTimeZoneIdentifier,
	timeZoneEquals,
	toTemporalTimeZoneIdentifier,
} from "./internal/timeZones.ts";
import { createIsoDateRecord, createTemporalDate, type IsoDateRecord } from "./PlainDate.ts";
import {
	balanceIsoDateTime,
	combineIsoDateAndTimeRecord,
	createTemporalDateTime,
	interpretTemporalDateTimeFields,
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
	time: typeof startOfDay | TimeRecord,
	offsetBehaviour: OffsetBehaviour,
	offsetNanoseconds: number,
	timeZone: string,
	disambiguation: Disambiguation,
	offsetOption: Offset,
	matchExactly: boolean,
	offsetCacheMap: Map<number, number>,
): EpochNanoseconds {
	if (time === startOfDay) {
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
		const epoch = getUtcEpochNanoseconds(
			balanceIsoDateTime(
				isoDateTime.$isoDate.$year,
				isoDateTime.$isoDate.$month,
				isoDateTime.$isoDate.$day,
				isoDateTime.$time.$hour,
				isoDateTime.$time.$minute,
				isoDateTime.$time.$second,
				isoDateTime.$time.$millisecond,
				isoDateTime.$time.$microsecond,
				isoDateTime.$time.$nanosecond - offsetNanoseconds,
			),
		);
		if (!isValidEpochNanoseconds(epoch)) {
			throw new RangeError();
		}
		return epoch;
	}
	const possibleEpochNs = getPossibleEpochNanoseconds(timeZone, isoDateTime, offsetCacheMap);
	for (const candidate of possibleEpochNs) {
		const candidateOffset = getOffsetNanosecondsFor(timeZone, candidate, offsetCacheMap);
		if (candidateOffset === offsetNanoseconds) {
			return candidate;
		}
		if (!matchExactly) {
			// TODO
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
	let time: typeof startOfDay | TimeRecord;
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

/** `GetOffsetNanosecondsFor` with caching */
function getOffsetNanosecondsForZonedDateTimeSlot(slot: ZonedDateTimeSlot): number {
	if (slot.$offsetNanoseconds !== undefined) {
		return slot.$offsetNanoseconds;
	}
	return (slot.$offsetNanoseconds = getOffsetNanosecondsFor(
		slot.$timeZone,
		slot.$epochNanoseconds,
	));
}

/** `GetISODateTimeFor` with caching */
export function getIsoDateTimeForZonedDateTimeSlot(slot: ZonedDateTimeSlot): IsoDateTimeRecord {
	const offsetNanoseconds = getOffsetNanosecondsForZonedDateTimeSlot(slot);
	// `GetISOPartsFromEpoch`
	const [epochDays, remainderNanoseconds] = epochDaysAndRemainderNanoseconds(
		slot.$epochNanoseconds,
	);
	const date = epochDaysToIsoDate(epochDays);
	return balanceIsoDateTime(
		date.$year,
		date.$month,
		date.$day,
		0,
		0,
		0,
		0,
		0,
		remainderNanoseconds + offsetNanoseconds,
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
	static compare() {}
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
		return undefined;
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
		return undefined;
	}
	with() {}
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
	add() {}
	subtract() {}
	until() {}
	since() {}
	round() {}
	equals(other: unknown) {
		const slot = getInternalSlotOrThrowForZonedDateTime(this);
		const otherSlot = getInternalSlotOrThrowForZonedDateTime(toTemporalZonedDateTime(other));
		return (
			!compareEpochNanoseconds(slot.$epochNanoseconds, otherSlot.$epochNanoseconds) &&
			timeZoneEquals(slot.$timeZone, otherSlot.$timeZone) &&
			calendarEquals(slot.$calendar, otherSlot.$calendar)
		);
	}
	toString() {}
	toLocaleString() {}
	toJSON() {}
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
