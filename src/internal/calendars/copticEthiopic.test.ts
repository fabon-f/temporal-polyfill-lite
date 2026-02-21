import { describe, expect, test } from "vitest";
import {
	calendarIntegersToEpochDays,
	daysInMonth,
	epochDaysToDate,
	monthDayToEpochDays,
} from "./copticEthiopic.ts";

test("calendarIntegersToEpochDays - coptic", () => {
	expect(calendarIntegersToEpochDays("coptic", 0, 1, 1)).toEqual(-615923);
	expect(calendarIntegersToEpochDays("coptic", 0, 13, 5)).toEqual(-615559);
	expect(calendarIntegersToEpochDays("coptic", 1, 1, 1)).toEqual(-615558);
	expect(calendarIntegersToEpochDays("coptic", 1, 13, 5)).toEqual(-615194);
	expect(calendarIntegersToEpochDays("coptic", 2, 1, 1)).toEqual(-615193);
	expect(calendarIntegersToEpochDays("coptic", 2, 13, 5)).toEqual(-614829);
	expect(calendarIntegersToEpochDays("coptic", 3, 1, 1)).toEqual(-614828);
	expect(calendarIntegersToEpochDays("coptic", 3, 13, 6)).toEqual(-614463);
	expect(calendarIntegersToEpochDays("coptic", 4, 1, 1)).toEqual(-614462);
	expect(calendarIntegersToEpochDays("coptic", 4, 13, 5)).toEqual(-614098);
	expect(calendarIntegersToEpochDays("coptic", 1686, 4, 23)).toEqual(0);
});

test("calendarIntegersToEpochDays - ethioaa", () => {
	expect(calendarIntegersToEpochDays("ethioaa", 0, 1, 1)).toEqual(-2725607);
	expect(calendarIntegersToEpochDays("ethioaa", 0, 13, 5)).toEqual(-2725243);
	expect(calendarIntegersToEpochDays("ethioaa", 1, 1, 1)).toEqual(-2725242);
	expect(calendarIntegersToEpochDays("ethioaa", 1, 13, 5)).toEqual(-2724878);
	expect(calendarIntegersToEpochDays("ethioaa", 2, 1, 1)).toEqual(-2724877);
	expect(calendarIntegersToEpochDays("ethioaa", 2, 13, 5)).toEqual(-2724513);
	expect(calendarIntegersToEpochDays("ethioaa", 3, 1, 1)).toEqual(-2724512);
	expect(calendarIntegersToEpochDays("ethioaa", 3, 13, 6)).toEqual(-2724147);
	expect(calendarIntegersToEpochDays("ethioaa", 4, 1, 1)).toEqual(-2724146);
	expect(calendarIntegersToEpochDays("ethioaa", 4, 13, 5)).toEqual(-2723782);
	expect(calendarIntegersToEpochDays("ethioaa", 7462, 4, 23)).toEqual(0);
});

test("calendarIntegersToEpochDays - ethiopic", () => {
	expect(calendarIntegersToEpochDays("ethiopic", 0, 1, 1)).toEqual(-716732);
	expect(calendarIntegersToEpochDays("ethiopic", 0, 13, 5)).toEqual(-716368);
	expect(calendarIntegersToEpochDays("ethiopic", 1, 1, 1)).toEqual(-716367);
	expect(calendarIntegersToEpochDays("ethiopic", 1, 13, 5)).toEqual(-716003);
	expect(calendarIntegersToEpochDays("ethiopic", 2, 1, 1)).toEqual(-716002);
	expect(calendarIntegersToEpochDays("ethiopic", 2, 13, 5)).toEqual(-715638);
	expect(calendarIntegersToEpochDays("ethiopic", 3, 1, 1)).toEqual(-715637);
	expect(calendarIntegersToEpochDays("ethiopic", 3, 13, 6)).toEqual(-715272);
	expect(calendarIntegersToEpochDays("ethiopic", 4, 1, 1)).toEqual(-715271);
	expect(calendarIntegersToEpochDays("ethiopic", 4, 13, 5)).toEqual(-714907);
	expect(calendarIntegersToEpochDays("ethiopic", 1962, 4, 23)).toEqual(0);
});

