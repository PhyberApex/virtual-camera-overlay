---
name: Virtual Camera Overlay
description: Fitness metrics overlay for video meetings (REFINED 2026-05-19)
colors:
  vital-green: 'oklch(76% 0.12 125)' # desaturated from 0.16 for sophistication
  vital-green-deep: 'oklch(63% 0.11 126)' # desaturated from 0.14
  surface-dark: '#1e1e1e'
  surface-darker: '#0a0a0a'
  text-primary: 'rgba(255, 255, 255, 0.95)' # off-white instead of pure white
  text-secondary: 'rgba(255, 255, 255, 0.85)' # adjusted from 0.9
  text-muted: '#aaaaaa'
  zone-resting: '#3b82f6'
  zone-normal: '#10b981'
  zone-active: '#f59e0b'
  zone-exercise: '#f97316'
  zone-intense: 'oklch(56% 0.17 25)' # desaturated from 0.20 - less alarming
  zone-maximum: 'oklch(40% 0.14 23)' # desaturated from 0.16 - more serious
  border-subtle: '#333333'
  border-medium: '#555555' # increased from #444 for visibility
typography:
  display:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '2.5rem'
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '1.8rem'
    fontWeight: 700
    lineHeight: 1.3
    fontVariantNumeric: 'tabular-nums' # better number alignment
  label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '1.4rem'
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: '0.02em' # refined spacing
  small:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '0.9rem'
    fontWeight: 400
    lineHeight: 1.4
  header:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '13px'
    fontWeight: 300 # lighter weight for refinement
    fontVariant: 'small-caps' # more sophisticated than uppercase
    letterSpacing: '0.08em' # spacious, refined
rounded:
  widget: '10px' # unified radius for all widgets
spacing:
  xs: '8px'
  sm: '12px'
  md: '16px'
  lg: '24px'
  xl: '32px'
  header-v: '8px' # tighter vertical for headers
  header-h: '16px'
  content-v: '20px' # more generous vertical for content
  content-h: '24px'
components:
  widget-base:
    backgroundColor: 'rgba(0, 0, 0, 0.7)'
    textColor: '{text-secondary}'
    rounded: '{rounded.widget}' # unified
    headerPadding: '{spacing.header-v} {spacing.header-h}' # 8px 16px - tighter
    contentPadding: '{spacing.content-v} {spacing.content-h}' # 20px 24px - generous
    headerBorder: '2px solid {border-medium}' # more visible
  widget-steps:
    backgroundColor: 'rgba(132, 204, 22, 0.35)' # REFINED: reduced from 0.8 for subtlety
    headerBackground: 'rgba(100, 160, 16, 0.6)' # REFINED: reduced from 0.9
    textColor: '{text-primary}'
    rounded: '{rounded.widget}' # unified
  bpm-display:
    backgroundColor: 'rgba(0, 0, 0, 0.6)'
    textColor: '{text-primary}'
    rounded: '{rounded.widget}' # unified
    padding: '{spacing.sm} {spacing.md}'
    showZoneName: true # REFINED: displays zone text for viewers
  brb-overlay:
    backgroundColor: 'rgba(0, 0, 0, 0.85)' # REFINED: semi-transparent like widgets
    backdropBlur: '12px' # REFINED: cohesive with widget blur
    accentColor: '{vital-green}' # REFINED: matches overlay theme (was indigo)
---

# Design System: Virtual Camera Overlay

## 1. Overview

**Creative North Star: "The Treadmill Dashboard"**

This system is built for people working out during video meetings. It's visible enough to show colleagues you're actively engaged and getting your steps in, but subtle enough not to dominate the call. The aesthetic is practical, energetic, data-forward: no corporate blandness, no clinical fitness tracking sterility. Every widget earns its place by communicating effort and intention without requiring explanation.

The overlay must work against varied backgrounds (home office, gym, outdoor) and in small video thumbnails. Transparency is non-negotiable. Widgets use semi-transparent backgrounds with backdrop blur to ensure readability regardless of what's behind them. Heart rate visualization scales with intensity: the interface becomes more visually active as the user's physical effort increases.

**Key Characteristics:**

- Readable in meeting gallery view where camera feeds are small
- Semi-transparent with backdrop blur for varied backgrounds
- Energy follows effort: visual intensity matches heart rate zones
- Playful personality touches without being distracting
- No explanation needed: glanceable context for colleagues

## 2. Colors: The Energy Gradient Palette

The palette uses an energy gradient strategy: heart rate zones progress from cool (resting) to hot (maximum), making physical exertion instantly readable. Vital Green is the hero accent for general activity metrics.

### Primary

