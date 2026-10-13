// Raster -> SVG tracing off the main thread, so big images don't freeze the page.
importScripts('vendor/imagetracer.js');
onmessage = e => postMessage(ImageTracer.imagedataToSVG(e.data.img, e.data.preset));
