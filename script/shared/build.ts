import strip from "@rollup/plugin-strip";
import terser from "@rollup/plugin-terser";
import { copyFile } from "node:fs/promises";
import { format } from "oxfmt";
import { rolldown, type RolldownPluginOption } from "rolldown";
import unpluginIsolatedDecl from "unplugin-isolated-decl/rolldown";

function createTerserPlugin(beautify: boolean) {
	// @ts-expect-error https://github.com/rollup/plugins/issues/1860
	return terser({
		compress: {
			ecma: 2015,
			unsafe_arrows: true,
			hoist_funs: true,
		},
		mangle: {
			keep_fnames: beautify,
			properties: {
				regex: /^(_|\$)/,
			},
		},
	});
}

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

const oxfmtPlugin = {
	name: "oxfmt",
	async renderChunk(code, chunk) {
		return (await format(chunk.fileName, code)).code;
	},
} satisfies RolldownPluginOption;

interface Options {
	minify: boolean;
	assertion: boolean;
	beautify?: boolean;
}

function plugins({ minify, assertion, beautify }: Options) {
	const inputPlugins = [];
	const outputPlugins = [];
	if (!assertion) {
		inputPlugins.push(wrappedStripPlugin);
	}
	if (minify) {
		const terser = createTerserPlugin(!!beautify);
		inputPlugins.push(terser);
		outputPlugins.push(terser);
		if (beautify) {
			outputPlugins.push(oxfmtPlugin);
		}
	}
	return {
		input: inputPlugins,
		output: outputPlugins,
	};
}

export async function bundle(options: Options) {
	const { input, output } = plugins(options);
	await using bundle = await rolldown({
		input: "src/global.ts",
		plugins: input,
	});
	const result = await bundle.generate({
		format: "iife",
		plugins: output,
	});
	return result.output[0].code;
}

export async function build() {
	const { input, output } = plugins({ assertion: false, minify: true, beautify: true });
	await using bundle = await rolldown({
		input: ["src/index.ts", "src/global.ts", "src/shim.ts"],
		plugins: [...input, unpluginIsolatedDecl({ include: "src/shim.ts" })],
	});
	await bundle.write({
		dir: "dist",
		cleanDir: true,
		plugins: output,
	});
	await copyFile("src/types/index.d.ts", "dist/index.d.ts");
	await copyFile("src/types/global.d.ts", "dist/global.d.ts");
}
