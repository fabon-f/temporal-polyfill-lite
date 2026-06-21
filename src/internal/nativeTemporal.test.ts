import { describe, expect, test } from "vitest";
import { createNativeZonedDateTime } from "./nativeTemporal.ts";

describe("createNativeZonedDateTime", () => {
	test("basic", () => {
		expect(createNativeZonedDateTime(0, "America/Los_Angeles")).toEqual(
			Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO("America/Los_Angeles"),
		);
	});
	test.for([8.64e15, -8.64e15])("extreme instant: %i", (epochMilliseconds) => {
		expect(createNativeZonedDateTime(epochMilliseconds, "America/Los_Angeles")).toEqual(
			Temporal.Instant.fromEpochMilliseconds(epochMilliseconds).toZonedDateTimeISO(
				"America/Los_Angeles",
			),
		);
		expect(createNativeZonedDateTime(epochMilliseconds, "Asia/Tokyo")).toEqual(
			Temporal.Instant.fromEpochMilliseconds(epochMilliseconds).toZonedDateTimeISO("Asia/Tokyo"),
		);
	});
	test("invalid time zone", () => {
		expect(() => {
			createNativeZonedDateTime(0, "Invalid/zone");
		}).toThrow(RangeError);
	});
});
