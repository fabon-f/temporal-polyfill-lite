import { isValidIsoDate } from "../PlainDate.ts";
import { createTimeRecord, type TimeRecord } from "../PlainTime.ts";
import { assert, assertNotUndefined } from "./assertion.ts";
import { nanosecondsPerMinute } from "./constants.ts";
import { toNumber } from "./ecmascript.ts";
import { parseError } from "./errorMessages.ts";
import { clamp } from "./math.ts";
import { asciiLowerCase } from "./string.ts";
import { mapUnlessUndefined, throwRangeError } from "./utils.ts";

/**
 * A, B, C -> A | A B | A B C
 */
function optionalChain(patterns: string[]): string {
	return patterns.reduceRight((prev, current) => {
		return `${current}(?:${prev})?`;
	});
}

function join(pattern: string, separator: string): string {
	return `${pattern}(?:${separator}${pattern})*`;
}

function createRegExp(pattern: string): RegExp {
	return RegExp(`^(?:${pattern})$`);
}

const dateYear = "\\d{4}|[-+]\\d{6}";
const dateMonth = "0[1-9]|1[0-2]";
const dateDay = "0[1-9]|[12]\\d|30|31";
const hour = "[01]\\d|2[0-3]";
const minuteSecond = "[0-5]\\d";
const timeSecond = "[0-5]\\d|60";

const date = `(?<a>${dateYear})(?<x>-?)(?<b>${dateMonth})\\k<x>(?<c>${dateDay})`;

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

const dateTime = optionalChain([date, `[ tT]${time}`, `(?<h>${utcOffsetWithSubMinute})`]);
const dateSpecYearMonth = `(?<l>${dateYear})-?(?<m>${dateMonth})`;
const dateSpecMonthDay = `(?:--)?(?<m>${dateMonth})-?(?<n>${dateDay})`;

const dateTimeUtcOffset = `(?<h>${utcOffsetWithSubMinute})|(?<i>[zZ])`;

const utcOffsetTimeZoneIdentifier = `([+-])(${hour})(?::?(${minuteSecond}))?`;
const timeZoneIANAName = join("[a-zA-Z._][a-zA-Z._+-\\d]*", "\\/");
const timeZoneIdentifier = `${utcOffsetTimeZoneIdentifier}|${timeZoneIANAName}`;
const timeZoneAnnotation = `\\[!?(?<j>${timeZoneIdentifier})\\]`;

const annotationKey = "[a-z_][a-z\\d_-]*";
const annotationValue = join("[a-zA-Z\\d]+", "-");
const annotation = `\\[(!)?(${annotationKey})=(${annotationValue})\\]`;
const annotations = `(?<k>(${annotation})*)`;
const annotationRegExp = RegExp(annotation, "g");

export const temporalZonedDateTimeStringRegExp = createRegExp(
	`${optionalChain([date, `[ tT]${time}`, dateTimeUtcOffset])}${timeZoneAnnotation}${annotations}`,
);
export const temporalDateTimeStringRegExp = createRegExp(
	`${dateTime}(?:${timeZoneAnnotation})?${annotations}`,
);
export const temporalInstantStringRegExp = createRegExp(
	`${date}[ tT]${time}(?:${dateTimeUtcOffset})(?:${timeZoneAnnotation})?${annotations}`,
);
export const temporalTimeStringRegExp = createRegExp(
	`(${date}[ tT]|[tT]?)${time}(?<h>${utcOffsetWithSubMinute})?(?:${timeZoneAnnotation})?${annotations}`,
);
export const temporalMonthDayStringRegExp = createRegExp(
	`(${dateTime}|${dateSpecMonthDay})(?:${timeZoneAnnotation})?${annotations}`,
);
export const temporalYearMonthStringRegExp = createRegExp(
	`(${dateTime}|${dateSpecYearMonth})(?:${timeZoneAnnotation})?${annotations}`,
);

const ambiguousTemporalTimeStringRegExp = [
	createRegExp(`${dateSpecMonthDay}(${timeZoneAnnotation})?(${annotation})*`),
	createRegExp(`${dateSpecYearMonth}(${timeZoneAnnotation})?(${annotation})*`),
];

function isAmbiguousTemporalTimeString(isoString: string): boolean {
	return ambiguousTemporalTimeStringRegExp.some((regexp) => {
		const result = isoString.match(regexp);
		return result && isSemanticallyValid(result.groups!);
	});
}

const timeZoneIdentifierRegExp = createRegExp(timeZoneIdentifier);
export function isTimeZoneIdentifier(timeZone: string): boolean {
	return timeZoneIdentifierRegExp.test(timeZone);
}

interface IsoStringTimeZoneParseRecord {
	$z: boolean;
	$offsetString: string | undefined;
	$timeZoneAnnotation: string | undefined;
}

interface IsoDateTimeParseRecord {
	$year: number | undefined;
	$month: number;
	$day: number;
	/** `undefined` means `START-OF-DAY` */
	$time: TimeRecord | undefined;
	$timeZone: IsoStringTimeZoneParseRecord;
	$calendar: string | undefined;
}

