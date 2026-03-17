import { Intl, Temporal, toTemporalInstant } from "./index.ts";
import { defineNonEnumerableProperty } from "./internal/property.ts";
import { setSystemTimeZoneIdCacheTtl as setSystemTimeZoneIdCacheTtlImpl } from "./Now.ts";

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

/**
 * Set TTL for `Temporal.Now.timeZoneId` cache (`Infinity` means no expiration). Pass `0` to clear and disable cache again.
 * @param ttl TTL in milliseconds
 */
export function setSystemTimeZoneIdCacheTtl(ttl: number): void {
	setSystemTimeZoneIdCacheTtlImpl(ttl);
}
