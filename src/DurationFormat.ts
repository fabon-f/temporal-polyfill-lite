import { toTemporalDuration, type DurationSlot } from "./Duration.ts";
import { createNullPrototypeObject } from "./internal/object.ts";
import { defineStringTag, renameFunction } from "./internal/property.ts";
import { pluralUnitKeys, type PluralUnitKey } from "./internal/unit.ts";
import { getInternalSlotOrThrow } from "./internal/utils.ts";

export const OriginalDurationFormat = globalThis.Intl.DurationFormat;
type RawDurationFormatter = InstanceType<typeof OriginalDurationFormat>;

const internalSlotBrand = /*#__PURE__*/ Symbol();

interface DurationFormatSlot {
	$rawDurationFormatter: RawDurationFormatter;
	[internalSlotBrand]: unknown;
}

const slots = new WeakMap<any, DurationFormatSlot>();

function getInternalSlotOrThrowForDurationFormat(durationFormat: any): DurationFormatSlot {
	return getInternalSlotOrThrow(slots, durationFormat);
}

export function durationRecordToDurationLikeObject(slot: DurationSlot) {
	const record: Partial<Record<PluralUnitKey, number>> = createNullPrototypeObject();
	pluralUnitKeys.map((k, i) => {
		record[k] = slot[i]!;
	});
	return record;
}

export class DurationFormat {
	static supportedLocalesOf(locales: unknown, options: unknown = undefined) {
		return OriginalDurationFormat.supportedLocalesOf(locales as any, options as any);
	}
	constructor(locales: unknown = undefined, options: unknown = undefined) {
		slots.set(this, {
			$rawDurationFormatter: new OriginalDurationFormat(locales as any, options as any),
		} as DurationFormatSlot);
	}
	format(durationLike: unknown) {
		return getInternalSlotOrThrowForDurationFormat(this).$rawDurationFormatter.format(
			durationRecordToDurationLikeObject(toTemporalDuration(durationLike)),
		);
	}
	formatToParts(durationLike: unknown) {
		return getInternalSlotOrThrowForDurationFormat(this).$rawDurationFormatter.formatToParts(
			durationRecordToDurationLikeObject(toTemporalDuration(durationLike)),
		);
	}
	resolvedOptions() {
		return getInternalSlotOrThrowForDurationFormat(this).$rawDurationFormatter.resolvedOptions();
	}
}

defineStringTag(DurationFormat.prototype, "Intl.DurationFormat");
renameFunction(DurationFormat, "DurationFormat");
