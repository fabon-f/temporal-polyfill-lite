# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fix the bug caused by improper minification which makes `new Intl.DateTimeFormat()` throw `TypeError` ([#5](https://github.com/fabon-f/temporal-polyfill-lite/pull/5))

## 0.2.1 (2026-02-06)

### Changed

- Improve performance for `ZonedDateTime` ([#3](https://github.com/fabon-f/temporal-polyfill-lite/pull/3), [e9b5cbf](https://github.com/fabon-f/temporal-polyfill-lite/commit/e9b5cbf3e06cd1db24c086ec5b41f7c5faf5861e))
- Improve error messages ([94990ad](https://github.com/fabon-f/temporal-polyfill-lite/commit/94990adca9052a785db16f74716cccf653f51a83))

### Fixed

- Stop display fractional seconds for date classes in `Intl.DateTimeFormat` ([#2](https://github.com/fabon-f/temporal-polyfill-lite/pull/2))

## 0.2.0 (2026-01-30)

### Changed

- **BREAKING**: Reflect a normative change which disallows adding weeks, days, and time units to `PlainYearMonth` ([#1](https://github.com/fabon-f/temporal-polyfill-lite/pull/1))
- Stop mangling of function names in the production build for better stack traces ([14a367e](https://github.com/fabon-f/temporal-polyfill-lite/commit/14a367e7392b06324bf1844316be4a0b43e6a531))

## 0.1.0 (2026-01-25)

### Added

- Initial release including everything
