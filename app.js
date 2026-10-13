'use strict';
const $ = s => document.querySelector(s);
const MAX_TRACE_PX = 1024; // tracing is O(pixels), so bigger images get downscaled first

let tracer;
async function traceImage(file, preset) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_TRACE_PX / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext('2d');
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  tracer ??= new Worker('trace-worker.js');
  return new Promise((resolve, reject) => {
    tracer.onmessage = e => resolve(e.data);
    tracer.onerror = e => { e.preventDefault(); tracer.terminate(); tracer = null; reject(Error('Tracing failed')); };
    tracer.postMessage({ img, preset }, [img.data.buffer]);
  });
}

const xmlName = name => {
  const base = name.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return (/^[a-z]/.test(base) ? base : 'ic_' + base) + '.xml'; // Android resource names: [a-z][a-z0-9_]*
};

const precision = () => Math.min(6, Math.max(0, Math.round(+$('#precision').value || 0)));

// Every result keeps its input, so changing an option re-renders it in place.
// Runs are queued because the tracer worker answers one image at a time.
let items = [], queue = Promise.resolve();
const enqueue = item => (queue = queue.then(() => render(item)));

function add(name, input) {
  const raster = input instanceof Blob && !/svg/.test(input.type) && !/\.svg$/i.test(name);
  const card = $('#card').content.firstElementChild.cloneNode(true);
  card.querySelector('h3').textContent = xmlName(name);
  $('#results').prepend(card);
  const item = { name, input, raster, card };
  items.push(item);
  card.querySelector('.copy').onclick = e => navigator.clipboard.writeText(item.xml).then(() => flash(e.target, 'Copied'));
  card.querySelector('.save').onclick = () => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([item.xml], { type: 'text/xml' })), download: xmlName(name) });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return enqueue(item);
}

async function source(item) {
  if (!item.raster) return (item.svg ??= typeof item.input === 'string' ? item.input : await item.input.text());
  const preset = $('#preset').value;
  if (item.preset !== preset) { item.svg = await traceImage(item.input, preset); item.preset = preset; }
  return item.svg;
}

async function render(item) {
  const { card } = item;
  if (!card.isConnected) return; // cleared while queued
  const status = card.querySelector('.status');
  status.textContent = 'Converting';
  try {
    const svg = await source(item);
    const orig = card.querySelector('.orig');
    if (!orig.src) orig.src = URL.createObjectURL(item.raster ? item.input : new Blob([svg], { type: 'image/svg+xml' }));
    const { xml, warnings } = svgToVector(svg, { precision: precision() });
    item.xml = xml;
    card.querySelector('.out').src = 'data:image/svg+xml,' + encodeURIComponent(vectorToSvg(xml));
    card.querySelector('textarea').value = xml;
    card.querySelector('.warnings').replaceChildren(...warnings.map(w => Object.assign(document.createElement('li'), { textContent: w })));
    card.classList.remove('failed');
    status.textContent = `${(new Blob([xml]).size / 1024).toFixed(1)} KB`;
  } catch (err) {
    card.classList.add('failed');
    status.textContent = err.message || String(err);
  }
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1200);
}

const addFiles = files => files.forEach(f => add(f.name, f));

$('#file').onchange = e => { addFiles([...e.target.files]); e.target.value = ''; };
$('#paste-go').onclick = () => { const s = $('#paste').value.trim(); if (s) add('pasted.svg', s); };
$('#clear').onclick = () => { items = []; $('#results').replaceChildren(); };
$('#precision').oninput = () => items.forEach(enqueue);
$('#preset').onchange = () => items.filter(i => i.raster).forEach(enqueue);

const drop = $('#drop');
addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
addEventListener('dragleave', e => { if (!e.relatedTarget) drop.classList.remove('over'); });
addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); addFiles([...e.dataTransfer.files]); });
addEventListener('paste', e => {
  if (e.target.closest('textarea, input')) return;
  const files = [...e.clipboardData.files];
  if (files.length) return addFiles(files);
  const s = e.clipboardData.getData('text');
  if (/<svg[\s>]/i.test(s)) add('pasted.svg', s);
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
