// enum specification types

/** `START-OF-DAY` */
export const startOfDay = Symbol();
/** `DATE` */
export const date = Symbol();
/** `YEAR-MONTH` */
export const yearMonth = Symbol();
/** `MONTH-DAY` */
export const monthDay = Symbol();

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
