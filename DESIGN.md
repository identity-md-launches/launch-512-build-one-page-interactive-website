# NFT Pulse design system

Extracted from the final source (`src/styles.css`, `src/components/*.tsx`) and confirmed in
headless Chromium at 320, 375, 768 and 1280 px. Values below are the ones actually declared;
where a value was measured in the browser it says so.

## Overview

NFT Pulse is a single-page monitor for people who watch Ethereum NFT collections: traders,
community managers, curious holders. The visual character is a dark, near-black navy surface
with one cyan accent, thin luminous rings and a restrained grid glow in the background. Type
is the system sans-serif stack for prose and the system monospace stack for addresses and
token IDs. Density is medium: cards carry 20–24 px padding, the dashboard is a two-column grid
on desktop and a single column on phones.

Hierarchy comes from size and weight, not from decorative color. Color is reserved for three
jobs: the cyan accent marks the one primary action and interactive links; the four level hues
encode the activity state (always with a text label and a bar glyph); coral marks errors.

System-wide rules: token tiers, the type scale, the spacing scale, the card surface, the
button and chip styles, focus treatment and motion gating. Page-specific arrangement: the hero,
the search card, the pulse/stat grid and the timeline layout. A new page should reuse the
former and may rearrange the latter.

## Colors

All colors are `oklch()` in `src/styles.css`. Primitives (`--navy-*`, `--cyan-*`,
`--mint-300`, `--amber-300`, `--coral-*`) are never referenced by components; semantic tokens
(`--color-*`) are. Every primitive is inside the sRGB gamut (checked by converting the declared
values; the earlier out-of-gamut cyan, amber and coral steps were lowered in chroma).

| Token | Value | Role |
| --- | --- | --- |
| `--color-bg-page` | `--navy-950` `oklch(0.14 0.02 270)` | page background |
| `--color-bg-surface` | `--navy-900` `oklch(0.18 0.022 270)` | cards, tiles, timeline rows |
| `--color-bg-raised` | `--navy-800` `oklch(0.22 0.024 270)` | chips, secondary buttons, badges, skeletons |
| `--color-bg-hover` | `--navy-700` `oklch(0.27 0.026 270)` | hover fill for neutral controls |
| `--color-bg-accent-solid` | `--cyan-400` `oklch(0.8 0.125 195)` | the single filled primary action, selection |
| `--color-text-primary` | `--navy-50` `oklch(0.96 0.01 270)` | headings, values, body |
| `--color-text-secondary` | `--navy-200` `oklch(0.82 0.018 270)` | supporting text, timeline addresses |
| `--color-text-muted` | `--navy-300` `oklch(0.72 0.022 270)` | labels, hints, captions, axis text |
| `--color-text-on-accent` | `--navy-950` | text on the filled primary button |
| `--color-text-accent` | `--cyan-300` `oklch(0.86 0.13 195)` | links |
| `--color-text-danger` | `--coral-300` `oklch(0.78 0.125 25)` | inline errors, invalid borders, burn label |
| `--color-border` | `--navy-700` | separators, badge borders |
| `--color-border-strong` | `--navy-500` `oklch(0.5 0.03 270)` | input and secondary-button borders |
| `--color-focus-ring` | `--cyan-300` | `:focus-visible` outline; the primary button swaps to `--color-text-primary` so the ring stays visible on cyan |
| `--color-level-quiet` | `--navy-300` | activity level Quiet |
| `--color-level-active` | `--mint-300` `oklch(0.84 0.15 160)` | activity level Active, "Mint" label, copied state |
| `--color-level-hot` | `--amber-300` `oklch(0.85 0.14 80)` | activity level Hot |
| `--color-level-explosive` | `--coral-400` `oklch(0.72 0.16 25)` | activity level Explosive |
| `--color-pulse` | `--cyan-400`, overridden per level | pulse core and rings |
| `--color-chart-bar` / `--color-chart-bar-current` | `--cyan-600` / `--cyan-300` | hourly bars and the peak bar |
| `--color-chart-grid` | `--navy-700` | chart gridlines |

Rendered contrast (WCAG 2 ratio, measured in Chromium from computed styles on the final
export): primary text on surface 16.81:1; secondary text on surface 10.79:1; muted text on
surface 7.57:1; muted on page 8.0:1; button text on accent 11.16:1; link on surface 12.9:1;
chip text on raised 9.94:1. The level colors on surface, computed from declared values:
Quiet 7.58, Active 12.22, Hot 11.76, Explosive 7.08. Input border against the card surface
3.13:1 and against the page 3.31:1.

Translucent decorations (`body::before` glow `oklch(0.34 0.05 195 / 0.5)`, card ring `oklch(1 0 0 / 0.06)`, alert fill
`oklch(0.72 0.16 25 / 0.12)`) carry no text of their own.

There is one theme. The document declares `color-scheme: dark`; no light theme exists and none
should be added by flipping the ramps.

## Typography

