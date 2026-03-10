import { expect, test } from "vitest";
import { overflowConstrain } from "./internal/enum.ts";
import { isoDateWithinLimits, regulateIsoDate } from "./PlainDate.ts";

test("isoDateWithinLimits and extreme value", () => {
	expect(isoDateWithinLimits({ $year: Number.MAX_VALUE, $month: 1, $day: 1 })).toEqual(false);
	expect(isoDateWithinLimits({ $year: -Number.MAX_VALUE, $month: 1, $day: 1 })).toEqual(false);
});

test("regulateIsoDate and extreme value", () => {
	expect(regulateIsoDate(Number.MAX_VALUE, 2, 30, overflowConstrain)).toEqual({
		$year: Number.MAX_VALUE,
		$month: 2,
		$day: 29,
	});
});
