import { mkdir, rm, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import runTest262 from "@js-temporal/temporal-test262-runner";
import { bundle } from "./shared/build.ts";

const { values, positionals: files } = parseArgs({
	args: process.argv.slice(2),
	options: {
		update: { type: "boolean", short: "u" },
	},
	allowPositionals: true,
});

await rm("dist", { recursive: true });
await mkdir("dist", {});
await writeFile("dist/bundle.js", await bundle());

const result = await runTest262({
	test262Dir: "test262",
	polyfillCodeFile: "dist/bundle.js",
	testGlobs:
		files.length === 0
			? [
					"test262/test/built-ins/Temporal/**/*.js",
					"test262/test/built-ins/Date/prototype/toTemporalInstant/*.js",
				]
			: files,
	expectedFailureFiles: files.length === 0 ? ["expected-failures.txt"] : [],
	updateExpectedFailureFiles: values.update,
});

// if result is `true`, all tests succeeded
process.exit(result ? 0 : 1);
