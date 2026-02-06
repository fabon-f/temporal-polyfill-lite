import { getNameFromUnit, Unit } from "./unit.ts";

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
export const disallowedUnit = (unit: "auto" | Unit) =>
	`disallowed unit: ${unit === "auto" ? unit : getNameFromUnit(unit)}`;
export const invalidEra = (era: string) => `invalid era: ${era}`;
export const notString = (value: unknown) => `${value} is not a string`;
export const invalidNumber = (value: number) => `invalid number: ${value}`;
export const invalidOptionsObject = "invalid options object";
export const invalidTimeZone = (id: string) => `invalid time zone: ${id}`;
export const invalidMethodCall = "invalid method call";
export const invalidDate = "invalid date";
export const invalidMonthCode = (code: string) => `invalid month code:${code}`;
export const durationWithDateUnit = (unit: Unit) =>
	`duration has a date unit: ${getNameFromUnit(unit)}`;
export const invalidLargestAndSmallestUnitOptions =
	"invalid `largestUnit` and `smallestUnit` options";
export const monthMismatch = "mismatch of `month` and `monthCode`";
export const yearMismatch = "mismatch of `year`, `era` and `eraYear`";
export const offsetMismatch = "time zone offset mismatch";
export const ambiguousTime = "ambiguity / gaps in local time";
export const yearMonthAddition = "duration can contain only years and months";
export const temporalTypeMismatch = "Temporal type mismatch";
export const notFormattable = "value is not formattable";
export const notObject = (value: unknown) => `not object: ${value}`;
export const emptyFields = "empty fields";
export const forbiddenValueOf = "can't convert Temporal classes to number";
export const toPrimitiveFailed = "cannot convert value to primitive";
export const undefinedArgument = "argument is undefined";
export const invalidPartialTemporalObject = "invalid argument for `with` method";