/** part of `ParseISODateTime` */
function parseAnnotationsAndGetCalendar(annotationsString: string): string | undefined {
	let calendar: string | undefined;
	let calendarWasCritical = false;
	for (const match of annotationsString.matchAll(annotationRegExp)) {
		const isCritical = !!match[1];
		if (match[2] === "u-ca") {
			if (!calendar) {
				calendar = match[3];
				if (isCritical) {
					calendarWasCritical = true;
				}
			} else {
				if (isCritical || calendarWasCritical) {
					throwRangeError(parseError);
				}
			}
		} else if (isCritical) {
			// unknown annotation with critical flag
			throwRangeError(parseError);
		}
	}
	return calendar;
}

/** part of `ParseISODateTime` */
function getTimeRecordFromMatchedGroups(matchedGroups: Record<string, string>): TimeRecord {
	const fractionalSecond = (matchedGroups["g"] || "").padEnd(9, "0");
	return createTimeRecord(
		toNumber(matchedGroups["d"] || 0),
		toNumber(matchedGroups["e"] || 0),
		clamp(toNumber(matchedGroups["f"] || 0), 0, 59),
		toNumber(fractionalSecond.slice(0, 3)),
		toNumber(fractionalSecond.slice(3, 6)),
		toNumber(fractionalSecond.slice(6)),
	);
}

/** "Static Semantics: Early Errors" */
function isSemanticallyValid(matchedGroups: Record<string, string>): boolean {
	return (
		(matchedGroups["a"] || matchedGroups["l"]) !== "-000000" &&
		(!matchedGroups["a"] ||
			isValidIsoDate(
				toNumber(matchedGroups["a"]),
				toNumber(matchedGroups["b"]),
				toNumber(matchedGroups["c"]),
			)) &&
		(!matchedGroups["n"] ||
			isValidIsoDate(1972, toNumber(matchedGroups["m"]), toNumber(matchedGroups["n"])))
	);
}

/** `ParseISODateTime` */
export function parseIsoDateTime(
	isoString: string,
	allowedFormats: RegExp[],
): IsoDateTimeParseRecord {
	for (const format of allowedFormats) {
		const result = isoString.match(format);
		if (
			!result ||
			!isSemanticallyValid(result.groups!) ||
			(format === temporalTimeStringRegExp && isAmbiguousTemporalTimeString(isoString))
		) {
			continue;
		}
		const matchedGroups = result.groups!;
		const calendar = parseAnnotationsAndGetCalendar(matchedGroups["k"] || "");
		if (matchedGroups["m"]) {
			if (calendar && asciiLowerCase(calendar) !== "iso8601") {
				throwRangeError(parseError);
			}
		}
		return {
			$year: mapUnlessUndefined(matchedGroups["a"] || matchedGroups["l"], toNumber),
			$month: toNumber(matchedGroups["b"] || matchedGroups["m"] || 1),
			$day: toNumber(matchedGroups["c"] || matchedGroups["n"] || 1),
			$time: matchedGroups["d"] ? getTimeRecordFromMatchedGroups(matchedGroups) : undefined,
			$timeZone: {
				$z: !!matchedGroups["i"],
				$offsetString: matchedGroups["h"],
				$timeZoneAnnotation: matchedGroups["j"],
			},
			$calendar: calendar,
		};
	}
	throwRangeError(parseError);
}

const annotationValueRegExp = createRegExp(annotationValue);

/** `ParseTemporalCalendarString` */
export function parseTemporalCalendarString(item: string): string {
	try {
		return (
			parseIsoDateTime(item, [
				temporalZonedDateTimeStringRegExp,
				temporalDateTimeStringRegExp,
				temporalInstantStringRegExp,
				temporalTimeStringRegExp,
				temporalMonthDayStringRegExp,
				temporalYearMonthStringRegExp,
			]).$calendar || "iso8601"
		);
	} catch {
		if (!annotationValueRegExp.test(item)) {
			throwRangeError(parseError);
		}
		return item;
	}
}

const utcOffsetWithSubMinuteRegExp = createRegExp(utcOffsetWithSubMinute);

/** `ParseDateTimeUTCOffset` */
export function parseDateTimeUtcOffset(offset: string): number {
	const result = offset.match(utcOffsetWithSubMinuteRegExp);
	if (!result) {
		throwRangeError(parseError);
	}
	assertNotUndefined(result[1]);
	assertNotUndefined(result[2]);
	return (
		toNumber(`${result[1]}1`) *
		(toNumber(result[2]) * 3.6e12 +
			toNumber(result[4] || "") * nanosecondsPerMinute +
			toNumber(result[5] || "") * 1e9 +
			toNumber((result[6] || "").padEnd(9, "0")) +
			0)
	);
}

export function hasUtcOffsetSubMinuteParts(offset: string): boolean {
	const result = offset.match(utcOffsetWithSubMinuteRegExp);
	assert(result !== null);
	return !!result[5];
}
