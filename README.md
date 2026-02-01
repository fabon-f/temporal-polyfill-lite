# temporal-polyfill-lite

[![pkg.pr.new](https://pkg.pr.new/badge/fabon-f/temporal-polyfill-lite)](https://pkg.pr.new/~/fabon-f/temporal-polyfill-lite)

Lightweight Temporal polyfill supporting all time zones and basic (`iso8601` and `gregory`) calendars.

# Usage

```sh
npm install temporal-polyfill-lite
```

```typescript
// as a ponyfill (without patching global variables)
import { Intl, Temporal } from "temporal-polyfill-lite";

// loading the polyfill to global
import "temporal-polyfill-lite/global";

// or you can manually install the polyfill
import { install } from "temporal-polyfill-lite/shim";
// overwrite native Temporal implementation
install(true);
// don't overwrite native Temporal implementation
install(false);
```

## Browser support

The polyfill works in browsers after September 2020 by default (e.g. Safari 14).

This polyfill doesn't internally rely on `bigint`, thus you can support older browsers by transpiling and injecting polyfills (e.g. it relies on `globalThis` which is baseline since January 2020). However, if you use APIs accepting or returning `bigint`, `bigint` support is required.

## Spec compliance

It supports the latest spec (January 2026) with few intentional deviations (see `/expectedFailures` directory for details).
