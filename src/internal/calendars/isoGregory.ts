import { type DateDurationRecord } from "../../Duration.ts";
import { type IsoDateRecord } from "../../PlainDate.ts";
import {
	isoCalendarDateAdd,
	isoCalendarDateToIso,
	isoCalendarDateUntil,
	isoCalendarIsoToDate,
	isoMonthDayToIsoReferenceDate,
	parseMonthCode,
	type CalendarDateRecord,
	type CalendarFieldsRecord,
} from "../calendars.ts";
import { type Overflow } from "../enum.ts";
import { calendarNotSupported, invalidEra } from "../errorMessages.ts";
import { asciiLowerCase } from "../string.ts";
import { Unit } from "../unit.ts";
import { throwRangeError } from "../utils.ts";

export type SupportedNonIsoCalendars = "gregory";
export type SupportedCalendars = "iso8601" | SupportedNonIsoCalendars;
type SupportedNonIsoCalendarsWithEras = "gregory";

/** `CanonicalizeCalendar` */
export function canonicalizeCalendar(id: string): SupportedCalendars {
	id = asciiLowerCase(id);
	if (id !== "iso8601" && id !== "gregory") {
		throwRangeError(calendarNotSupported(id));
	}
	return id as SupportedCalendars;
}

/** `CalendarDateAdd` */
export function calendarDateAdd(
	_calendar: SupportedCalendars,
	isoDate: IsoDateRecord,
	duration: DateDurationRecord,
	overflow: Overflow,
): IsoDateRecord {
	return isoCalendarDateAdd(isoDate, duration, overflow);
}

/** `CalendarDateUntil` */
export function calendarDateUntil(
	_calendar: SupportedCalendars,
	one: IsoDateRecord,
	two: IsoDateRecord,
	largestUnit: Unit,
): DateDurationRecord {
	return isoCalendarDateUntil(one, two, largestUnit);
}

/** `CalendarDateToISO` */
export function calendarDateToIso(
	_calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateRecord {
	return isoCalendarDateToIso(fields, overflow);
}

/** `NonISOCalendarISOToDate` */
export function nonIsoCalendarIsoToDate(
	_calendar: SupportedNonIsoCalendars,
	isoDate: IsoDateRecord,
): CalendarDateRecord {
	return {
		$era: isoDate.$year > 0 ? "ce" : "bce",
		$eraYear: isoDate.$year > 0 ? isoDate.$year : 1 - isoDate.$year,
		...isoCalendarIsoToDate(isoDate),
		$weekOfYear: {
			$year: undefined,
			$week: undefined,
		},
	};
}

/** `CalendarMonthDayToISOReferenceDate` */
export function calendarMonthDayToIsoReferenceDate(
	_calendar: SupportedCalendars,
	fields: CalendarFieldsRecord,
	overflow: Overflow,
): IsoDateRecord {
	return isoMonthDayToIsoReferenceDate(fields, overflow);
}

/** `CalendarSupportsEra` */
export function calendarSupportsEra(
	calendar: SupportedCalendars,
): calendar is SupportedNonIsoCalendarsWithEras {
	return calendar === "gregory";
}

/** `CanonicalizeEraInCalendar` */
export function canonicalizeEraInCalendar(
	_calendar: SupportedNonIsoCalendarsWithEras,
	era: string,
): string {
	if (era === "ad" || era === "ce") {
		return "ce";
	}
	if (era === "bc" || era === "bce") {
		return "bce";
	}
	return throwRangeError(invalidEra(era));
}

/** `CalendarHasMidYearEras` */
export function calendarHasMidYearEras(_calendar: SupportedCalendars): boolean {
	return false;
}

/** `IsValidMonthCodeForCalendar` */
export function isValidMonthCodeForCalendar(
	_calendar: SupportedNonIsoCalendars,
	_monthCode: string,
): boolean {
	// stub, not called in "basic" build
	return true;
}

/** `ConstrainMonthCode` */
export function constrainMonthCode(
	_calendar: SupportedNonIsoCalendars,
	_arithmeticYear: number,
	monthCode: string,
	_overflow: Overflow,
): string {
	// stub, not called in "basic" build
	return monthCode;
}

/** `MonthCodeToOrdinal` */
export function monthCodeToOrdinal(
	_calendar: SupportedNonIsoCalendars,
	_arithmeticYear: number,
	monthCode: string,
): number {
	// stub, not called in "basic" build
	return parseMonthCode(monthCode)[0];
}

/** `CalendarDateArithmeticYearForEraYear` */
export function calendarDateArithmeticYearForEraYear(
	calendar: SupportedNonIsoCalendarsWithEras,
	era: string,
	eraYear: number,
): number {
	if (canonicalizeEraInCalendar(calendar, era) === "ce") {
		return eraYear;
	}
	return 1 - eraYear;
}

export function calendarSupportsEraForNonIsoCalendars(
	_calendar: SupportedNonIsoCalendars,
): _calendar is SupportedNonIsoCalendarsWithEras {
	return true;
}

export function isIsoLikeCalendar(_calendar: SupportedCalendars): boolean {
	return true;
}