- `--font-sans`: `'Inter', 'SF Pro Text', ui-sans-serif, system-ui, …`. No font file is
  bundled; the system face renders (Chromium on the test machine used its default sans).
- `--font-mono`: `ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, …` for addresses,
  token IDs and the address input.
- Root: `-webkit-font-smoothing: antialiased`, body `line-height: 1.5`, `overflow-wrap:
  break-word`.

| Token | Size | Used for |
| --- | --- | --- |
| `--text-caption` | 13px | hints, stat labels, captions, badges, timeline meta |
| `--text-label` | 14px | form labels, chips, small buttons, addresses |
| `--text-body` | 16px | body, inputs (16px also on mobile to avoid iOS zoom) |
| `--text-title` | 18px | hero paragraph, brand, chart heading |
| `--text-heading` | 24px | section `h2`, collection name |
| `--text-display` | `clamp(2rem, 1.4rem + 2.4vw, 3rem)` | the page `h1` |
| `--text-hero` | `clamp(2.5rem, 1.8rem + 3vw, 3.75rem)` | the activity level word |
| stat value | `clamp(1.5rem, 1.1rem + 1.6vw, 2.25rem)` weight 650 | the four stat tiles |

Weights: 400 body, 500 small labels, 600 buttons and form labels, 650 headings and stat
values, 700 the level word. Nothing below 400 is used. Headings use `line-height: 1.15`,
`text-wrap: balance`, and negative tracking from −0.01em (brand) to −0.03em (level word).
Paragraphs use `text-wrap: pretty`. Uppercase labels (`.header-meta`, `.pulse-label`) add
0.04–0.08em tracking. Changing numbers (timeline times, hourly table, pulse rate) use
`font-variant-numeric: tabular-nums`; large standalone values stay proportional. Prose is
capped at `--measure: 62ch`. Links use `from-font` underline metrics and `skip-ink`.

## Layout

- Spacing scale `--space-1` … `--space-12` = 4, 8, 12, 16, 20, 24, 32, 40, 48 px. Within a
  group use 4–12 px; between groups 16 px or more; between sections 40 px (`.section`).
- Content column: `.page` is `min(100% − 32px, 68rem)` centered, 32 px side margins from
  40rem up, with `env(safe-area-inset-*)` padding.
- Breakpoints are content-driven and in rem: 26rem (pulse card switches from two columns to a
  centered stack), 27rem (stat tiles go from one column to two), 40rem (search row becomes
  input + button on one line; header meta appears), 48rem (timeline row becomes
  token | parties | time; full address shown instead of the short form; window note
  right-aligns), 52rem (pulse card and stat grid sit side by side, 2fr/3fr).
- Logical properties throughout (`margin-block`, `padding-inline`, `inset-inline-start`).
- The hourly chart's SVG `viewBox` follows its container width through a `ResizeObserver`
  (`src/components/HourlyChart.tsx`), so axis text stays at 11 CSS px on phones; hour labels
  thin out below 480 px.
- Long values never overflow: addresses and token IDs use `overflow-wrap: anywhere`, the
  full address is hidden below 48rem in favor of `0x1234…abcd`, and no text container has a
  fixed height. Measured horizontal overflow at 320, 375, 768 and 1280 px: 0 px.

## Elevation & depth

Flat surfaces with one shadow recipe. `.card` uses a layered `box-shadow`: a 1px ring
`oklch(1 0 0 / 0.06)` for structure, `0 1px 2px oklch(0 0 0 / 0.35)` and
`0 8px 24px -12px oklch(0 0 0 / 0.5)` for lift. Stat tiles and timeline rows use only the 1px
ring. Structural borders (`--color-border`, `--color-border-strong`) are reserved for inputs,
chips, secondary buttons, badges, table rows and the footer rule. The pulse core has a colored
glow (`box-shadow: 0 0 24px 4px`) that changes with the level. The background glow and grid
live on `body::before`, `z-index: -1`, `pointer-events: none`.

## Shapes

- `--radius-sm` 6px: icon buttons, skeletons, badges, skip link.
- `--radius-md` 10px: inputs, buttons, stat tiles, timeline rows, alerts.
- `--radius-lg` 16px: cards (outer 16 = inner 10 + ~6 of padding at the tightest nesting).
- `--radius-pill`: example chips.
- Circles: brand mark, pulse core and rings.

## Components

All components are function components in `src/components/`; styles are class-based in
`src/styles.css`. None is published as a package; import them by path.

- **Buttons** (`.button` + `.button-primary` | `.button-secondary`, optional `.button-small`):
  min-height 48px (36px small), verb-first labels, `scale: 0.96` on `:active`, transitions
  limited to `background-color, color, border-color, scale` at 150ms. Exactly one
  `.button-primary` per view (Analyze collection). Native `disabled` while a scan runs, with a
  `.spinner` prepended and the label unchanged.
