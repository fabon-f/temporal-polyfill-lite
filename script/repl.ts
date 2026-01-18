import repl from "node:repl";
import "../src/global.ts";
import { inspect } from "node:util";
import type { Temporal as TemporalNamespace } from "../src/Temporal.ts";

declare var Temporal: typeof TemporalNamespace;

for (const Class of [
	Temporal.Instant,
	Temporal.ZonedDateTime,
	Temporal.PlainDateTime,
	Temporal.PlainDate,
	Temporal.PlainTime,
	Temporal.PlainYearMonth,
	Temporal.PlainMonthDay,
	Temporal.Duration,
]) {
	Object.defineProperty(Class.prototype, inspect.custom, {
		value() {
			return `${this[Symbol.toStringTag]}: ${this.toString()}`;
		},
	});
}

repl.start({ prompt: "> ", useGlobal: true });
