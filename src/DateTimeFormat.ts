import { getInternalSlotOrThrowForInstant, isInstant } from "./Instant.ts";
import { getUtcEpochNanoseconds } from "./internal/abstractOperations.ts";
import { toBoolean, toNumber, toString } from "./internal/ecmascript.ts";
import { DATE, DATETIME, TIME } from "./internal/enum.ts";
import { epochMilliseconds } from "./internal/epochNanoseconds.ts";
import {
	calendarMismatch,
	disallowedField,
	invalidFormattingOptions,
	invalidMethodCall,
	notFormattable,
	temporalTypeMismatch,
} from "./internal/errorMessages.ts";
import { createNullPrototypeObject, isObject, pickObject } from "./internal/object.ts";
import { defineStringTag } from "./internal/property.ts";
import { mapUnlessUndefined, throwRangeError, throwTypeError } from "./internal/utils.ts";
import { createIsoDateRecord, getInternalSlotForPlainDate, isPlainDate } from "./PlainDate.ts";
import {
	combineIsoDateAndTimeRecord,
	getInternalSlotForPlainDateTime,
	isPlainDateTime,
} from "./PlainDateTime.ts";
import { getInternalSlotForPlainMonthDay, isPlainMonthDay } from "./PlainMonthDay.ts";
import {
	getInternalSlotOrThrowForPlainTime,
	isPlainTime,
	midnightTimeRecord,
} from "./PlainTime.ts";
import { getInternalSlotForPlainYearMonth, isPlainYearMonth } from "./PlainYearMonth.ts";
import { isZonedDateTime } from "./ZonedDateTime.ts";

export const OriginalDateTimeFormat = globalThis.Intl.DateTimeFormat;
type RawDTF = InstanceType<typeof OriginalDateTimeFormat>;

const internalSlotBrand = /*#__PURE__*/ Symbol();

interface DateTimeFormatSlot {
	$rawDtf: RawDTF;
	$locale: string;
	$originalOptions: Intl.DateTimeFormatOptions;
	$boundFormatFunction?: ((date: unknown) => string) | undefined;
	$rawDtfForPlainDate?: Intl.DateTimeFormat;
	$rawDtfForPlainTime?: Intl.DateTimeFormat;
	$rawDtfForPlainDateTime?: Intl.DateTimeFormat;
	$rawDtfForPlainYearMonth?: Intl.DateTimeFormat;
	$rawDtfForPlainMonthDay?: Intl.DateTimeFormat;
	$rawDtfForInstant?: Intl.DateTimeFormat;
	[internalSlotBrand]: unknown;
}

const dtfOptionsKeys: string[] = [];
new OriginalDateTimeFormat(
	undefined,
	new Proxy(
		{},
		{
			get(_, p) {
				dtfOptionsKeys.push(p as string);
			},
		},
	),
);

const slots = new WeakMap<any, DateTimeFormatSlot>();

export function getInternalSlotOrThrowForDateTimeFormat(dtf: any): DateTimeFormatSlot {
	const slot = slots.get(dtf);
	if (!slot) {
		throwTypeError(invalidMethodCall);
	}
	return slot;
}

export function formatDateTime(dtf: DateTimeFormatImpl, date: unknown): string {
	const [rawDtf, value] = handleDateTimeValue(getInternalSlotOrThrowForDateTimeFormat(dtf), date);
	return rawDtf.format(value as any);
}

function formatDateTimeToParts(dtf: DateTimeFormatImpl, date: unknown): Intl.DateTimeFormatPart[] {
	const slot = getInternalSlotOrThrowForDateTimeFormat(dtf);
	const [rawDtf, value] = handleDateTimeValue(slot, date);
	return rawDtf.formatToParts(value as any);
}

function formatDateTimeRange(dtf: DateTimeFormatImpl, x: unknown, y: unknown): string {
	const slot = getInternalSlotOrThrowForDateTimeFormat(dtf);
	validateSameTemporalType(x, y);
	const [rawDtf, value1] = handleDateTimeValue(slot, x);
	return rawDtf.formatRange(value1 as any, handleDateTimeValue(slot, y)[1] as any);
}

