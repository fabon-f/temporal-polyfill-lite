import { OriginalDateTimeFormat } from "./DateTimeFormat.ts";
import { createTemporalInstant } from "./Instant.ts";
import {
	createEpochNanosecondsFromEpochMilliseconds,
	type EpochNanoseconds,
} from "./internal/epochNanoseconds.ts";
import { defineStringTag, makePropertiesNonEnumerable } from "./internal/property.ts";
import { toTemporalTimeZoneIdentifier } from "./internal/timeZones.ts";
import { createTemporalDate } from "./PlainDate.ts";
import { createTemporalDateTime, type IsoDateTimeRecord } from "./PlainDateTime.ts";
import { createTemporalTime } from "./PlainTime.ts";
import {
	createTemporalZonedDateTime,
	createZonedDateTimeSlot,
	getIsoDateTimeForZonedDateTimeSlot,
} from "./ZonedDateTime.ts";

/** `SystemTimeZoneIdentifier` */
function systemTimeZoneIdentifier() {
	// Creating `Intl.DateTimeFormat` is a CPU-heavy operation in many JS engines,
	// but caching it can cause an unexpected behavior for polyfill users, because the polyfill can return an outdated value.
	// Unfortunately there's no way to observe a system time zone change effectively.
	// cf. https://github.com/fullcalendar/temporal-polyfill/issues/63
	return new OriginalDateTimeFormat().resolvedOptions().timeZone;
}

/** `SystemUTCEpochNanoseconds` */
function systemUtcEpochNanoseconds(): EpochNanoseconds {
	return createEpochNanosecondsFromEpochMilliseconds(Date.now());
}

/** `SystemDateTime` */
function systemDateTime(temporalTimeZoneLike: unknown): IsoDateTimeRecord {
	const timeZone =
		temporalTimeZoneLike === undefined
			? systemTimeZoneIdentifier()
			: toTemporalTimeZoneIdentifier(temporalTimeZoneLike);
	return getIsoDateTimeForZonedDateTimeSlot(
		createZonedDateTimeSlot(systemUtcEpochNanoseconds(), timeZone, "iso8601"),
	);
}

export const Now = {
	timeZoneId() {
		return systemTimeZoneIdentifier();
	},
	instant() {
		return createTemporalInstant(systemUtcEpochNanoseconds());
	},
	plainDateTimeISO(temporalTimeZoneLike: unknown = undefined) {
		return createTemporalDateTime(systemDateTime(temporalTimeZoneLike), "iso8601");
	},
	zonedDateTimeISO(temporalTimeZoneLike: unknown = undefined) {
		const timeZone =
			temporalTimeZoneLike === undefined
				? systemTimeZoneIdentifier()
				: toTemporalTimeZoneIdentifier(temporalTimeZoneLike);
		return createTemporalZonedDateTime(systemUtcEpochNanoseconds(), timeZone, "iso8601");
	},
	plainDateISO(temporalTimeZoneLike: unknown = undefined) {
		return createTemporalDate(systemDateTime(temporalTimeZoneLike).$isoDate, "iso8601");
	},
	plainTimeISO(temporalTimeZoneLike: unknown = undefined) {
		return createTemporalTime(systemDateTime(temporalTimeZoneLike).$time);
	},
};

defineStringTag(Now, "Temporal.Now");
makePropertiesNonEnumerable(Now);
