import { isoDateToEpochDays } from "./abstractOperations.ts";
import { asciiLowerCase } from "./string.ts";

/** `CanonicalizeCalendar` */
export function canonicalizeCalendar(id: string): string {
	id = asciiLowerCase(id);
	if (!["iso8601", "gregory"].includes(id)) {
		throw new RangeError();
	}
	return id;
}

/** `ISODaysInMonth` */
export function isoDaysInMonth(year: number, month: number): number {
	return isoDateToEpochDays(year, month, 1) - isoDateToEpochDays(year, month - 1, 1);
}
