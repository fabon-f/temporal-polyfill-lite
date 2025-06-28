import { defineStringTag } from "./utils/property.js";

export class PlainYearMonth {
	constructor() {}
	static from() {}
	static compare() {}
	get calendarId() {}
	get era() {}
	get eraYear() {}
	get year() {}
	get month() {}
	get monthCode() {}
	get daysInYear() {}
	get daysInMonth() {}
	get monthsInYear() {}
	get inLeapYear() {}
	with() {}
	add() {}
	subtract() {}
	until() {}
	since() {}
	equals() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
	toPlainDate() {}
}

defineStringTag(PlainYearMonth.prototype, "Temporal.PlainYearMonth");
