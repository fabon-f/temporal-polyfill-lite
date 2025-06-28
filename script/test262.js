import runTest262 from "@js-temporal/temporal-test262-runner";
import { build } from "rolldown";

await build({
	input: "src/global.ts",
	output: {
		file: "dist/script.js",
	},
});

const result = runTest262({
	test262Dir: "test262",
	polyfillCodeFile: "dist/script.js",
	expectedFailureFiles: ["test/expected-failures.txt"],
	testGlobs: ["test262/test/built-ins/Temporal/**/*.js"],
	updateExpectedFailureFiles: process.argv.includes("--update"),
});

process.exit(result ? 0 : 1);
