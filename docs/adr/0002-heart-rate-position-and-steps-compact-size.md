# 2. Configurable heart-rate position and steps compact size

## Status

Accepted

## Context

ADR-0001 declared `HeartRate` a "fixed, non-repositionable" component, and the steps widget's
compact-mode size a "code-level constant" (`STEPS_WIDGET_COMPACT_SIZE` in `App.vue`), unaffected by
`public/overlay-config.json`. Both of those claims were correct at the time but became limiting:
viewers with a different camera framing or a taller/shorter compact steps row had no way to adjust
either without a code change.

`#615` lifts both restrictions, without disturbing the rest of ADR-0001's design (entity IDs,
`widgets[]`, the all-or-nothing validation of `entities`/`widgets`, or `BeRightBack`, which stays
fixed and non-positionable).

## Decision

- `public/overlay-config.json` gains an optional, top-level `heartRate` block:
  `{ anchor: WidgetAnchor, offset: Vector2 }`, reusing the same `WidgetAnchor` and `Vector2` types
  as `widgets[].anchor`/`widgets[].offset`. It controls where the BPM display and its pulse-wave
  animation render; the two always move together, anchored to the same corner with the same
  offset. The full-screen pulsing screen-border effect stays inset to the viewport, unaffected by
  this field.
- Unlike `entities`/`widgets`, `heartRate` fails **soft**, mirroring `maxHeartRate`'s existing
  independent fallback from #600: a missing `heartRate`, or one that fails shape validation (bad or
  missing `anchor`/`offset`), doesn't invalidate the rest of the config. The overlay still renders,
  `HeartRate` falls back to the previous hard-coded position (anchor `top-left`, offset
  `{x: 20, y: 20}`), and exactly one `console.warn` is logged naming the heart-rate config. This is
  intentional: an overlay with a slightly misplaced BPM display is still useful, unlike one pointed
  at the wrong Home Assistant entities.
- `src/utils/widgetLayout.ts` gains `computeCornerStyle(anchor, offset)`, returning CSS `top`/
  `bottom`/`left`/`right` values. Unlike `computeWidgetPosition` (used by `widgets[]`, which have a
  known configured `size` to subtract from the viewport), the BPM display and pulse waves are
  intrinsically sized, so `HeartRate.vue` anchors them with native corner CSS properties instead of
  computing an absolute `{x, y}` position.
- `HeartRate.vue`'s existing mobile breakpoint (`max-width: 768px`) still shrinks the offset (by
  5px per axis, floored at 0), but now relative to whichever corner is configured, not hard-coded
  to top-left.
- `widgets[]` entries of `type: "steps"` gain an optional `compactSize: Size2` field. When present,
  it's used instead of the `App.vue`-level `DEFAULT_STEPS_WIDGET_COMPACT_SIZE` constant (600×72)
  while compact mode is on. `compactSize` is part of the existing all-or-nothing `widgets`
  validation from ADR-0001: a present-but-malformed value fails the whole config the same way a
  malformed `size` or `anchor` does today. A missing `compactSize` on a `steps` widget is valid and
  keeps today's 600×72 default. Non-`steps` widgets ignore the field if present.
- `BeRightBack` is untouched by this change: still full-screen, still non-positionable, still no
  config of its own.

## Consequences

- Pointing the BPM display at a different corner, or giving a different-height compact steps row
  more or less room, is now a config edit, matching the rest of ADR-0001's "one-file edit" model.
- `heartRate`'s soft-fail path is a second validation style alongside the all-or-nothing
  `entities`/`widgets` gate and `maxHeartRate`'s silent fallback — now three fallback behaviors in
  one file: all-or-nothing (fatal), warn-and-fallback (heartRate), and silent-fallback
  (maxHeartRate). Any future field should pick deliberately from these, not invent a fourth.
- A configuration UI, schema library, or live hot-reload remains out of scope.