describe("epochDaysToDate - coptic", () => {
	test("year", () => {
		expect(epochDaysToDate("coptic", -615923).$year).toEqual(0);
		expect(epochDaysToDate("coptic", -615559).$year).toEqual(0);
		expect(epochDaysToDate("coptic", -615558).$year).toEqual(1);
		expect(epochDaysToDate("coptic", -615194).$year).toEqual(1);
		expect(epochDaysToDate("coptic", -615193).$year).toEqual(2);
		expect(epochDaysToDate("coptic", -614829).$year).toEqual(2);
		expect(epochDaysToDate("coptic", -614828).$year).toEqual(3);
		expect(epochDaysToDate("coptic", -614463).$year).toEqual(3);
		expect(epochDaysToDate("coptic", -614462).$year).toEqual(4);
		expect(epochDaysToDate("coptic", -614098).$year).toEqual(4);
	});
});

describe("epochDaysToDate - ethioaa", () => {
	test("year", () => {
		expect(epochDaysToDate("ethioaa", -2725607).$year).toEqual(0);
		expect(epochDaysToDate("ethioaa", -2725243).$year).toEqual(0);
		expect(epochDaysToDate("ethioaa", -2725242).$year).toEqual(1);
		expect(epochDaysToDate("ethioaa", -2724878).$year).toEqual(1);
		expect(epochDaysToDate("ethioaa", -2724877).$year).toEqual(2);
		expect(epochDaysToDate("ethioaa", -2724513).$year).toEqual(2);
		expect(epochDaysToDate("ethioaa", -2724512).$year).toEqual(3);
		expect(epochDaysToDate("ethioaa", -2724147).$year).toEqual(3);
		expect(epochDaysToDate("ethioaa", -2724146).$year).toEqual(4);
		expect(epochDaysToDate("ethioaa", -2723782).$year).toEqual(4);
	});
});

describe("epochDaysToDate - ethiopic", () => {
	test("year", () => {
		expect(epochDaysToDate("ethiopic", -716732).$year).toEqual(0);
		expect(epochDaysToDate("ethiopic", -716368).$year).toEqual(0);
		expect(epochDaysToDate("ethiopic", -716367).$year).toEqual(1);
		expect(epochDaysToDate("ethiopic", -716003).$year).toEqual(1);
		expect(epochDaysToDate("ethiopic", -716002).$year).toEqual(2);
		expect(epochDaysToDate("ethiopic", -715638).$year).toEqual(2);
		expect(epochDaysToDate("ethiopic", -715637).$year).toEqual(3);
		expect(epochDaysToDate("ethiopic", -715272).$year).toEqual(3);
		expect(epochDaysToDate("ethiopic", -715271).$year).toEqual(4);
	});
});

test("daysInMonth", () => {
	for (const y of [-4, -3, -2, -1, 0, 1, 2, 3, 4]) {
		for (const m of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
			expect(daysInMonth(y, m)).toEqual(30);
		}
	}
	expect(daysInMonth(0, 13)).toEqual(5);
	expect(daysInMonth(1, 13)).toEqual(5);
	expect(daysInMonth(2, 13)).toEqual(5);
	expect(daysInMonth(3, 13)).toEqual(6);
});

test("monthDayToEpochDays", () => {
	expect(monthDayToEpochDays(1, 1)).toEqual(984);
	expect(monthDayToEpochDays(4, 22)).toEqual(1095);
	expect(monthDayToEpochDays(4, 23)).toEqual(731);
	expect(monthDayToEpochDays(13, 5)).toEqual(983);
	expect(monthDayToEpochDays(13, 6)).toEqual(618);
});
