// without `-0` quirks
export type NumberSign = -1 | 0 | 1;

export function divModFloor(num: number, divisor: number): [quotient: number, remainder: number] {
	const quotient = Math.floor(num / divisor) + 0;
	const remainder = (((num % divisor) + divisor) % divisor) + 0;
	return [quotient, remainder];
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
