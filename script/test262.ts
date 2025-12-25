import { mkdir, rm, writeFile } from "node:fs/promises";
import runTest262 from "@js-temporal/temporal-test262-runner";
import { bundle } from "./shared/build.ts";

await rm("dist", { recursive: true });
await mkdir("dist", {});
await writeFile("dist/bundle.js", await bundle());

const result = await runTest262({
	test262Dir: "test262",
	polyfillCodeFile: "dist/bundle.js",
	testGlobs: [
		"test262/test/built-ins/Temporal/**/*.js",
		"test262/test/built-ins/Date/prototype/toTemporalInstant/*.js",
	],
});

// if result is `true`, all tests succeeded
process.exit(result ? 0 : 1);
