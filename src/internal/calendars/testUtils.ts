import { Date, Calendar, CalendarKind } from "icu";
import { epochDaysToIsoDate } from "../abstractOperations.ts";
import { assertUnreachable } from "../assertion.ts";
import { isoDayOfWeek, type CalendarDateRecord } from "../calendars.ts";

type RuleBasedCalendarId =
	| "coptic"
	| "ethioaa"
	| "ethiopic"
	| "hebrew"
	| "indian"
	| "islamic-civil"
	| "islamic-tbla";

function calendarIdToIcuCalendarKind(calendar: RuleBasedCalendarId): CalendarKind {
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
}

function epochDaysToRataDie(epochDays: number) {
	return BigInt(epochDays) + 719163n;
}

export function epochDaysToDateByIcu(
	calendar: RuleBasedCalendarId,
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
		calendar === "indian"
	) {
		inLeapYear = icuDate.daysInYear === 366;
	} else if (calendar === "hebrew") {
		inLeapYear = icuDate.monthsInYear === 13;
	} else if (calendar === "islamic-civil" || calendar === "islamic-tbla") {
		inLeapYear = icuDate.daysInYear === 355;
	} else {
		assertUnreachable(calendar);
	}
	return {
		$era: icuDate.era,
		$eraYear: icuDate.eraYearOrRelatedIso,
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
