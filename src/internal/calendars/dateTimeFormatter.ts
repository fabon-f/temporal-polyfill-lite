import { createMonthCode } from "../calendars.ts";
import { millisecondsPerDay } from "../constants.ts";
import { toIntegerIfIntegral } from "../ecmascript.ts";
import { createNullPrototypeObject } from "../object.ts";

export interface YearMonthDayNumber {
	$year: number;
	$month: number;
	$day: number;
}

export interface EastAsianYearMonthDay {
	$year: number;
	$monthCode: string;
	$day: number;
}

const calendarFormatterCache: Record<string, Intl.DateTimeFormat> = createNullPrototypeObject({});

function formatToParts(calendar: string, epochDays: number): Intl.DateTimeFormatPart[] {
	return (calendarFormatterCache[calendar] ||= new Intl.DateTimeFormat("en", {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		calendar: calendar,
		timeZone: "UTC",
	})).formatToParts(epochDays * millisecondsPerDay);
}

export function extractYearMonthDay(calendar: string, epochDays: number): YearMonthDayNumber {
	const parts = formatToParts(calendar, epochDays);
	const calendarIntegers = ["year", "month", "day"].map((field) =>
		toIntegerIfIntegral(parts.find((p) => p.type === field)!.value),
	) as [number, number, number];
	return {
		$year: calendarIntegers[0],
		$month: calendarIntegers[1],
		$day: calendarIntegers[2],
	};
}

export function extractYearMonthDayForEastAsianLunisolarCalendar(
	calendar: "chinese" | "dangi",
	epochDays: number,
): EastAsianYearMonthDay {
	const parts = formatToParts(calendar, epochDays);
	const calendarIntegers = ["relatedYear", "month", "day"].map(
		(field) => parts.find((p) => p.type === field)!.value,
	) as [string, string, string];
	return {
		$year: toIntegerIfIntegral(calendarIntegers[0]),
		$monthCode: createMonthCode(parseInt(calendarIntegers[1]), /bis/.test(calendarIntegers[1])),
		$day: toIntegerIfIntegral(calendarIntegers[2]),
	};
}
