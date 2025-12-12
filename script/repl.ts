import repl from "node:repl";
import "../src/global.ts";

repl.start({ prompt: "> ", useGlobal: true });
