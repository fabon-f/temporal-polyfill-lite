import { daysPer400Years, millisecondsPerDay } from "./constants.ts";

export function utcEpochMilliseconds(
	year: number,
	month: number,
	day: number,
	hour = 0,
	minute = 0,
	second = 0,
	millisecond = 0,
): number {
	// gregorian calendar has 400 years cycle
	// avoid `Date.UTC` quirks on 1 or 2 digit years
	return (
		Date.UTC((year % 400) - 400, month - 1, day, hour, minute, second, millisecond) +
		(Math.trunc(year / 400) + 1) * daysPer400Years * millisecondsPerDay
	);
}
