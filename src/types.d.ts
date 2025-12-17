declare module "tzdata" {
	const record: { zones: Record<string, unknown> };
	export { record as default };
}
