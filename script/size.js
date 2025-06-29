import { promisify } from "node:util";
import zlib from "node:zlib";
import terser from "@rollup/plugin-terser";
import { rolldown } from "rolldown";

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

const terserPlugin = terser();

const bundle = await rolldown({
	input: "src/global.ts",
	plugins: [terserPlugin],
});
const result = await bundle.generate({
	format: "esm",
	plugins: [terserPlugin],
});

const rawText = new TextEncoder().encode(result.output[0].code);
const gzipped = await gzip(result.output[0].code);
const brotliCompressed = await brotli(result.output[0].code);
console.log(`raw: ${rawText.byteLength} bytes`);
console.log(`gzip: ${gzipped.byteLength} bytes`);
console.log(`brotli: ${brotliCompressed.byteLength} bytes`);

await bundle.close();
