import { toTemporalInstant } from "./Instant.ts";
import { defineNonEnumerableProperty } from "./internal/property.ts";
import { Intl } from "./Intl.ts";
import { Temporal } from "./Temporal.ts";

defineNonEnumerableProperty(globalThis, "Temporal", Temporal);
defineNonEnumerableProperty(globalThis, "Intl", Intl);
defineNonEnumerableProperty(Date.prototype, "toTemporalInstant", toTemporalInstant);
