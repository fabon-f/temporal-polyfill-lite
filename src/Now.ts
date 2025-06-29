import {
	defineStringTag,
	rewritePropertyDescriptorsForProperties,
} from "./utils/property.ts";

export const Now = {
	timeZoneId() {},
	instant() {},
	plainDateTimeISO() {},
	zonedDateTimeISO() {},
	plainDateISO() {},
	plainTimeISO() {},
};

defineStringTag(Now, "Temporal.Now");
rewritePropertyDescriptorsForProperties(Now);
