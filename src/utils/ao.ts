import { createTemporalDurationSlot } from "../Duration.ts";
import type { ISODateRecord } from "../PlainDate.ts";
import { balanceTime } from "../PlainTime.ts";
import { daysPer400Years, millisecondsPerDay } from "./constants.ts";
import { toIntegerWithTruncation } from "./ecmascript.ts";

/** `ISODateToEpochDays` but `month` is 1-indexed */
export const isoDateToEpochDays = (
	year: number,
	month: number,
	day: number,
) => {
	// gregorian calendar has 400 years cycle
	// avoid passing 1 or 2 digit years to `Date.UTC` function
	return (
		Date.UTC((year % 400) + 800, month - 1, day) / millisecondsPerDay +
		Math.trunc(year / 400 - 2) * daysPer400Years
	);
};

export function utcEpochMillisecondsToIsoDateTime(epochMilliseconds: number) {
	const date = new Date(
		epochMilliseconds % (millisecondsPerDay * daysPer400Years),
	);
	return [
		[
			date.getUTCFullYear() +
				Math.trunc(epochMilliseconds / (millisecondsPerDay * daysPer400Years)) *
					400,
			date.getUTCMonth() + 1,
			date.getUTCDate(),
		],
		[
			date.getUTCHours(),
			date.getUTCMinutes(),
			date.getUTCSeconds(),
			date.getUTCMilliseconds(),
		],
	] as [
		ISODateRecord,
		[hour: number, minute: number, second: number, millisecond: number],
	];
}

/** `MathematicalInLeapYear` */
export const mathematicalInLeapYear = (year: number) =>
	// https://codegolf.stackexchange.com/questions/50798/is-it-a-leap-year
	+!(year % (year % 25 ? 4 : 16));

/** `ParseTemporalDurationString` */
export function parseTemporalDurationString(isoString: string) {
	// * a fractional time unit should be in the end (and appears at most once)
	// * date time separator "T" should be followed by time units
	// * at least one of units should be present
	if (/[.,]\d+[hms].|[pt]$/i.test(isoString)) {
		throw new RangeError();
	}
	const result = isoString.match(
		/^([+-]?)p(?:(\d+)y)?(?:(\d+)m)?(?:(\d+)w)?(?:(\d+)d)?(?:t(?:(\d+)(?:[.,](\d{1,9}))?h)?(?:(\d+)(?:[.,](\d{1,9}))?m)?(?:(\d+)(?:[.,](\d{1,9}))?s)?)?$/i,
	);
	if (!result) {
		throw new RangeError();
	}
	const [
		,
		sign,
		years = "",
		months = "",
		weeks = "",
		days = "",
		hours = "",
		fHours = "",
		minutes = "",
		fMinutes = "",
		seconds = "",
		fSeconds = "",
	] = result;
	const factor = sign === "-" ? -1 : 1;
	const fractionalPart = balanceTime(
		0,
		0,
		0,
		0,
		0,
		toIntegerWithTruncation(fHours.padEnd(9, "0")) * 3600 +
			toIntegerWithTruncation(fMinutes.padEnd(9, "0")) * 60 +
			toIntegerWithTruncation(fSeconds.padEnd(9, "0")),
	);
	return createTemporalDurationSlot(
		toIntegerWithTruncation(years) * factor + 0,
		toIntegerWithTruncation(months) * factor + 0,
		toIntegerWithTruncation(weeks) * factor + 0,
		toIntegerWithTruncation(days) * factor + 0,
		toIntegerWithTruncation(hours) * factor + 0,
		(toIntegerWithTruncation(minutes) + fractionalPart[2]) * factor + 0,
		(toIntegerWithTruncation(seconds) + fractionalPart[3]) * factor + 0,
		fractionalPart[4] * factor + 0,
		fractionalPart[5] * factor + 0,
		fractionalPart[6] * factor + 0,
	);
}
