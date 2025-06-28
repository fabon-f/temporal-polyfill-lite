import { defineStringTag } from "./utils/property.js";

export class Instant {
	constructor() {}
	static from() {}
	static fromEpochMilliseconds() {}
	static fromEpochNanoseconds() {}
	static compare() {}
	get epochMilliseconds() {}
	get epochNanoseconds() {}
	add() {}
	subtract() {}
	until() {}
	since() {}
	round() {}
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
	toZonedDateTimeISO() {}
}

defineStringTag(Instant.prototype, "Temporal.Instant");
