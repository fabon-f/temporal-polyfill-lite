import { defineStringTag, makePropertiesNonEnumerable } from "./internal/property.ts";

export const Now = {
	timeZoneId() {},
	instant() {},
	plainDateTimeISO() {},
	zonedDateTimeISO() {},
	plainDateISO() {},
	plainTimeISO() {},
};

defineStringTag(Now, "Temporal.Now");
makePropertiesNonEnumerable(Now);
