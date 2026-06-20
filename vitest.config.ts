import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		exclude: typeof globalThis.Temporal === "object" ? [] : ["src/internal/nativeTemporal.test.ts"],
	},
});
