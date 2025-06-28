import { Temporal } from "./Temporal.js";

Object.defineProperty(globalThis, "Temporal", {
	value: Temporal,
	writable: true,
	configurable: true,
});