function formatDateTimeRangeToParts(
	dtf: DateTimeFormatImpl,
	x: unknown,
	y: unknown,
): Intl.DateTimeRangeFormatPart[] {
	const slot = getInternalSlotOrThrowForDateTimeFormat(dtf);
	validateSameTemporalType(x, y);
	const [rawDtf, value1] = handleDateTimeValue(slot, x);
	return rawDtf.formatRangeToParts(value1 as any, handleDateTimeValue(slot, y)[1] as any);
}

function removeDateTimeFormatOptions(
	options: Intl.DateTimeFormatOptions,
	keys: (keyof Intl.DateTimeFormatOptions)[],
) {
	for (const key of keys) {
		options[key] = undefined;
	}
}

const dateKeys = ["year", "month", "day", "weekday", "dateStyle"] as const;
const timeKeys = [
	"hour",
	"minute",
	"second",
	"fractionalSecondDigits",
	"dayPeriod",
	"timeStyle",
] as const;

function dateStyleToMonthStyle(
	dateStyle: Exclude<Intl.DateTimeFormatOptions["dateStyle"], undefined>,
): Exclude<Intl.DateTimeFormatOptions["month"], undefined> {
	return dateStyle === "short" ? "numeric" : dateStyle === "medium" ? "short" : "long";
}

function amendOptionsForPlainDate(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (!hasAnyOptions(originalOptions, dateKeys)) {
		if (hasAnyOptions(originalOptions, timeKeys)) {
			throwTypeError(invalidFormattingOptions);
		}
		newOptions.year = newOptions.month = newOptions.day = "numeric";
	}
	removeDateTimeFormatOptions(newOptions, [...timeKeys, "timeZoneName"]);
	newOptions.timeZone = "UTC";
	return newOptions;
}

function amendOptionsForPlainTime(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (!hasAnyOptions(originalOptions, timeKeys)) {
		if (hasAnyOptions(originalOptions, dateKeys)) {
			throwTypeError(invalidFormattingOptions);
		}
		newOptions.hour = newOptions.minute = newOptions.second = "numeric";
	}
	if (originalOptions.timeStyle === "long" || originalOptions.timeStyle === "full") {
		// stop displaying time zone name
		removeDateTimeFormatOptions(newOptions, ["timeStyle"]);
		newOptions.hour = newOptions.minute = newOptions.second = "numeric";
	}
	removeDateTimeFormatOptions(newOptions, [...dateKeys, "era", "timeZoneName"]);
	newOptions.timeZone = "UTC";
	return newOptions;
}

function amendOptionsForPlainDateTime(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (originalOptions.timeStyle === "long" || originalOptions.timeStyle === "full") {
		// stop displaying time zone name
		removeDateTimeFormatOptions(newOptions, ["timeStyle"]);
		newOptions.hour = newOptions.minute = newOptions.second = "numeric";
		if (originalOptions.dateStyle) {
			removeDateTimeFormatOptions(newOptions, ["dateStyle"]);
			newOptions.year = newOptions.day = "numeric";
			newOptions.month = dateStyleToMonthStyle(originalOptions.dateStyle);
			newOptions.weekday = originalOptions.dateStyle === "full" ? "long" : undefined;
		}
	}
	if (!hasAnyOptions(originalOptions, [...dateKeys, ...timeKeys])) {
		newOptions.year =
			newOptions.month =
			newOptions.day =
			newOptions.hour =
			newOptions.minute =
			newOptions.second =
				"numeric";
	}
	removeDateTimeFormatOptions(newOptions, ["timeZoneName"]);
	newOptions.timeZone = "UTC";
	return newOptions;
}

