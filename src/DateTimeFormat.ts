import { getInternalSlotForInstant, isInstant } from "./Instant.ts";
import { getUtcEpochNanoseconds } from "./internal/abstractOperations.ts";
import { toBoolean, toString } from "./internal/ecmascript.ts";
import { DATE, DATETIME, TIME } from "./internal/enum.ts";
import { epochMilliseconds } from "./internal/epochNanoseconds.ts";
import { createNullPrototypeObject, pickObject } from "./internal/object.ts";
import { defineStringTag } from "./internal/property.ts";
import { mapUnlessUndefined } from "./internal/utils.ts";
import { createIsoDateRecord, getInternalSlotForPlainDate, isPlainDate } from "./PlainDate.ts";
import {
	combineIsoDateAndTimeRecord,
	getInternalSlotForPlainDateTime,
	isPlainDateTime,
} from "./PlainDateTime.ts";
import { getInternalSlotForPlainMonthDay, isPlainMonthDay } from "./PlainMonthDay.ts";
import { getInternalSlotForPlainTime, isPlainTime, midnightTimeRecord } from "./PlainTime.ts";
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

function createInternalSlot(
	rawDTF: RawDTF,
	originalOptions: Intl.DateTimeFormatOptions,
): DateTimeFormatSlot {
	return createNullPrototypeObject({
		$rawDtf: rawDTF,
		$originalOptions: originalOptions,
		$locale: rawDTF.resolvedOptions().locale,
	}) as DateTimeFormatSlot;
}

