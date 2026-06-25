import { Intl, Temporal, toTemporalInstant } from "./index.ts";

// Always overwrite the existing Temporal implementation for test262 and REPL
// FIXME: Replace workaround with `install(true)` after https://github.com/nodejs/node/issues/64008 is fixed
Object.defineProperty(globalThis, "Temporal", {
	value: Temporal,
	writable: true,
	enumerable: false,
	configurable: true,
});
Object.defineProperty(globalThis, "Intl", {
	value: Intl,
	writable: true,
	enumerable: false,
	configurable: true,
});
Object.defineProperty(Date.prototype, "toTemporalInstant", {
	value: toTemporalInstant,
	writable: true,
	enumerable: false,
	configurable: true,
});
