import { OriginalDateTimeFormat } from "./DateTimeFormat.ts";
import { defineStringTag, makePropertiesNonEnumerable } from "./internal/property.ts";

/** `SystemTimeZoneIdentifier` */
function systemTimeZoneIdentifier() {
	// Creating `Intl.DateTimeFormat` is a CPU-heavy operation in many JS engines,
	// but caching it can cause an unexpected behavior for polyfill users, because the polyfill can return an outdated value.
	// Unfortunately there's no way to observe a system time zone change effectively.
	// cf. https://github.com/fullcalendar/temporal-polyfill/issues/63
	return new OriginalDateTimeFormat().resolvedOptions().timeZone;
}

export const Now = {
	timeZoneId() {
		return systemTimeZoneIdentifier();
	},
	instant() {},
	plainDateTimeISO() {},
	zonedDateTimeISO() {},
	plainDateISO() {},
	plainTimeISO() {},
};

defineStringTag(Now, "Temporal.Now");
makePropertiesNonEnumerable(Now);
