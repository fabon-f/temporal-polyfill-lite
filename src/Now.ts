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

let ttlMilliseconds = 0;

let systemTimeZoneCache:
	| {
			$timeZone: string;
			$accessTimestamp: number;
	  }
	| undefined;

/** `SystemTimeZoneIdentifier` */
export function systemTimeZoneIdentifier(): string {
	// Creating `Intl.DateTimeFormat` is a CPU-heavy operation in many JS engines,
	// but caching it can cause an unexpected behavior for polyfill users, because the polyfill can return an outdated value.
	// Unfortunately there's no way to observe a system time zone change effectively.
	// cf. https://github.com/fullcalendar/temporal-polyfill/issues/63
	// Therefore we implement opt-in caching which is disabled by default.

	// Time-based cache doesn't work in runtimes which disallow timers (e.g. Cloudflare Workers),
	// but it won't be a problem since system time zone don't change in such special runtimes.
	if (
		ttlMilliseconds &&
		systemTimeZoneCache &&
		systemTimeZoneCache.$accessTimestamp + ttlMilliseconds > /*#__PURE__*/ Date.now()
	) {
		// cache is not expired yet
		return systemTimeZoneCache.$timeZone;
	}
	systemTimeZoneCache = {
		// `resolvedOptions().timeZone` can be `undefined` in some engines
		// cf. https://github.com/fabon-f/temporal-polyfill-lite/issues/54
		$timeZone: OriginalDateTimeFormat().resolvedOptions().timeZone || "UTC",
		$accessTimestamp: /*#__PURE__*/ Date.now(),
	};
	return systemTimeZoneCache.$timeZone;
}

export function setSystemTimeZoneIdCacheTtl(ttl: number) {
	ttlMilliseconds = ttl;
	if (!ttl) {
		systemTimeZoneCache = undefined;
	}
}

/** `SystemUTCEpochNanoseconds` */
function systemUtcEpochNanoseconds(): EpochNanoseconds {
	return createEpochNanosecondsFromEpochMilliseconds(Date.now());
}

/** `SystemDateTime` */
function systemDateTime(
	temporalTimeZoneLike: unknown = systemTimeZoneIdentifier(),
): IsoDateTimeRecord {
	return getIsoDateTimeForZonedDateTimeSlot(
		createZonedDateTimeSlot(
			systemUtcEpochNanoseconds(),
			toTemporalTimeZoneIdentifier(temporalTimeZoneLike),
			"iso8601",
		),
	);
}

// oxlint-disable typescript/no-useless-default-assignment
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
	zonedDateTimeISO(temporalTimeZoneLike: unknown = systemTimeZoneIdentifier()) {
		return createTemporalZonedDateTime(
			systemUtcEpochNanoseconds(),
			toTemporalTimeZoneIdentifier(temporalTimeZoneLike),
			"iso8601",
		);
	},
	plainDateISO(temporalTimeZoneLike: unknown = undefined) {
		return createTemporalDate(systemDateTime(temporalTimeZoneLike).$isoDate, "iso8601");
	},
	plainTimeISO(temporalTimeZoneLike: unknown = undefined) {
		return createTemporalTime(systemDateTime(temporalTimeZoneLike).$time);
	},
};
// oxlint-enable typescript/no-useless-default-assignment

defineStringTag(Now, "Temporal.Now");
makePropertiesNonEnumerable(Now);
