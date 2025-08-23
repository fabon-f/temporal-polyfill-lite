import { mod } from "./utils/math.ts";
import { defineStringTag } from "./utils/property.ts";

export type TimeRecord = [
	/** overflow days, usually 0 */
	day: number,
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
];

export function isValidTime(
	_: unknown,
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
) {
	return (
		hour >= 0 &&
		hour < 24 &&
		minute >= 0 &&
		minute < 60 &&
		second >= 0 &&
		second < 60 &&
		millisecond >= 0 &&
		millisecond < 1000 &&
		microsecond >= 0 &&
		microsecond < 1000 &&
		nanosecond >= 0 &&
		nanosecond < 1000
	);
}

/** `BalanceTime` */
export function balanceTime(
	hour: number,
	minute: number,
	second: number,
	millisecond: number,
	microsecond: number,
	nanosecond: number,
): TimeRecord {
	microsecond += Math.floor(nanosecond / 1000);
	millisecond += Math.floor(microsecond / 1000);
	second += Math.floor(millisecond / 1000);
	minute += Math.floor(second / 60);
	hour += Math.floor(minute / 60);
	return [
		Math.floor(hour / 24),
		mod(hour, 24),
		mod(minute, 60),
		mod(second, 60),
		mod(millisecond, 1000),
		mod(microsecond, 1000),
		mod(nanosecond, 1000),
	];
}

export class PlainTime {
	constructor() {}
	static from() {}
	static compare() {}
	get hour() {
		return undefined;
	}
	get minute() {
		return undefined;
	}
	get second() {
		return undefined;
	}
	get millisecond() {
		return undefined;
	}
	get microsecond() {
		return undefined;
	}
	get nanosecond() {
		return undefined;
	}
	add() {}
	subtract() {}
	with() {}
	until() {}
	since() {}
	round() {}
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
}

defineStringTag(PlainTime.prototype, "Temporal.PlainTime");
