import tzdata from "tzdata" with { type: "json" };
import { expect, test } from "vitest";
import {
	getOffsetNanosecondsFor,
	getTimeZoneTransition as getTimeZoneTransitionOriginal,
	normalizeIanaTimeZoneId,
} from "./timeZones.ts";
import {
	addNanosecondsToEpochSeconds,
	createEpochNanosecondsFromEpochMilliseconds,
	type EpochNanoseconds,
} from "./epochNanoseconds.ts";
import { millisecondsPerDay, nanosecondsPerMilliseconds } from "./constants.ts";
import { describe } from "node:test";

const ianaTimeZoneIds = Object.keys(tzdata.zones);

function dateToEpochNanoseconds(date: Date) {
	return createEpochNanosecondsFromEpochMilliseconds(date.getTime());
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

function getTimeZoneTransition(timeZone: string, epoch: EpochNanoseconds, direction: -1 | 1) {
	return getTimeZoneTransitionOriginal(timeZone, epoch, direction, new Map());
}

describe("getTimeZoneTransition", () => {
	test("forward searching", () => {
		const transition1 = dateToEpochNanoseconds(new Date("2025-03-30T01:00:00Z"));
		const transition2 = dateToEpochNanoseconds(new Date("2025-10-26T01:00:00Z"));
		expect(
			getTimeZoneTransition("Europe/London", addNanosecondsToEpochSeconds(transition1, -1), 1),
		).toEqual(transition1);
		expect(getTimeZoneTransition("Europe/London", transition1, 1)).toEqual(transition2);
		expect(
			getTimeZoneTransition("Europe/London", addNanosecondsToEpochSeconds(transition1, 1), 1),
		).toEqual(transition2);
	});

	test("forward searching in far future", () => {
		const timeZoneWithRegularDst = "America/New_York";
		const timeZoneWithoutRegularDst = "Asia/Tokyo";
		expect(
			getTimeZoneTransition(
				timeZoneWithRegularDst,
				dateToEpochNanoseconds(new Date("+200000-01-01T00:00:00Z")),
				1,
			),
		).not.toBeNull();
		expect(
			getTimeZoneTransition(
				timeZoneWithoutRegularDst,
				dateToEpochNanoseconds(new Date("+200000-01-01T00:00:00Z")),
				1,
			),
		).toBeNull();
	});

	test("forward searching in far past", () => {
		// Japan has historical offset transition
		expect(
			getTimeZoneTransition(
				"Asia/Tokyo",
				dateToEpochNanoseconds(new Date("-200000-01-01T00:00:00Z")),
				1,
			),
		).toEqual(dateToEpochNanoseconds(new Date("1888-01-01T00:00:00+09:00")));
	});

	test("backward searching", () => {
		const transition1 = dateToEpochNanoseconds(new Date("2025-03-30T01:00:00Z"));
		const transition2 = dateToEpochNanoseconds(new Date("2025-10-26T01:00:00Z"));
		expect(
			getTimeZoneTransition("Europe/London", addNanosecondsToEpochSeconds(transition2, -1), -1),
		).toEqual(transition1);
		expect(getTimeZoneTransition("Europe/London", transition2, -1)).toEqual(transition1);
		expect(
			getTimeZoneTransition("Europe/London", addNanosecondsToEpochSeconds(transition2, 1), -1),
		).toEqual(transition2);
	});

	test("backward searching in far future", () => {
		expect(
			getTimeZoneTransition(
				"America/New_York",
				dateToEpochNanoseconds(new Date("+200000-01-01T00:00:00Z")),
				-1,
			),
		).not.toBeNull();
		const lastTransitionInJapan = dateToEpochNanoseconds(new Date("1951-09-09T00:00:00+09:00"));
		expect(
			getTimeZoneTransition(
				"Asia/Tokyo",
				dateToEpochNanoseconds(new Date("+200000-01-01T00:00:00Z")),
				-1,
			),
		).toEqual(lastTransitionInJapan);
	});

	test("backward searching in far past", () => {
		expect(
			getTimeZoneTransition(
				"America/New_York",
				dateToEpochNanoseconds(new Date("-200000-01-01T00:00:00Z")),
				-1,
			),
		).toBeNull();
	});
});
