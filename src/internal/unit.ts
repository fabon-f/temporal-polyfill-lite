import {
	millisecondsPerDay,
	nanosecondsPerMilliseconds,
	nanosecondsPerMinute,
} from "./constants.ts";

export const unitIndices = {
	$year: 0,
	$month: 1,
	$week: 2,
	$day: 3,
	$hour: 4,
	$minute: 5,
	$second: 6,
	$millisecond: 7,
	$microsecond: 8,
	$nanosecond: 9,
} as const;
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
