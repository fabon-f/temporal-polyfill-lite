import { expect, test } from "vitest";
import { isValidIanaTimeZoneId } from "./iso_parser.ts";

test("isValidIanaTimeZoneId", () => {
	expect(isValidIanaTimeZoneId("foo/")).toEqual(false);
	expect(isValidIanaTimeZoneId("/foo")).toEqual(false);
	expect(isValidIanaTimeZoneId("foo/bar")).toEqual(true);
});