function amendOptionsForPlainYearMonth(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (originalOptions.dateStyle) {
		removeDateTimeFormatOptions(newOptions, ["dateStyle"]);
		newOptions.year = originalOptions.dateStyle === "short" ? "2-digit" : "numeric";
		newOptions.month = dateStyleToMonthStyle(originalOptions.dateStyle);
	}
	if (!hasAnyOptions(originalOptions, ["year", "month", "dateStyle"])) {
		if (hasAnyOptions(originalOptions, [...dateKeys, ...timeKeys])) {
			throwTypeError(invalidFormattingOptions);
		}
		newOptions.year = newOptions.month = "numeric";
	}
	removeDateTimeFormatOptions(newOptions, [...timeKeys, "day", "weekday", "timeZoneName"]);
	newOptions.timeZone = "UTC";
	return newOptions;
}

function amendOptionsForPlainMonthDay(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (originalOptions.dateStyle) {
		removeDateTimeFormatOptions(newOptions, ["dateStyle"]);
		newOptions.month = dateStyleToMonthStyle(originalOptions.dateStyle);
		newOptions.day = "numeric";
	}
	if (!hasAnyOptions(originalOptions, ["month", "day", "dateStyle"])) {
		if (hasAnyOptions(originalOptions, [...dateKeys, ...timeKeys])) {
			throwTypeError(invalidFormattingOptions);
		}
		newOptions.month = newOptions.day = "numeric";
	}
	removeDateTimeFormatOptions(newOptions, [...timeKeys, "era", "year", "weekday", "timeZoneName"]);
	newOptions.timeZone = "UTC";
	return newOptions;
}

function amendOptionsForInstant(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (!hasAnyOptions(originalOptions, [...dateKeys, ...timeKeys])) {
		newOptions.year =
			newOptions.month =
			newOptions.day =
			newOptions.hour =
			newOptions.minute =
			newOptions.second =
				"numeric";
	}
	return newOptions;
}

function hasAnyOptions(
	options: Intl.DateTimeFormatOptions,
	keys: readonly (keyof Intl.DateTimeFormatOptions)[],
): boolean {
	return keys.some((k) => options[k] !== undefined);
}

/** `CreateDateTimeFormat` */
export function createDateTimeFormat(
	locales: unknown,
	options: {} | null = createNullPrototypeObject({}),
	required: typeof DATE | typeof TIME | typeof DATETIME,
	toLocaleStringTimeZone?: string,
	instance = Object.create(DateTimeFormatImpl.prototype) as DateTimeFormatImpl,
): DateTimeFormatImpl {
	if (options === null) {
		throwTypeError(invalidFormattingOptions);
	}
	const copiedOptions = pickObject(Object(options), dtfOptionsKeys);
	// coerce first to avoid accessing userland objects (e.g. `toString` method) twice
	copiedOptions["hour12"] = mapUnlessUndefined(copiedOptions["hour12"], toBoolean);
	copiedOptions["hourCycle"] = mapUnlessUndefined(copiedOptions["hourCycle"], toString);
	copiedOptions["formatMatcher"] = mapUnlessUndefined(copiedOptions["formatMatcher"], toString);
	// for `Temporal.ZonedDateTime.prototype.toLocaleString`
	if (toLocaleStringTimeZone !== undefined) {
		if (copiedOptions["timeZone"] !== undefined) {
			throwTypeError(disallowedField("timeZone"));
		}
		copiedOptions["timeZone"] = toLocaleStringTimeZone;
		if (!hasAnyOptions(copiedOptions, [...dateKeys, ...timeKeys, "timeZoneName"])) {
			copiedOptions["timeZoneName"] = "short";
		}
	}
	const rawDtf = new OriginalDateTimeFormat(locales as any, copiedOptions);
	const resolvedOptions = rawDtf.resolvedOptions();
	// `resolvedOptions` returns almost same to original options
	const coercedOriginalOptions = createNullPrototypeObject(resolvedOptions);
	for (const key of Object.keys(coercedOriginalOptions)) {
		if (copiedOptions[key] === undefined) {
			(coercedOriginalOptions as Record<string, any>)[key] = undefined;
		}
	}
	coercedOriginalOptions.hour12 = copiedOptions["hour12"];
	coercedOriginalOptions.hourCycle = copiedOptions["hourCycle"];
	coercedOriginalOptions.formatMatcher = copiedOptions["formatMatcher"];
	coercedOriginalOptions.timeZone = resolvedOptions.timeZone;
	coercedOriginalOptions.calendar = resolvedOptions.calendar;

	if (
		(required === DATE && coercedOriginalOptions["timeStyle"]) ||
		(required === TIME && coercedOriginalOptions["dateStyle"])
	) {
		throwTypeError(invalidFormattingOptions);
	}
	slots.set(
		instance,
		createNullPrototypeObject({
			$rawDtf: rawDtf,
			$originalOptions: coercedOriginalOptions as Intl.DateTimeFormatOptions,
			$locale: rawDtf.resolvedOptions().locale,
		}) as DateTimeFormatSlot,
	);
	return instance;
}

