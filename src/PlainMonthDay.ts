import { defineStringTag } from "./utils/property.js";

export class PlainMonthDay {
	constructor() {}
	static from() {}
	get calendarId() {
		return undefined;
	}
	get monthCode() {
		return undefined;
	}
	get day() {
		return undefined;
	}
	with() {}
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
	toPlainDate() {}
}

defineStringTag(PlainMonthDay.prototype, "Temporal.PlainMonthDay");
