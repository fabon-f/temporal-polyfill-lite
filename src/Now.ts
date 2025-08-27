import { createTemporalInstant, createTemporalInstantSlot } from "./Instant.ts";
import { type EpochNanoseconds, normalizeEpoch } from "./utils/epochNano.ts";
import {
	defineStringTag,
	rewritePropertyDescriptorsForProperties,
} from "./utils/property.ts";
import {
	createTemporalZonedDateTime,
	createTemporalZonedDateTimeSlot,
} from "./ZonedDateTime.ts";

/** `SystemTimeZoneIdentifier` */
function systemTimeZoneIdentifier() {
	// creating `Intl.DateTimeFormat` is a CPU-heavy operation in many JS engines,
	// but caching it can be an unexpected behavior for polyfill users since the polyfill can return an outdated value,
	// and there's no way to observe a system time zone change effectively.
	// cf. https://github.com/fullcalendar/temporal-polyfill/issues/63
	return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** `SystemUTCEpochNanoseconds` */
function systemUTCEpochNanoseconds(): EpochNanoseconds {
	return normalizeEpoch(Date.now(), 0);
}

export const Now = {
	timeZoneId() {
		return systemTimeZoneIdentifier();
	},
	instant() {
		return createTemporalInstant(
			createTemporalInstantSlot(systemUTCEpochNanoseconds()),
		);
	},
	plainDateTimeISO() {},
	zonedDateTimeISO() {
		return createTemporalZonedDateTime(
			createTemporalZonedDateTimeSlot(
				systemUTCEpochNanoseconds(),
				systemTimeZoneIdentifier(),
				undefined,
			),
		);
	},
	plainDateISO() {},
	plainTimeISO() {},
};

defineStringTag(Now, "Temporal.Now");
rewritePropertyDescriptorsForProperties(Now);