/** `SameTemporalType` */
function validateSameTemporalType(x: unknown, y: unknown) {
	if (
		[
			isPlainDate,
			isPlainTime,
			isPlainDateTime,
			isZonedDateTime,
			isInstant,
			isPlainYearMonth,
			isPlainMonthDay,
		].some((f) => f(x) !== f(y))
	) {
		throwTypeError(temporalTypeMismatch);
	}
}

/** `IsTemporalObject` */
function isTemporalObject(x: unknown) {
	return (
		isObject(x) &&
		(isPlainDate(x) ||
			isPlainTime(x) ||
			isPlainDateTime(x) ||
			isZonedDateTime(x) ||
			isPlainYearMonth(x) ||
			isPlainMonthDay(x) ||
			isInstant(x))
	);
}

/** `ToDateTimeFormattable` */
function toDateTimeFormattable(x: unknown) {
	return isTemporalObject(x) ? x : toNumber(x);
}

/** `HandleDateTimeValue` */
function handleDateTimeValue(dateTimeFormat: DateTimeFormatSlot, x: unknown): [RawDTF, number] {
	const plainDateSlot = getInternalSlotForPlainDate(x);
	const plainDateTimeSlot = getInternalSlotForPlainDateTime(x);
	const plainYearMonthSlot = getInternalSlotForPlainYearMonth(x);
	const plainMonthDaySlot = getInternalSlotForPlainMonthDay(x);
	if (isPlainTime(x)) {
		return [
			(dateTimeFormat.$rawDtfForPlainTime ||= new OriginalDateTimeFormat(
				dateTimeFormat.$locale,
				amendOptionsForPlainTime(dateTimeFormat.$originalOptions),
			)),
			epochMilliseconds(
				getUtcEpochNanoseconds(
					combineIsoDateAndTimeRecord(
						createIsoDateRecord(1970, 1, 1),
						getInternalSlotOrThrowForPlainTime(x),
					),
				),
			),
		];
	}
	if (plainDateSlot) {
		if (
			plainDateSlot.$calendar !== dateTimeFormat.$originalOptions.calendar &&
			plainDateSlot.$calendar !== "iso8601"
		) {
			throwRangeError(calendarMismatch);
		}
		return [
			(dateTimeFormat.$rawDtfForPlainDate ||= new OriginalDateTimeFormat(
				dateTimeFormat.$locale,
				amendOptionsForPlainDate(dateTimeFormat.$originalOptions),
			)),
			epochMilliseconds(
				getUtcEpochNanoseconds(
					combineIsoDateAndTimeRecord(plainDateSlot.$isoDate, midnightTimeRecord()),
				),
			),
		];
	}
	if (plainDateTimeSlot) {
		if (
			plainDateTimeSlot.$calendar !== dateTimeFormat.$originalOptions.calendar &&
			plainDateTimeSlot.$calendar !== "iso8601"
		) {
			throwRangeError(calendarMismatch);
		}
		return [
			(dateTimeFormat.$rawDtfForPlainDateTime ||= new OriginalDateTimeFormat(
				dateTimeFormat.$locale,
				amendOptionsForPlainDateTime(dateTimeFormat.$originalOptions),
			)),
			epochMilliseconds(getUtcEpochNanoseconds(plainDateTimeSlot.$isoDateTime)),
		];
	}
	if (plainYearMonthSlot) {
		if (plainYearMonthSlot.$calendar !== dateTimeFormat.$originalOptions.calendar) {
			throwRangeError(calendarMismatch);
		}
		return [
			(dateTimeFormat.$rawDtfForPlainYearMonth ||= new OriginalDateTimeFormat(
				dateTimeFormat.$locale,
				amendOptionsForPlainYearMonth(dateTimeFormat.$originalOptions),
			)),
			epochMilliseconds(
				getUtcEpochNanoseconds(
					combineIsoDateAndTimeRecord(plainYearMonthSlot.$isoDate, midnightTimeRecord()),
				),
			),
		];
	}
	if (plainMonthDaySlot) {
		if (plainMonthDaySlot.$calendar !== dateTimeFormat.$originalOptions.calendar) {
			throwRangeError(calendarMismatch);
		}
		return [
			(dateTimeFormat.$rawDtfForPlainMonthDay ||= new OriginalDateTimeFormat(
				dateTimeFormat.$locale,
				amendOptionsForPlainMonthDay(dateTimeFormat.$originalOptions),
			)),
			epochMilliseconds(
				getUtcEpochNanoseconds(
					combineIsoDateAndTimeRecord(plainMonthDaySlot.$isoDate, midnightTimeRecord()),
				),
			),
		];
	}
	if (isInstant(x)) {
		return [
			(dateTimeFormat.$rawDtfForInstant ||= new OriginalDateTimeFormat(
				dateTimeFormat.$locale,
				amendOptionsForInstant(dateTimeFormat.$originalOptions),
			)),
			epochMilliseconds(getInternalSlotOrThrowForInstant(x).$epochNanoseconds),
		];
	}
	if (isZonedDateTime(x)) {
		throwTypeError(notFormattable);
	}
	return [dateTimeFormat.$rawDtf, x as any];
}

