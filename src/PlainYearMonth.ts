import { createDateTimeFormat, formatDateTime } from "./DateTimeFormat.ts";
import {
	adjustDateDurationRecord,
	applySignToDurationSlot,
	combineDateAndTimeDuration,
	createTemporalDuration,
	createTemporalDurationSlot,
	Duration,
	roundRelativeDuration,
	temporalDurationFromInternal,
	toInternalDurationRecord,
	toTemporalDuration,
} from "./Duration.ts";
import {
	getDifferenceSettings,
	getTemporalOverflowOption,
	getTemporalShowCalendarNameOption,
	getUtcEpochNanoseconds,
	isoDateToFields,
	validatePartialTemporalObject,
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
import {
	calendarMismatch,
	forbiddenValueOf,
	invalidDateTime,
	invalidMethodCall,
	notObject,
	outOfBoundsDate,
	yearMonthAddition,
} from "./internal/errorMessages.ts";
import { divFloor, isWithin, modFloor } from "./internal/math.ts";
import { createNullPrototypeObject, isObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { toZeroPaddedDecimalString } from "./internal/string.ts";
import { createTimeDurationFromSeconds, signTimeDuration } from "./internal/timeDuration.ts";
import { Unit } from "./internal/unit.ts";
import { throwRangeError, throwTypeError } from "./internal/utils.ts";
import {
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
	return createTemporalYearMonth(
		calendarYearMonthFromFields(
			calendar,
			isoDateToFields(
				calendar,
				validateIsoYearMonth(createIsoDateRecord(result.$year, result.$month, result.$day)),
				YEAR_MONTH,
			),
			overflowConstrain,
		),
		calendar,
	);
}

/** `ISOYearMonthWithinLimits` */
function isoYearMonthWithinLimits(isoDate: IsoDateRecord): boolean {
	return isWithin(isoDate.$year * 12 + isoDate.$month, -3261848, 3309129);
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
	slots.set(instance, {
		$isoDate: validateIsoYearMonth(isoDate),
		$calendar: calendar,
	} as PlainYearMonthSlot);
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
		throwRangeError(calendarMismatch);
	}
	const settings = getDifferenceSettings(
		operationSign,
		getOptionsObject(options),
		DATE,
		[Unit.Week, Unit.Day],
		Unit.Month,
		Unit.Year,
	);
	if (!compareIsoDate(yearMonth.$isoDate, otherSlot.$isoDate)) {
		return createTemporalDuration(createTemporalDurationSlot([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
	}
	const thisDate = calendarDateFromFields(
		yearMonth.$calendar,
		createNullPrototypeObject({
			...isoDateToFields(yearMonth.$calendar, yearMonth.$isoDate, YEAR_MONTH),
			[calendarFieldKeys.$day]: 1,
		}),
		overflowConstrain,
	);
	const otherDate = calendarDateFromFields(
		yearMonth.$calendar,
		createNullPrototypeObject({
			...isoDateToFields(yearMonth.$calendar, otherSlot.$isoDate, YEAR_MONTH),
			[calendarFieldKeys.$day]: 1,
		}),
		overflowConstrain,
	);

	let duration = combineDateAndTimeDuration(
		adjustDateDurationRecord(
			calendarDateUntil(yearMonth.$calendar, thisDate, otherDate, settings.$largestUnit),
			0,
			0,
		),
		createTimeDurationFromSeconds(0),
	);
	if (settings.$smallestUnit !== Unit.Month || settings.$roundingIncrement !== 1) {
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
		applySignToDurationSlot(temporalDurationFromInternal(duration, Unit.Day), operationSign),
	);
}

/** `AddDurationToYearMonth` */
function addDurationToYearMonth(
	operationSign: 1 | -1,
	yearMonth: PlainYearMonthSlot,
	temporalDurationLike: unknown,
	options: unknown,
): PlainYearMonth {
	const internalDuration = toInternalDurationRecord(
		applySignToDurationSlot(toTemporalDuration(temporalDurationLike), operationSign),
	);
	const overflow = getTemporalOverflowOption(getOptionsObject(options));
	if (
		internalDuration.$date.$weeks ||
		internalDuration.$date.$days ||
		signTimeDuration(internalDuration.$time)
	) {
		throwRangeError(yearMonthAddition);
	}
	return createTemporalYearMonth(
		calendarYearMonthFromFields(
			yearMonth.$calendar,
			isoDateToFields(
				yearMonth.$calendar,
				calendarDateAdd(
					yearMonth.$calendar,
					calendarDateFromFields(
						yearMonth.$calendar,
						createNullPrototypeObject({
							...isoDateToFields(yearMonth.$calendar, yearMonth.$isoDate, YEAR_MONTH),
							[calendarFieldKeys.$day]: 1,
						}),
						overflowConstrain,
					),
					internalDuration.$date,
					overflow,
				),
				YEAR_MONTH,
			),
			overflow,
		),
		yearMonth.$calendar,
	);
}

export function validateIsoYearMonth(isoDate: IsoDateRecord) {
	if (!isoYearMonthWithinLimits(isoDate)) {
		throwRangeError(outOfBoundsDate);
	}
	return isoDate;
}

export function getInternalSlotForPlainYearMonth(
	plainDateTime: unknown,
): PlainYearMonthSlot | undefined {
	return slots.get(plainDateTime);
}

function getInternalSlotOrThrowForPlainYearMonth(plainDateTime: unknown): PlainYearMonthSlot {
	const slot = getInternalSlotForPlainYearMonth(plainDateTime);
	if (!slot) {
		throwTypeError(invalidMethodCall);
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
		const y = toIntegerWithTruncation(isoYear);
		const m = toIntegerWithTruncation(isoMonth);
		validateString(calendar);
		const canonicalizedCalendar = canonicalizeCalendar(calendar);
		const ref = toIntegerWithTruncation(referenceIsoDay);
		if (!isValidIsoDate(y, m, ref)) {
			throwRangeError(invalidDateTime);
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
		validatePartialTemporalObject(temporalYearMonthLike);
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
		throwTypeError(forbiddenValueOf);
	}
	toPlainDate(item: unknown) {
		const slot = getInternalSlotOrThrowForPlainYearMonth(this);
		if (!isObject(item)) {
			throwTypeError(notObject(item));
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
