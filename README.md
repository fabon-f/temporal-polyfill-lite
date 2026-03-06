# temporal-polyfill-lite

[![pkg.pr.new](https://pkg.pr.new/badge/fabon-f/temporal-polyfill-lite)](https://pkg.pr.new/~/fabon-f/temporal-polyfill-lite)

Lightweight Temporal polyfill.

- **Small**: The bundle size is nearly 10% smaller than [temporal-polyfill](https://www.npmjs.com/package/temporal-polyfill), 60% smaller than [@js-temporal/polyfill](https://www.npmjs.com/package/@js-temporal/polyfill) if you need only Gregorian calendar (see [comparison](https://github.com/fabon-f/temporal-polyfill-comparison) for details).
- **Spec-compliant**: It supports the latest spec, while other polyfills are based on the outdated spec (at least as of February 2026).

# Usage

```sh
npm install temporal-polyfill-lite
```

For users who need only Gregorian calendar (`iso8601` and `gregory`), you can use a smaller "basic" bundle:

```typescript
// as a ponyfill (without patching global variables)
import { Intl, Temporal } from "temporal-polyfill-lite";

// load the polyfill to global
import "temporal-polyfill-lite/global";
// load types to global if you need (optional)
import "temporal-polyfill-lite/types/global";

// or you can manually install the polyfill
import { install } from "temporal-polyfill-lite/shim";
// overwrite native Temporal implementation
install(true);
// don't overwrite native Temporal implementation
install(false);
```

If you need other calendars (such as `hebrew`, `chinese`, or `indian`), you have to load a "full" bundle from `temporal-polyfill-lite/calendars-full` module instead of `temporal-polyfill-lite`.

```typescript
import { Intl, Temporal } from "temporal-polyfill-lite/calendars-full";
import "temporal-polyfill-lite/calendars-full/global";
import { install } from "temporal-polyfill-lite/calendars-full/shim";
```

## Browser support

The polyfill works in browsers after September 2020 by default (e.g. Safari 14).

This polyfill doesn't internally rely on `bigint`, thus you can support older browsers by transpiling and injecting polyfills (e.g. it relies on `globalThis` which is baseline since January 2020). However, if you use APIs accepting or returning `bigint`, `bigint` support is required.

## Spec compliance

It supports the latest spec with few intentional deviations (see `/expectedFailures` directory for details).
