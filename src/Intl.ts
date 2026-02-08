import { DateTimeFormat } from "./DateTimeFormat.ts";

const intlPropertyDescriptors = Object.getOwnPropertyDescriptors(globalThis.Intl);
intlPropertyDescriptors.DateTimeFormat.value =
	DateTimeFormat as any as Intl.DateTimeFormatConstructor;

export const Intl = {} as typeof globalThis.Intl;

Object.defineProperties(Intl, intlPropertyDescriptors);
