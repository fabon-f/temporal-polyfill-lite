import { millisecondsPerDay } from "../constants.ts";
import { toIntegerIfIntegral } from "../ecmascript.ts";
import { createNullPrototypeObject } from "../object.ts";

export interface YearMonthDayNumber {
	$year: number;
	$month: number;
	$day: number;
}

const calendarFormatterCache: Record<string, Intl.DateTimeFormat> = createNullPrototypeObject({});

export function extractYearMonthDay(calendar: string, epochDays: number): YearMonthDayNumber {
	const parts = (calendarFormatterCache[calendar] ||= new Intl.DateTimeFormat("en", {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		calendar: calendar,
		timeZone: "UTC",
	})).formatToParts(epochDays * millisecondsPerDay);
	const calendarIntegers = ["year", "month", "day"].map((field) =>
		toIntegerIfIntegral(parts.find((p) => p.type === field)!.value),
	) as [number, number, number];
	return {
		$year: calendarIntegers[0],
		$month: calendarIntegers[1],
		$day: calendarIntegers[2],
	};
}
