import * as polyfill from "temporal-polyfill-lite";

if (!globalThis.Temporal) {
	console.error("this script requires native Temporal");
	process.exit(1);
}

function assertEqual(a: Temporal.ZonedDateTime | null, b: Temporal.ZonedDateTime | null) {
	if (a === null && b === null) {
		return;
	}
	if (
		a !== null &&
		b !== null &&
		a.epochNanoseconds === b.epochNanoseconds &&
		a.timeZoneId === b.timeZoneId
	) {
		return;
	}
	throw new Error(`ZonedDateTime mismatch: ${a} and ${b}`);
}

function createInPolyfill(arg: Temporal.ZonedDateTime) {
	return new polyfill.Temporal.ZonedDateTime(arg.epochNanoseconds, arg.timeZoneId);
}

function getTransitions(timeZone: string) {
	const transitions: Temporal.ZonedDateTime[] = [];
	const upperLimit = Temporal.Now.zonedDateTimeISO(timeZone).add({ years: 15 });
	let transition = Temporal.Instant.from("1600-01-01T00:00:00Z")
		.toZonedDateTimeISO(timeZone)
		.getTimeZoneTransition("next");
	while (transition !== null && Temporal.Instant.compare(transition, upperLimit) < 0) {
		transitions.push(transition);
		transition = transition.getTimeZoneTransition("next");
	}
	return transitions;
}

function hasRegularDst(timeZone: string) {
	return (
		Temporal.Instant.from("2200-01-01T00:00:00Z")
			.toZonedDateTimeISO(timeZone)
			.getTimeZoneTransition("next") !== null
	);
}

function filterUnusualTransitions(transitions: Temporal.ZonedDateTime[]) {
	const threshold = Temporal.Duration.from({ days: 30 }).round({ largestUnit: "hours" });
	return transitions.filter((transition, i) => {
		const before = transitions[i - 1];
		const after = transitions[i + 1];
		return (
			before &&
			after &&
			(Temporal.Duration.compare(transition.until(before).abs(), threshold) < 0 ||
				Temporal.Duration.compare(transition.until(after).abs(), threshold) < 0)
		);
	});
}

for (const timeZone of Intl.supportedValuesOf("timeZone")) {
	const transitions = getTransitions(timeZone);

	// the earliest offset
	if (transitions[0] !== null) {
		const zdt1 = transitions[0]!.add({ hours: 1 });
		const zdt2 = transitions[0]!.subtract({ hours: 1 });
		assertEqual(
			zdt1.getTimeZoneTransition("previous"),
			createInPolyfill(zdt1).getTimeZoneTransition("previous"),
		);
		assertEqual(
			zdt2.getTimeZoneTransition("next"),
			createInPolyfill(zdt2).getTimeZoneTransition("next"),
		);
	}

	if (hasRegularDst(timeZone)) {
		const today = Temporal.Now.zonedDateTimeISO(timeZone);
		for (const base of Array.from({ length: 6000 }, (_, i) => today.add({ hours: i * 24 }))) {
			assertEqual(
				base.getTimeZoneTransition("next"),
				createInPolyfill(base).getTimeZoneTransition("next"),
			);
			assertEqual(
				base.getTimeZoneTransition("previous"),
				createInPolyfill(base).getTimeZoneTransition("previous"),
			);
		}
	}

	for (const transition of filterUnusualTransitions(transitions)) {
		for (const delta of Array.from({ length: 43200 }, (_, i) => ({ minutes: i + 1 }))) {
			const zdt1 = transition.add(delta);
			assertEqual(
				zdt1.getTimeZoneTransition("previous"),
				createInPolyfill(zdt1).getTimeZoneTransition("previous"),
			);
			const zdt2 = transition.subtract(delta);
			assertEqual(
				zdt2.getTimeZoneTransition("next"),
				createInPolyfill(zdt2).getTimeZoneTransition("next"),
			);
		}
	}
}
