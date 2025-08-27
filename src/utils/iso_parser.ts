import { type ISODateRecord, isValidISODate } from "../PlainDate.ts";
import { balanceTime, type TimeRecord } from "../PlainTime.ts";
import { assertCalendar } from "./calendars.ts";
import { toIntegerIfIntegral } from "./ecmascript.ts";
import { clampNumber } from "./math.ts";

/**
 * A, B, C -> A | A B | A B C
 */
function optionalChain(patterns: string[]) {
	return patterns.reduceRight((prev, current) => {
		return `${current}(?:${prev})?`;
	});
}

function join(pattern: string, separator: string) {
	return `${pattern}(?:${separator}${pattern})*`;
}

const dateYear = "\\d{4}|[-+]\\d{6}";
const dateMonth = "0[1-9]|1[0-2]";
const hour = "[01]\\d|2[0-3]";
const minuteSecond = "[0-5]\\d";
const timeSecond = "[0-5]\\d|60";

const date = `(?<a>${dateYear})(?<x>-?)(?<b>${dateMonth})\\k<x>(?<c>\\d\\d)`;

const time = optionalChain([
	`(?<d>${hour})`,
	`(?<y>:?)(?<e>${minuteSecond})`,
	`\\k<y>(?<f>${timeSecond})`,
	"[.,](?<g>\\d{1,9})",
]);

const utcOffsetWithSubMinute = optionalChain([
	`([+-])(${hour})`,
	`(?<z>:?)(${minuteSecond})`,
	`\\k<z>(${minuteSecond})`,
	"[.,](\\d{1,9})",
]);

const utcOffsetTimeZoneIdentifier = `([+-])(${hour})(?::?(${minuteSecond}))?`;
const timeZoneIANAName = join("[a-zA-Z._][a-zA-Z._+-\\d]*", "\\/");
const timeZoneIdentifier = `${utcOffsetTimeZoneIdentifier}|${timeZoneIANAName}`;
const timeZoneAnnotation = `\\[!?(?<j>${timeZoneIdentifier})\\]`;

const annotationKey = "[a-z_][a-z\\d_-]*";
const annotationValue = join("[a-zA-Z\\d]+", "-");
const annotation = `\\[(!)?(${annotationKey})=(${annotationValue})\\]`;

const dateTime = optionalChain([
	date,
	`[ tT]${time}`,
	`(?<h>${utcOffsetWithSubMinute})`,
]);
export const temporalDateTimeStringWithZoned = `${optionalChain([
	date,
	`[ tT]${time}`,
	`(?<h>${utcOffsetWithSubMinute})|(?<i>[zZ])`,
])}${timeZoneAnnotation}(?<k>(${annotation})*)`;
export const temporalDateTimeString = `${dateTime}(?:${timeZoneAnnotation})?(?<k>(${annotation})*)`;
export const temporalInstantString = `${date}[ tT]${time}(?:(?<h>${utcOffsetWithSubMinute})|(?<i>[zZ]))(?:${timeZoneAnnotation})?(?<k>(${annotation})*)`;
export const temporalTimeString = `(${date}[ tT]|[tT]?)${time}(?<h>${utcOffsetWithSubMinute})?(?:${timeZoneAnnotation})?(?<k>(${annotation})*)`;
export const temporalMonthDayString = `(${dateTime}|(?:--)?(?<m>${dateMonth})-?(?<n>\\d\\d))(?:${timeZoneAnnotation})?(?<k>(${annotation})*)`;
export const temporalYearMonthString = `(${dateTime}|(?<l>\\d\\d)-?(?<m>${dateMonth}))(?:${timeZoneAnnotation})?(?<k>(${annotation})*)`;

export function isValidTimeZoneIdentifier(timeZoneId: string) {
	return new RegExp(`^(${timeZoneIdentifier}$)`).test(timeZoneId);
}

