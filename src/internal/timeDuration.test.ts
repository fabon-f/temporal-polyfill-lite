import { expect, test } from "vitest";
import {
	createTimeDurationFromMicroseconds,
	createTimeDurationFromNanoseconds,
	normalize,
} from "./timeDuration.ts";
import { nanosecondsPerDay } from "./constants.ts";

function fromNanosecondsBigInt(n: bigint) {
	return [Number(n / BigInt(nanosecondsPerDay)), Number(n % BigInt(nanosecondsPerDay))] as const;
}

function daysToNanoseconds(n: number) {
	return BigInt(n * nanosecondsPerDay);
}

test("normalize", () => {
	expect(normalize(1, -nanosecondsPerDay + 1)).toEqual([0, 1]);
	expect(normalize(-1, +nanosecondsPerDay - 1)).toEqual([0, -1]);

	const daysList = [1, 0, -1];
	const nanosecondsList = [2, 1.5, 1, 0.5, 0, -0.5, -1, -1.5 - 2].map((n) => n * nanosecondsPerDay);
	for (const d of daysList) {
		for (const n of nanosecondsList) {
			expect(normalize(d, n)).toEqual(fromNanosecondsBigInt(daysToNanoseconds(d) + BigInt(n)));
		}
	}
});

test("createTimeDurationFromNanoseconds and unsafe integers", () => {
	const nanoseconds = [9007199254713599772327936, -9007199254713599772327936];
	for (const n of nanoseconds) {
		expect(createTimeDurationFromNanoseconds(n)).toEqual(fromNanosecondsBigInt(BigInt(n)));
	}
});

test("createTimeDurationFromMicroseconds and unsafe integers", () => {
	const microsecondsList = [9007199254627199483904, -9007199254627199483904];
	for (const n of microsecondsList) {
		expect(createTimeDurationFromMicroseconds(n)).toEqual(fromNanosecondsBigInt(BigInt(n) * 1000n));
	}
});
