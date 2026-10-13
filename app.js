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

const DEFAULTS = { precision: '2', preset: 'default' };
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
  syncView();
  const remove = card.querySelector('.remove');
  remove.setAttribute('aria-label', 'Remove ' + xmlName(name));
  remove.title = 'Remove';
  remove.onclick = () => dismiss(item);
  card.querySelectorAll('.zoom').forEach(z => (z.onclick = () => openViewer(item, z.dataset.show)));
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
  if (!card.isConnected) return; // removed while queued
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

function dismiss(item) {
  const i = items.indexOf(item);
  items.splice(i, 1);
  const { card } = item;
  const gone = () => {
    const orig = card.querySelector('.orig').src;
    if (orig) URL.revokeObjectURL(orig);
    card.remove();
    syncView();
    // Keep keyboard focus on the page: the next card's X, or the file picker once nothing is left.
    ($('#results .remove') || $('#file')).focus();
  };
  // Let the card fade out first. Reduced motion turns the animation off, and then no animationend fires.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return gone();
  card.classList.add('leaving');
  card.addEventListener('animationend', gone, { once: true });
}

// Tapping a preview opens it large, with a switch to compare the original and the output.
const viewer = $('#viewer');
let viewing;
function showInViewer(which) {
  $('#viewer-img').src = viewing.card.querySelector('.' + which).src;
  $('#viewer-img').alt = which === 'orig' ? 'Original' : 'VectorDrawable preview';
  viewer.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-pressed', b.dataset.show === which));
}
function openViewer(item, which) {
  if (!item.card.querySelector('.' + which).src) return; // still converting
  viewing = item;
  $('#viewer-name').textContent = xmlName(item.name);
  showInViewer(which);
  viewer.showModal();
}
viewer.querySelectorAll('[data-show]').forEach(b => (b.onclick = () => showInViewer(b.dataset.show)));
$('#viewer-close').onclick = () => viewer.close();
viewer.onclick = e => { if (e.target === viewer) viewer.close(); }; // the dialog box itself is only hit outside .viewer-body
viewer.onkeydown = e => {
  if (e.key === 'ArrowLeft') showInViewer('orig');
  if (e.key === 'ArrowRight') showInViewer('out');
};

// Empty: show the ways in. Loaded: hide them and show the options and the inputs.
function syncView() {
  const loaded = items.length > 0;
  $('#start').hidden = loaded;
  $('#work').hidden = !loaded;
  // The preset only steers raster tracing; next to SVG inputs it would be a control that does nothing.
  $('#preset').closest('label').hidden = !items.some(i => i.raster);
}

function syncReset() {
  $('#reset').disabled = $('#precision').value === DEFAULTS.precision && $('#preset').value === DEFAULTS.preset;
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1200);
}

const addFiles = files => files.forEach(f => add(f.name, f));

$('#file').onchange = e => { addFiles([...e.target.files]); e.target.value = ''; };
$('#paste-go').onclick = () => {
  const s = $('#paste').value.trim();
  if (!s) return $('#paste').focus();
  $('#paste').value = '';
  $('details').open = false;
  add('pasted.svg', s);
};
$('#precision').oninput = () => { syncReset(); items.forEach(enqueue); };
$('#preset').onchange = () => { syncReset(); items.filter(i => i.raster).forEach(enqueue); };
$('#reset').onclick = () => {
  $('#precision').value = DEFAULTS.precision;
  $('#preset').value = DEFAULTS.preset;
  syncReset();
  items.forEach(enqueue); // traced SVGs are cached per preset, so this re-traces only if the preset moved
};

// The class goes on <body> so a drop target shows in both states, not only on the drop zone.
const dragging = on => document.body.classList.toggle('over', on);
addEventListener('dragover', e => { e.preventDefault(); dragging(true); });
addEventListener('dragleave', e => { if (!e.relatedTarget) dragging(false); });
addEventListener('drop', e => { e.preventDefault(); dragging(false); addFiles([...e.dataTransfer.files]); });
addEventListener('paste', e => {
  if (e.target.closest('textarea, input')) return;
  const files = [...e.clipboardData.files];
  if (files.length) return addFiles(files);
  const s = e.clipboardData.getData('text');
  if (/<svg[\s>]/i.test(s)) add('pasted.svg', s);
});

// The theme follows the system until the toggle is used, then the choice is remembered.
const root = document.documentElement;
const light = () => (root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'light';
function syncTheme() {
  const label = light() ? 'Switch to dark theme' : 'Switch to light theme';
  $('#theme').setAttribute('aria-label', label);
  $('#theme').title = label;
  $('#theme .sun').style.display = light() ? 'none' : '';
  $('#theme .moon').style.display = light() ? '' : 'none';
}
$('#theme').onclick = () => {
  root.dataset.theme = light() ? 'dark' : 'light';
  $('#theme').classList.add('turned'); // only animate the icon swap after a click, not on page load
  try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  syncTheme();
};
matchMedia('(prefers-color-scheme: light)').addEventListener('change', syncTheme);
syncTheme();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
