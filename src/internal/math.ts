import { toIntegerWithTruncation } from "./ecmascript.ts";

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

export function clamp(num: number, min: number, max: number) {
	if (num < min) {
		return min;
	}
	if (num > max) {
		return max;
	}
	return num;
}

export function isWithin(num: number, min: number, max: number) {
	return num >= min && num <= max;
}

export function truncateDigits(num: number, digits: number): number {
	return (
		(Number.isSafeInteger(num)
			? Math.trunc(num / Math.pow(10, digits))
			: (num < 0 ? -1 : 1) *
				toIntegerWithTruncation(
					Math.abs(num)
						.toPrecision(50)
						.replace(/^\d+/, (d) => d.slice(0, -digits)),
				)) + 0
	);
}
