# Support for legacy browsers

The polyfill works in browsers after September 2020 by default (e.g. Safari 14).

If you want to support older browsers, you have to transpile `temporal-polyfill-lite` itself and inject polyfills for APIs used by it.

## features after ES2015 used by this polyfill

### `BigInt`

The polyfill doesn't rely on `BigInt` internally, so it works fine even in browsers without support for `BigInt`, unless you explicitly use APIs accepting or returning `BigInt` (such as `epochNanoseconds` getters).

### syntax

- [exponentiation operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Exponentiation) (`**`): baseline 2017
- [spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) (`...`) in object literal: baseline 2020
- optional catch binding in [`catch` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch) (`try {} catch {}`): baseline 2020
- [optional chaining operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining) (`?.`): baseline 2020
- [nullish coalescing operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_assignment) (`??`): baseline 2020
- [logical OR assignment operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR_assignment) (`||=`): baseline 2020
- [nullish coalescing assignment operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_assignment) (`??=`): baseline 2020

### runtime

- [`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes): baseline 2016
- [`String.prototype.padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart): baseline 2017
- [`String.prototype.padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd): baseline 2017
- [`Object.getOwnPropertyDescriptors`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptors): baseline 2017
- `globalThis`: baseline 2020
- [`String.prototype.matchAll`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/matchAll): baseline 2020

If you want to handle time zones:

- `timeZone` option in `Intl.DateTimeFormat` constructor: baseline 2017
- [`Intl.DateTime.prototype.resolvedOptions`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/resolvedOptions): baseline 2017
- [`Intl.DateTimeFormat.prototype.formatToParts`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts): baseline 2018

If you want to use `islamic-umalqura`, `persian`, `chinese`, or `dangi` calendars:

- `calendar` option in `Intl.DateTimeFormat` constructor: baseline 2021
