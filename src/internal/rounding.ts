function isIntegerAndHalf(num: number): boolean {
	return Math.abs(num) % 1 === 0.5;
}

export function roundExpand(num: number): number {
	return num < 0 ? Math.floor(num) : Math.ceil(num);
}

export function roundHalfFloor(num: number): number {
	return isIntegerAndHalf(num) ? Math.floor(num) : Math.round(num);
}

export function roundHalfExpand(num: number): number {
	return isIntegerAndHalf(num) ? roundExpand(num) : Math.round(num);
}

export function roundHalfTrunc(num: number): number {
	return isIntegerAndHalf(num) ? Math.trunc(num) : Math.round(num);
}

export function roundHalfEven(num: number): number {
	return isIntegerAndHalf(num) ? (num = Math.trunc(num)) + (num % 2) : Math.round(num);
}
