# 1. Entities and widgets from a committed overlay config file

## Status

Accepted

## Context

Which Home Assistant entities feed the overlay, and which widgets appear where, used to be
hard-coded: six (then seven, once #511 added the compact-mode toggle) entity IDs were literals
inside `useHomeAssistant.ts`'s message handler and subscription list, and the only widget ever
instantiated was the one `addWidget` call in `App.vue` for the steps display. `WidgetTemperature`
and `WidgetSensor` existed in the codebase but were never reachable outside of tests. Pointing the
overlay at a different treadmill or watch, or adding a temperature/sensor widget, required a code
change and a redeploy.

`#600` had already introduced `public/overlay-config.json`, fetched relative to the current page
(not the site root, since production is served from Home Assistant's `/local/`), to carry one
field: `maxHeartRate`. This decision extends that same file to carry the entity IDs and widget
layout as well, rather than introducing a second configuration mechanism.

## Decision

- `public/overlay-config.json` is committed to the repo and deployed as a static asset. Besides
  the existing `maxHeartRate`, it now also declares:
  - `entities`: the seven Home Assistant entity IDs the overlay reads (`steps`, `distance`,
    `speed`, `heartRate`, `brbToggle`, `heartToggle`, `compactToggle`).
  - `widgets`: an array of widget declarations (`id`, `type`, `anchor`, `offset`, `size`, and
    per-type `props` such as `entityId`/`unit`/`displayName`).
- The committed defaults are exactly today's hard-coded values: the same seven entity IDs, and one
  `steps` widget anchored `bottom-right` with a 30/30 offset at the current normal-mode size. No
  entity ID literal remains anywhere under `src/`.
- Widget position is expressed as `anchor` + `offset` + `size` instead of absolute coordinates.
  `src/utils/widgetLayout.ts` resolves `anchor`/`offset`/`size` against the current viewport into
  an `{x, y}` position; `App.vue` recomputes it on window resize and, for the `steps` widget only,
  on compact-mode toggle (its compact-mode alternate size stays a code-level constant, unaffected
  by this change).
- `HeartRate` and `BeRightBack` stay fixed, non-repositionable components; only the entity IDs they
  depend on (via `useHomeAssistant`) become configurable.
- Validation is a hand-written guard (no schema library): `entities` and `widgets` are required
  and type-checked field by field. If the file can't be fetched, isn't valid JSON, or fails this
  guard, the overlay renders nothing and logs exactly one `console.error` — mirroring the existing
  missing-token behavior. This check runs once, before connecting to Home Assistant at all, so no
  entity subscription or widget is ever built from a partially-loaded config. `maxHeartRate` keeps
  its own independent, softer fallback (default `185`) from #600, since an invalid/missing value
  there doesn't prevent the overlay from working.
- The widget subscription list is built from the loaded config at authentication time, same as
  today, just reading the configured entity IDs instead of literals.

## Consequences

- Pointing the overlay at a different treadmill, watch, or set of `input_boolean` toggles is now a
  one-file edit, no code change or PR required.
- Adding a `temperature` or `sensor` widget — previously unreachable outside of tests — is now a
  config edit; a reload picks it up (no live hot-reload of the config file is required).
- A broken or missing config file is an all-or-nothing failure: the entire overlay renders
  nothing rather than partially working with stale defaults. This is intentional — a malformed
  config can't silently point at the wrong entities.
- Theming and a configuration UI remain out of scope; editing the JSON file by hand is the only
  interface.
