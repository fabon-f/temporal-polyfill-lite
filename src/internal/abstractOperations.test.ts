import { expect, test } from "vitest";
import { isoDateToEpochDays } from "./abstractOperations.ts";

test("isoDateToEpochDays and extreme dates", () => {
	expect(isoDateToEpochDays(321970, 0, 1)).toEqual(116877600);
	expect(isoDateToEpochDays(-318030, 0, 1)).toEqual(-116877600);
});
