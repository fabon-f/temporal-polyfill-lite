import { defineStringTag } from "./utils/property.js";

export class PlainMonthDay {
	constructor() {}
	static from() {}
	get calendarId() {}
	get monthCode() {}
	get day() {}
	with() {}
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
	toPlainDate() {}
}

defineStringTag(PlainMonthDay.prototype, "Temporal.PlainMonthDay");
