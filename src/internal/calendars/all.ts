import { type DateDurationRecord } from "../../Duration.ts";
import { type IsoDateRecord } from "../../PlainDate.ts";
import { isoDateRecordToEpochDays } from "../abstractOperations.ts";
import { assert, assertNotUndefined } from "../assertion.ts";
import {
	isoCalendarDateAdd,
	isoCalendarDateToIso,
	isoCalendarDateUntil,
	isoCalendarIsoToDate,
	isoMonthDayToIsoReferenceDate,
	type CalendarDateRecord,
	type CalendarFieldsRecord,
} from "../calendars.ts";
import { type Overflow } from "../enum.ts";
import { calendarNotSupported, invalidEra } from "../errorMessages.ts";
import { createNullPrototypeObject } from "../object.ts";
import { asciiLowerCase } from "../string.ts";
import { Unit } from "../unit.ts";
import { mapUnlessUndefined, throwRangeError } from "../utils.ts";
import { notImplementedYet } from "./utils.ts";

/** `EPOCH` -> 1, `OFFSET` -> the offset year, `NEGATIVE` -> false */
type EraKind = number | false;

const islamicEras = new Map<string, EraKind>([
	["ah", 1],
	["bh", false],
]);

const erasPerCalendar: Record<SupportedCalendars, Map<string, EraKind>> = createNullPrototypeObject(
	{
		iso8601: new Map(),
		buddhist: new Map([["be", 1]]),
		chinese: new Map(),
		coptic: new Map([["am", 1]]),
		dangi: new Map(),
		ethioaa: new Map([["aa", 1]]),
		ethiopic: new Map([
			["am", 1],
			["aa", -5499],
		]),
		gregory: new Map<string, EraKind>([
			["ce", 1],
			["bce", false],
		]),
		hebrew: new Map([["am", 1]]),
		indian: new Map([["shaka", 1]]),
		"islamic-civil": islamicEras,
		"islamic-tbla": islamicEras,
		"islamic-umalqura": islamicEras,
		japanese: new Map<string, EraKind>([
			["reiwa", 2019],
			["heisei", 1989],
			["showa", 1926],
			["taisho", 1912],
			["meiji", 1868],
			["ce", 1],
			["bce", false],
		]),
		persian: new Map([["ap", 1]]),
		roc: new Map<string, EraKind>([
			["roc", 1],
			["broc", false],
		]),
	},
);

export type SupportedNonIsoCalendars =
	| "buddhist"
	| "chinese"
	| "coptic"
	| "dangi"
	| "ethioaa"
	| "ethiopic"
	| "gregory"
	| "hebrew"
	| "indian"
	| "islamic-civil"
	| "islamic-tbla"
	| "islamic-umalqura"
	| "japanese"
	| "persian"
	| "roc";
export type SupportedCalendars = "iso8601" | SupportedNonIsoCalendars;
type SupportedNonIsoCalendarsWithEras =
	| "buddhist"
	| "coptic"
	| "ethioaa"
	| "ethiopic"
	| "gregory"
	| "hebrew"
	| "indian"
	| "islamic-civil"
	| "islamic-tbla"
	| "islamic-umalqura"
	| "japanese"
	| "persian"
	| "roc";

/** `CanonicalizeCalendar` */
export function canonicalizeCalendar(id: string): SupportedCalendars {
	id = asciiLowerCase(id);
	if (id === "islamicc") {
		return "islamic-civil";
	}
	if (id === "ethiopic-amete-alem") {
		return "ethioaa";
	}
	return (erasPerCalendar as Record<string, Map<any, any>>)[id]
		? (id as SupportedCalendars)
		: throwRangeError(calendarNotSupported(id));
}

/** `CalendarDateAdd` */
export function calendarDateAdd(
	calendar: SupportedCalendars,
	isoDate: IsoDateRecord,
	duration: DateDurationRecord,
	overflow: Overflow,
): IsoDateRecord {
	if (isIsoLikeCalendar(calendar)) {
		return isoCalendarDateAdd(isoDate, duration, overflow);
	}
	notImplementedYet();
}

/** `CalendarDateUntil` */
export function calendarDateUntil(
	calendar: SupportedCalendars,
	one: IsoDateRecord,
	two: IsoDateRecord,
	largestUnit: Unit,
): DateDurationRecord {
	if (isIsoLikeCalendar(calendar)) {
		return isoCalendarDateUntil(one, two, largestUnit);
	}
	notImplementedYet();
}

