declare module "tzdata" {
	const record: { zones: Record<string, unknown> };
	export { record as default };
}

declare module "@js-temporal/temporal-test262-runner" {
	export default function runTest262(options: object): Promise<number>;
}

namespace Intl {
	interface DurationFormat {
		format(duration: unknown): string;
	}
	const DurationFormat: {
		new (locales: unknown, options: unknown): DurationFormat;
	};
}
