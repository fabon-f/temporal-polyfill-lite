import { expect, test } from "vitest";
import { epochDaysToIsoDate, isoDateToEpochDays } from "./abstractOperations.ts";

test("isoDateToEpochDays and extreme dates", () => {
	expect(isoDateToEpochDays(321970, 0, 1)).toEqual(116877600);
	expect(isoDateToEpochDays(-318030, 0, 1)).toEqual(-116877600);
});

test("epochDaysToIsoDate", () => {
	expect(epochDaysToIsoDate(20454)).toEqual({ $year: 2026, $month: 1, $day: 1 });
	expect(epochDaysToIsoDate(-43829)).toEqual({ $year: 1850, $month: 1, $day: 1 });
	expect(epochDaysToIsoDate(116877600)).toEqual({
		$year: 321970,
		$month: 1,
		$day: 1,
	});
	expect(epochDaysToIsoDate(-116877600)).toEqual({
		$year: -318030,
		$month: 1,
		$day: 1,
	});
});
