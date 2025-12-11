import { defineStringTag } from "./internal/property.ts";

export class Duration {
	constructor() {}
	static from() {}
	static compare() {}
	get years() {
		return undefined;
	}
	get months() {
		return undefined;
	}
	get weeks() {
		return undefined;
	}
	get days() {
		return undefined;
	}
	get hours() {
		return undefined;
	}
	get minutes() {
		return undefined;
	}
	get seconds() {
		return undefined;
	}
	get milliseconds() {
		return undefined;
	}
	get microseconds() {
		return undefined;
	}
	get nanoseconds() {
		return undefined;
	}
	get sign() {
		return undefined;
	}
	get blank() {
		return undefined;
	}
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
	valueOf() {
		throw new TypeError();
	}
}

defineStringTag(Duration.prototype, "Temporal.Duration");
