---
version: alpha
name: SVG to VectorDrawable
description: The visual language of the converter page. The Droidspaces palette and Material 3 rules, cut down to what a one-page tool needs.
colors:
  primary: "#a2cde2"
  on-primary: "#174557"
  secondary-container: "#2a3e48"
  on-secondary-container: "#adc3ce"
  tertiary: "#d1dcff"
  error: "#fa746f"
  surface: "#0b0f11"
  surface-container-lowest: "#000000"
  surface-container-low: "#0f1417"
  surface-container: "#141a1e"
  surface-container-high: "#1a2124"
  surface-container-highest: "#1f272b"
  on-surface: "#dee7ec"
  on-surface-variant: "#a4acb2"
  outline-variant: "#41494e"
typography:
  headline-lg-emphasized:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: 0px
  title-lg:
    fontFamily: IBM Plex Sans
    fontSize: 22px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: 0px
  title-md-emphasized:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0.15px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0.25px
  label-lg-emphasized:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.5px
  code:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0px
rounded:
  md: 12px
  lg: 16px
  xl: 28px
  full: 9999px
spacing:
  "50": 4px
  "100": 8px
  "150": 12px
  "200": 16px
  "300": 24px
  "400": 32px
  "600": 48px
  "800": 64px
components:
  button-filled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg-emphasized}"
    rounded: 24px
    height: 48px
    padding: 0 24px
  button-outlined:
    backgroundColor: transparent
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-lg-emphasized}"
    rounded: 24px
    height: 48px
    padding: 0 24px
  card:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: 24px
  field:
    backgroundColor: "{colors.surface-container}"
    rounded: "{rounded.lg}"
    height: 48px
  code-pane:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
    padding: 20px
---

# DESIGN.md

