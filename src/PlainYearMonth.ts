import { defineStringTag } from "./utils/property.js";

export class PlainYearMonth {
	constructor() {}
	static from() {}
	static compare() {}
	get calendarId() {
		return undefined;
	}
	get era() {
		return undefined;
	}
	get eraYear() {
		return undefined;
	}
	get year() {
		return undefined;
	}
	get month() {
		return undefined;
	}
	get monthCode() {
		return undefined;
	}
	get daysInYear() {
		return undefined;
	}
	get daysInMonth() {
		return undefined;
	}
	get monthsInYear() {
		return undefined;
	}
	get inLeapYear() {
		return undefined;
	}
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
