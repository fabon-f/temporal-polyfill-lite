import { defineStringTag } from "./utils/property.js";

export class PlainDateTime {
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
	get hour() {}
	get minute() {}
	get second() {}
	get millisecond() {}
	get microsecond() {}
	get nanosecond() {}
	get dayOfWeek() {}
	get dayOfYear() {}
	get weekOfYear() {}
	get yearOfWeek() {}
	get daysInWeek() {}
	get daysInMonth() {}
	get daysInYear() {}
	get monthsInYear() {}
	get inLeapYear() {}
	with() {}
	withPlainTime() {}
	withCalendar() {}
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
	toZonedDateTime() {}
	toPlainDate() {}
	toPlainTime() {}
}

defineStringTag(PlainDateTime.prototype, "Temporal.PlainDateTime");
