export const calendarNotSupported = (id: string) =>
	`calendar not supported in this polyfill: ${id}`;

export const missingField = (fieldName: string) => `missing field: ${fieldName}`;
export const invalidField = (fieldName: string) => `invalid field: ${fieldName}`;
export const disallowedField = (fieldName: string) => `disallowed field: ${fieldName}`;
export const parseError = "parse error";
export const invalidDateTime = "invalid date / time";
export const outOfBoundsDate = "out-of-bounds date";
export const outOfBoundsDuration = "out-of-bounds duration";
export const invalidFormattingOptions = "invalid formatting options";
export const calendarMismatch = "calendar mismatch";
export const timeZoneMismatch = "time zone mismatch";
export const invalidDuration = "invalid duration";
export const disallowedUnit = (unit: string) => `disallowed unit: ${unit}`;
export const invalidEra = (era: string) => `invalid era: ${era}`;
export const notString = (value: unknown) => `${value} is not a string`;
export const invalidNumber = (value: number) => `invalid number: ${value}`;
export const invalidOptionsObject = "invalid options object";
export const invalidTimeZone = (id: string) => `invalid time zone: ${id}`;
export const invalidMethodCall = "invalid method call";
export const invalidDate = "invalid date";
export const invalidMonthCode = (code: string) => `invalid month code:${code}`;
