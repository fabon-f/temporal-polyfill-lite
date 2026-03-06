import { epochDaysToIsoDate, isoDateToEpochDays } from "../abstractOperations.ts";
import { createLruCache } from "../cacheMap.ts";
import {
	createMonthCode,
	isoDayOfWeek,
	type CalendarDateRecord,
	type MonthCode,
} from "../calendars.ts";
import { clamp, isWithin, modFloor, sign } from "../math.ts";
import {
	extractYearMonthDayForEastAsianLunisolarCalendar,
	type EastAsianYearMonthDay,
} from "./dateTimeFormatter.ts";

const newYearCache = {
	chinese: createLruCache<number, number>(2000),
	dangi: createLruCache<number, number>(2000),
};

const cache = {
	chinese: createLruCache<number, EastAsianYearMonthDay>(10000),
	dangi: createLruCache<number, EastAsianYearMonthDay>(10000),
};

function yearMonthDay(calendar: "chinese" | "dangi", epochDays: number): EastAsianYearMonthDay {
	const cachedDate = cache[calendar].$get(epochDays);
	if (cachedDate) {
		return cachedDate;
	}
	const date = extractYearMonthDayForEastAsianLunisolarCalendar(calendar, epochDays);
	cache[calendar].$set(epochDays, date);
	return date;
}

function getNewYear(calendar: "chinese" | "dangi", year: number) {
	let cachedNewYear = newYearCache[calendar].$get(year);
	if (cachedNewYear) {
		return cachedNewYear;
	}

	let epochDaysInNewYear = isoDateToEpochDays(
		year,
		0,
		year === 1985 ? 53 : Math.floor(modFloor(-10.8822 * year + 16, 29.53)) + 23,
	);
	let ymd = yearMonthDay(calendar, epochDaysInNewYear);
	// `epochDaysInNewYear` is few days after the new year in most cases, but adjust here for exceptions
	for (let i = 0; ymd.$monthCode !== "M01"; i++) {
		if (i > 20) {
			// `Intl.DateTimeFormat` can return an inconsistent result when the date is in extreme range,
			// which causes an infinite loop.
			throw new Error("unexpected calendar error");
		}
		epochDaysInNewYear += ymd.$year < year ? 31 - ymd.$day : -ymd.$day;
		ymd = yearMonthDay(calendar, epochDaysInNewYear);
	}
	newYearCache[calendar].$set(year, epochDaysInNewYear - ymd.$day + 1);
	return epochDaysInNewYear - ymd.$day + 1;
}

function ordinalMonthToMonthCode(
	calendar: "chinese" | "dangi",
	year: number,
	month: number,
): string {
	return yearMonthDay(calendar, getNewYear(calendar, year) + 30 * (month - 1)).$monthCode;
}

export function monthCodeToOrdinal(
	calendar: "chinese" | "dangi",
	arithmeticYear: number,
	monthCode: MonthCode,
) {
	if (
		!monthCode[1] &&
		ordinalMonthToMonthCode(calendar, arithmeticYear, monthCode[0]) ===
			createMonthCode(...monthCode)
	) {
		return monthCode[0];
	}
	return monthCode[0] + 1;
}

export function calendarIntegersToEpochDays(
	calendar: "chinese" | "dangi",
	arithmeticYear: number,
	ordinalMonth: number,
	day: number,
) {
	const epochDaysInTargetMonth = getNewYear(calendar, arithmeticYear) + 30 * (ordinalMonth - 1);
	return epochDaysInTargetMonth - yearMonthDay(calendar, epochDaysInTargetMonth).$day + day;
}

function daysInMonth(calendar: "chinese" | "dangi", year: number, month: number) {
	return (
		calendarIntegersToEpochDays(calendar, year, month + 1, 1) -
		calendarIntegersToEpochDays(calendar, year, month, 1)
	);
}

function monthsInYear(calendar: "chinese" | "dangi", year: number) {
	return getNewYear(calendar, year + 1) - getNewYear(calendar, year) > 360 ? 13 : 12;
}

export function constrainMonthCode(
	calendar: "chinese" | "dangi",
	year: number,
	monthCode: MonthCode,
): MonthCode {
	return !monthCode[1] ||
		ordinalMonthToMonthCode(calendar, year, monthCode[0] + 1) === createMonthCode(...monthCode)
		? monthCode
		: [monthCode[0], false];
}

export function constrainDay(
	calendar: "chinese" | "dangi",
	year: number,
	month: number,
	day: number,
) {
	if (day <= 29) {
		return day;
	}
	return clamp(day, 1, daysInMonth(calendar, year, month));
}

export function constrainMonth(calendar: "chinese" | "dangi", year: number, month: number) {
	if (isWithin(month, 1, 12)) {
		return month;
	}
	return clamp(month, 1, monthsInYear(calendar, year));
}

