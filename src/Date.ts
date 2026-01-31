import { createTemporalInstant, type Instant } from "./Instant.ts";
import { createEpochNanosecondsFromEpochMilliseconds } from "./internal/epochNanoseconds.ts";
import { invalidDate } from "./internal/errorMessages.ts";
import { throwRangeError } from "./internal/utils.ts";

class TmpClass {
	// make `toTemporalInstant` not work as constructor
	toTemporalInstant(this: unknown): Instant {
		// brand check
		const epochMilliseconds = Date.prototype.valueOf.call(this);
		if (isNaN(epochMilliseconds)) {
			throwRangeError(invalidDate);
		}
		return createTemporalInstant(createEpochNanosecondsFromEpochMilliseconds(epochMilliseconds));
	}
}

export const toTemporalInstant = TmpClass.prototype.toTemporalInstant;
