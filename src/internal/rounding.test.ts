import { expect, test } from "vitest";
import {
	roundExpand,
	roundHalfEven,
	roundHalfExpand,
	roundHalfFloor,
	roundHalfTrunc,
} from "./rounding.ts";

test.for([
	[0, 0],
	[0.1, 1],
	[0.5, 1],
	[1, 1],
	[1.1, 2],
	[-0.1, -1],
	[-0.5, -1],
	[-1, -1],
	[-1.1, -2],
] as [number, number][])("roundExpand(%s) is %s", ([input, expected]) => {
	expect(roundExpand(input)).toBe(expected);
});

test.for([
	[0.49, 0],
	[0.5, 0],
	[0.51, 1],
	[1.5, 1],
	[2.5, 2],
	[-0.49, 0],
	[-0.5, -1],
	[-0.51, -1],
	[-1.5, -2],
	[-2.5, -3],
] as [number, number][])("roundHalfFloor(%s) is %s", ([input, expected]) => {
	expect(roundHalfFloor(input)).toBe(expected);
});

test.for([
	[0.49, 0],
	[0.5, 1],
	[0.51, 1],
	[1.5, 2],
	[-0.49, 0],
	[-0.5, -1],
	[-0.51, -1],
	[-1.5, -2],
] as [number, number][])("roundHalfExpand(%s) is %s", ([input, expected]) => {
	expect(roundHalfExpand(input)).toBe(expected);
});

test.for([
	[0.49, 0],
	[0.5, 0],
	[0.51, 1],
	[1.5, 1],
	[-0.49, 0],
	[-0.5, 0],
	[-0.51, -1],
	[-1.5, -1],
] as [number, number][])("roundHalfTrunc(%s) is %s", ([input, expected]) => {
	expect(roundHalfTrunc(input)).toBe(expected);
});

test.for([
	[0.49, 0],
	[0.5, 0],
	[0.51, 1],
	[1.49, 1],
	[1.5, 2],
	[1.51, 2],
	[2.5, 2],
	[3.5, 4],
	[-0.5, 0],
	[-0.51, -1],
	[-1.49, -1],
	[-1.5, -2],
	[-1.51, -2],
	[-2.5, -2],
	[-3.5, -4],
] as [number, number][])("roundHalfEven(%s) is %s", ([input, expected]) => {
	expect(roundHalfEven(input)).toBe(expected);
});