export function getInternalSlotOrThrowForDateTimeFormat(dtf: any): DateTimeFormatSlot {
	const slot = slots.get(dtf);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

export function formatDateTime(dtf: DateTimeFormatImpl, date: unknown): string {
	const [rawDtf, value] = handleDateTimeValue(getInternalSlotOrThrowForDateTimeFormat(dtf), date);
	return rawDtf.format(value as any);
}

/** DateTime Format Functions */
function dateTimeFormatFunction(this: DateTimeFormatImpl, date: unknown): string {
	return formatDateTime(this, date);
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
	const [, value2] = handleDateTimeValue(slot, y);
	return rawDtf.formatRange(value1 as any, value2 as any);
}

function formatDateTimeRangeToParts(
	dtf: DateTimeFormatImpl,
	x: unknown,
	y: unknown,
): Intl.DateTimeRangeFormatPart[] {
	const slot = getInternalSlotOrThrowForDateTimeFormat(dtf);
	validateSameTemporalType(x, y);
	const [rawDtf, value1] = handleDateTimeValue(slot, x);
	const [, value2] = handleDateTimeValue(slot, y);
	return rawDtf.formatRangeToParts(value1 as any, value2 as any);
}

function assignDateTimeFormatOptions(
	options: Intl.DateTimeFormatOptions,
	extra: Intl.DateTimeFormatOptions,
) {
	Object.assign(options, extra);
}

const dateKeys = ["year", "month", "day", "weekday"] as const;
const timeKeys = ["hour", "minute", "second", "fractionalSecondDigits", "dayPeriod"] as const;

function dateStyleToMonthStyle(
	dateStyle: Exclude<Intl.DateTimeFormatOptions["dateStyle"], undefined>,
): Exclude<Intl.DateTimeFormatOptions["month"], undefined> {
	return dateStyle === "short" ? "numeric" : dateStyle === "medium" ? "short" : "long";
}

function amendOptionsForPlainDate(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (!hasAnyOptions(originalOptions, [...dateKeys, "dateStyle"])) {
		if (hasAnyOptions(originalOptions, [...timeKeys, "timeStyle"])) {
			throw new TypeError();
		}
		assignDateTimeFormatOptions(newOptions, { year: "numeric", month: "numeric", day: "numeric" });
	}
	assignDateTimeFormatOptions(newOptions, {
		hour: undefined,
		minute: undefined,
		second: undefined,
		dayPeriod: undefined,
		timeZoneName: undefined,
		timeStyle: undefined,
		timeZone: "UTC",
	});
	return newOptions;
}

function amendOptionsForPlainTime(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (!hasAnyOptions(originalOptions, [...timeKeys, "timeStyle"])) {
		if (hasAnyOptions(originalOptions, [...dateKeys, "dateStyle"])) {
			throw new TypeError();
		}
		assignDateTimeFormatOptions(newOptions, {
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
		});
	}
	if (originalOptions.timeStyle === "long" || originalOptions.timeStyle === "full") {
		// stop displaying time zone name
		assignDateTimeFormatOptions(newOptions, {
			timeStyle: undefined,
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
		});
	}
	assignDateTimeFormatOptions(newOptions, {
		era: undefined,
		year: undefined,
		month: undefined,
		day: undefined,
		weekday: undefined,
		timeZoneName: undefined,
		dateStyle: undefined,
		timeZone: "UTC",
	});
	return newOptions;
}

function amendOptionsForPlainDateTime(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (originalOptions.timeStyle === "long" || originalOptions.timeStyle === "full") {
		// stop displaying time zone name
		assignDateTimeFormatOptions(newOptions, {
			timeStyle: undefined,
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
		});
		const dateStyle = originalOptions.dateStyle;
		if (dateStyle) {
			assignDateTimeFormatOptions(newOptions, {
				dateStyle: undefined,
				year: "numeric",
				month: dateStyleToMonthStyle(dateStyle),
				day: "numeric",
				weekday: dateStyle === "full" ? "long" : undefined,
			});
		}
	}
	if (!hasAnyOptions(originalOptions, [...dateKeys, ...timeKeys, "timeStyle", "dateStyle"])) {
		assignDateTimeFormatOptions(newOptions, {
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
		});
	}
	assignDateTimeFormatOptions(newOptions, {
		timeZoneName: undefined,
		timeZone: "UTC",
	});
	return newOptions;
}

function amendOptionsForPlainYearMonth(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (originalOptions.dateStyle) {
		assignDateTimeFormatOptions(newOptions, {
			dateStyle: undefined,
			year: originalOptions.dateStyle === "short" ? "2-digit" : "numeric",
			month: dateStyleToMonthStyle(originalOptions.dateStyle),
		});
	}
	if (!hasAnyOptions(originalOptions, ["year", "month", "dateStyle"])) {
		if (hasAnyOptions(originalOptions, [...dateKeys, ...timeKeys, "timeStyle"])) {
			throw new TypeError();
		}
		assignDateTimeFormatOptions(newOptions, {
			year: "numeric",
			month: "numeric",
		});
	}
	assignDateTimeFormatOptions(newOptions, {
		day: undefined,
		hour: undefined,
		minute: undefined,
		second: undefined,
		weekday: undefined,
		dayPeriod: undefined,
		timeZoneName: undefined,
		timeStyle: undefined,
		timeZone: "UTC",
	});
	return newOptions;
}

function amendOptionsForPlainMonthDay(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (originalOptions.dateStyle) {
		assignDateTimeFormatOptions(newOptions, {
			dateStyle: undefined,
			month: dateStyleToMonthStyle(originalOptions.dateStyle),
			day: "numeric",
		});
	}
	if (!hasAnyOptions(originalOptions, ["month", "day", "dateStyle"])) {
		if (hasAnyOptions(originalOptions, [...dateKeys, ...timeKeys, "timeStyle"])) {
			throw new TypeError();
		}
		assignDateTimeFormatOptions(newOptions, {
			month: "numeric",
			day: "numeric",
		});
	}
	assignDateTimeFormatOptions(newOptions, {
		era: undefined,
		year: undefined,
		hour: undefined,
		minute: undefined,
		second: undefined,
		weekday: undefined,
		dayPeriod: undefined,
		timeZoneName: undefined,
		timeStyle: undefined,
		timeZone: "UTC",
	});
	return newOptions;
}

function amendOptionsForInstant(
	originalOptions: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
	const newOptions = createNullPrototypeObject(originalOptions);
	if (!hasAnyOptions(originalOptions, [...dateKeys, ...timeKeys, "dateStyle", "timeStyle"])) {
		assignDateTimeFormatOptions(newOptions, {
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
		});
	}
	return newOptions;
}

function hasAnyOptions(
	options: Intl.DateTimeFormatOptions,
	keys: (keyof Intl.DateTimeFormatOptions)[],
): boolean {
	return keys.some((k) => options[k] !== undefined);
}

/** `CreateDateTimeFormat` */
export function createDateTimeFormat(
	locales: unknown,
	options: {} | null = Object.create(null),
	required: typeof DATE | typeof TIME | typeof DATETIME,
	toLocaleStringTimeZone?: string,
	instance = Object.create(DateTimeFormatImpl.prototype) as DateTimeFormatImpl,
): DateTimeFormatImpl {
	if (options === null) {
		throw new TypeError();
	}
	const copiedOptions = pickObject(Object(options), dtfOptionsKeys);
	// coerce first to avoid accessing userland objects (e.g. `toString` method) twice
	copiedOptions["hour12"] = mapUnlessUndefined(copiedOptions["hour12"], toBoolean);
	copiedOptions["hourCycle"] = mapUnlessUndefined(copiedOptions["hourCycle"], toString);
	copiedOptions["formatMatcher"] = mapUnlessUndefined(copiedOptions["formatMatcher"], toString);
	// for `Temporal.ZonedDateTime.prototype.toLocaleString`
	if (toLocaleStringTimeZone !== undefined) {
		if (copiedOptions["timeZone"] !== undefined) {
			throw new TypeError();
		}
		copiedOptions["timeZone"] = toLocaleStringTimeZone;
		if (
			!hasAnyOptions(copiedOptions, [
				...dateKeys,
				...timeKeys,
				"dateStyle",
				"timeStyle",
				"timeZoneName",
			])
		) {
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
		throw new TypeError();
	}

	slots.set(
		instance,
		createInternalSlot(rawDtf, coercedOriginalOptions as Intl.DateTimeFormatOptions),
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
		throw new TypeError();
	}
}

/** `HandleDateTimeValue` */
function handleDateTimeValue(dateTimeFormat: DateTimeFormatSlot, x: unknown): [RawDTF, number] {
	const plainTimeSlot = getInternalSlotForPlainTime(x);
	if (plainTimeSlot) {
		return [
			(dateTimeFormat.$rawDtfForPlainTime ||= new OriginalDateTimeFormat(
				dateTimeFormat.$locale,
				amendOptionsForPlainTime(dateTimeFormat.$originalOptions),
			)),
			epochMilliseconds(
				getUtcEpochNanoseconds(
					combineIsoDateAndTimeRecord(createIsoDateRecord(1970, 1, 1), plainTimeSlot),
				),
			),
		];
	}
	const plainDateSlot = getInternalSlotForPlainDate(x);
	if (plainDateSlot) {
		if (
			plainDateSlot.$calendar !== dateTimeFormat.$originalOptions.calendar &&
			plainDateSlot.$calendar !== "iso8601"
		) {
			throw new RangeError();
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
	const plainDateTimeSlot = getInternalSlotForPlainDateTime(x);
	if (plainDateTimeSlot) {
		if (
			plainDateTimeSlot.$calendar !== dateTimeFormat.$originalOptions.calendar &&
			plainDateTimeSlot.$calendar !== "iso8601"
		) {
			throw new RangeError();
		}
		return [
			(dateTimeFormat.$rawDtfForPlainDateTime ||= new OriginalDateTimeFormat(
				dateTimeFormat.$locale,
				amendOptionsForPlainDateTime(dateTimeFormat.$originalOptions),
			)),
			epochMilliseconds(getUtcEpochNanoseconds(plainDateTimeSlot.$isoDateTime)),
		];
	}
	const plainYearMonthSlot = getInternalSlotForPlainYearMonth(x);
	if (plainYearMonthSlot) {
		if (plainYearMonthSlot.$calendar !== dateTimeFormat.$originalOptions.calendar) {
			throw new RangeError();
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
	const plainMonthDaySlot = getInternalSlotForPlainMonthDay(x);
	if (plainMonthDaySlot) {
		if (plainMonthDaySlot.$calendar !== dateTimeFormat.$originalOptions.calendar) {
			throw new RangeError();
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
	const instantSlot = getInternalSlotForInstant(x);
	if (instantSlot) {
		return [
			(dateTimeFormat.$rawDtfForInstant ||= new OriginalDateTimeFormat(
				dateTimeFormat.$locale,
				amendOptionsForInstant(dateTimeFormat.$originalOptions),
			)),
			epochMilliseconds(instantSlot.$epochNanoseconds),
		];
	}
	if (isZonedDateTime(x)) {
		throw new TypeError();
	}
	return [dateTimeFormat.$rawDtf, x as any];
}

export class DateTimeFormatImpl {
	constructor(locales: unknown, options: unknown) {
		createDateTimeFormat(locales, options, DATETIME, undefined, this);
	}
	get format() {
		return Object.defineProperty(
			(getInternalSlotOrThrowForDateTimeFormat(this).$boundFormatFunction ||=
				dateTimeFormatFunction.bind(this)),
			"name",
			{ value: "" },
		);
	}
	formatToParts(date: unknown) {
		return formatDateTimeToParts(this, date);
	}
	formatRange(startDate: unknown, endDate: unknown) {
		return formatDateTimeRange(this, startDate, endDate);
	}
	formatRangeToParts(startDate: unknown, endDate: unknown) {
		return formatDateTimeRangeToParts(this, startDate, endDate);
	}
	resolvedOptions() {
		return getInternalSlotOrThrowForDateTimeFormat(this).$rawDtf.resolvedOptions();
	}
}

export const DateTimeFormat = function (locale: unknown, options: unknown) {
	return new DateTimeFormatImpl(locale, options);
} as unknown as Intl.DateTimeFormatConstructor;

const dtfDescriptors = Object.getOwnPropertyDescriptors(Intl.DateTimeFormat);
dtfDescriptors.prototype.value = DateTimeFormatImpl.prototype;
Object.defineProperties(DateTimeFormat, dtfDescriptors);
DateTimeFormat.prototype.constructor = DateTimeFormat;
defineStringTag(DateTimeFormat.prototype, "Intl.DateTimeFormat");
