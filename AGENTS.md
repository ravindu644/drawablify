# AGENTS.md

Instructions for AI coding agents working in this repository.

## What this is

A static web page that converts SVG, PNG, JPEG and GIF files to Android VectorDrawable XML,
entirely in the browser. No build step, no framework, no package manager.

- `index.html` is the page, with all CSS inline.
- `convert.js` is the converter. It renders the SVG in a sandboxed iframe so the browser resolves
  CSS, units, `<use>` and transforms, then bakes the geometry and writes the XML.
  `vectorToSvg()` turns that XML back into SVG for the preview.
- `app.js` is the UI: file input, drop, paste, options, result cards.
- `trace-worker.js` runs `vendor/imagetracer.js` (imagetracerjs 1.2.6, public domain) to turn
  raster images into SVG before conversion.
- `sw.js` caches the page for offline use.
- `test.html` is the self-check.

## Run and test

```
python3 -m http.server 8000
```

Open http://localhost:8000 for the page and http://localhost:8000/test.html for the check. The
check converts sample SVGs, renders each output back through `vectorToSvg()`, pixel-diffs it
against the original, and confirms that scripts inside an SVG do not run. It must print
`ALL PASS`. Headless:

```
chromium-browser --headless=new --virtual-time-budget=5000 --dump-dom http://localhost:8000/test.html
```

Raster tracing needs a Web Worker, which `--virtual-time-budget` does not advance. Test it in a
real browser or a real-time headless session.

Add a case to `CASES` in `test.html` when you fix a conversion bug.

After changing any cached file, bump `CACHE` in `sw.js`, or returning visitors keep the old copy.

## Commits

- Sign off every commit: `git commit -s`.
- Never add a `Co-Authored-By:` trailer for an AI agent. Human co-authors are fine.
- Prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `style:` for visual changes,
  `fix(security):` for anything touching the sandbox or the CSP.

## Style

Four rules. They apply to code, comments, commit messages, documentation and the page's copy.

**No em-dashes.** Use a comma, a full stop, or rewrite the sentence.

**No ASCII banner comments.** No rows of `-----`, no `=====`, no boxed section headers.

**Comments sound like a person.** Say why the code does something, or what breaks if it does
not. Skip comments that restate the line below them.

```js
// Bad: loop over the children
for (const el of parent.children) {

// Good: arc flags may be packed without separators ("a1 1 0 0110 10"), so a flag eats one char
```

**Ten lines that work beat a hundred that do the same thing.** Delete before you add. A smaller
diff in the right place is the goal, not a smaller diff anywhere.

The page copy states what the tool does and what it cannot do. No marketing words, no claims
that are not true of the code.

## UI changes

Anything visual follows [DESIGN.md](./DESIGN.md). Colours, type, spacing, radii and the button
rules are specified there.

If a rule genuinely does not fit your case, deviate, but leave a comment at the site saying what
the deviation buys. An undocumented deviation is drift and the next contributor will "fix" it.
DESIGN.md's "Decided exceptions" section lists the deviations that are decisions, do not "fix"
those.

## Before you write it at all

Work down this list and stop at the first answer that holds.

1. Does this need to exist? An option nobody asked for, a knob for a value that never changes:
   skip it and say so in one line.
2. Does it already exist here? Grep `convert.js` and `app.js` first.
3. Does the browser already do it? The converter leans on the browser on purpose:
   `getComputedStyle` for the CSS cascade, `getScreenCTM` for transforms, `getBBox` for
   bounding boxes, `DOMParser` for XML. Use those before writing a parser.
4. Can it be one line? Then it is one line.
5. Only then write the smallest thing that works.

The list shortens the solution, never the reading. Trace the flow the change touches before you
pick a rung. A bug report names a symptom, so grep every caller before you edit.

Never simplify away input validation at a trust boundary, a fail-closed check, or anything the
requester asked for by name.

## Choke points

Bypassing one of these is a bug, not a shortcut.

- `sandboxDoc()` in `convert.js` is the only place an untrusted SVG enters a live document. The
  iframe has `sandbox="allow-same-origin"` and must never get `allow-scripts`: the two together
  let the SVG reach this page.
- The Content-Security-Policy `<meta>` in `index.html` keeps every request on this origin, and
  the sandbox iframe inherits it. Do not loosen it to load anything external.
- `expandUse()` caps `<use>` expansion. Self-referencing and exponential `<use>` chains are real
  inputs, the cap is what stops them hanging the tab.
- `parsePath()` is the only path parser. `pathData()` is the only place geometry is transformed
  and formatted. Shapes become path data through `SHAPES` and go through both.
- `serialize()` is the only place XML is written. `vectorToSvg()` reads exactly that subset back,
  so a new output attribute needs a matching line there or the preview lies.

## Hard constraints

- No build step and no dependency manager. The page must work when its files are copied to any
  static host.
- No request to another origin, at load or at runtime. Fonts, icons and scripts are local or
  absent.
- First load stays small. The tracer loads only when a raster file is converted. Measure with
  `cat index.html convert.js app.js icon.svg | gzip -9 | wc -c` before and after a change.
- `vendor/imagetracer.js` is upstream code. Do not edit it; replace the whole file to upgrade.
