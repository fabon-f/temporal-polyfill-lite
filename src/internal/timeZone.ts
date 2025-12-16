import { OriginalDateTimeFormat } from "../DateTimeFormat.ts";
import { nanosecondsPerMilliseconds } from "./constants.ts";
import { toIntegerIfIntegral } from "./ecmascript.ts";
import { epochSeconds, type EpochNanoseconds } from "./epochNanoseconds.ts";
import { clamp } from "./math.ts";
import { asciiCapitalize, asciiLowerCase, asciiUpperCase } from "./string.ts";
import { utcEpochMilliseconds } from "./time.ts";

const intlCache = Object.create(null) as Record<string, Intl.DateTimeFormat>;

export function getOffsetNanosecondsFor(timeZone: string, epoch: EpochNanoseconds) {
	if (timeZone === "UTC") {
		return 0;
	}
	// avoid CE / BCE confusion, clamp to 1653 BC (no offset transition in pre-modern years)
	const clampedEpoch = clamp(epochSeconds(epoch) * 1000, -1e13, Infinity);
	const parts = getFormatterForTimeZone(timeZone).formatToParts(clampedEpoch);
	const units = ["year", "month", "day", "hour", "minute", "second"].map((unit) =>
		toIntegerIfIntegral(parts.find((p) => p.type === unit)!.value),
	) as [number, number, number, number, number, number];
	return (utcEpochMilliseconds(...units) - clampedEpoch) * nanosecondsPerMilliseconds;
}

function getFormatterForTimeZone(timeZone: string): Intl.DateTimeFormat {
	return (intlCache[timeZone] ||= new OriginalDateTimeFormat("en-u-hc-h23", {
		timeZone,
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
	}));
}

/** normalize upper/lower case of IANA time zone IDs */
export function normalizeIanaTimeZoneId(id: string) {
	return asciiLowerCase(id).replace(/[^/]+/g, (part) => {
		if (/^(?!etc|yap).{1,3}$|\d/.test(part)) {
			return asciiUpperCase(part);
		}
		return part.replace(/baja|mc|comod|[a-z]+/g, (word) => {
			if (/^(su|gb|nz|in|chat)$/.test(word)) {
				return asciiUpperCase(word);
			}
			if (/^(of|au|es)$/.test(word)) {
				return word;
			}
			return asciiCapitalize(word).replace(/du(?=r)|n(?=or)|i(?=slan)/, asciiUpperCase);
		});
	});
}
