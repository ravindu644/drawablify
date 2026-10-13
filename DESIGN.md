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
| Content max width | 1200px |

A sticky top bar spans the window: the icon and "Drawablify" on the left, the GitHub link and
the theme toggle on the right. Its content lines up with the column below, and a 1px
`outline-variant` line separates it from the page.

One column. The page has two states and shows only what the current one needs.

- **Empty:** title, intro, drop zone, the "Paste SVG markup" disclosure, footer.
- **Loaded:** title, intro, a one-line hint, the inputs as result
  cards (newest first), footer. The drop zone and paste box are hidden. Dropping or pasting
  still adds files.

Removing the last card returns to the empty state.

From 900px wide, a result card turns sideways: the two previews (224px tall) and the card's
options on the left, the XML on the right filling the card's height, Copy and Download under
the XML. A tall card down the middle of a wide screen left most of it empty.

### Mobile

Under 600px:

- The title steps down to 28/36 and the intro to `body-lg`. The side gutter is 16.
- Cards take 16 padding and radius 24. The two previews stay side by side at 128px tall, because
  comparing them is the point; stacked, one is always off screen.
- The option fields share a row and grow to fill it. Copy and Download split the card width,
  so both are wide tap targets.
- The XML pane does not wrap lines; it scrolls sideways, like code.
- The paste box uses 16px text, because iOS zooms the page into any field smaller than that.
- The viewer is the full width less 8px each side, and its image is 45% of the viewport height
  so the options stay on screen below it.

Hover styles apply only under `(hover: hover)`, so a tapped element on a touch screen does not
stay highlighted. Under `(pointer: coarse)` the hints about dropping files and Ctrl+V are hidden,
because a phone can do neither. The `theme-color` meta follows the page surface, including a
toggled theme, so the phone's browser bar matches the page.

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

### Preview viewer

Tapping or clicking either preview opens a native `<dialog>`: the image large on the
checkerboard, an Original / VectorDrawable segmented switch, the file name, and a close X. The
switch is how you compare input and output, so it opens on the side that was tapped. Left and
Right arrow keys switch too; Escape, the X, or a click on the scrim closes it.

The viewer has its own options row for the file it shows, so the large image redraws as they
change. It and the card's row both write to the same per-file options and are synced from them,
so the card behind the scrim always shows what the viewer shows. Nothing moves out of the card
while the viewer is open; an earlier version moved the row and the card lost it behind the scrim. The caption under the image shows the file name and
the current size, and says "Converting" while a change is being applied. The preset shows only
when the viewed file is a raster.

The segmented switch is the M3 segmented button: outlined segments joined into one pill, the
selected one on `secondary-container`. It is not `primary`, because the dialog has no primary
action.

The preview tiles are buttons with an `aria-label` ("View original larger"), a zoom-in cursor,
and a border that steps to `on-surface-variant` on hover.

### Options

Each result card has its own options row under the previews, because one batch can mix files
that want different settings. Changing decimal places re-renders only that card. The tracing
preset shows only on PNG, JPEG and GIF cards, because it steers raster tracing and does nothing
to an SVG. There is no "apply" button. Reset puts the card back to the defaults (2, `default`).
The fields share the row and grow to fill it.

While a file is dragged over the page, the drop zone border turns `primary` in the empty state,
and a dashed `primary` outline appears around the results in the loaded state.

## Motion

Every curve is a Droidspaces token: the M3 Expressive spatial-default spring (472ms, slight
overshoot) for things that move, the effects springs (182ms and 269ms, no overshoot) for colour
and opacity, and the `@material/web` press curve for buttons. All are CSS. There is no animation
library.

Objects move. Text never moves on its own.

1. **Press.** Buttons morph from radius 24 to 12 on `:active` and spring back over
   `350ms cubic-bezier(0.42, 1.67, 0.21, 0.9)`.
2. **Hover.** Surfaces, outlined buttons and preview borders step over effects-fast (182ms).
3. **Arrival.** A result card rises 16px and fades in over the spatial spring when it is added.
   The paste box does the same when its disclosure opens. Each happens once.
4. **Removal.** A removed card fades and shrinks to 96% over effects-default (269ms), then
   leaves the layout, and the cards and footer below slide up into the gap (FLIP, 472ms,
   `cubic-bezier(0.2, 0, 0, 1)`) instead of snapping.
5. **State change.** Removing the last card does not animate the card alone: everything under
   the header (hint, cards, footer) sinks 8px and fades out together over effects-default.
   Then the empty state rises in over the spatial spring and the footer fades in at its new
   place after 120ms. The footer re-enters the same way on every state swap. Rule: anything that
   changes position during a swap is invisible while it does. The first version faded the card
   alone and left the footer to jump 600px in one frame, which read as a glitch.
6. **Theme change.** Background, text and border colours ease over effects-default. The toggle
   icon turns in from -90 degrees, only after a click, never on page load.
7. **Viewer.** The preview dialog scales in from 96% over the spatial spring, and its scrim
   fades in. Closing, by the X, Escape or the scrim, plays it in reverse over effects-fast.

Under `prefers-reduced-motion: reduce` every transition and animation is off, buttons do not
morph, and a removed card, the state swap and the viewer close all happen at once. The code
checks the preference before waiting on an `animationend` that would never fire.

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
Don't animate text, and don't add motion that is not listed under Motion.

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
- **The viewer has a scrim.** `rgb(0 0 0 / .5)` behind the dialog is the one translucent
  thing on the page. A modal has to push the page back, and that is what the M3 scrim is for.
- **Warnings are `tertiary`.** M3 has no warning role, and `error` is kept for a conversion that
  failed outright.
