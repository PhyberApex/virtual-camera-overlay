# 4. Be Right Back content from overlay-config.json

## Status

Accepted. Supersedes ADR-0002's "`BeRightBack` ... still no config of its own" clause.

## Context

ADR-0001 aimed for no personal literal under `src/`. The Be Right Back title, subtitle and
`rain/janis*.png` particle images were the last ones left.

## Decision

- `public/overlay-config.json` gains an optional top-level `beRightBack` block:
  `{ title, subtitle, particles }`. `title`/`subtitle` are non-empty strings; `particles` is an
  array of non-empty image paths, resolved relative to the page like the existing `rain/` images.
- 15 particles are drawn, cycling over the configured list; the count stays a code constant. An
  empty list renders no particles.
- Fallback follows ADR-0003, per field: absent is silent, invalid logs one `console.warn` and uses
  the default (today's copy and images). A non-object block warns once and uses all defaults.
- Position, the fully opaque full-screen background and the privacy-screen role stay as ADR-0002
  and #616 left them; only content is configurable.

## Consequences

- A deployment can use its own wording and images without touching `src/`.
- The defaults still ship in code (`DEFAULT_BE_RIGHT_BACK`), so omitting the block keeps today's look.
