import { createTemporalInstant, type Instant } from "./Instant.ts";
import { createEpochNanosecondsFromEpochMilliseconds } from "./internal/epochNanoseconds.ts";

export function toTemporalInstant(this: unknown): Instant {
	// brand check
	const epochMilliseconds = Date.prototype.valueOf.call(this);
	if (isNaN(epochMilliseconds)) {
		throw new RangeError();
	}
	return createTemporalInstant(createEpochNanosecondsFromEpochMilliseconds(epochMilliseconds));
}
