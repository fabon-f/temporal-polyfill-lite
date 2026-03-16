import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setSystemTimeZoneIdCacheTtl, systemTimeZoneIdentifier } from "./Now.ts";

function modifyTimeZone(timeZoneId: string) {
	const originalTimeZoneEnv = process.env["tz"];
	process.env["TZ"] = timeZoneId;
	return {
		[Symbol.dispose]() {
			if (originalTimeZoneEnv !== undefined) {
				process.env["TZ"] = originalTimeZoneEnv;
			} else {
				delete process.env["TZ"];
			}
		},
	};
}

describe("setSystemTimeZoneIdCacheTtl", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
	});
	afterEach(() => {
		setSystemTimeZoneIdCacheTtl(0);
		vi.useRealTimers();
	});

	test("cache is disabled by default", () => {
		using _tz1 = modifyTimeZone("Europe/London");
		expect(systemTimeZoneIdentifier()).toEqual("Europe/London");
		using _tz2 = modifyTimeZone("Asia/Tokyo");
		expect(systemTimeZoneIdentifier()).toEqual("Asia/Tokyo");
	});

	test("clear cache", () => {
		using _tz1 = modifyTimeZone("Europe/London");
		setSystemTimeZoneIdCacheTtl(1000);
		expect(systemTimeZoneIdentifier()).toEqual("Europe/London");
		using _tz2 = modifyTimeZone("Asia/Tokyo");
		setSystemTimeZoneIdCacheTtl(0);
		setSystemTimeZoneIdCacheTtl(1000);
		expect(systemTimeZoneIdentifier()).toEqual("Asia/Tokyo");
	});

	test("disable cache", () => {
		using _tz1 = modifyTimeZone("Europe/London");
		setSystemTimeZoneIdCacheTtl(1000);
		expect(systemTimeZoneIdentifier()).toEqual("Europe/London");
		using _tz2 = modifyTimeZone("Asia/Tokyo");
		setSystemTimeZoneIdCacheTtl(0);
		expect(systemTimeZoneIdentifier()).toEqual("Asia/Tokyo");
	});

	test("cache expiration", () => {
		using _tz1 = modifyTimeZone("Europe/London");
		setSystemTimeZoneIdCacheTtl(1000);
		expect(systemTimeZoneIdentifier()).toEqual("Europe/London");
		using _tz2 = modifyTimeZone("Asia/Tokyo");
		expect(systemTimeZoneIdentifier()).toEqual("Europe/London");
		vi.advanceTimersByTime(1001);
		expect(systemTimeZoneIdentifier()).toEqual("Asia/Tokyo");
	});

	test("cache without expiration", () => {
		using _tz1 = modifyTimeZone("Europe/London");
		setSystemTimeZoneIdCacheTtl(Infinity);
		expect(systemTimeZoneIdentifier()).toEqual("Europe/London");
		using _tz2 = modifyTimeZone("Asia/Tokyo");
		vi.advanceTimersByTime(8.64e15);
		expect(systemTimeZoneIdentifier()).toEqual("Europe/London");
		setSystemTimeZoneIdCacheTtl(0);
		expect(systemTimeZoneIdentifier()).toEqual("Asia/Tokyo");
	});
});
