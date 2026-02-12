import { assertNotUndefined, assertUnitIndex } from "./assertion.ts";
import { nanosecondsPerDay, nanosecondsPerHour, nanosecondsPerMinute } from "./constants.ts";

export const Unit = {
	Year: 0,
	Month: 1,
	Week: 2,
	Day: 3,
	Hour: 4,
	Minute: 5,
	Second: 6,
	Millisecond: 7,
	Microsecond: 8,
	Nanosecond: 9,
} as const;
export namespace Unit {
	export type Year = 0;
	export type Month = 1;
	export type Week = 2;
	export type Day = 3;
	export type Hour = 4;
	export type Minute = 5;
	export type Second = 6;
	export type Millisecond = 7;
	export type Microsecond = 8;
	export type Nanosecond = 9;
	export type Date = 0 | 1 | 2 | 3;
	export type Time = 4 | 5 | 6 | 7 | 8 | 9;
	export type Calendar = 0 | 1 | 2;
}
export type Unit =
	| Unit.Year
	| Unit.Month
	| Unit.Week
	| Unit.Day
	| Unit.Hour
	| Unit.Minute
	| Unit.Second
	| Unit.Millisecond
	| Unit.Microsecond
	| Unit.Nanosecond;

export function getUnitFromString(unitName: SingularUnitKey): Unit {
	const index = singularUnitKeys.indexOf(unitName);
	assertUnitIndex(index);
	return getUnitFromIndex(index);
}

export function getIndexFromUnit(unit: Unit): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
	return unit;
}

export function getUnitFromIndex(index: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): Unit {
	return index;
}

export function getNameFromUnit(unit: Unit) {
	return singularUnitKeys[unit];
}

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
	nanosecondsPerDay,
	nanosecondsPerHour,
	nanosecondsPerMinute,
	1e9,
	1e6,
	1e3,
	1,
] as [number, number, number, number, number, number, number];

export function nanosecondsForTimeUnit(unit: Unit.Day | Unit.Time): number {
	const length = timeUnitLengths[getIndexFromUnit(unit) - 3];
	assertNotUndefined(length);
	return length;
}
