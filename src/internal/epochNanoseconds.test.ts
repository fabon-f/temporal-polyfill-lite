import { expect, test } from "vitest";
import {
	compareEpochNanoseconds,
	convertEpochNanosecondsToBigInt,
	createEpochNanosecondsFromBigInt,
	createEpochNanosecondsFromEpochMilliseconds,
	epochMilliseconds,
	normalizeEpochNanoseconds,
} from "./epochNanoseconds.ts";
import { nanosecondsPerDay } from "./constants.ts";

function daysToNanoseconds(n: number) {
	return BigInt(n * nanosecondsPerDay);
}

function millisecondsToNanoseconds(n: number) {
	return BigInt(n) * 1000000n;
}

const daysInNsBigInt = BigInt(nanosecondsPerDay);

test("createEpochNanosecondsFromBigInt", () => {
	expect(createEpochNanosecondsFromBigInt(90000000000000n)).toEqual([1, 3600000000000]);
	expect(createEpochNanosecondsFromBigInt(86400000000000n)).toEqual([1, 0]);
	expect(createEpochNanosecondsFromBigInt(21600000000000n)).toEqual([0, 21600000000000]);
	expect(createEpochNanosecondsFromBigInt(0n)).toEqual([0, 0]);
	expect(createEpochNanosecondsFromBigInt(-21600000000000n)).toEqual([-1, 64800000000000]);
	expect(createEpochNanosecondsFromBigInt(-86400000000000n)).toEqual([-1, 0]);
	expect(createEpochNanosecondsFromBigInt(-90000000000000n)).toEqual([-2, 82800000000000]);
});

test("createEpochNanosecondsFromEpochMilliseconds", () => {
	const epochs = [Date.UTC(1970, 0, 1), Date.UTC(1970, 0, 1, 6), Date.UTC(1969, 11, 31, 6)];
	for (const epoch of epochs) {
		expect(createEpochNanosecondsFromEpochMilliseconds(epoch)).toEqual(
			createEpochNanosecondsFromBigInt(millisecondsToNanoseconds(epoch)),
		);
	}
});

test("convertEpochNanosecondsToBigInt", () => {
	const epochs = [1.5, 1, 0.5, 0, -0.5, 1, 1.5].map(daysToNanoseconds);
	for (const epoch of epochs) {
		expect(convertEpochNanosecondsToBigInt(createEpochNanosecondsFromBigInt(epoch))).toEqual(epoch);
	}
});

test("normalizeEpochNanoseconds()", () => {
	// use BigInt to avoid `-0` quirks in testing
	const daysList = [2n, 1n, 0n, -1n, -2n];
	const remainderNanosecondsList = [1.5, 1, 0.5, 0, -0.5, 1, 1.5].map(daysToNanoseconds);
	for (const days of daysList) {
		for (const remainder of remainderNanosecondsList) {
			const expected = createEpochNanosecondsFromBigInt(days * daysInNsBigInt + remainder);
			expect(normalizeEpochNanoseconds(Number(days), Number(remainder))).toEqual(expected);
		}
	}
});

test("compareEpochNanoseconds", () => {
	for (const [a, b, expected] of [
		[daysToNanoseconds(1.5), daysToNanoseconds(1.8), -1],
		[daysToNanoseconds(-1.5), daysToNanoseconds(-1.8), 1],
		[daysToNanoseconds(-2), daysToNanoseconds(-1.8), -1],
		[daysToNanoseconds(-2), daysToNanoseconds(-2), 0],
	] as const) {
		expect(
			compareEpochNanoseconds(
				createEpochNanosecondsFromBigInt(a),
				createEpochNanosecondsFromBigInt(b),
			),
		).toEqual(expected);
	}
});

test("epochMilliseconds", () => {
	expect(epochMilliseconds(createEpochNanosecondsFromBigInt(1n))).toEqual(0);
	expect(epochMilliseconds(createEpochNanosecondsFromBigInt(-1n))).toEqual(-1);
	expect(epochMilliseconds(createEpochNanosecondsFromBigInt(daysToNanoseconds(1.25)))).toEqual(
		Date.UTC(1970, 0, 2, 6),
	);
	expect(epochMilliseconds(createEpochNanosecondsFromBigInt(daysToNanoseconds(-1.25)))).toEqual(
		Date.UTC(1969, 11, 30, 18),
	);
});
