import { isoDateToEpochDays } from "./abstractOperations.ts";
import { millisecondsPerDay } from "./constants.ts";

export function utcEpochMilliseconds(
	year: number,
	month: number,
	day: number,
	hour = 0,
	minute = 0,
	second = 0,
	millisecond = 0,
): number {
	return (
		isoDateToEpochDays(year, month - 1, day) * millisecondsPerDay +
		Date.UTC(1970, 0, 1, hour, minute, second, millisecond)
	);
}
