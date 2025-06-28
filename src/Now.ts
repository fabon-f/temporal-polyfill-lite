import {
	defineStringTag,
	rewritePropertyDescriptorsForProperties,
} from "./utils/property.js";

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