- **Vital Green** (#84cc16 / oklch(76% 0.16 125)): The hero accent. Used for the steps widget background and active states. Communicates life, energy, movement. Appears at ~15-20% of the surface when active.
- **Vital Green Deep** (#64a010 / oklch(63% 0.14 126)): Darker sibling for widget headers and hover states. Adds depth to the primary without introducing new hues.

### Heart Rate Zones (gradient spectrum)

The heart rate zones form a deliberate cool-to-hot progression. Each color is used for both border and text to maintain zone identity across components:

- **Zone Resting** (#3b82f6 / oklch(60% 0.18 256)): <60 BPM. Calm blue.
- **Zone Normal** (#10b981 / oklch(63% 0.14 165)): 60-70 BPM. Steady green.
- **Zone Active** (#f59e0b / oklch(75% 0.17 61)): 70-100 BPM. Warming amber.
- **Zone Exercise** (#f97316 / oklch(68% 0.18 35)): 100-120 BPM. Orange effort.
- **Zone Intense** (#dc2626 / oklch(56% 0.20 25)): 120-130 BPM. Red exertion.
- **Zone Maximum** (#991b1b / oklch(40% 0.16 23)): 130+ BPM. Deep crimson with pulsing animation.

### Neutral

- **Text Primary** (#ffffff): White, used for metric values.
- **Text Secondary** (rgba(255, 255, 255, 0.9)): Slightly dimmed white for labels and secondary info.
- **Text Muted** (#aaa): Low-priority text, entity names, placeholders.
- **Surface Dark** (#1e1e1e / oklch(16% 0 0)): Widget header backgrounds.
- **Surface Darker** (#0a0a0a / oklch(4% 0 0)): Reserved for future use.
- **Border Subtle** (#333 / oklch(24% 0 0)): Widget borders.
- **Border Medium** (#444 / oklch(31% 0 0)): Header dividers.

### Named Rules

**The Energy Follows Effort Rule.** Visual intensity scales with heart rate. At rest, the interface is calm (blue borders, minimal animation). At maximum exertion, the interface pulses (deep red, animated danger state). Meeting participants can see when you're working hard without hearing you breathe.

**The Backdrop Rule.** Every widget uses semi-transparent backgrounds with backdrop blur. No solid fills; the camera feed must always be partially visible through the overlay. This maintains presence and context.

## 3. Typography

**Body Font:** Inter (system-ui, sans-serif fallback)

**Character:** Single sans-serif, no serifs. Inter provides clarity at small sizes (meeting thumbnails) and remains readable with backdrop blur. Weight contrast creates hierarchy: 700 for values, 400 for labels.

### Hierarchy

- **Display** (700, 2.5rem, 1.2): Large metric values in the steps widget.
- **Body** (700, 1.8rem, 1.3): Primary metric displays (heart rate, temperature). Bold for emphasis.
- **Label** (400, 1.4rem, 1.4): Metric labels ("steps", "km/h", "bpm"). Regular weight to stay secondary.
- **Small** (400, 0.9rem, 1.4): Entity names, widget subtitles, dev panel text.

### Named Rules

**The Bold Values Rule.** Metric numbers are always bold (700). Labels are always regular (400). The 1.75× weight contrast makes values pop even in small thumbnails.

## 4. Elevation

This system is flat by default with tonal layering via transparency. Shadows are ambient and subtle, used only to lift widgets slightly off the background, never for structural hierarchy.

### Shadow Vocabulary

- **Ambient Low** (0 4px 6px rgba(0, 0, 0, 0.1)): Default widget shadow. Soft, barely perceptible.
- **Ambient Medium** (0 4px 8px rgba(0, 0, 0, 0.3)): Steps widget shadow. Slightly more presence due to the bright lime background.

### Named Rules

**The Transparent Layers Rule.** Depth is created through transparency and backdrop blur, not shadows. A widget with rgba(0, 0, 0, 0.7) sits "in front" because it's darker, not because of a heavy shadow. Shadows are finishing touches, not the primary depth mechanism.

## 5. Components

### Widgets (Base)

- **Shape:** Gently rounded corners (8px)
- **Background:** Semi-transparent dark (rgba(0, 0, 0, 0.7)) with backdrop blur (4px)
- **Border:** Subtle dark border (1px solid #333)
- **Shadow:** Ambient low
- **Header:** Darker background (rgba(30, 30, 30, 0.9)), thin divider below (1px #444)
- **Padding:** 12px content area, 8px 12px header

### Widget: Steps (distinctive variant)

- **Background:** Vital Green semi-transparent (rgba(132, 204, 22, 0.8))
- **Header Background:** Vital Green Deep (rgba(100, 160, 16, 0.9))
- **Corner Style:** Medium rounded (10px)
- **Padding:** 16px 24px for generous breathing room
- **Conditional Visibility:** Only appears when steps, speed, and distance are all non-zero

### BPM Display

- **Shape:** Larger rounded corners (12px) for a softer presence
- **Background:** Semi-transparent dark (rgba(0, 0, 0, 0.6))
- **Border:** 2px solid, color determined by heart rate zone
- **Padding:** 12px 16px
- **State:** Border and text color both change to match the active zone color

### Pulse Waves

- **Style:** Expanding circles emanating from the BPM display
- **Animation:** Opacity 0.8 → 0, scale 1 → 4, 2s ease-out
- **Color:** Matches current heart rate zone border color
- **Trigger:** Active when heartEnabled is true

### Screen Border (Heart Rate)

- **Style:** Full-screen inset border (4px solid)
- **Color:** Matches current heart rate zone
- **Animation:** Pulses in sync with calculated BPM interval (GSAP timeline)
- **Intensity:** Opacity varies 0.2 → 0.8 with the heartbeat

### BPM Display with Zone Indicator

- **REFINED (2026-05-19):** Now displays zone name ("resting", "active", "exercise", etc.) below BPM value
- **Rationale:** Helps meeting participants understand color meaning without learning the zone system
- **Style:** Small-caps text, 0.65rem, letter-spacing 0.08em for refined feel

### Dev Panel

- **Background:** Dark gray (rgba(30, 30, 30, 0.9))
- **Typography:** Monospace (font-mono from Tailwind)
- **Size:** Fixed 256px width
- **Position:** Top-left (12px, 12px)
- **Visibility:** Development mode only, toggled with 'u' key

## 6. Do's and Don'ts

### Do:

- **Do** use semi-transparent backgrounds with backdrop blur for every overlay element so the camera feed remains partially visible.
- **Do** scale visual intensity with heart rate: calm at rest (blue), intense at peak (pulsing red).
- **Do** keep text large and bold for values (1.8rem, weight 700) so metrics are readable in meeting gallery view thumbnails.
- **Do** use the Vital Green (#84cc16) sparingly (≤20% of surface) for active states and the steps widget.
- **Do** make widgets conditionally visible: only show when data exists, hide when inactive.

### Don't:

- **Don't** use solid opaque backgrounds. The camera feed must always be partially visible through widgets.
- **Don't** use generic fitness app aesthetics (Strava/MyFitnessPal blue-teal palettes, sterile metric cards).
- **Don't** make it look medical or clinical (hospital monitor UI, EKG-style visuals).
- **Don't** use aggressive neon rainbow or gamer RGB chaos that competes with meeting content.
- **Don't** add side-stripe borders (border-left/right > 1px as colored accents). Use full borders or background tints.
- **Don't** make widgets visible by default when no data exists. Empty states should be truly empty (no widget frame).

---

## 7. Design Refinements (2026-05-19)

### Visual Polish Pass

The following refinements were applied to elevate the design from "functional" to "refined":

**Color Sophistication:**

- Desaturated vital green from `oklch(76% 0.16 125)` → `0.12` for a more sophisticated, less "LOOK AT ME" feel
- Desaturated intense/maximum zone reds (`0.20` → `0.17`, `0.16` → `0.14`) for a more serious, less alarming tone
- Changed text-primary from pure white `#fff` → off-white `rgba(255, 255, 255, 0.95)` for less harsh contrast
- Increased border-medium visibility from `#444` → `#555` for clearer widget separation

**Typography Refinement:**

- Widget headers: changed from uppercase Inter 400 → small-caps Inter 300 with `letter-spacing: 0.08em` for refined, spacious feel
- Added `font-variant-numeric: tabular-nums` to metric values for better number alignment
- Added subtle `letter-spacing: 0.02em` to labels for visual refinement
- BPM zone text uses small-caps instead of uppercase for sophistication

**Spacing Rhythm:**

- Tightened widget header padding: `12px` → `8px vertical` (more compact)
- Increased content padding: `12px` → `20px vertical, 24px horizontal` (more generous breathing room)
- Increased header border: `1px` → `2px` for clearer visual separation
- Creates visual contrast: tight headers, generous content = refined rhythm

**Unified Structure:**

- Consolidated border-radius to single `--radius-widget: 10px` for all widgets (was 8px/10px/12px)
- Rationale: subtle differences (8px vs 10px) felt inconsistent rather than intentionally varied

**Steps Widget Subtlety:**

- Reduced lime background opacity: `0.8` → `0.35` to reduce visual dominance
- Reduced header background: `0.9` → `0.6` for cohesion
- Still distinct but no longer SCREAMING for attention

**BeRightBack Cohesion:**

- Changed from solid indigo-900 → semi-transparent `rgba(0, 0, 0, 0.85)` with `backdrop-blur: 12px`
- Changed accent from indigo → vital green to match overlay theme
- Simplified from raining images → single centered image with subtle pulse
- Now feels like part of the same design system instead of a different app

**Feature Removals:**

- Removed blood drops animation (>100 BPM) - border pulsing is sufficient, blood drops felt gimmicky
- Rationale: personality over polish vs. refined polish - chose refinement

**Viewer-Focused Additions:**

- Added zone name display to BPM ("resting", "active", "exercise", etc.)
- Rationale: meeting participants viewing the overlay don't know the color system - text makes it glanceable
