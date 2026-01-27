import { promisify } from "node:util";
import zlib from "node:zlib";
import { bundle } from "./shared/build.ts";

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);
const zstd = promisify(zlib.zstdCompress);

const bundledCode = await bundle({ assertion: false, minify: true, beautify: false });

const rawText = new TextEncoder().encode(bundledCode);
const gzipped = await gzip(bundledCode);
const brotliCompressed = await brotli(bundledCode);
const zstdCompressed = await zstd(bundledCode);
console.log(`raw: ${rawText.byteLength} bytes`);
console.log(`gzip: ${gzipped.byteLength} bytes`);
console.log(`brotli: ${brotliCompressed.byteLength} bytes`);
console.log(`zstd: ${zstdCompressed.byteLength} bytes`);
