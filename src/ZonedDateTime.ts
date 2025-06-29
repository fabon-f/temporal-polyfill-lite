import { defineStringTag } from "./utils/property.js";

export class ZonedDateTime {
	constructor() {}
	static from() {}
	static compare() {}
	get calendarId() {}
	get timeZoneId() {}
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
	get epochMilliseconds() {}
	get epochNanoseconds() {}
	get dayOfWeek() {}
	get dayOfYear() {}
	get weekOfYear() {}
	get yearOfWeek() {}
	get hoursInDay() {}
	get daysInWeek() {}
	get daysInMonth() {}
	get daysInYear() {}
	get monthsInYear() {}
	get inLeapYear() {}
	get offsetNanoseconds() {}
	get offset() {}
	with() {}
	withPlainTime() {}
	withTimeZone() {}
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
	startOfDay() {}
	getTimeZoneTransition() {}
	toInstant() {}
	toPlainDate() {}
	toPlainTime() {}
	toPlainDateTime() {}
}

defineStringTag(ZonedDateTime.prototype, "Temporal.ZonedDateTime");
