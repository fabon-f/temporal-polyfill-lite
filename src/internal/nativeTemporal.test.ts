import { describe, expect, test } from "vitest";
import { createNativeZonedDateTime } from "./nativeTemporal.ts";

describe("createNativeZonedDateTime", () => {
	test("basic", () => {
		expect(createNativeZonedDateTime(0, "America/Los_Angeles")).toEqual(
			new Temporal.ZonedDateTime(0n, "America/Los_Angeles"),
		);
	});
	test.for([8.64e15, -8.64e15])("extreme instant: %i", (epochMilliseconds) => {
		expect(createNativeZonedDateTime(epochMilliseconds, "America/Los_Angeles")).toEqual(
			new Temporal.ZonedDateTime(BigInt(epochMilliseconds) * 1000000n, "America/Los_Angeles"),
		);
		expect(createNativeZonedDateTime(epochMilliseconds, "Asia/Tokyo")).toEqual(
			new Temporal.ZonedDateTime(BigInt(epochMilliseconds) * 1000000n, "Asia/Tokyo"),
		);
	});
});
