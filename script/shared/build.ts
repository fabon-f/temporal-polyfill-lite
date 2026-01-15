import strip from "@rollup/plugin-strip";
import terser from "@rollup/plugin-terser";
import { rolldown, type RolldownPluginOption } from "rolldown";

// @ts-expect-error https://github.com/rollup/plugins/issues/1860
const terserPlugin = terser({
	mangle: {
		properties: {
			regex: /^(_|\$)/,
		},
	},
});

// @ts-expect-error
const stripPlugin = strip({
	include: "**/*.(js|ts)",
	functions: ["assert", "assert*"],
});

const wrappedStripPlugin = {
	name: stripPlugin.name,
	transform(code, id) {
		return stripPlugin.transform.call(
			{
				parse: (code: string, options?: any) => this.parse(code, { ...options, lang: "ts" }),
			},
			code,
			id,
		);
	},
} satisfies RolldownPluginOption;

export async function bundle() {
	await using bundle = await rolldown({
		input: "src/global.ts",
		plugins: [wrappedStripPlugin, terserPlugin],
	});
	const result = await bundle.generate({
		format: "iife",
		plugins: [terserPlugin],
	});
	return result.output[0].code;
}