The visual language of this converter. It is taken from the Droidspaces website's
[DESIGN.md](https://github.com/Droidspaces/droidspaces.github.io/blob/main/DESIGN.md): same
palette, same type scale, same flat surfaces. Most of that file is about a marketing page
(phone mockups, decorative shapes, carousels). None of that applies here, so it is left out.

The front matter is the normative part. The prose says when each value applies. All tokens live
at the top of the `<style>` block in `index.html`, and that is the only place a hex colour may
appear.

## Overview

One page, one job: drop a file, get VectorDrawable XML. The page is a tool, so it has no hero,
no feature list and no sales copy. A visitor should reach the drop zone without scrolling on any
screen.

Personality, in three words: **plain, quick, exact.** The copy says what the tool does and what
it cannot do, and nothing else.

The page has to load on a slow connection. That decides several rules below: no web fonts, no
icon font, no framework, no third-party request of any kind.

Dark is the default. Light follows `prefers-color-scheme` until the visitor uses the theme
toggle, which then wins and is remembered in `localStorage`.

## Colors

Roles come from Material 3, generated from the Droidspaces source colour `#7DC4E4` with
`SchemeTonalSpot`. The page uses a subset, named after the M3 roles.

### Dark (default)

| Role | Value | Where it goes |
| --- | --- | --- |
| `primary` | `#a2cde2` | The one filled button per area, "Choose files", the focus ring, drag-over border |
| `on-primary` | `#174557` | Text on `primary` |
| `tertiary` | `#d1dcff` | Conversion warnings |
| `error` | `#fa746f` | A failed conversion. Nothing else |
| `surface` | `#0b0f11` | Page background |
| `surface-container-lowest` | `#000000` | XML panes and the paste box |
| `surface-container` | `#141a1e` | Drop zone, result cards, fields |
| `surface-container-high` | `#1a2124` | Preview tiles |
| `surface-container-highest` | `#1f272b` | Hover on a surface, checkerboard squares |
| `on-surface` | `#dee7ec` | Body text, headings |
| `on-surface-variant` | `#a4acb2` | Labels, captions, status, outlined button text |
| `outline-variant` | `#41494e` | Every border |

### Light

| Role | Value |
| --- | --- |
| `primary` | `#28667e` |
| `on-primary` | `#f3faff` |
| `tertiary` | `#4f5e84` |
| `error` | `#a83836` |
| `surface` | `#f7fafc` |
| `surface-container-lowest` | `#ffffff` |
| `surface-container` | `#e9eff3` |
| `surface-container-high` | `#e2e9ee` |
| `surface-container-highest` | `#dbe4e9` |
| `on-surface` | `#2b3438` |
| `on-surface-variant` | `#586065` |
| `outline-variant` | `#abb3b9` |

### How colour is used

**One `primary` per area.** The drop zone has "Choose files". The paste area has "Convert". Each
result card has "Copy XML". Everything else is outlined or plain text. Two filled buttons side
by side is wrong.

**Borders carry state, fills stay quiet.** Dragging a file over the page turns the drop zone's
border `primary`. The zone itself is never filled with `primary`.

**Code panes are black** in dark mode, `surface-container-lowest`, the same as Droidspaces
terminals.

## Typography

**IBM Plex Sans** for interface text and **JetBrains Mono** for XML, but only if the visitor
already has them installed. Neither is downloaded. The stacks fall back to `system-ui` and
`ui-monospace`. See Decided exceptions.

The scale is the Material 3 type scale with the Expressive emphasized weights: 700 for the
headline, 600 for titles and labels, 400 for everything else.

| Element | Style |
| --- | --- |
| Page title | `headline-lg-emphasized`, 32/40 |
| Intro sentence | `title-lg`, 22/28, `on-surface-variant` |
| Result file name | `title-md-emphasized`, 16/24 |
| Body | `body-lg`, 16/24 |
| Status, warnings, footer | `body-md`, 14/20 |
| Button label | `label-lg-emphasized`, 14/20 |
| Field label, caption | `label-md`, 12/16 |
| XML, SVG markup | `code`, 14/22 |

The intro sentence is capped at 68 characters a line. The footer notes run the full content
width: they are two short reference lines, and a cap left a ragged empty column beside them.
Headlines are one sentence in one colour.

## Layout

The grid unit is 8px. Gaps come from **4, 8, 12, 16, 24, 32, 48, 64**. If a gap wants 40, it
wants 32 or 48.

| Gap | Value |
| --- | --- |
| Between rows inside a card | 12 |
| Card inner padding | 24 |
| Between result cards | 16 |
| Page side gutter | 24, and 16 under 600px |
| Content max width | 960px |

One column. The page has two states and shows only what the current one needs.

- **Empty:** header, intro, drop zone, the "Paste SVG markup" disclosure, footer.
- **Loaded:** header, intro, the options row with Reset, a one-line hint, the inputs as result
  cards (newest first), footer. The drop zone and paste box are hidden. Dropping or pasting
  still adds files.

Removing the last card returns to the empty state. Under 600px the two previews stack and the
title and intro step down one size.

## Elevation and depth

No shadows. Depth is tonal: a card on the page is `surface-container`, a tile inside it is
`surface-container-high`, hover steps a surface to `surface-container-highest`. Every surface has
a 1px `outline-variant` border. Nothing is translucent and nothing uses `backdrop-filter`.

## Shapes

| Element | Radius |
| --- | --- |
| Drop zone, result card | 28 |
| Preview tile, field, code pane | 16 |
| Button at rest | 24, a pill at 48px tall |
| Button pressed | 12 |

## Components

Plain HTML and CSS. No component library.

### Buttons

48px tall, two variants:

| Variant | Fill | Text | Border |
| --- | --- | --- | --- |
| Filled | `primary` | `on-primary` | none |
| Outlined | transparent | `on-surface-variant` | 1px `outline-variant` |

Labels are sentence case and say the action: "Copy XML", "Download", "Reset". No arrow glyph
and no icon inside a labelled button.

A disabled button is at 38% opacity, the M3 disabled state. Reset is disabled while the options
are already at their defaults, so it never looks like it does something it does not.

### Icon buttons

The M3 standard icon button: 48px square, no border, a 24px icon in `on-surface-variant`, the
hover tier step and the press morph like every other button. Used three times: the GitHub link
and theme toggle in the header, and the remove X on each result card. Each has an `aria-label`
that says what happens ("Switch to light theme", "Remove icon.xml") and a matching `title`.

### Header

The page title on the left, the GitHub link and the theme toggle on the right. The toggle shows
a sun in dark mode and a moon in light mode, the theme it switches to.

### Drop zone

A `<label>` wrapping the file input, so the whole zone opens the picker and keyboard focus works
without a script. `surface-container`, radius 28, 1px dashed `outline-variant`. The dashed border
is the only dashed line on the page and it means "drop here".

### Result card

File name, status and the remove X on one line, then the two previews, then warnings, then the
XML pane, then the actions. A failed card hides everything but that first line, with the error
in `error`. Removing a card moves focus to the next card's X, or to the file picker when none
are left, so a keyboard user never lands on nothing.

### Previews

Original on the left, the generated VectorDrawable on the right, drawn from the output XML so it
shows what Android will draw. Both sit on a checkerboard so transparency is visible.

### Options

Shown only in the loaded state. Changing decimal places re-renders every result. The tracing
preset is shown only while a PNG, JPEG or GIF is loaded, because it steers raster tracing and
does nothing to an SVG. Changing it re-traces every raster result. There is no "apply" button. Reset puts both back
to their defaults (2, `default`) and re-renders.

While a file is dragged over the page, the drop zone border turns `primary` in the empty state,
and a dashed `primary` outline appears around the results in the loaded state.

## Motion

Two kinds, nothing else moves.

1. **Press.** Buttons morph from radius 24 to 12 on `:active` and spring back over
   `350ms cubic-bezier(0.42, 1.67, 0.21, 0.9)`, the `@material/web` 2.5.0 expressive button curve.
2. **Hover.** Surfaces and outlined buttons step a tier over the M3 effects-fast spring (182ms).

Under `prefers-reduced-motion: reduce` every transition is off and buttons do not morph.

## Do's and Don'ts

Do use `primary` on one element per area.
Do give every surface a 1px `outline-variant` border and no shadow.
Do keep anything tappable at least 48px.
Do test both colour schemes and reduced motion after a visual change.
Do keep every request on the page's own origin.

Don't use an em dash. Use a comma, a full stop, or rewrite the sentence.
Don't write "Unlock", "Supercharge", "Seamless", "Blazing fast", "Next-generation" or "Reimagine".
Don't claim what the tool does not do. If a feature has a limit, the page says so.
Don't add a gradient other than the preview checkerboard.
Don't load a font, icon or script from anywhere but this origin.
Don't append an arrow to a label.
Don't animate text or add entrance animations.

## Decided exceptions

Looked at and deliberately left alone.

- **No web fonts.** Droidspaces self-hosts IBM Plex Sans and JetBrains Mono. This page names
  them first in the stack but never downloads them, because a font file would double the first
  load on a slow connection.
- **Buttons are 48px, not 56px.** A tool page with several buttons per card reads as cramped at
  56. 48 keeps the touch-target minimum.
- **The checkerboard is a gradient.** It is the standard way to show transparency, and a tiled
  image would be one more request.
- **The light tokens are written twice** in `index.html`, once under the system media query and
  once under `[data-theme="light"]`. `light-dark()` would say it once, but it breaks every colour
  on browsers older than 2024, and this page is meant for old phones too.
- **`theme.js` is a separate blocking script in `<head>`.** The CSP forbids inline scripts, and
  applying a saved theme any later flashes the other theme on load.
- **Warnings are `tertiary`.** M3 has no warning role, and `error` is kept for a conversion that
  failed outright.
