import { toBoolean, toString } from "./internal/ecmascript.ts";
import { pickObject } from "./internal/object.ts";
import { defineStringTag } from "./internal/property.ts";
import { mapUnlessUndefined } from "./internal/utils.ts";

export const OriginalDateTimeFormat = globalThis.Intl.DateTimeFormat;
type RawDTF = InstanceType<typeof OriginalDateTimeFormat>;

const internalSlotBrand = /*#__PURE__*/ Symbol();

interface DateTimeFormatSlot {
	$rawDtf: RawDTF;
	$originalOptions: Intl.DateTimeFormatOptions;
	$boundFormatFunction?: ((date: unknown) => string) | undefined;
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
	return {
		$rawDtf: rawDTF,
		$originalOptions: originalOptions,
	} as DateTimeFormatSlot;
}

export function getInternalSlotOrThrowForDateTimeFormat(dtf: any) {
	const slot = slots.get(dtf);
	if (!slot) {
		throw new TypeError();
	}
	return slot;
}

function formatDateTime(dtf: DateTimeFormatImpl, date: unknown) {
	// @ts-expect-error
	return getInternalSlotOrThrowForDateTimeFormat(dtf).$rawDtf.format(date);
}

/** DateTime Format Functions */
function dateTimeFormatFunction(this: DateTimeFormatImpl, date: unknown) {
	return formatDateTime(this, date);
}

/** `CreateDateTimeFormat` */
function createDateTimeFormat(
	locales: unknown,
	options: {} | null = Object.create(null),
	toLocaleStringTimeZone?: string,
	instance = Object.create(DateTimeFormatImpl.prototype) as DateTimeFormatImpl,
) {
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
	}
	// @ts-expect-error
	const rawDtf = new OriginalDateTimeFormat(locales, copiedOptions);
	// `resolvedOptions` returns almost same to original options
	const coercedOriginalOptions = rawDtf.resolvedOptions();
	for (const key of Object.keys(coercedOriginalOptions)) {
		if (copiedOptions[key] === undefined) {
			// @ts-expect-error
			coercedOriginalOptions[key] = undefined;
		}
	}
	coercedOriginalOptions.hour12 = copiedOptions["hour12"];
	coercedOriginalOptions.hourCycle = copiedOptions["hourCycle"];
	coercedOriginalOptions.formatMatcher = copiedOptions["formatMatcher"];
	slots.set(
		instance,
		createInternalSlot(rawDtf, coercedOriginalOptions as Intl.DateTimeFormatOptions),
	);
	return instance;
}

export class DateTimeFormatImpl {
	constructor(locales: unknown, options: unknown) {
		createDateTimeFormat(locales, options, undefined, this);
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
		// @ts-expect-error
		return getInternalSlotOrThrowForDateTimeFormat(this).$rawDtf.formatToParts(date);
	}
	formatRange(startDate: unknown, endDate: unknown) {
		// @ts-expect-error
		return getInternalSlotOrThrowForDateTimeFormat(this).$rawDtf.formatRange(startDate, endDate);
	}
	formatRangeToParts(startDate: unknown, endDate: unknown) {
		return getInternalSlotOrThrowForDateTimeFormat(this).$rawDtf.formatRangeToParts(
			// @ts-expect-error
			startDate,
			endDate,
		);
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
