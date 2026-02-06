import { assert } from "./assertion.ts";

// without `-0` quirks
export type NumberSign = -1 | 0 | 1;

export function divFloor(num: number, divisor: number): number {
	return Math.floor(num / divisor) + 0;
}

export function modFloor(num: number, divisor: number): number {
	return (((num % divisor) + divisor) % divisor) + 0;
}

export function divTrunc(num: number, divisor: number): number {
	return Math.trunc(num / divisor) + 0;
}

export function sign(v: number): NumberSign {
	assert(typeof v === "number" && !Number.isNaN(v));
	return v < 0 ? -1 : v ? 1 : 0;
}

export function compare(a: number, b: number): NumberSign {
	return sign(a - b) as NumberSign;
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
