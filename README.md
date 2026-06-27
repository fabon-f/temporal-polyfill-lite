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

`Temporal.Now.timeZoneId` is very slow in the polyfill because there is no efficient way to get the system time zone (except native `Temporal.Now.timeZoneId`). `temporal-polyfill-lite` has an opt-in cache mechanism for this.

```typescript
import { setSystemTimeZoneIdCacheTtl } from "temporal-polyfill-lite/shim";
// or use "temporal-polyfill-lite/calendars-full/shim" entrypoint if you use the "full" bundle

setSystemTimeZoneIdCacheTtl(1000);
// The result of `Temporal.Now.timeZoneId()` will be cached for a second
```

## Browser support

The polyfill works in browsers after September 2020 by default (e.g. Safari 14). See [`docs/legacy.md`](docs/legacy.md) if you want broader support.

## TypeScript configuration

This polyfill provides type definitions out of the box (You don't need `@types/*`).

This package is ESM-only, so you have to set [`module`](https://www.typescriptlang.org/tsconfig/#module) and [`moduleResolution`](https://www.typescriptlang.org/tsconfig/#moduleResolution) correctly. It also uses the [`exports` field](https://nodejs.org/api/packages.html#exports) in `package.json`, so you should not set the [`resolvePackageJsonExports`](https://www.typescriptlang.org/tsconfig/#resolvePackageJsonExports) option to `false` in your `tsconfig.json`. Otherwise the type resolution will fail.

## Spec compliance

It supports the latest spec with few intentional deviations (see `tests/expectedFailures` directory for details).

## Docs

- [`docs/legacy.md`](docs/legacy.md): information about support for legacy browsers
- [`docs/restrictions.md`](docs/restrictions.md): caveats and restrictions of this polyfill
