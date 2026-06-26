import { mkdir, rm, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import runTest262 from "@js-temporal/temporal-test262-runner";
import { bundle } from "./shared/build.ts";

const isBun = process.versions["bun"] !== undefined;
const isNode = !isBun;

function parseSemver(version: string): [major: number, minor: number, patch: number] {
	const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
	if (!match) {
		throw new Error(`invalid version: ${version}`);
	}
	return [match[1]!, match[2]!, match[3]!].map((v) => parseInt(v)) as [number, number, number];
}

function expectedFailureFiles(mode: "basic" | "full") {
	const files = ["ecma262.txt"];
	files.push(isBun ? "ecma402-bun.txt" : "ecma402-node.txt");
	if (mode === "basic") {
		files.push("ecma402-unsupported.txt");
	} else if (!isBun) {
		files.push("ecma402-full-node.txt");
	} else {
		console.log("testing full mode in Bun is not supported for now");
		process.exit(0);
	}
	if (isNode) {
		const major = parseSemver(process.versions.node)[0];
		if (major < 26) {
			files.push("ecma402-node-lt26.txt");
		}
	}
	return files.map((file) => `tests/expectedFailures/${file}`);
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
	await bundle(values.mode, {
		assertion: false,
		minify: true,
		beautify: true,
		overwriteGlobal: true,
	}),
);

const result = await runTest262({
	test262Dir: "tests/test262",
	polyfillCodeFile: "dist/bundle.js",
	testGlobs:
		files.length === 0
			? [
					"tests/test262/test/built-ins/Temporal/**/*.js",
					"tests/test262/test/built-ins/Date/prototype/toTemporalInstant/*.js",
					"tests/test262/test/intl402/DateTimeFormat/**/*.js",
					"tests/test262/test/intl402/Temporal/**/*.js",
					...(globalThis.Intl.DurationFormat
						? ["tests/test262/test/intl402/DurationFormat/**/*.js"]
						: []),
				]
			: files,
	expectedFailureFiles: files.length === 0 ? expectedFailureFiles(values.mode) : [],
	updateExpectedFailureFiles: values.update,
	timeoutMsecs: 30000,
});

// if result is `true`, all tests succeeded
process.exit(result ? 0 : 1);
