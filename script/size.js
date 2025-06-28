import { promisify } from "node:util";
import zlib from "node:zlib";
import terser from "@rollup/plugin-terser";
import { rolldown } from "rolldown";

const gzip = promisify(zlib.gzip);

const terserPlugin = terser();

const bundle = await rolldown({
	input: "src/global.ts",
	plugins: [terserPlugin],
});
const result = await bundle.generate({
	format: "esm",
	plugins: [terserPlugin],
});

const gzipped = await gzip(result.output[0].code);
console.log(`bytes in gzip: ${gzipped.byteLength}`);

await bundle.close();
