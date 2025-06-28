import { defineStringTag } from "./utils/property.js";

export class Duration {
	constructor() {}
	static from() {}
	static compare() {}
	get years() {}
	get months() {}
	get weeks() {}
	get days() {}
	get hours() {}
	get minutes() {}
	get seconds() {}
	get milliseconds() {}
	get microseconds() {}
	get nanoseconds() {}
	get sign() {}
	get blank() {}

	with() {}
	negated() {}
	abs() {}
	add() {}
	subtract() {}
	round() {}
	total() {}
	toString() {}
	toJSON() {}
	toLocaleString() {}
	valueOf() {}
}

defineStringTag(Duration.prototype, "Temporal.Duration");
