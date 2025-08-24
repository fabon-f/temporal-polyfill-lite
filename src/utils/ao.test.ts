import { expect, test } from "vitest";
import { toPrimitiveAndAssertString } from "./ecmascript.ts";

test("ToPrimitive and type assertion", () => {
	expect(() => {
		toPrimitiveAndAssertString({
			[Symbol.toPrimitive]() {
				return undefined;
			},
		});
	}).toThrow(TypeError);
});
