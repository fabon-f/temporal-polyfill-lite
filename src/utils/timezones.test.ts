import tzdata from "tzdata" with { type: "json" };
import { expect, test } from "vitest";
import { normalizeTimeZoneIdCase } from "./timezones.ts";

const ianaTimeZoneIds = Object.keys(tzdata.zones);

test.for(ianaTimeZoneIds)("time zone case normalization: %s", (timeZone) => {
	expect(normalizeTimeZoneIdCase(timeZone.toLowerCase())).toEqual(timeZone);
});