- **Icon button** (`.icon-button`, used by `CopyButton.tsx` and the Etherscan link): 36×36px,
  `currentColor` SVG, always an `aria-label`. `CopyButton` cross-fades copy → check
  (opacity/scale 0.25/blur 4px, 300ms, `cubic-bezier(0.2,0,0,1)`), reverts after 2s, and
  announces through its own `role="status"` span; it falls back to `execCommand('copy')`.
- **Chip** (`.chip`): pill secondary control for the example collections; hover only under
  `@media (hover: hover)`.
- **Text input** (`.text-input`): 48px tall, monospace, 16px, `--color-border-strong` border,
  danger border when `aria-invalid="true"`. Always paired with a visible `.field-label`
  (`<label for>`), a `.field-hint` bound by `aria-describedby`, and a `.field-error`
  (`role="alert"`) that replaces the hint on failure. `SearchForm.tsx` validates on submit and
  focuses the field on error.
- **Status line** (`.status-line`, `role="status"`, `aria-live="polite"`): a stable region that
  is always in the DOM; shows the scan phase with a spinner, then the loaded summary.
- **Alert** (`.alert`, `role="alert"`): title + fix text for contract-level failures (not a
  contract, not an NFT, RPC error). Focus moves to the results container when it appears.
- **Card** (`.card`): the container for the search form, collection header, pulse meter and
  chart. `.stat-tile` is the lighter variant for KPI numbers (label, value, detail).
- **PulseMeter** (`PulseMeter.tsx`): decorative `.pulse` (aria-hidden) with `data-level` and
  `data-playing`; the period comes from `pulsePeriodSeconds()` via the `--pulse-period`
  custom property; keyframes `pulse-core` and `pulse-ring` run only under
  `prefers-reduced-motion: no-preference`. The readout gives the level word with a
  `LevelIcon` bar glyph, the rate sentence, a four-segment `.meter` list with `aria-current`
  on the active segment, and a "Pause pulse / Resume pulse" toggle (`aria-pressed`).
- **StatTiles** (`StatTiles.tsx`): four tiles; hour ranges render in 24-hour form so they
  fit on one line from 27rem up.
- **HourlyChart** (`HourlyChart.tsx`): 24 bars, 2px gaps, 4px rounded tops, peak bar in the
  brighter cyan, legend in text tokens, `role="img"` with title/description, per-bar `<title>`
  hover text, and a "Show hourly table" toggle (`aria-expanded`) that renders a real
  `<table>`.
- **Timeline** (`Timeline.tsx`): `<ol>` of `.transfer` rows using named grid areas
  (`token`, `parties`, `time`). Mint and burn are labeled in text and color. Pages of 25 with a
  "Show N more" button. Etherscan links open in a new tab and say so in their accessible name.
- **Settings** (`Settings.tsx`): native `<details>` disclosure in the footer with an `https://`
  URL field for the RPC endpoint; validates on submit; "Reset to default" appears only when
  changed.
- **Skeleton** (`Skeleton.tsx`): `aria-hidden` placeholder mirroring the dashboard while a scan
  runs; shimmer only under `no-preference`.
- **Skip link** (`.skip-link`): first focusable element, targets `<main id="main">`.

Focus: every control relies on the global `:focus-visible { outline: 2px solid
var(--color-focus-ring); outline-offset: 2px }`, `Highlight` under `forced-colors`. Verified
visible at 16 tab stops on the loaded dashboard.

Motion: enter animation `.enter` (opacity + 8px rise, 300ms, staggered 100ms for up to four
siblings), spinner, skeleton shimmer and the pulse are all gated behind
`prefers-reduced-motion: no-preference`; state transitions on controls are 150ms and named per
property. Nothing autoplays without a pause control except the 0.8s spinner during loading.

## Do's and don'ts

- Do start a new surface from `.card` inside `.page`, and a new metric from `.stat-tile`.
- Do reference only `--color-*`, `--space-*`, `--text-*` and `--radius-*` tokens; add a
  semantic token if a role is missing instead of using a primitive or a raw `oklch()`.
- Do keep one `.button-primary` per view; every other action is `.button-secondary`, `.chip`
  or `.icon-button`.
- Do give any new status a text label or icon next to its color, as the level meter does.
- Do wrap new animation in `@media (prefers-reduced-motion: no-preference)` and offer a pause
  control if it loops longer than five seconds.
- Do keep inputs at 16px and give inline links or icon buttons a 24px-or-larger hit box.
- Don't add a light theme by inverting the ramps; the palette was tuned for the dark surface
  only.
- Don't use cyan for non-interactive text or amber/coral for anything other than the Hot and
  Explosive levels and errors.
- Don't introduce `px` breakpoints or physical `left`/`right` properties.

Recipe for another page: copy `index.html`, mount a new component in `src/main.tsx`, wrap it in
`.page` with `.site-header` and `.site-footer`, use `.hero` for the title block, `.card` for
each panel, `.section` + `.section-heading` between panels, and reuse `CopyButton`, `Icons` and
the button classes as they are.
