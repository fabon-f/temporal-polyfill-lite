import { expect, test } from "vitest";
import { isoDateToEpochDays } from "../abstractOperations.ts";
import { extractYearMonthDay } from "./dateTimeFormatter.ts";
import {
	calendarIntegersToEpochDays,
	dayOfYearFromMonthDay,
	epochDaysToDate,
	monthDayFromDayOfYear,
} from "./persian.ts";

test("dayOfYearFromMonthDay", () => {
	expect(dayOfYearFromMonthDay(1, 1)).toEqual(1);
	expect(dayOfYearFromMonthDay(1, 31)).toEqual(31);
	expect(dayOfYearFromMonthDay(2, 1)).toEqual(32);
	expect(dayOfYearFromMonthDay(2, 31)).toEqual(62);
	expect(dayOfYearFromMonthDay(3, 1)).toEqual(63);
	expect(dayOfYearFromMonthDay(3, 31)).toEqual(93);
	expect(dayOfYearFromMonthDay(4, 1)).toEqual(94);
	expect(dayOfYearFromMonthDay(4, 31)).toEqual(124);
	expect(dayOfYearFromMonthDay(5, 1)).toEqual(125);
	expect(dayOfYearFromMonthDay(5, 31)).toEqual(155);
	expect(dayOfYearFromMonthDay(6, 1)).toEqual(156);
	expect(dayOfYearFromMonthDay(6, 31)).toEqual(186);
	expect(dayOfYearFromMonthDay(7, 1)).toEqual(187);
	expect(dayOfYearFromMonthDay(7, 30)).toEqual(216);
	expect(dayOfYearFromMonthDay(8, 1)).toEqual(217);
	expect(dayOfYearFromMonthDay(8, 30)).toEqual(246);
	expect(dayOfYearFromMonthDay(9, 1)).toEqual(247);
	expect(dayOfYearFromMonthDay(9, 30)).toEqual(276);
	expect(dayOfYearFromMonthDay(10, 1)).toEqual(277);
	expect(dayOfYearFromMonthDay(10, 30)).toEqual(306);
	expect(dayOfYearFromMonthDay(11, 1)).toEqual(307);
	expect(dayOfYearFromMonthDay(11, 30)).toEqual(336);
	expect(dayOfYearFromMonthDay(12, 1)).toEqual(337);
	expect(dayOfYearFromMonthDay(12, 30)).toEqual(366);
});

test("monthDayFromDayOfYear", () => {
	expect(monthDayFromDayOfYear(1)).toEqual([1, 1]);
	expect(monthDayFromDayOfYear(31)).toEqual([1, 31]);
	expect(monthDayFromDayOfYear(32)).toEqual([2, 1]);
	expect(monthDayFromDayOfYear(62)).toEqual([2, 31]);
	expect(monthDayFromDayOfYear(63)).toEqual([3, 1]);
	expect(monthDayFromDayOfYear(93)).toEqual([3, 31]);
	expect(monthDayFromDayOfYear(94)).toEqual([4, 1]);
	expect(monthDayFromDayOfYear(124)).toEqual([4, 31]);
	expect(monthDayFromDayOfYear(125)).toEqual([5, 1]);
	expect(monthDayFromDayOfYear(155)).toEqual([5, 31]);
	expect(monthDayFromDayOfYear(156)).toEqual([6, 1]);
	expect(monthDayFromDayOfYear(186)).toEqual([6, 31]);
	expect(monthDayFromDayOfYear(187)).toEqual([7, 1]);
	expect(monthDayFromDayOfYear(216)).toEqual([7, 30]);
	expect(monthDayFromDayOfYear(217)).toEqual([8, 1]);
	expect(monthDayFromDayOfYear(246)).toEqual([8, 30]);
	expect(monthDayFromDayOfYear(247)).toEqual([9, 1]);
	expect(monthDayFromDayOfYear(276)).toEqual([9, 30]);
	expect(monthDayFromDayOfYear(277)).toEqual([10, 1]);
	expect(monthDayFromDayOfYear(306)).toEqual([10, 30]);
	expect(monthDayFromDayOfYear(307)).toEqual([11, 1]);
	expect(monthDayFromDayOfYear(336)).toEqual([11, 30]);
	expect(monthDayFromDayOfYear(337)).toEqual([12, 1]);
	expect(monthDayFromDayOfYear(366)).toEqual([12, 30]);
});

test.for<[number, number, number]>([
	[1200, 1, 1],
	[1500, 1, 1],
	[275139, 1, 1],
	[-272441, 1, 1],
	[-272442, 12, 1],
])(
	"calendarIntegersToEpochDays should match to Intl.DateTimeFormat: %i, %i, %i",
	([year, month, day]) => {
		const newYear = calendarIntegersToEpochDays(year, month, day);
		expect({
			$year: year,
			$month: month,
			$day: day,
		}).toEqual(extractYearMonthDay("persian", newYear));
	},
);

test("epochDaysToDate should match to Intl.DateTimeFormat", () => {
	const epochDaysList = [];
	for (const year of [270000, 1970, -270000]) {
		// vernal equinox should be within this range even for extreme years in existing JavaScript engines
		const min = isoDateToEpochDays(year, 1, 25);
		const max = isoDateToEpochDays(year, 3, 15);
		for (let d = min; d <= max; d++) {
			epochDaysList.push(d);
		}
	}
	epochDaysList.push(
		0,
		-1e8,
		1e8,
		isoDateToEpochDays(2024, 2, 19),
		isoDateToEpochDays(2024, 2, 20),
		isoDateToEpochDays(1959, 2, 21),
		isoDateToEpochDays(1959, 2, 22),
	);
	for (const epochDays of epochDaysList) {
		const expected = extractYearMonthDay("persian", epochDays);
		const actual = epochDaysToDate(epochDays);
		expect([actual.$year, actual.$month, actual.$day]).toEqual([
			expected.$year,
			expected.$month,
			expected.$day,
		]);
	}
});

test("roundtrip in extreme days", () => {
	for (const epochDays of [-1e8 - 1, 1e8]) {
		const date = epochDaysToDate(epochDays);
		expect(calendarIntegersToEpochDays(date.$year, date.$month, date.$day)).toEqual(epochDays);
	}
});
