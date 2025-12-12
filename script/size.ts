import { promisify } from "node:util";
import zlib from "node:zlib";
import terser from "@rollup/plugin-terser";
import { rolldown } from "rolldown";

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);
const zstd = promisify(zlib.zstdCompress);

// @ts-expect-error https://github.com/rollup/plugins/issues/1860
const terserPlugin = terser();

async function bundle() {
	await using bundle = await rolldown({
		input: "src/global.ts",
		plugins: [terserPlugin],
	});
	const result = await bundle.generate({
		format: "esm",
		plugins: [terserPlugin],
	});
	return result.output[0].code;
}

const bundledCode = await bundle();

const rawText = new TextEncoder().encode(bundledCode);
const gzipped = await gzip(bundledCode);
const brotliCompressed = await brotli(bundledCode);
const zstdCompressed = await zstd(bundledCode);
console.log(`raw: ${rawText.byteLength} bytes`);
console.log(`gzip: ${gzipped.byteLength} bytes`);
console.log(`brotli: ${brotliCompressed.byteLength} bytes`);
console.log(`zstd: ${zstdCompressed.byteLength} bytes`);
