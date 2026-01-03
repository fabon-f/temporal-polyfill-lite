import { isValidIsoDate } from "../PlainDate.ts";
import { createTimeRecord, type TimeRecord } from "../PlainTime.ts";
import { toNumber } from "./ecmascript.ts";
import { startOfDay } from "./enum.ts";
import { asciiLowerCase } from "./string.ts";
import { mapUnlessUndefined } from "./utils.ts";

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

// remove named capture groups because duplicate names of capture groups are allowed only after ES2025
const ambiguousTemporalTimeStringRegExp = createRegExp(
	`(${dateSpecMonthDay}|${dateSpecYearMonth})(${timeZoneAnnotation})?(${annotation})*`.replace(
		/<[^>]>/g,
		":",
	),
);
export function isAmbiguousTemporalTimeString(isoString: string): boolean {
	return ambiguousTemporalTimeStringRegExp.test(isoString);
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
	$time: TimeRecord | typeof startOfDay;
	$timeZone: IsoStringTimeZoneParseRecord;
	$calendar: string | undefined;
}

/** part of `ParseISODateTime` */
function parseAnnotationsAndGetCalendar(annotationsString: string): string | undefined {
	let calendar: string | undefined;
	let calendarWasCritical = false;
	const regexp = RegExp(annotation, "g");
	let match: RegExpExecArray | null;
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

/** part of `ParseISODateTime` */
function getTimeRecordFromMatchedGroups(matchedGroups: Record<string, string>): TimeRecord {
	const fractionalSecond = (matchedGroups["g"] || "").padEnd(9, "0");
	return createTimeRecord(
		toNumber(matchedGroups["d"] || 0),
		toNumber(matchedGroups["e"] || 0),
		toNumber(matchedGroups["f"] || 0),
		toNumber(fractionalSecond.slice(0, 3)),
		toNumber(fractionalSecond.slice(3, 6)),
		toNumber(fractionalSecond.slice(6)),
	);
}

/** "Static Semantics: Early Errors" */
function isSemanticallyValid(matchedGroups: Record<string, string>) {
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
	let matchedGroups: Record<string, string> | undefined;
	let calendar: string | undefined;
	for (const format of allowedFormats) {
		const result = isoString.match(format);
		if (!result || !isSemanticallyValid((matchedGroups = result.groups!))) {
			continue;
		}

		calendar = parseAnnotationsAndGetCalendar(matchedGroups["k"] || "");
		if (matchedGroups["m"]) {
			if (calendar !== undefined && asciiLowerCase(calendar) !== "iso8601") {
				throw new RangeError();
			}
		}
		break;
	}
	if (!matchedGroups) {
		throw new RangeError();
	}
	return {
		$year: mapUnlessUndefined(matchedGroups["a"] || matchedGroups["l"], toNumber),
		$month: toNumber(matchedGroups["b"] || matchedGroups["m"] || 1),
		$day: toNumber(matchedGroups["c"] || matchedGroups["n"] || 1),
		$time: matchedGroups["d"] ? getTimeRecordFromMatchedGroups(matchedGroups) : startOfDay,
		$timeZone: {
			$z: !!matchedGroups["i"],
			$offsetString: matchedGroups["h"],
			$timeZoneAnnotation: matchedGroups["j"],
		},
		$calendar: calendar,
	};
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
			throw new RangeError();
		}
		return item;
	}
}

const utcOffsetWithSubMinuteRegExp = createRegExp(utcOffsetWithSubMinute);

/** `ParseDateTimeUTCOffset` */
export function parseDateTimeUtcOffset(offset: string): number {
	const result = offset.match(utcOffsetWithSubMinuteRegExp);
	if (!result) {
		throw new RangeError();
	}
	return (
		toNumber(`${result[1]!}1`) *
		(toNumber(result[2]!) * 3.6e12 +
			toNumber(result[4] || "") * 6e10 +
			toNumber(result[5] || "") * 1e9 +
			toNumber((result[6] || "").padEnd(9, "0")))
	);
}
