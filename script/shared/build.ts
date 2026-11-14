import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import strip from "@rollup/plugin-strip";
import terser from "@rollup/plugin-terser";
import { format } from "oxfmt";
import { rolldown, type RolldownPluginOption } from "rolldown";
import unpluginIsolatedDecl from "unplugin-isolated-decl/rolldown";

// @ts-expect-error https://github.com/rollup/plugins/issues/1860
const terserPlugin = terser({
	compress: {
		ecma: 2015,
		unsafe_arrows: true,
		hoist_funs: true,
	},
	mangle: {
		keep_fnames: true,
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

const oxfmtPlugin = {
	name: "oxfmt",
	async renderChunk(code, chunk) {
		return (await format(chunk.fileName, code)).code;
	},
} satisfies RolldownPluginOption;

interface Options {
	assertion: boolean;
}

function plugins({ assertion }: Options) {
	const inputPlugins = [];
	const outputPlugins = [];
	if (!assertion) {
		inputPlugins.push(wrappedStripPlugin);
	}
	inputPlugins.push(terserPlugin);
	outputPlugins.push(terserPlugin);
	outputPlugins.push(oxfmtPlugin);
	return {
		input: inputPlugins,
		output: outputPlugins,
	};
}

async function createTemporaryFile(path: string, content: string) {
	await writeFile(path, content);
	return {
		async [Symbol.asyncDispose]() {
			await rm(path, { force: true });
		},
	};
}

export async function bundle(
	mode: "basic" | "full",
	options: { overwriteGlobal?: boolean; minify: boolean },
) {
	await build();

	const moduleEntry =
		mode === "basic" ? "temporal-polyfill-lite" : "temporal-polyfill-lite/calendars-full";
	const code = options.overwriteGlobal
		? `
import { install } from "${moduleEntry}/shim";
install(true);
`
		: `
import "${moduleEntry}/global"
`;
	const path = "tmp.js";
	await using _file = await createTemporaryFile(path, code);

	await using bundle = await rolldown({
		input: path,
	});
	const result = await bundle.generate({
		format: "iife",
		minify: options.minify,
	});
	return result.output[0].code;
}

export async function build() {
	const { input, output } = plugins({ assertion: false });
	const declarationPluginOptions = { include: ["src/shim.ts", "src/global.ts"] };
	await using bundle1 = await rolldown({
		input: ["src/index.ts", "src/global.ts", "src/shim.ts"],
		plugins: [...input, unpluginIsolatedDecl(declarationPluginOptions)],
	});
	await bundle1.write({
		dir: "dist",
		cleanDir: true,
		plugins: output,
	});
	await using bundle2 = await rolldown({
		input: ["src/index.ts", "src/global.ts", "src/shim.ts"],
		plugins: [...input, unpluginIsolatedDecl(declarationPluginOptions)],
		resolve: {
			conditionNames: ["nonIsoCalendars"],
		},
	});
	await bundle2.write({
		dir: "dist/calendars",
		plugins: output,
	});
	await mkdir("dist/types");
	await copyFile("src/types/index.d.ts", "dist/index.d.ts");
	await copyFile("src/types/index.d.ts", "dist/calendars/index.d.ts");
	await writeFile("dist/types/global.js", "");
	await copyFile("src/types/global.d.ts", "dist/types/global.d.ts");
}
