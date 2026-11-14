import type { Plugin } from "rolldown";

// Rolldown transforms `class Instant {}` into `var Instant = class {}`, which disables Terser's `keep_classnames` option.
// This plugin restore class names (`var Instant = class Instant {}`) for Temporal and Intl classes before Terser runs.
// cf. https://github.com/rolldown/rolldown/issues/9405

const whitelist = new Set([
	// Temporal
	"Duration",
	"Instant",
	"PlainDate",
	"PlainDateTime",
	"PlainMonthDay",
	"PlainTime",
	"PlainYearMonth",
	"ZonedDateTime",
	// Intl
	"DurationFormat",
]);

export function keepTemporalClassNames(): Plugin {
	return {
		name: "rolldown-plugin-keep-temporal-class-names",

		renderChunk: {
			order: "pre",
			handler(code, _chunk, _outputOptions, meta) {
				if (!code.includes("class")) {
					return null;
				}
				const s = meta.magicString;
				if (s === undefined) {
					throw new Error("You have to enable native magic-string");
				}

				for (const node of this.parse(code).body) {
					const stmt = node.type === "ExportNamedDeclaration" ? node.declaration : node;
					if (stmt?.type !== "VariableDeclaration" || stmt.kind !== "var") {
						continue;
					}
					for (const decl of stmt.declarations) {
						if (decl.id.type !== "Identifier") {
							continue;
						}
						const variableName = decl.id.name;
						if (!whitelist.has(variableName)) {
							continue;
						}
						const cls = decl.init;
						if (cls?.type !== "ClassExpression" || cls.id !== null) {
							continue;
						}
						if (code.slice(cls.start, cls.start + 5) !== "class") {
							continue;
						}
						// class {} -> class Foo {}
						s.appendLeft(cls.start + 5, ` ${variableName}`);
					}
				}

				if (!s.hasChanged()) {
					return null;
				}
				return {
					code: s.toString(),
				};
			},
		},
	};
}
