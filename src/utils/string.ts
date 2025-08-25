export function upperCase(str: string) {
	return str.toUpperCase();
}

export function capitalize(str: string) {
	return str.replace(/^[a-z]/, upperCase);
}
