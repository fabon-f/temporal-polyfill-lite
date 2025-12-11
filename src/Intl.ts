import { DateTimeFormat } from "./DateTimeFormat.ts";

const originalIntl = globalThis.Intl;

export const Intl = {} as typeof globalThis.Intl;
const intlPropertyDescriptors = Object.getOwnPropertyDescriptors(originalIntl);
// @ts-expect-error
intlPropertyDescriptors.DateTimeFormat.value = DateTimeFormat;

Object.defineProperties(Intl, intlPropertyDescriptors);
