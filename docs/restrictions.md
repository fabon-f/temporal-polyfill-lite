# Restrictions

## precision of `Temporal.Duration.prototype.total`

Floating-point precision errors may occur in `Temporal.Duration.prototype.total` when using units of "minutes" or larger.

```javascript
Temporal.Duration.from("PT816H2049.18749766S").total("hours");
// spec:     816.56921874935
// polyfill: 816.5692187493501
```

## time zone equivalence in Safari / JavaScriptCore

Safari doesn't resolve linked time zones from the `backward` file in the time zone database (cf. <https://bugs.webkit.org/show_bug.cgi?id=310866>); consequently, `Temporal.ZonedDateTime.prototype.equals` may return inaccurate results for pairs of renamed or merged time zone IDs.

```javascript
new Temporal.ZonedDateTime(0n, "Europe/Kiev").equals(new Temporal.ZonedDateTime(0n, "Europe/Kyiv"));
// correct:   `true`  (Chrome, Firefox, Node.js)
// incorrect: `false` (Safari, Bun)
```

## `toLocaleString` and `Intl.DateTimeFormat`

### formatting dates near boundaries

This polyfill is unable to format `PlainDate`, `PlainDateTime`, and `PlainYearMonth` objects near their lower bounds. A similar restriction applies to `PlainDateTime` near its upper bound.

```javascript
// This polyfill will throw for these cases (but native implementations not):
Temporal.PlainDate.from("-271821-04-19").toLocaleString("en-US");
Temporal.PlainDateTime.from("-271821-04-19T00:00:01").toLocaleString("en-US");
Temporal.PlainYearMonth.from("-271821-04-19[u-ca=gregory]").toLocaleString("en-US");
Temporal.PlainDateTime.from("+275760-09-13T23:59:59").toLocaleString("en-US");
```

### `formatRange` and time ranges across midnight in older browsers

In browsers and JavaScript runtimes released before 2022 (e.g., Safari 16.3 or earlier, Node.js v18 or earlier), formatting time ranges that cross or end at midnight is not supported. See [#24](https://github.com/fabon-f/temporal-polyfill-lite/issues/24) for more details.

```javascript
new Intl.DateTimeFormat("en-US").formatRange(
	Temporal.PlainTime.from("23:00"),
	Temporal.PlainTime.from("00:00"),
); // "11:00:00 PM – 12:00:00 AM", but `RangeError` in older browsers
```

### other `Intl.DateTimeFormat` issues

This polyfill adds `Temporal` support to `Intl.DateTimeFormat` without modifying its underlying logic; therefore, native environment bugs and spec deviations remain present.

## `Temporal.Duration.prototype.toLocaleString` and `Intl.DurationFormat`

### environments without `Intl.DurationFormat`

`Temporal.Duration.prototype.toLocaleString` will throw an error in runtimes where `Intl.DurationFormat` is not supported.

### other `Intl.DurationFormat` issues

This polyfill enables `Intl.DurationFormat` to accept ISO 8601 duration strings (such as `P1Y`); however, it does not otherwise modify native behavior, even to patch existing bugs.

## calendars

### calendrical calculations

Because this polyfill independently implements most calendrical calculations defined in the latest specification, `Temporal`'s behavior for certain calendars may diverge from `Intl.DateTimeFormat` in specific browsers and runtimes. Known discrepancies include:

- pre-modern eras (before 1872) in `japanese` calendars
- `roc`, `buddhist`, and `japanese` calendars before 1582

Conversely, for calendars that are not rule-based and require astronomical calculations (i.e. `islamic-umalqura`, `persian`, `chinese`, and `dangi`), the polyfill follows the results of the native `Intl.DateTimeFormat`, even in cases where those results are incorrect.

### extreme dates in `chinese` and `dangi` calendars

The polyfill may throw an error for extreme dates in these calendars due to the following reasons:

- Some browsers' `Intl.DateTimeFormat` implementations cannot perform calendrical calculations for these calendars for dates in the distant past or future.
- The polyfill's algorithm for these calendars does not support dates near boundaries of `Intl.DateTimeFormat`.