export function epochDaysToDate(
	calendar: "chinese" | "dangi",
	epochDays: number,
): CalendarDateRecord {
	const isoDate = epochDaysToIsoDate(epochDays);
	return {
		$era: undefined,
		$eraYear: undefined,
		get $year() {
			return yearMonthDay(calendar, epochDays).$year;
		},
		get $month() {
			const date = yearMonthDay(calendar, epochDays);
			return Math.round((epochDays - date.$day - getNewYear(calendar, date.$year)) / 29.53) + 1;
		},
		get $monthCode() {
			return yearMonthDay(calendar, epochDays).$monthCode;
		},
		get $day() {
			return yearMonthDay(calendar, epochDays).$day;
		},
		$dayOfWeek: isoDayOfWeek(isoDate),
		get $dayOfYear() {
			const year = yearMonthDay(calendar, epochDays).$year;
			return epochDays - getNewYear(calendar, year) + 1;
		},
		$weekOfYear: { $week: undefined, $year: undefined },
		$daysInWeek: 7,
		get $daysInMonth() {
			const date = yearMonthDay(calendar, epochDays);
			return daysInMonth(
				calendar,
				date.$year,
				Math.round((epochDays - date.$day - getNewYear(calendar, date.$year)) / 29.53) + 1,
			);
		},
		get $daysInYear() {
			const year = yearMonthDay(calendar, epochDays).$year;
			return getNewYear(calendar, year + 1) - getNewYear(calendar, year);
		},
		get $monthsInYear() {
			return monthsInYear(calendar, yearMonthDay(calendar, epochDays).$year);
		},
		get $inLeapYear() {
			return monthsInYear(calendar, yearMonthDay(calendar, epochDays).$year) > 12;
		},
	};
}

export function balanceYearMonth(calendar: "chinese" | "dangi", year: number, month: number) {
	if (isWithin(month, 1, 12)) {
		return { $year: year, $month: month };
	}
	const monthsSign = month >= 1 ? 1 : -1;
	let currentDate = getNewYear(calendar, year);
	let monthsToAddOrSubtract = Math.abs(month - 1);
	for (; monthsToAddOrSubtract > 0; ) {
		// add per 5e5 months in order not to accumulate error
		const months = Math.min(monthsToAddOrSubtract, 5e5);
		currentDate += Math.floor(29.5306 * months * monthsSign + 10);
		currentDate -= yearMonthDay(calendar, currentDate).$day - 1;
		monthsToAddOrSubtract -= months;
	}
	const endDate = epochDaysToDate(calendar, currentDate);
	return {
		$year: endDate.$year,
		$month: endDate.$month,
	};
}

export function untilInMonths(
	calendar: "chinese" | "dangi",
	startYear: number,
	startMonth: number,
	targetYear: number,
	targetMonth: number,
) {
	if (startYear === targetYear) {
		return targetMonth - startMonth;
	}
	const start = calendarIntegersToEpochDays(calendar, startYear, startMonth, 1);
	const target = calendarIntegersToEpochDays(calendar, targetYear, targetMonth, 1);
	const direction = sign(target - start);
	if (Math.abs(target - start) <= 15000000) {
		return Math.round((target - start) / 29.5306);
	}
	let months = 0;
	let currentDate = start;
	for (; (target - currentDate) * direction > 0; ) {
		let newDate = currentDate + clamp(15000000, 1, Math.abs(target - currentDate)) * direction;
		newDate -= yearMonthDay(calendar, newDate).$day - 1;
		months += Math.round((newDate - currentDate) / 29.5306);
		currentDate = newDate;
	}
	return months;
}

function getReferenceYearFromTable(
	calendar: "chinese" | "dangi",
	monthNum: number,
	isLeapMonth: boolean,
	day: number,
): number {
	if (monthNum === 12) {
		return 1971;
	}
	if (
		!isLeapMonth &&
		(day < 30 ||
			monthNum === 2 ||
			monthNum === 5 ||
			monthNum === 7 ||
			monthNum === 9 ||
			monthNum === 10)
	) {
		return 1972;
	}
	if (!isLeapMonth) {
		const referenceYear =
			monthNum === 1 || monthNum === 4
				? 1970
				: monthNum === 3
					? calendar === "chinese"
						? 1966
						: 1968
					: 1971;
		return referenceYear;
	}
	// leap months
	if (monthNum === 2) {
		return 1947;
	}
	if (monthNum === 3) {
		return day === 30 ? 1955 : 1966;
	}
	if (monthNum === 4) {
		return day === 30 ? 1944 : 1963;
	}
	if (monthNum === 5) {
		return day === 30 ? 1952 : 1971;
	}
	if (monthNum === 6) {
		return day === 30 ? 1941 : 1960;
	}
	if (monthNum === 7) {
		return day === 30 ? 1938 : 1968;
	}
	if (monthNum === 8) {
		return 1957;
	}
	if (monthNum === 9) {
		return 2014;
	}
	if (monthNum === 10) {
		return 1984;
	}
	return 2033;
}

export function monthDayToEpochDays(
	calendar: "chinese" | "dangi",
	monthNumber: number,
	isLeapMonth: boolean,
	day: number,
): number {
	const ordinalMonth =
		isLeapMonth || (day === 30 && (monthNumber === 6 || monthNumber === 8)) || monthNumber === 12
			? monthNumber + 1
			: monthNumber;
	if (monthNumber === 11 && !isLeapMonth) {
		const firstCandidate = calendarIntegersToEpochDays(calendar, day === 30 ? 1969 : 1972, 11, day);
		if (firstCandidate <= 1095) {
			return firstCandidate;
		}
		return calendarIntegersToEpochDays(calendar, 1971, 12, day);
	}
	return calendarIntegersToEpochDays(
		calendar,
		getReferenceYearFromTable(calendar, monthNumber, isLeapMonth, day),
		ordinalMonth,
		day,
	);
}
