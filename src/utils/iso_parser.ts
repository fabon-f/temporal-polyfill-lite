import { toIntegerIfIntegral } from "./ecmascript.ts";

const hour = "[01]\\d|2[0-3]";
const minuteSecond = "[0-5]\\d";
const temporalDecimalFraction = "[.,](\\d{1,9})";

/**
 * A, B, C -> A | A B | A B C
 */
function optionalChain(patterns: string[]) {
	return patterns.reduceRight((prev, current) => {
		return `${current}(?:${prev})?`;
	});
}

export function isValidIanaTimeZoneId(timeZoneId: string) {
	return timeZoneId
		.split("/")
		.every((part) => /^[a-zA-Z._][a-zA-Z._\d-+]*$/.test(part));
}

type UtcOffsetParserResult = [
	sign: string,
	hour: string,
	minute: string | undefined,
	second: string | undefined,
	fractionalSecond: string | undefined,
];
const utcOffsetRegExp = new RegExp(
	`^${optionalChain([
		`([+-])(${hour})`,
		`(:?)(${minuteSecond})`,
		`\\3(${minuteSecond})`,
		temporalDecimalFraction,
	])}$`,
);
export function parseUtcOffsetFormat(
	offset: string,
	subMinutePrecision: boolean,
): UtcOffsetParserResult | null {
	const result = offset.match(utcOffsetRegExp);
	if (!result) {
		return null;
	}
	const [, sign, h, , m, s, fs] = result as [
		string,
		string,
		string,
		string | undefined,
		string | undefined,
		string | undefined,
		string | undefined,
	];
	if (!subMinutePrecision && s !== undefined) {
		return null;
	}
	return [sign, h, m, s, fs];
}
export function utcOffsetToOffsetNanoseconds([
	sign,
	h,
	m = "",
	s = "",
	fs = "",
]: UtcOffsetParserResult) {
	return (
		toIntegerIfIntegral(`${sign}1`) *
		(toIntegerIfIntegral(h) * 3.6e12 +
			toIntegerIfIntegral(m) * 6e10 +
			toIntegerIfIntegral(s) * 1e9 +
			toIntegerIfIntegral(fs.padEnd(9, "0")))
	);
}
