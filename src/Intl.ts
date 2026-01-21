import { DateTimeFormat } from "./DateTimeFormat.ts";

const intlPropertyDescriptors = Object.getOwnPropertyDescriptors(globalThis.Intl);
intlPropertyDescriptors.DateTimeFormat.value = DateTimeFormat;

export const Intl = {} as typeof globalThis.Intl;

Object.defineProperties(Intl, intlPropertyDescriptors);
