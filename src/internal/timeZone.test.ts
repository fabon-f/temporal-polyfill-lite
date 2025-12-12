import tzdata from "tzdata" with { type: "json" };
import { expect, test } from "vitest";
import { normalizeIanaTimeZoneId } from "./timeZone.ts";

const ianaTimeZoneIds = Object.keys(tzdata.zones);

test.for(ianaTimeZoneIds)("time zone case normalization: %s", (timeZone) => {
	expect(normalizeIanaTimeZoneId(timeZone.toLowerCase())).toEqual(timeZone);
	expect(normalizeIanaTimeZoneId(timeZone.toUpperCase())).toEqual(timeZone);
});