export function isValidIanaTimeZoneId(timeZoneId: string) {
	return new RegExp(`^(${timeZoneIANAName})$`).test(timeZoneId);
}

type UtcOffsetParserResult = [
	sign: string,
	hour: string,
	minute: string | undefined,
	second: string | undefined,
	fractionalSecond: string | undefined,
];
export function parseUtcOffsetFormat(
	offset: string,
	subMinutePrecision: boolean,
): UtcOffsetParserResult | null {
	const result = offset.match(new RegExp(`^(?:${utcOffsetWithSubMinute})$`));
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

function isValidDate(
	y: string | number,
	m: string | number,
	d: string | number,
) {
	return isValidISODate(
		toIntegerIfIntegral(y),
		toIntegerIfIntegral(m),
		toIntegerIfIntegral(d),
	);
}

export type TimeZoneParseResult = [
	z: boolean,
	offsetString: string | undefined,
	timeZoneAnnotation: string | undefined,
];

export function parseISODateTime(
	iso: string,
	formats: string[],
): [
	ISODateRecord,
	TimeRecord | undefined,
	TimeZoneParseResult,
	calendar: string | undefined,
] {
	let parseResult: Record<string, string> | undefined;
	let calendar: string | undefined;
	for (const format of formats) {
		const result = iso.match(new RegExp(`^(?:${format})$`));
		if (result) {
			const r = result.groups!;
			if ((r["a"] || r["l"]) === "-000000") {
				continue;
			}
			if (r["a"] && !isValidDate(r["a"], r["b"]!, r["c"]!)) {
				continue;
			}
			if (r["n"] && !isValidDate(1972, r["m"]!, r["n"])) {
				continue;
			}
			calendar = parseAnnotationsAndGetCalendar(r["k"] || "");

			if (r["m"] && calendar !== undefined) {
				assertCalendar(calendar);
			}

			parseResult = r;
			break;
		}
	}
	if (!parseResult) {
		throw new RangeError();
	}
	const yearMv = toIntegerIfIntegral(
		parseResult["a"] || parseResult["l"] || "",
	);
	const monthMv = toIntegerIfIntegral(
		parseResult["b"] || parseResult["m"] || 1,
	);
	const dayMv = toIntegerIfIntegral(parseResult["c"] || parseResult["n"] || 1);
	const hourMv = toIntegerIfIntegral(parseResult["d"] || 0);
	const minuteMv = toIntegerIfIntegral(parseResult["e"] || 0);
	const secondMv = toIntegerIfIntegral(parseResult["f"] || 0);
	const [, , , , millisecondMv, microsecondMv, nanosecondMv] = balanceTime(
		0,
		0,
		0,
		0,
		0,
		toIntegerIfIntegral((parseResult["g"] || "").padEnd(9, "0")),
	);
	return [
		[yearMv, monthMv, dayMv],
		parseResult["d"]
			? [
					0,
					hourMv,
					minuteMv,
					clampNumber(secondMv, 0, 59),
					millisecondMv,
					microsecondMv,
					nanosecondMv,
				]
			: undefined,
		[!!parseResult["i"], parseResult["h"], parseResult["j"]],
		calendar,
	];
}

/** part of `ParseISODateTime` */
function parseAnnotationsAndGetCalendar(annotationsString: string) {
	let calendar: string | undefined;
	let calendarWasCritical = false;
	const regexp = new RegExp(annotation, "g");
	let match: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: regexp idiom
	while ((match = regexp.exec(annotationsString)) !== null) {
		const isCritical = !!match[1];
		if (match[2] === "u-ca") {
			if (calendar === undefined) {
				calendar = match[3];
				if (isCritical) {
					calendarWasCritical = true;
				}
			} else {
				if (isCritical || calendarWasCritical) {
					throw new RangeError();
				}
			}
		} else if (isCritical) {
			// unknown annotation with critical flag
			throw new RangeError();
		}
	}
	return calendar;
}