/** `CalendarDateToISO` */
export function calendarDateToIso(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateRecord {
	assertNotUndefined(fields.year);
	if (isIsoLikeCalendar(calendar)) {
		return isoCalendarDateToIso(
			{
				...fields,
				year: fields.year + (calendar === "buddhist" ? -543 : calendar === "roc" ? 1911 : 0),
			},
			overflow,
		);
	}
	notImplementedYet();
}

/** `NonISOCalendarISOToDate` */
export function nonIsoCalendarIsoToDate(
	calendar: SupportedNonIsoCalendars,
	isoDate: IsoDateRecord,
): CalendarDateRecord {
	if (isIsoLikeCalendar(calendar)) {
		const isoCalendarDate = {
			...isoCalendarIsoToDate(isoDate),
			$weekOfYear: {
				$year: undefined,
				$week: undefined,
			},
		};
		if (calendar === "japanese") {
			const epochDays = isoDateRecordToEpochDays(isoDate);
			const era =
				epochDays >= 18017
					? "reiwa"
					: epochDays >= 6947
						? "heisei"
						: epochDays >= -15713
							? "showa"
							: epochDays >= -20974
								? "taisho"
								: epochDays >= -35428
									? "meiji"
									: isoDate.$year > 0
										? "ce"
										: "bce";
			const offset = erasPerCalendar[calendar].get(era);
			return {
				$era: era,
				$eraYear:
					era === "bce"
						? 1 - isoDate.$year
						: isoDate.$year - (assert(typeof offset === "number"), offset) + 1,
				...isoCalendarDate,
			};
		}
		if (calendar === "gregory") {
			return {
				$era: isoDate.$year > 0 ? "ce" : "bce",
				$eraYear: isoDate.$year > 0 ? isoDate.$year : 1 - isoDate.$year,
				...isoCalendarDate,
			};
		}
		if (calendar === "buddhist") {
			return {
				$era: "be",
				$eraYear: isoDate.$year + 543,
				...isoCalendarDate,
				$year: isoDate.$year + 543,
			};
		}
		assert(calendar === "roc");
		return {
			$era: isoDate.$year >= 1912 ? "roc" : "broc",
			$eraYear: isoDate.$year >= 1912 ? isoDate.$year - 1911 : 1912 - isoDate.$year,
			...isoCalendarDate,
			$year: isoDate.$year - 1911,
		};
	}
	notImplementedYet();
}

/** `CalendarMonthDayToISOReferenceDate` */
export function calendarMonthDayToIsoReferenceDate(
	calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateRecord {
	if (isIsoLikeCalendar(calendar)) {
		return isoMonthDayToIsoReferenceDate(
			{
				...fields,
				year: mapUnlessUndefined(
					fields.year,
					(y) => y - (calendar === "buddhist" ? -543 : calendar === "roc" ? 1911 : 0),
				),
			},
			overflow,
		);
	}
	notImplementedYet();
}

/** `CalendarSupportsEra` */
export function calendarSupportsEra(
	calendar: SupportedCalendars,
): calendar is SupportedNonIsoCalendarsWithEras {
	return !!erasPerCalendar[calendar].size;
}

/** `CanonicalizeEraInCalendar` */
export function canonicalizeEraInCalendar(
	calendar: SupportedNonIsoCalendarsWithEras,
	era: string,
): string {
	const unaliasedEra = era === "ad" ? "ce" : era === "bc" ? "bce" : era;
	return erasPerCalendar[calendar].has(unaliasedEra)
		? unaliasedEra
		: throwRangeError(invalidEra(era));
}

/** `CalendarHasMidYearEras` */
export function calendarHasMidYearEras(calendar: SupportedCalendars): boolean {
	return calendar === "japanese";
}

/** `CalendarDateArithmeticYearForEraYear` */
export function calendarDateArithmeticYearForEraYear(
	calendar: SupportedNonIsoCalendarsWithEras,
	era: string,
	eraYear: number,
): number {
	const canonicalizedEra = canonicalizeEraInCalendar(calendar, era);
	const eraKind = erasPerCalendar[calendar].get(canonicalizedEra);
	assertNotUndefined(eraKind);
	return eraKind === false ? 1 - eraYear : eraKind + eraYear - 1;
}

export function calendarSupportsEraForNonIsoCalendars(
	calendar: SupportedNonIsoCalendars,
): calendar is SupportedNonIsoCalendarsWithEras {
	return calendarSupportsEra(calendar);
}

export function isIsoLikeCalendar(
	calendar: SupportedCalendars,
): calendar is "iso8601" | "buddhist" | "gregory" | "japanese" | "roc" {
	return (
		calendar === "iso8601" ||
		calendar === "buddhist" ||
		calendar === "gregory" ||
		calendar === "japanese" ||
		calendar === "roc"
	);
}
