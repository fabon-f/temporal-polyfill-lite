import { Duration } from "./Duration.ts";
import { Instant } from "./Instant.ts";
import { Now } from "./Now.ts";
import { PlainDate } from "./PlainDate.ts";
import { PlainDateTime } from "./PlainDateTime.ts";
import { PlainMonthDay } from "./PlainMonthDay.ts";
import { PlainTime } from "./PlainTime.ts";
import { PlainYearMonth } from "./PlainYearMonth.ts";
import {
	defineStringTag,
	rewritePropertyDescriptorsForProperties,
} from "./utils/property.ts";
import { ZonedDateTime } from "./ZonedDateTime.ts";

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
