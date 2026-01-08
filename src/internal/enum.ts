// enum specification types

/** `START-OF-DAY` */
export const startOfDay = Symbol();
/** `DATE` */
export const date = Symbol();
/** `TIME` */
export const time = Symbol();
/** `DATETIME` */
export const dateTime = Symbol();
/** `YEAR-MONTH` */
export const yearMonth = Symbol();
/** `MONTH-DAY` */
export const monthDay = Symbol();
/** `REQUIRED` */
export const required = Symbol();

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

export const offsetBehaviourOption = Symbol();
export const offsetBehaviourExact = Symbol();
export const offsetBehaviourWall = Symbol();
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
