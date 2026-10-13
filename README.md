# SVG to Android VectorDrawable

Converts SVG, PNG, JPEG, GIF, WebP and BMP files to Android VectorDrawable XML in the browser.
Files are never uploaded. No build step and no requests to other sites. After the first visit
the page also works offline.

## Run

Serve the folder with any static file server:

    python3 -m http.server 8000

Then open http://localhost:8000. Opening `index.html` from disk converts SVGs, but raster
tracing and the offline cache need http.

## How it works

- `convert.js` renders the SVG in a sandboxed iframe where scripts cannot run, lets the browser
  resolve CSS, units, `<use>` and transforms, then writes the geometry out as VectorDrawable.
  Gradients are written with `aapt:attr` and need API 24 or newer.
- `trace-worker.js` runs [imagetracerjs](https://github.com/jankovicsandras/imagetracerjs) 1.2.6
  (public domain, in `vendor/`) to trace raster images into SVG first.
- `sw.js` caches the page for offline use.
- A Content-Security-Policy blocks requests to other origins, including remote images or fonts
  referenced inside an SVG you convert.

VectorDrawable has no text, masks, filters, patterns, markers or dashed strokes. When an SVG uses
them, the result lists a warning.

## Test

Serve the folder and open `test.html`. It converts sample SVGs, renders the output back,
pixel-diffs it against the original, and must print `ALL PASS`.

## License

MIT. `vendor/imagetracer.js` is public domain (The Unlicense).
