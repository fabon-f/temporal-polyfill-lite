import {
	millisecondsPerDay,
	nanosecondsPerMilliseconds,
	nanosecondsPerMinute,
} from "./constants.ts";

export const unitYear = 0;
export const unitMonth = 1;
export const unitWeek = 2;
export const unitDay = 3;
export const unitHour = 4;
export const unitMinute = 5;
export const unitSecond = 6;
export const unitMillisecond = 7;
export const unitMicrosecond = 8;
export const unitNanosecond = 9;
export type Unit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const singularUnitKeys = [
	"year",
	"month",
	"week",
	"day",
	"hour",
	"minute",
	"second",
	"millisecond",
	"microsecond",
	"nanosecond",
] as const;
export const pluralUnitKeys = singularUnitKeys.map((u) => `${u}s`) as [
	"years",
	"months",
	"weeks",
	"days",
	"hours",
	"minutes",
	"seconds",
	"milliseconds",
	"microseconds",
	"nanoseconds",
];
export type SingularUnitKey = (typeof singularUnitKeys)[number];
export type PluralUnitKey = (typeof pluralUnitKeys)[number];

export const timeUnitLengths = [
	millisecondsPerDay * nanosecondsPerMilliseconds,
	3.6e12,
	nanosecondsPerMinute,
	1e9,
	1e6,
	1e3,
	1,
] as [number, number, number, number, number, number, number];
