# 3. One fallback style for optional config fields

## Status

Accepted. Amends ADR-0002's Consequences (the three-fallback-behaviors bullet).

## Context

ADR-0002 left `public/overlay-config.json` with three behaviors: all-or-nothing (`entities`,
`widgets`), warn-and-fallback (`heartRate`), and silent fallback (`maxHeartRate`). It asked future
fields to pick deliberately; this ADR picks one for all optional fields.

## Decision

- Two styles only. **Required** fields (`entities`, `widgets`, including `widgets[].compactSize`
  when present) stay fatal: the first failing field is named in one console error and the overlay
  renders nothing (ADR-0001). **Optional** fields use warn-and-fallback.
- Warn-and-fallback: absent means the built-in default, silently; present but invalid logs one
  `console.warn` and uses the default. An invalid optional field never invalidates the rest of the
  config.
- `maxHeartRate` is valid when finite and > 0; anything else (0, negatives, `Infinity`, non-numbers)
  warns and falls back to 185.
- A missing `heartRate` block no longer warns; a malformed one still does.
- Any future optional field uses warn-and-fallback.

## Consequences

- Operators get a warning only when they wrote something wrong, never for omitting a field.
- ADR-0002's "three fallback behaviors" bullet is amended: there are two.
