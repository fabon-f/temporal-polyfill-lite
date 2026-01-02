import { daysPer400Years, millisecondsPerDay } from "./constants.ts";
import { divModFloor } from "./math.ts";

/** `ISODateToEpochDays` (`month` is 0-indexed) */
export function isoDateToEpochDays(year: number, month: number, day: number): number {
	const [y, m] = divModFloor(month, 12);
	year += y;

	// Gregorian calendar has 400 years cycle (146097 days).
	// In order to avoid `Date.UTC` quirks on 1 or 2 digit years
	// and handle extreme dates not supported by `Date`.
	return (
		Date.UTC((year % 400) - 400, m, 0) / millisecondsPerDay +
		(Math.trunc(year / 400) + 1) * daysPer400Years +
		day
	);
}
