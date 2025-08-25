import { balanceTime } from "../PlainTime.ts";
import { formatTimeString } from "./ao.ts";
import {
	isValidIanaTimeZoneId,
	parseUtcOffsetFormat,
	utcOffsetToOffsetNanoseconds,
} from "./iso_parser.ts";
import { capitalize, upperCase } from "./string.ts";

const localeForIntlQuery = "en-GB";
const intlCache = Object.create(null) as Record<string, Intl.DateTimeFormat>;

/** `GetAvailableNamedTimeZoneIdentifier` */
export function getAvailableNamedTimeZoneIdentifier(timeZone: string) {
	timeZone = normalizeTimeZoneIdCase(timeZone);
	getFormatter(timeZone);
	return timeZone;
}

/** `FormatUTCOffsetNanoseconds` */
export function formatUTCOffsetNanoseconds(offsetNanoseconds: number) {
	const [, h, m, s, milli, micro, nano] = balanceTime(
		0,
		0,
		0,
		0,
		0,
		Math.abs(offsetNanoseconds),
	);
	return `${offsetNanoseconds < 0 ? "-" : "+"}${formatTimeString(h, m, s, milli * 1e6 + micro * 1e3 + nano)}`;
}

/**
 * `ParseTimeZoneIdentifier`
 * @returns offset nanoseconds for UTC offset, time zone ID for IANA
 */
export function parseTimeZoneIdentifier(timeZone: string): string | number {
	const utcResult = parseUtcOffsetFormat(timeZone, false);
	if (utcResult) {
		return utcOffsetToOffsetNanoseconds(utcResult);
	}
	if (!isValidIanaTimeZoneId(timeZone)) {
		throw new RangeError();
	}
	return timeZone;
}

export function normalizeTimeZoneIdCase(id: string) {
	return id
		.toLowerCase()
		.split("/")
		.map((part) => {
			if (/^(?!etc|yap).{1,3}$|\d/.test(part)) {
				return upperCase(part);
			}
			return part.replace(/baja|mc|comod|[a-z]+/g, (word) => {
				if (/^(su|gb|nz|in|chat)$/.test(word)) {
					return upperCase(word);
				}
				if (/^(of|au|es)$/.test(word)) {
					return word;
				}
				return capitalize(word).replace(
					/du(?=r)|n(?=oro)|i(?=sland)/,
					upperCase,
				);
			});
		})
		.join("/");
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
	// biome-ignore lint/suspicious/noAssignInExpressions: code golf
	return (intlCache[timeZone] ||= new Intl.DateTimeFormat(localeForIntlQuery, {
		timeZone,
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
	}));
}
