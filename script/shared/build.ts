import terser from "@rollup/plugin-terser";
import { rolldown } from "rolldown";

// @ts-expect-error https://github.com/rollup/plugins/issues/1860
const terserPlugin = terser({
	mangle: {
		properties: {
			regex: /^(_|\$)/,
		},
	},
});

export async function bundle() {
	await using bundle = await rolldown({
		input: "src/global.ts",
		plugins: [terserPlugin],
	});
	const result = await bundle.generate({
		format: "iife",
		plugins: [terserPlugin],
	});
	return result.output[0].code;
}
