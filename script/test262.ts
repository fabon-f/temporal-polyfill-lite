import { mkdir, rm, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import runTest262 from "@js-temporal/temporal-test262-runner";
import { bundle } from "./shared/build.ts";

function expectedFailureFiles() {
	if (process.versions["bun"]) {
		return [
			"expectedFailures/ecma262.txt",
			"expectedFailures/ecma402-bun.txt",
			"expectedFailures/ecma402-unsupported.txt",
		];
	}
	return [
		"expectedFailures/ecma262.txt",
		"expectedFailures/ecma402-node.txt",
		"expectedFailures/ecma402-unsupported.txt",
	];
}

const { values, positionals: files } = parseArgs({
	args: process.argv.slice(2),
	options: {
		mode: { type: "string" },
		update: { type: "boolean", short: "u" },
	},
	allowPositionals: true,
});

values.mode ??= "basic";

if (values.mode !== "basic" && values.mode !== "full") {
	process.exit(1);
}

await rm("dist", { recursive: true, force: true });
await mkdir("dist", {});
await writeFile(
	"dist/bundle.js",
	await bundle(values.mode, { assertion: false, minify: true, beautify: true }),
);

const result = await runTest262({
	test262Dir: "test262",
	polyfillCodeFile: "dist/bundle.js",
	testGlobs:
		files.length === 0
			? [
					"test262/test/built-ins/Temporal/**/*.js",
					"test262/test/built-ins/Date/prototype/toTemporalInstant/*.js",
					"test262/test/intl402/DateTimeFormat/**/*.js",
					"test262/test/intl402/Temporal/**/*.js",
				]
			: files,
	expectedFailureFiles: files.length === 0 ? expectedFailureFiles() : [],
	updateExpectedFailureFiles: values.update,
	timeoutMsecs: 30000,
});

// if result is `true`, all tests succeeded
process.exit(result ? 0 : 1);
