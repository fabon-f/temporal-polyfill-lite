// enum specification types

/** `DATE` */
export const DATE = Symbol();
/** `TIME` */
export const TIME = Symbol();
/** `DATETIME` */
export const DATETIME = Symbol();
/** `YEAR-MONTH` */
export const YEAR_MONTH = Symbol();
/** `MONTH-DAY` */
export const MONTH_DAY = Symbol();
/** `REQUIRED` */
export const REQUIRED = Symbol();
/** `MINUTE` (for time precision) */
export const MINUTE = Symbol();

export const overflowConstrain = "constrain";
export const overflowReject = "reject";
export type Overflow = typeof overflowConstrain | typeof overflowReject;

export const disambiguationCompatible = "compatible";
export const disambiguationEarlier = "earlier";
export const disambiguationLater = "later";
export const disambiguationReject = "reject";
export type Disambiguation =
	| typeof disambiguationCompatible
	| typeof disambiguationEarlier
	| typeof disambiguationLater
	| typeof disambiguationReject;

export const offsetPrefer = "prefer";
export const offsetUse = "use";
export const offsetIgnore = "ignore";
export const offsetReject = "reject";
export type Offset =
	| typeof offsetPrefer
	| typeof offsetUse
	| typeof offsetIgnore
	| typeof offsetReject;

export const offsetBehaviourOption = Symbol("option");
export const offsetBehaviourExact = Symbol("exact");
export const offsetBehaviourWall = Symbol("wall");
export type OffsetBehaviour =
	| typeof offsetBehaviourOption
	| typeof offsetBehaviourExact
	| typeof offsetBehaviourWall;

export const roundingModeCeil = "ceil";
export const roundingModeFloor = "floor";
export const roundingModeExpand = "expand";
export const roundingModeTrunc = "trunc";
export const roundingModeHalfCeil = "halfCeil";
export const roundingModeHalfFloor = "halfFloor";
export const roundingModeHalfExpand = "halfExpand";
export const roundingModeHalfTrunc = "halfTrunc";
export const roundingModeHalfEven = "halfEven";
export type RoundingMode =
	| typeof roundingModeCeil
	| typeof roundingModeFloor
	| typeof roundingModeExpand
	| typeof roundingModeTrunc
	| typeof roundingModeHalfCeil
	| typeof roundingModeHalfFloor
	| typeof roundingModeHalfExpand
	| typeof roundingModeHalfTrunc
	| typeof roundingModeHalfEven;

export const showCalendarName = {
	$auto: "auto",
	$always: "always",
	$never: "never",
	$critical: "critical",
} as const;
export type ShowCalendarName = (typeof showCalendarName)[keyof typeof showCalendarName];

export const showOffsetOptions = {
	$auto: "auto",
	$never: "never",
} as const;
export type ShowOffsetOptions = (typeof showOffsetOptions)[keyof typeof showOffsetOptions];

export const timeZoneNameOptions = {
	$auto: "auto",
	$never: "never",
	$critical: "critical",
} as const;
export type TimeZoneNameOptions = (typeof timeZoneNameOptions)[keyof typeof timeZoneNameOptions];
