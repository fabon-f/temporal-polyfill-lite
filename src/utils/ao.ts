/** `MathematicalInLeapYear` */
export const mathematicalInLeapYear = (year: number) =>
	// https://codegolf.stackexchange.com/questions/50798/is-it-a-leap-year
	+!(year % (year % 25 ? 4 : 16));
