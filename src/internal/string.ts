export function asciiLowerCase(str: string) {
	return str.replace(/[A-Z]/g, (str) => str.toLowerCase());
}

export function asciiUpperCase(str: string) {
	return str.replace(/[a-z]/g, (str) => str.toUpperCase());
}

export function asciiCapitalize(str: string) {
	return str.replace(/^[a-z]/, (cap) => cap.toUpperCase());
}
