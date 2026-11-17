import { Date, Calendar, CalendarKind, DateOverflow } from "icu";
import { epochDaysToIsoDate } from "../abstractOperations.ts";
import { assertUnreachable } from "../assertion.ts";
import { isoDayOfWeek, type CalendarDateRecord, type MonthCode } from "../calendars.ts";
import { millisecondsPerDay } from "../constants.ts";

type TestableCalendarId =
	| "chinese"
	| "coptic"
	| "dangi"
	| "ethioaa"
	| "ethiopic"
	| "hebrew"
	| "indian"
	| "islamic-civil"
	| "islamic-tbla"
	| "islamic-umalqura"
	| "persian";

function calendarIdToIcuCalendarKind(calendar: TestableCalendarId): CalendarKind {
	if (calendar === "coptic") {
		return CalendarKind.Coptic;
	}
	if (calendar === "ethioaa") {
		return CalendarKind.EthiopianAmeteAlem;
	}
	if (calendar === "ethiopic") {
		return CalendarKind.Ethiopian;
	}
	if (calendar === "hebrew") {
		return CalendarKind.Hebrew;
	}
	if (calendar === "indian") {
		return CalendarKind.Indian;
	}
	if (calendar === "islamic-civil") {
		return CalendarKind.HijriTabularTypeIiFriday;
	}
	if (calendar === "islamic-tbla") {
		return CalendarKind.HijriTabularTypeIiThursday;
	}
	if (calendar === "persian") {
		return CalendarKind.Persian;
	}
	if (calendar === "islamic-umalqura") {
		return CalendarKind.HijriUmmAlQura;
	}
	if (calendar === "chinese") {
		return CalendarKind.Chinese;
	}
	if (calendar === "dangi") {
		return CalendarKind.Dangi;
	}
	assertUnreachable(calendar);
}

function epochDaysToRataDie(epochDays: number) {
	return BigInt(epochDays) + 719163n;
}

function rataDieToEpochDays(rataDie: bigint) {
	return Number(rataDie - 719163n);
}

export function epochDaysToDateByIcu(
	calendar: TestableCalendarId,
	epochDays: number,
): CalendarDateRecord {
	const icuDate = Date.fromRataDie(
		epochDaysToRataDie(epochDays),
		new Calendar(calendarIdToIcuCalendarKind(calendar)),
	);
	let inLeapYear: boolean;
	if (
		calendar === "coptic" ||
		calendar === "ethioaa" ||
		calendar === "ethiopic" ||
		calendar === "indian" ||
		calendar === "persian"
	) {
		inLeapYear = icuDate.daysInYear === 366;
	} else if (calendar === "chinese" || calendar === "dangi" || calendar === "hebrew") {
		inLeapYear = icuDate.monthsInYear === 13;
	} else if (
		calendar === "islamic-civil" ||
		calendar === "islamic-tbla" ||
		calendar === "islamic-umalqura"
	) {
		inLeapYear = icuDate.daysInYear === 355;
	} else {
		assertUnreachable(calendar);
	}
	return {
		$era: icuDate.era !== "" ? icuDate.era : undefined,
		$eraYear: icuDate.era !== "" ? icuDate.eraYearOrRelatedIso : undefined,
		$year: icuDate.extendedYear,
		$month: icuDate.ordinalMonth,
		$monthCode: icuDate.monthCode,
		$day: icuDate.dayOfMonth,
		$dayOfWeek: isoDayOfWeek(epochDaysToIsoDate(epochDays)),
		$dayOfYear: icuDate.dayOfYear,
		$weekOfYear: { $week: undefined, $year: undefined },
		$daysInWeek: 7,
		$daysInMonth: icuDate.daysInMonth,
		$daysInYear: icuDate.daysInYear,
		$monthsInYear: icuDate.monthsInYear,
		$inLeapYear: inLeapYear,
	};
}

export function calendarIntegersToEpochDaysByIcu(
	calendar: TestableCalendarId,
	year: number,
	month: number,
	day: number,
) {
	const date = Date.fromFieldsInCalendar(
		{ extendedYear: year, ordinalMonth: month, day },
		{ overflow: DateOverflow.Reject },
		new Calendar(calendarIdToIcuCalendarKind(calendar)),
	);
	return rataDieToEpochDays(date.rataDie);
}

