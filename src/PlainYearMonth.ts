import { createDateTimeFormat, formatDateTime } from "./DateTimeFormat.ts";
import {
	adjustDateDurationRecord,
	applySignToDurationSlot,
	combineDateAndTimeDuration,
	createDateDurationRecord,
	createTemporalDuration,
	createTemporalDurationSlot,
	Duration,
	durationSign,
	roundRelativeDuration,
	temporalDurationFromInternal,
	toDateDurationRecordWithoutTime,
	toTemporalDuration,
} from "./Duration.ts";
import {
	getDifferenceSettings,
	getTemporalOverflowOption,
	getTemporalShowCalendarNameOption,
	getUtcEpochNanoseconds,
	isoDateToFields,
	isPartialTemporalObject,
} from "./internal/abstractOperations.ts";
import { assertNotUndefined } from "./internal/assertion.ts";
import {
	calendarDateAdd,
	calendarDateFromFields,
	calendarDateUntil,
	calendarEquals,
	calendarFieldKeys,
	calendarIsoToDate,
	calendarMergeFields,
	calendarYearMonthFromFields,
	canonicalizeCalendar,
	formatCalendarAnnotation,
	getTemporalCalendarIdentifierWithIsoDefault,
	prepareCalendarFields,
	type SupportedCalendars,
} from "./internal/calendars.ts";
import { parseIsoDateTime, temporalYearMonthStringRegExp } from "./internal/dateTimeParser.ts";
import {
	getOptionsObject,
	toIntegerWithTruncation,
	validateString,
} from "./internal/ecmascript.ts";
import {
	DATE,
	overflowConstrain,
	showCalendarName,
	YEAR_MONTH,
	type ShowCalendarName,
} from "./internal/enum.ts";
import { calendarMismatch, invalidDateTime, outOfBoundsDate } from "./internal/errorMessages.ts";
import { divFloor, isWithin, modFloor } from "./internal/math.ts";
import { isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { toZeroPaddedDecimalString } from "./internal/string.ts";
import { createTimeDurationFromSeconds } from "./internal/timeDuration.ts";
import {
	addDaysToIsoDate,
	compareIsoDate,
	createIsoDateRecord,
	createTemporalDate,
	isValidIsoDate,
	padIsoYear,
	type IsoDateRecord,
} from "./PlainDate.ts";
import { combineIsoDateAndTimeRecord } from "./PlainDateTime.ts";
import { midnightTimeRecord } from "./PlainTime.ts";

const internalSlotBrand = /*#__PURE__*/ Symbol();
interface PlainYearMonthSlot {
	$isoDate: IsoDateRecord;
	$calendar: SupportedCalendars;
	[internalSlotBrand]: unknown;
}

interface IsoYearMonthRecord {
	$year: number;
	$month: number;
}

const slots = new WeakMap<any, PlainYearMonthSlot>();

/** `ToTemporalYearMonth` */
function toTemporalYearMonth(item: unknown, options?: unknown): PlainYearMonth {
	if (isObject(item)) {
		const slot = getInternalSlotForPlainYearMonth(item);
		if (slot) {
			getTemporalOverflowOption(getOptionsObject(options));
			return createTemporalYearMonth(slot.$isoDate, slot.$calendar);
		}
		const calendar = getTemporalCalendarIdentifierWithIsoDefault(item);
		const fields = prepareCalendarFields(
			calendar,
			item,
			[calendarFieldKeys.$year, calendarFieldKeys.$month, calendarFieldKeys.$monthCode],
			[],
		);
		return createTemporalYearMonth(
			calendarYearMonthFromFields(
				calendar,
				fields,
				getTemporalOverflowOption(getOptionsObject(options)),
			),
			calendar,
		);
	}
	validateString(item);
	const result = parseIsoDateTime(item, [temporalYearMonthStringRegExp]);
	const calendar = canonicalizeCalendar(result.$calendar || "iso8601");
	getTemporalOverflowOption(getOptionsObject(options));
	assertNotUndefined(result.$year);
	const isoDate = createIsoDateRecord(result.$year, result.$month, result.$day);
	if (!isoYearMonthWithinLimits(isoDate)) {
		throw new RangeError(outOfBoundsDate);
	}
	return createTemporalYearMonth(
		calendarYearMonthFromFields(
			calendar,
			isoDateToFields(calendar, isoDate, YEAR_MONTH),
			overflowConstrain,
		),
		calendar,
	);
}

/** `ISOYearMonthWithinLimits` */
export function isoYearMonthWithinLimits(isoDate: IsoDateRecord): boolean {
	return (
		isWithin(isoDate.$year, -271821, 275760) &&
		(isoDate.$year !== -271821 || isoDate.$month >= 4) &&
		(isoDate.$year !== 275760 || isoDate.$month <= 9)
	);
}

/** `BalanceISOYearMonth` */
export function balanceIsoYearMonth(year: number, month: number): IsoYearMonthRecord {
	return {
		$year: year + divFloor(month - 1, 12),
		$month: modFloor(month - 1, 12) + 1,
	};
}

/** `CreateTemporalYearMonth` */
export function createTemporalYearMonth(
	isoDate: IsoDateRecord,
	calendar: SupportedCalendars,
	instance = Object.create(PlainYearMonth.prototype) as PlainYearMonth,
): PlainYearMonth {
	if (!isoYearMonthWithinLimits(isoDate)) {
		throw new RangeError(outOfBoundsDate);
	}
	slots.set(instance, createPlainYearMonthSlot(isoDate, calendar));
	return instance;
}

/** `TemporalYearMonthToString` */
function temporalYearMonthToString(
	yearMonthSlot: PlainYearMonthSlot,
	showCalendar: ShowCalendarName,
): string {
	return `${padIsoYear(yearMonthSlot.$isoDate.$year)}-${toZeroPaddedDecimalString(yearMonthSlot.$isoDate.$month, 2)}${
		showCalendar === showCalendarName.$always ||
		showCalendar === showCalendarName.$critical ||
		yearMonthSlot.$calendar !== "iso8601"
			? `-${toZeroPaddedDecimalString(yearMonthSlot.$isoDate.$day, 2)}`
			: ""
	}${formatCalendarAnnotation(yearMonthSlot.$calendar, showCalendar)}`;
}

/** `DifferenceTemporalPlainYearMonth` */
function differenceTemporalPlainYearMonth(
	operationSign: 1 | -1,
	yearMonth: PlainYearMonthSlot,
	other: unknown,
	options: unknown,
): Duration {
	const otherSlot = getInternalSlotOrThrowForPlainYearMonth(toTemporalYearMonth(other));
	if (!calendarEquals(yearMonth.$calendar, otherSlot.$calendar)) {
		throw new RangeError(calendarMismatch);
	}
	const settings = getDifferenceSettings(
		operationSign,
		getOptionsObject(options),
		DATE,
		["week", "day"],
		"month",
		"year",
	);
	if (!compareIsoDate(yearMonth.$isoDate, otherSlot.$isoDate)) {
		return createTemporalDuration(createTemporalDurationSlot(0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
	}
	const thisFields = isoDateToFields(yearMonth.$calendar, yearMonth.$isoDate, YEAR_MONTH);
	thisFields.day = 1;
	const thisDate = calendarDateFromFields(yearMonth.$calendar, thisFields, overflowConstrain);
	const otherFields = isoDateToFields(yearMonth.$calendar, otherSlot.$isoDate, YEAR_MONTH);
	otherFields.day = 1;
	const otherDate = calendarDateFromFields(yearMonth.$calendar, otherFields, overflowConstrain);

	let duration = combineDateAndTimeDuration(
		adjustDateDurationRecord(
			calendarDateUntil(yearMonth.$calendar, thisDate, otherDate, settings.$largestUnit),
			0,
			0,
		),
		createTimeDurationFromSeconds(0),
	);
	if (settings.$smallestUnit !== "month" || settings.$roundingIncrement !== 1) {
		const isoDateTime = combineIsoDateAndTimeRecord(thisDate, midnightTimeRecord());
		duration = roundRelativeDuration(
			duration,
			getUtcEpochNanoseconds(isoDateTime),
			getUtcEpochNanoseconds(combineIsoDateAndTimeRecord(otherDate, midnightTimeRecord())),
			isoDateTime,
			undefined,
			yearMonth.$calendar,
			settings.$largestUnit,
			settings.$roundingIncrement,
			settings.$smallestUnit,
			settings.$roundingMode,
		);
	}
	return createTemporalDuration(
		applySignToDurationSlot(temporalDurationFromInternal(duration, "day"), operationSign),
	);
}

/** `AddDurationToYearMonth` */
function addDurationToYearMonth(
	operationSign: 1 | -1,
	yearMonth: PlainYearMonthSlot,
	temporalDurationLike: unknown,
	options: unknown,
): PlainYearMonth {
	const duration = applySignToDurationSlot(toTemporalDuration(temporalDurationLike), operationSign);
	const overflow = getTemporalOverflowOption(getOptionsObject(options));
	const fields = isoDateToFields(yearMonth.$calendar, yearMonth.$isoDate, YEAR_MONTH);
	fields.day = 1;
	const intermediateDate = calendarDateFromFields(yearMonth.$calendar, fields, overflowConstrain);
	return createTemporalYearMonth(
		calendarYearMonthFromFields(
			yearMonth.$calendar,
			isoDateToFields(
				yearMonth.$calendar,
				calendarDateAdd(
					yearMonth.$calendar,
					durationSign(duration) < 0
						? addDaysToIsoDate(
								calendarDateAdd(
									yearMonth.$calendar,
									intermediateDate,
									createDateDurationRecord(0, 1, 0, 0),
									overflowConstrain,
								),
								-1,
							)
						: intermediateDate,
					toDateDurationRecordWithoutTime(duration),
					overflow,
				),
				YEAR_MONTH,
			),
			overflow,
		),
		yearMonth.$calendar,
	);
}

function createPlainYearMonthSlot(
	isoDate: IsoDateRecord,
	calendar: SupportedCalendars,
): PlainYearMonthSlot {
	return {
		$isoDate: isoDate,
		$calendar: calendar,
	} as PlainYearMonthSlot;
}

export function getInternalSlotForPlainYearMonth(
	plainDateTime: unknown,
): PlainYearMonthSlot | undefined {
	return slots.get(plainDateTime);
}

function getInternalSlotOrThrowForPlainYearMonth(plainDateTime: unknown): PlainYearMonthSlot {
	const slot = getInternalSlotForPlainYearMonth(plainDateTime);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

export function isPlainYearMonth(item: unknown): boolean {
	return !!getInternalSlotForPlainYearMonth(item);
}

export class PlainYearMonth {
	constructor(
		isoYear: unknown,
		isoMonth: unknown,
		calendar: unknown = "iso8601",
		referenceIsoDay: unknown = 1,
	) {
		if (!new.target) {
			throw new TypeError();
		}
		const y = toIntegerWithTruncation(isoYear);
		const m = toIntegerWithTruncation(isoMonth);
		validateString(calendar);
		const canonicalizedCalendar = canonicalizeCalendar(calendar);
		const ref = toIntegerWithTruncation(referenceIsoDay);
		if (!isValidIsoDate(y, m, ref)) {
			throw new RangeError(invalidDateTime);
		}
		createTemporalYearMonth(createIsoDateRecord(y, m, ref), canonicalizedCalendar, this);
	}
	static from(item: unknown, options: unknown = undefined) {
		return toTemporalYearMonth(item, options);
	}
	static compare(one: unknown, two: unknown) {
		return compareIsoDate(
			getInternalSlotOrThrowForPlainYearMonth(toTemporalYearMonth(one)).$isoDate,
			getInternalSlotOrThrowForPlainYearMonth(toTemporalYearMonth(two)).$isoDate,
		);
	}
	get calendarId() {
		return getInternalSlotOrThrowForPlainYearMonth(this).$calendar;
	}
	get era() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$era;
	}
	get eraYear() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$eraYear;
	}
	get year() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$year;
	}
	get month() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$month;
	}
	get monthCode() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$monthCode;
	}
	get daysInYear() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$daysInYear;
	}
	get daysInMonth() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$daysInMonth;
	}
	get monthsInYear() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$monthsInYear;
	}
	get inLeapYear() {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		return calendarIsoToDate(slot.$calendar, slot.$isoDate).$inLeapYear;
	}
	with(temporalYearMonthLike: unknown, options: unknown = undefined) {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		if (!isPartialTemporalObject(temporalYearMonthLike)) {
			throw new TypeError();
		}
		const fields = calendarMergeFields(
			slot.$calendar,
			isoDateToFields(slot.$calendar, slot.$isoDate, YEAR_MONTH),
			prepareCalendarFields(slot.$calendar, temporalYearMonthLike as object, [
				calendarFieldKeys.$year,
				calendarFieldKeys.$month,
				calendarFieldKeys.$monthCode,
			]),
		);
		return createTemporalYearMonth(
			calendarYearMonthFromFields(
				slot.$calendar,
				fields,
				getTemporalOverflowOption(getOptionsObject(options)),
			),
			slot.$calendar,
		);
	}
	add(temporalDurationLike: unknown, options: unknown = undefined) {
		return addDurationToYearMonth(
			1,
			getInternalSlotOrThrowForPlainYearMonth(this),
			temporalDurationLike,
			options,
		);
	}
	subtract(temporalDurationLike: unknown, options: unknown = undefined) {
		return addDurationToYearMonth(
			-1,
			getInternalSlotOrThrowForPlainYearMonth(this),
			temporalDurationLike,
			options,
		);
	}
	until(other: unknown, options: unknown = undefined) {
		return differenceTemporalPlainYearMonth(
			1,
			getInternalSlotOrThrowForPlainYearMonth(this),
			other,
			options,
		);
	}
	since(other: unknown, options: unknown = undefined) {
		return differenceTemporalPlainYearMonth(
			-1,
			getInternalSlotOrThrowForPlainYearMonth(this),
			other,
			options,
		);
	}
	equals(other: unknown) {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		const otherSlot = getInternalSlotOrThrowForPlainYearMonth(toTemporalYearMonth(other));
		return (
			compareIsoDate(slot.$isoDate, otherSlot.$isoDate) === 0 &&
			slot.$calendar === otherSlot.$calendar
		);
	}
	toString(options: unknown = undefined) {
		return temporalYearMonthToString(
			getInternalSlotOrThrowForPlainYearMonth(this),
			getTemporalShowCalendarNameOption(getOptionsObject(options)),
		);
	}
	toLocaleString(locales: unknown = undefined, options: unknown = undefined) {
		getInternalSlotOrThrowForPlainYearMonth(this);
		return formatDateTime(createDateTimeFormat(locales, options, DATE), this);
	}
	toJSON() {
		return temporalYearMonthToString(
			getInternalSlotOrThrowForPlainYearMonth(this),
			showCalendarName.$auto,
		);
	}
	valueOf() {
		throw new TypeError();
	}
	toPlainDate(item: unknown) {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		if (!isObject(item)) {
			throw new TypeError();
		}
		return createTemporalDate(
			calendarDateFromFields(
				slot.$calendar,
				calendarMergeFields(
					slot.$calendar,
					isoDateToFields(slot.$calendar, slot.$isoDate, YEAR_MONTH),
					prepareCalendarFields(slot.$calendar, item, [calendarFieldKeys.$day], []),
				),
				overflowConstrain,
			),
			slot.$calendar,
		);
	}
}

defineStringTag(PlainYearMonth.prototype, "Temporal.PlainYearMonth");
renameFunction(PlainYearMonth, "PlainYearMonth");
