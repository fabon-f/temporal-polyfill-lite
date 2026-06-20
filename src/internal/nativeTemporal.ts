import { assert } from "./assertion.ts";

export const NativeTemporal: typeof Temporal | undefined = globalThis.Temporal;

export function createNativeZonedDateTime(epochMilliseconds: number, timeZone: string) {
	// caller have to ensure that native Temporal exists in advance
	assert(NativeTemporal !== undefined);
	return NativeTemporal.ZonedDateTime.from(`${new Date(epochMilliseconds).toJSON()}[${timeZone}]`);
}
