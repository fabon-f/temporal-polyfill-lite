import { defineStringTag } from "./utils/property.js";

export class PlainTime {
	constructor() {}
	static from() {}
	static compare() {}
	get hour() {}
	get minute() {}
	get second() {}
	get millisecond() {}
	get microsecond() {}
	get nanosecond() {}
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
