import { toString } from "./ecmascript.ts";

export function asciiLowerCase(str: string) {
	return str.replace(/[A-Z]/g, (str) => str.toLowerCase());
}

export function asciiUpperCase(str: string) {
	return str.replace(/[a-z]/g, (str) => str.toUpperCase());
}

export function asciiCapitalize(str: string) {
	return str.replace(/^[a-z]/, (cap) => cap.toUpperCase());
}

export function ToZeroPaddedDecimalString(n: number, minLength: number) {
	return toString(n).padStart(minLength, "0");
}
