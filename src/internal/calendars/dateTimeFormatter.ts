import { millisecondsPerDay } from "../constants.ts";
import { toIntegerIfIntegral } from "../ecmascript.ts";
import { createNullPrototypeObject } from "../object.ts";

const calendarFormatterCache: Record<string, Intl.DateTimeFormat> = createNullPrototypeObject({});

export function extractYearMonthDay(
	calendar: string,
	epochDays: number,
): { $month: number; $day: number } {
	const parts = (calendarFormatterCache[calendar] ||= new Intl.DateTimeFormat("en", {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		calendar: calendar,
		timeZone: "UTC",
	})).formatToParts(epochDays * millisecondsPerDay);
	const calendarIntegers = ["month", "day"].map((field) =>
		toIntegerIfIntegral(parts.find((p) => p.type === field)!.value),
	) as [number, number];
	return {
		$month: calendarIntegers[0],
		$day: calendarIntegers[1],
	};
}
