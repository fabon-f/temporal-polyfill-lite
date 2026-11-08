import { Date, Calendar, CalendarKind, DateOverflow } from "icu";
import { epochDaysToIsoDate } from "../abstractOperations.ts";
import { assertUnreachable } from "../assertion.ts";
import { isoDayOfWeek, type CalendarDateRecord } from "../calendars.ts";

type TestableCalendarId =
	| "chinese"
	| "coptic"
	| "dangi"
	| "ethioaa"
	| "ethiopic"
	| "hebrew"
	| "indian"
	| "islamic-civil"
	| "islamic-tbla"
	| "islamic-umalqura"
	| "persian";

function calendarIdToIcuCalendarKind(calendar: TestableCalendarId): CalendarKind {
	if (calendar === "coptic") {
		return CalendarKind.Coptic;
	}
	if (calendar === "ethioaa") {
		return CalendarKind.EthiopianAmeteAlem;
	}
	if (calendar === "ethiopic") {
		return CalendarKind.Ethiopian;
	}
	if (calendar === "hebrew") {
		return CalendarKind.Hebrew;
	}
	if (calendar === "indian") {
		return CalendarKind.Indian;
	}
	if (calendar === "islamic-civil") {
		return CalendarKind.HijriTabularTypeIiFriday;
	}
	if (calendar === "islamic-tbla") {
		return CalendarKind.HijriTabularTypeIiThursday;
	}
	if (calendar === "persian") {
		return CalendarKind.Persian;
	}
	if (calendar === "islamic-umalqura") {
		return CalendarKind.HijriUmmAlQura;
	}
	if (calendar === "chinese") {
		return CalendarKind.Chinese;
	}
	if (calendar === "dangi") {
		return CalendarKind.Dangi;
	}
	assertUnreachable(calendar);
}

function epochDaysToRataDie(epochDays: number) {
	return BigInt(epochDays) + 719163n;
}

function rataDieToEpochDays(rataDie: bigint) {
	return Number(rataDie - 719163n);
}

export function epochDaysToDateByIcu(
	calendar: TestableCalendarId,
	epochDays: number,
): CalendarDateRecord {
	const icuDate = Date.fromRataDie(
		epochDaysToRataDie(epochDays),
		new Calendar(calendarIdToIcuCalendarKind(calendar)),
	);
	let inLeapYear: boolean;
	if (
		calendar === "coptic" ||
		calendar === "ethioaa" ||
		calendar === "ethiopic" ||
		calendar === "indian" ||
		calendar === "persian"
	) {
		inLeapYear = icuDate.daysInYear === 366;
	} else if (calendar === "chinese" || calendar === "dangi" || calendar === "hebrew") {
		inLeapYear = icuDate.monthsInYear === 13;
	} else if (
		calendar === "islamic-civil" ||
		calendar === "islamic-tbla" ||
		calendar === "islamic-umalqura"
	) {
		inLeapYear = icuDate.daysInYear === 355;
	} else {
		assertUnreachable(calendar);
	}
	return {
		$era: icuDate.era !== "" ? icuDate.era : undefined,
		$eraYear: icuDate.era !== "" ? icuDate.eraYearOrRelatedIso : undefined,
		$year: icuDate.extendedYear,
		$month: icuDate.ordinalMonth,
		$monthCode: icuDate.monthCode,
		$day: icuDate.dayOfMonth,
		$dayOfWeek: isoDayOfWeek(epochDaysToIsoDate(epochDays)),
		$dayOfYear: icuDate.dayOfYear,
		$weekOfYear: { $week: undefined, $year: undefined },
		$daysInWeek: 7,
		$daysInMonth: icuDate.daysInMonth,
		$daysInYear: icuDate.daysInYear,
		$monthsInYear: icuDate.monthsInYear,
		$inLeapYear: inLeapYear,
	};
}

export function calendarIntegersToEpochDaysByIcu(
	calendar: TestableCalendarId,
	year: number,
	month: number,
	day: number,
) {
	const date = Date.fromFieldsInCalendar(
		{ extendedYear: year, ordinalMonth: month, day },
		{ overflow: DateOverflow.Reject },
		new Calendar(calendarIdToIcuCalendarKind(calendar)),
	);
	return rataDieToEpochDays(date.rataDie);
}
