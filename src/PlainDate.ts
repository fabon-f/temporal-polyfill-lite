import { defineStringTag } from "./internal/property.ts";

export class PlainDate {
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
	get day() {
		return undefined;
	}
	get dayOfWeek() {
		return undefined;
	}
	get dayOfYear() {
		return undefined;
	}
	get weekOfYear() {
		return undefined;
	}
	get yearOfWeek() {
		return undefined;
	}
	get daysInWeek() {
		return undefined;
	}
	get daysInMonth() {
		return undefined;
	}
	get daysInYear() {
		return undefined;
	}
	get monthsInYear() {
		return undefined;
	}
	get inLeapYear() {
		return undefined;
	}
	toPlainYearMonth() {}
	toPlainMonthDay() {}
	add() {}
	subtract() {}
	with() {}
	withCalendar() {}
	until() {}
	since() {}
	equals() {}
	toPlainDateTime() {}
	toZonedDateTime() {}
	toString() {}
	toLocaleString() {}
	toJSON() {}
	valueOf() {}
}

defineStringTag(PlainDate.prototype, "Temporal.PlainDate");
