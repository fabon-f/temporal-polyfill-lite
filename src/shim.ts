import { Intl, Temporal, toTemporalInstant } from "./index.ts";
import { defineNonEnumerableProperty } from "./internal/property.ts";

/**
 * Install Temporal polyfill.
 * @param overwrite Whether to overwrite an existing Temporal implementation
 */
export function install(overwrite: boolean): void {
	if (!overwrite && typeof globalThis.Temporal === "object") {
		return;
	}
	defineNonEnumerableProperty(globalThis, "Temporal", Temporal);
	defineNonEnumerableProperty(globalThis, "Intl", Intl);
	defineNonEnumerableProperty(Date.prototype, "toTemporalInstant", toTemporalInstant);
}
