import { defineStringTag } from "./utils/property.js";

export class PlainDate {
	constructor() {}
	static from() {}
	static compare() {}
	get calendarId() {}
	get era() {}
	get eraYear() {}
	get year() {}
	get month() {}
	get monthCode() {}
	get day() {}
	get dayOfWeek() {}
	get dayOfYear() {}
	get weekOfYear() {}
	get yearOfWeek() {}
	get daysInWeek() {}
	get daysInMonth() {}
	get daysInYear() {}
	get monthsInYear() {}
	get inLeapYear() {}
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
