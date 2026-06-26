import { DateTimeFormat } from "./DateTimeFormat.ts";
import { DurationFormat } from "./DurationFormat.ts";

const intlPropertyDescriptors = Object.getOwnPropertyDescriptors(globalThis.Intl);
intlPropertyDescriptors.DateTimeFormat.value =
	DateTimeFormat as any as Intl.DateTimeFormatConstructor;
if (intlPropertyDescriptors.DurationFormat) {
	intlPropertyDescriptors.DurationFormat.value = DurationFormat;
}

export const Intl = {} as typeof globalThis.Intl;

Object.defineProperties(Intl, intlPropertyDescriptors);
