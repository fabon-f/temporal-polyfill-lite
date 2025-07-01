import { createTemporalDurationSlot } from "../Duration.ts";
import { balanceTime } from "../PlainTime.ts";
import { toIntegerWithTruncation } from "./ecmascript.ts";

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
