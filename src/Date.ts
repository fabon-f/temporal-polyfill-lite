import { createTemporalInstant, type Instant } from "./Instant.ts";
import { createEpochNanosecondsFromEpochMilliseconds } from "./internal/epochNanoseconds.ts";

export function toTemporalInstant(this: unknown): Instant {
	// brand check
	const epochMilliseconds = Date.prototype.valueOf.call(this);
	return createTemporalInstant(createEpochNanosecondsFromEpochMilliseconds(epochMilliseconds));
}
