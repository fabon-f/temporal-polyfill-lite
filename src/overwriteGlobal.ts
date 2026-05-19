import { install } from "./shim.ts";

// Always overwrite the existing Temporal implementation for test262 and REPL
install(true);
