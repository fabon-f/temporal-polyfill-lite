import { defineStringTag } from "./internal/property.ts";

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
