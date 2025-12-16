import tzdata from "tzdata" with { type: "json" };
import { expect, test } from "vitest";
import { getOffsetNanosecondsFor, normalizeIanaTimeZoneId } from "./timeZone.ts";
import { normalizeEpochNanoseconds } from "./epochNanoseconds.ts";
import { millisecondsPerDay, nanosecondsPerMilliseconds } from "./constants.ts";

const ianaTimeZoneIds = Object.keys(tzdata.zones);

function dateToEpochNanoseconds(date: Date) {
	return normalizeEpochNanoseconds(date.getTime(), 0);
}

test.for(ianaTimeZoneIds)("time zone case normalization: %s", (timeZone) => {
	expect(normalizeIanaTimeZoneId(timeZone.toLowerCase())).toEqual(timeZone);
	expect(normalizeIanaTimeZoneId(timeZone.toUpperCase())).toEqual(timeZone);
});

test("getOffsetNanosecondsFor", () => {
	expect(
		getOffsetNanosecondsFor("Asia/Tokyo", dateToEpochNanoseconds(new Date("2025-01-01T00:00:00Z"))),
	).toEqual(3.24e13);
	expect(
		getOffsetNanosecondsFor(
			"Europe/London",
			dateToEpochNanoseconds(new Date("2025-03-30T00:59:59.999Z")),
		),
	).toEqual(0);
	expect(
		getOffsetNanosecondsFor(
			"Europe/London",
			dateToEpochNanoseconds(new Date("2025-03-30T01:00:00Z")),
		),
	).toEqual(3.6e12);
});

test("getOffsetNanosecondsFor and sub-minute offset", () => {
	expect(
		getOffsetNanosecondsFor(
			"Africa/Monrovia",
			dateToEpochNanoseconds(new Date("1970-01-01T00:00:00Z")),
		),
	).toEqual(-2.67e12);
});

test("getOffsetNanosecondsFor and far-past", () => {
	// historical data which isn't accurate and can change, but definitely from -24 to 24 hours
	expect(
		Math.abs(
			getOffsetNanosecondsFor(
				"Asia/Tokyo",
				dateToEpochNanoseconds(new Date("-001000-01-01T00:00:00Z")),
			),
		),
	).toBeLessThan(millisecondsPerDay * nanosecondsPerMilliseconds);
});
