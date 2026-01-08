function isIntegerAndHalf(num: number) {
	return Math.abs(num) % 1 === 0.5;
}

export function roundExpand(num: number) {
	return 0 + (num < 0 ? Math.floor(num) : Math.ceil(num));
}

export function roundHalfCeil(num: number) {
	return 0 + (isIntegerAndHalf(num) ? Math.ceil(num) : Math.round(num));
}

export function roundHalfFloor(num: number) {
	return 0 + (isIntegerAndHalf(num) ? Math.floor(num) : Math.round(num));
}

export function roundHalfExpand(num: number) {
	return 0 + (isIntegerAndHalf(num) ? roundExpand(num) : Math.round(num));
}

export function roundHalfTrunc(num: number) {
	return 0 + (isIntegerAndHalf(num) ? Math.trunc(num) : Math.round(num));
}

export function roundHalfEven(num: number) {
	return 0 + (isIntegerAndHalf(num) ? (num = Math.trunc(num)) + (num % 2) : Math.round(num));
}
