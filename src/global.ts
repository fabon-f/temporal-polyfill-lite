import { Temporal } from "./Temporal.ts";

Object.defineProperty(globalThis, "Temporal", {
	value: Temporal,
	writable: true,
	configurable: true,
});
