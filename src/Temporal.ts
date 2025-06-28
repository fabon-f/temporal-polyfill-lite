import { Duration } from "./Duration.js";
import { Instant } from "./Instant.js";
import { Now } from "./Now.js";
import { PlainDate } from "./PlainDate.js";
import { PlainDateTime } from "./PlainDateTime.js";
import { PlainMonthDay } from "./PlainMonthDay.js";
import { PlainTime } from "./PlainTime.js";
import { PlainYearMonth } from "./PlainYearMonth.js";
import {
	defineStringTag,
	rewritePropertyDescriptorsForProperties,
} from "./utils/property.js";
import { ZonedDateTime } from "./ZonedDateTime.js";

export const Temporal = {
	Instant,
	PlainDateTime,
	PlainDate,
	PlainTime,
	PlainYearMonth,
	PlainMonthDay,
	Duration,
	ZonedDateTime,
	Now,
};

defineStringTag(Temporal, "Temporal");
rewritePropertyDescriptorsForProperties(Temporal);
