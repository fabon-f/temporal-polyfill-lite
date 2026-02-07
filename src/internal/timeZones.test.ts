import tzdata from "tzdata" with { type: "json" };
import { expect, test } from "vitest";
import {
	getOffsetNanosecondsFor,
	getTimeZoneTransition,
	rejectNonIanaTimeZoneId,
	normalizeIanaTimeZoneId,
} from "./timeZones.ts";
import {
	addNanosecondsToEpochSeconds,
	createEpochNanosecondsFromEpochMilliseconds,
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

test("rejectNonIanaTimeZoneId and non-IANA time zones", () => {
	const nonIanaTimeZoneIds = [
		"ACT",
		"AET",
		"AGT",
		"ART",
		"AST",
		"BET",
		"BST",
		"CAT",
		"CNT",
		"CST",
		"CTT",
		"EAT",
		"ECT",
		"IET",
		"IST",
		"JST",
		"MIT",
		"NET",
		"NST",
		"PLT",
		"PNT",
		"PRT",
		"PST",
		"SST",
		"VST",
		"SystemV",
		"SystemV/AST4ADT",
		"SystemV/EST5EDT",
		"SystemV/CST6CDT",
		"SystemV/MST7MDT",
		"SystemV/PST8PDT",
		"SystemV/YST9YDT",
		"SystemV/AST4",
		"SystemV/EST5",
		"SystemV/CST6",
		"SystemV/MST7",
		"SystemV/PST8",
		"SystemV/YST9",
		"SystemV/HST10",
		"US/Pacific-New",
	];
	for (const id of nonIanaTimeZoneIds) {
		expect(() => rejectNonIanaTimeZoneId(id)).toThrow(RangeError);
	}
});

test("rejectNonIanaTimeZoneId and IANA time zones", () => {
	const ianaTimeZoneIds = [
		"CET",
		"EET",
		"EST",
		"GMT",
		"HST",
		"MET",
		"MST",
		"PRC",
		"ROC",
		"ROK",
		"UCT",
		"UTC",
		"WET",
	];
	for (const id of ianaTimeZoneIds) {
		expect(() => rejectNonIanaTimeZoneId(id)).not.toThrow();
	}
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