interface YearMonthInfo {
	year: number;
	month: number;
	daysInMonth: number;
	/** epoch days */
	start: number;
	/** epoch days */
	end: number;
}

export function* yearMonthGeneratorByIcu(
	calendar: TestableCalendarId,
	minYear: number,
	maxYear: number,
): Generator<YearMonthInfo> {
	for (let year = minYear; year <= maxYear; year++) {
		const monthsInYear = epochDaysToDateByIcu(
			calendar,
			calendarIntegersToEpochDaysByIcu(calendar, year, 1, 1),
		).$monthsInYear;
		for (let month = 1; month <= monthsInYear; month++) {
			const startEpochDays = calendarIntegersToEpochDaysByIcu(calendar, year, month, 1);
			const date = epochDaysToDateByIcu(calendar, startEpochDays);
			yield {
				year,
				month,
				daysInMonth: date.$daysInMonth,
				start: startEpochDays,
				end: startEpochDays + date.$daysInMonth - 1,
			};
		}
	}
}

function parseChineseLunisolarMonth(monthString: string): MonthCode {
	const leap = /^[闰閏]/u.test(monthString);
	const monthName = monthString.replace(/^[闰閏]/u, "");
	const monthsMap: Record<string, number> = {
		正月: 1,
		一月: 1,
		二月: 2,
		三月: 3,
		四月: 4,
		五月: 5,
		六月: 6,
		七月: 7,
		八月: 8,
		九月: 9,
		十月: 10,
		冬月: 11,
		十一月: 11,
		腊月: 12,
		臘月: 12,
		十二月: 12,
	};
	const monthNumber = monthsMap[monthName];
	if (monthNumber === undefined) {
		throw new Error(`Invalid Chinese lunisolar month: ${monthString}`);
	}
	return [monthNumber, leap];
}
function parseChineseDayNumber(dayString: string): number {
	dayString = dayString.replace(/^二十./u, "廿");
	const days: Record<string, number> = {
		初一: 1,
		初二: 2,
		初三: 3,
		初四: 4,
		初五: 5,
		初六: 6,
		初七: 7,
		初八: 8,
		初九: 9,
		初十: 10,
		十一: 11,
		十二: 12,
		十三: 13,
		十四: 14,
		十五: 15,
		十六: 16,
		十七: 17,
		十八: 18,
		十九: 19,
		二十: 20,
		廿一: 21,
		廿二: 22,
		廿三: 23,
		廿四: 24,
		廿五: 25,
		廿六: 26,
		廿七: 27,
		廿八: 28,
		廿九: 29,
		三十: 30,
	};
	const day = days[dayString];
	if (day === undefined) {
		throw new Error(`Invalid Chinese lunisolar day: ${dayString}`);
	}
	return day;
}
function parseKoreanLunisolarMonth(monthString: string): MonthCode {
	const match = /^(윤)?(\d{1,2})월$/u.exec(monthString);
	if (!match) {
		throw new Error(`Invalid Korean lunisolar month: ${monthString}`);
	}
	const month = parseInt(match[2]!, 10);
	if (month < 1 || month > 12) {
		throw new Error(`Invalid Korean lunisolar month: ${monthString}`);
	}
	return [month, match[1] !== undefined];
}

let chineseDtf: Intl.DateTimeFormat;
let dangiDtf: Intl.DateTimeFormat;

export function extractChineseDateFromIntlDateTimeFormat(epochDays: number) {
	chineseDtf ||= new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
		dateStyle: "full",
		timeZone: "UTC",
	});
	const parts = chineseDtf.formatToParts(epochDays * millisecondsPerDay);
	return {
		monthCode: parseChineseLunisolarMonth(parts.find((p) => p.type === "month")!.value),
		day: parseChineseDayNumber(parts.find((p) => p.type === "day")!.value),
	};
}
export function extractDangiDateFromIntlDateTimeFormat(epochDays: number) {
	dangiDtf ||= new Intl.DateTimeFormat("ko-KR-u-ca-dangi", {
		dateStyle: "full",
		timeZone: "UTC",
	});
	const parts = dangiDtf.formatToParts(epochDays * millisecondsPerDay);
	return {
		monthCode: parseKoreanLunisolarMonth(parts.find((part) => part.type === "month")!.value),
		day: parseInt(parts.find((part) => part.type === "day")!.value, 10),
	};
}
