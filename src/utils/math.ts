/** `y` should positive integer */
export function mod(x: number, y: number) {
	return ((x % y) + y) % y;
}
