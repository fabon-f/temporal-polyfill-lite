export type NumberSign = -1 | 0 | 1;

/** `y` should positive integer */
export function mod(x: number, y: number) {
	return ((x % y) + y) % y;
}

export function compareNumber(x: number, y: number) {
	return Math.sign(x - y) as NumberSign;
}

export function clampNumber(num: number, min: number, max: number) {
	if (num < min) {
		return min;
	}
	if (num > max) {
		return max;
	}
	return num;
}
