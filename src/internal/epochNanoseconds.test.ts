import { expect, test } from "vitest";
import {
	compareEpochNanoseconds,
	convertEpochNanosecondsToBigInt,
	createEpochNanosecondsFromBigInt,
	msInNs,
	normalizeEpochNanoseconds,
} from "./epochNanoseconds.ts";

const msInNsBigInt = BigInt(msInNs);

test("createEpochNanosecondsFromBigInt", () => {
	expect(createEpochNanosecondsFromBigInt(1500000n)).toEqual([1, 500000]);
	expect(createEpochNanosecondsFromBigInt(1000000n)).toEqual([1, 0]);
	expect(createEpochNanosecondsFromBigInt(500000n)).toEqual([0, 500000]);
	expect(createEpochNanosecondsFromBigInt(0n)).toEqual([0, 0]);
	expect(createEpochNanosecondsFromBigInt(-500000n)).toEqual([-1, 500000]);
	expect(createEpochNanosecondsFromBigInt(-1000000n)).toEqual([-1, 0]);
	expect(createEpochNanosecondsFromBigInt(-1500000n)).toEqual([-2, 500000]);
});

test("convertEpochNanosecondsToBigInt", () => {
	const epochs = [1500000n, 1000000n, 500000n, 0n, -500000n, -1000000n, -1500000n];
	for (const epoch of epochs) {
		expect(convertEpochNanosecondsToBigInt(createEpochNanosecondsFromBigInt(epoch))).toEqual(epoch);
	}
});

test("normalizeEpochNanoseconds()", () => {
	// use BigInt to avoid `-0` quirks in testing
	const millisecondsList = [2n, 1n, 0n, -1n, -2n];
	const remainderNanosecondsList = [
		1500000n,
		1000000n,
		500000n,
		0n,
		-500000n,
		-1000000n,
		-1500000n,
	];
	for (const milliseconds of millisecondsList) {
		for (const remainder of remainderNanosecondsList) {
			const expected = createEpochNanosecondsFromBigInt(milliseconds * msInNsBigInt + remainder);
			expect(normalizeEpochNanoseconds(Number(milliseconds), Number(remainder))).toEqual(expected);
		}
	}
});

test("compareEpochNanoseconds", () => {
	for (const [a, b, expected] of [
		[1000000n, 1200000n, -1],
		[-1500000n, -1800000n, 1],
		[-2000000n, -1800000n, -1],
		[-2000000n, -2000000n, 0],
	] as const) {
		expect(
			compareEpochNanoseconds(
				createEpochNanosecondsFromBigInt(a),
				createEpochNanosecondsFromBigInt(b),
			),
		).toEqual(expected);
	}
});
