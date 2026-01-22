import { Intl, Temporal, toTemporalInstant } from "./index.ts";
import { defineNonEnumerableProperty } from "./internal/property.ts";

defineNonEnumerableProperty(globalThis, "Temporal", Temporal);
defineNonEnumerableProperty(globalThis, "Intl", Intl);
defineNonEnumerableProperty(Date.prototype, "toTemporalInstant", toTemporalInstant);
