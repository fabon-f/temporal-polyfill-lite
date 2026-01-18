import { assert } from "./assertion.ts";
import { toString } from "./ecmascript.ts";
import { toZeroPaddedDecimalString } from "./string.ts";

// without `-0` quirks
export type NumberSign = -1 | 0 | 1;

export function divFloor(num: number, divisor: number): number {
	return Math.floor(num / divisor) + 0;
}

export function modFloor(num: number, divisor: number): number {
	return (((num % divisor) + divisor) % divisor) + 0;
}

export function compare(a: number, b: number): NumberSign {
	return Math.sign(a - b) as NumberSign;
}

export function clamp(num: number, min: number, max: number): number {
	if (num < min) {
		return min;
	}
	if (num > max) {
		return max;
	}
	return num;
}

export function isWithin(num: number, min: number, max: number): boolean {
	return num >= min && num <= max;
}

/** `x` and `z` should be safe integer */
export function fusedMultiplyAddPow10(x: number, digitCount: number, z: number): number {
	assert(
		10 ** digitCount > z &&
			Math.sign(x) * Math.sign(z) !== -1 &&
			Math.abs(x) < 1e21 &&
			Math.abs(z) < 1e21,
	);
	return Number.isSafeInteger(x * 10 ** digitCount + z)
		? x * 10 ** digitCount + z
		: Number(`${toString(x)}${toZeroPaddedDecimalString(Math.abs(z), digitCount)}`);
}