class TmpClass {
	// make `format` function not work as constructor
	/** DateTime Format Functions */
	$dateTimeFormatFunction(this: DateTimeFormatImpl, date: unknown): string {
		return formatDateTime(this, date);
	}
}

export class DateTimeFormatImpl {
	constructor(locales: unknown, options: unknown) {
		createDateTimeFormat(locales, options, DATETIME, undefined, this);
	}
	get format() {
		return Object.defineProperty(
			(getInternalSlotOrThrowForDateTimeFormat(this).$boundFormatFunction ||=
				TmpClass.prototype.$dateTimeFormatFunction.bind(this)),
			"name",
			{ value: "" },
		);
	}
	formatToParts(date: unknown) {
		return formatDateTimeToParts(this, date);
	}
	formatRange(startDate: unknown, endDate: unknown) {
		if (startDate === undefined || endDate === undefined) {
			throwTypeError(notFormattable);
		}
		return formatDateTimeRange(
			this,
			toDateTimeFormattable(startDate),
			toDateTimeFormattable(endDate),
		);
	}
	formatRangeToParts(startDate: unknown, endDate: unknown) {
		if (startDate === undefined || endDate === undefined) {
			throwTypeError(notFormattable);
		}
		return formatDateTimeRangeToParts(
			this,
			toDateTimeFormattable(startDate),
			toDateTimeFormattable(endDate),
		);
	}
	resolvedOptions() {
		return getInternalSlotOrThrowForDateTimeFormat(this).$rawDtf.resolvedOptions();
	}
}

export function DateTimeFormat(locale: unknown, options: unknown) {
	return new DateTimeFormatImpl(locale, options);
}

const dtfDescriptors = Object.getOwnPropertyDescriptors(Intl.DateTimeFormat);
dtfDescriptors.prototype.value = DateTimeFormatImpl.prototype;
Object.defineProperties(DateTimeFormat, dtfDescriptors);
DateTimeFormat.prototype.constructor = DateTimeFormat;
defineStringTag(DateTimeFormat.prototype, "Intl.DateTimeFormat");
