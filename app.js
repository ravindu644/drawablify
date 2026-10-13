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
const precision = item => Math.min(6, Math.max(0, Math.round(+item.opts.precision || 0)));

// Every result keeps its input and its own options, so changing one re-renders only that result.
// Runs are queued because the tracer worker answers one image at a time.
let items = [], queue = Promise.resolve();
const enqueue = item => (queue = queue.then(() => render(item)));

function add(name, input) {
  const raster = input instanceof Blob && !/svg/.test(input.type) && !/\.svg$/i.test(name);
  const card = $('#card').content.firstElementChild.cloneNode(true);
  card.querySelector('h3').textContent = xmlName(name);
  $('#results').prepend(card);
  const item = { name, input, raster, card, opts: { ...DEFAULTS } };
  card.querySelector('.previews').after(bindOptions($('#opts').content.firstElementChild.cloneNode(true), () => item));
  syncOptions(item);
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
  const { preset } = item.opts;
  if (item.traced !== preset) { item.svg = await traceImage(item.input, preset); item.traced = preset; }
  return item.svg;
}

async function render(item) {
  const { card } = item;
  if (!card.isConnected) return; // removed while queued
  const status = card.querySelector('.status');
  status.textContent = 'Converting';
  syncCaption(item);
  try {
    const svg = await source(item);
    const orig = card.querySelector('.orig');
    if (!orig.src) orig.src = URL.createObjectURL(item.raster ? item.input : new Blob([svg], { type: 'image/svg+xml' }));
    const { xml, warnings } = svgToVector(svg, { precision: precision(item) });
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
  if (viewer.open && viewing === item) showInViewer(viewingWhich);
  syncCaption(item);
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
  // Reduced motion turns the animations off, and then no animationend would fire.
  if (reduced()) return gone();
  if (!items.length) {
    // The last one: the whole loaded view sinks out together, then the empty state rises in.
    const main = $('main'), footer = $('footer');
    main.classList.add('swapping');
    footer.addEventListener('animationend', function done(e) {
      if (e.animationName !== 'sink') return;
      footer.removeEventListener('animationend', done);
      main.classList.remove('swapping');
      gone();
    });
    return;
  }
  card.classList.add('leaving');
  card.addEventListener('animationend', () => slideIntoGap(gone), { once: true });
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Removing a card shortens the list; slide what was below it up (FLIP) instead of letting it snap.
function slideIntoGap(remove) {
  const els = [...$('#results').children, $('footer')];
  const tops = els.map(el => el.getBoundingClientRect().top);
  remove();
  els.forEach((el, i) => {
    const dy = tops[i] - el.getBoundingClientRect().top;
    if (el.isConnected && dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 472, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
  });
}

// A card's options and the viewer's copy both write to item.opts, then syncOptions puts the values
// back into every control showing that item, so the card behind the viewer never disagrees with it.
function bindOptions(el, current) {
  const set = opts => { const item = current(); item.opts = opts; syncOptions(item); enqueue(item); };
  el.querySelector('.precision').oninput = e => set({ ...current().opts, precision: e.target.value });
  el.querySelector('.preset').onchange = e => set({ ...current().opts, preset: e.target.value });
  el.querySelector('.reset').onclick = () => set({ ...DEFAULTS }); // traces are cached per preset, so this re-traces only if it moved
  return el;
}
function syncOptions(item) {
  const els = [item.card.querySelector('.options')];
  if (viewing === item) els.push($('#viewer-options .options'));
  for (const el of els) {
    // Skip equal values so a field being typed in keeps its caret.
    const precision = el.querySelector('.precision'), preset = el.querySelector('.preset');
    if (precision.value !== item.opts.precision) precision.value = item.opts.precision;
    if (preset.value !== item.opts.preset) preset.value = item.opts.preset;
    // The preset only steers raster tracing; on an SVG it would be a control that does nothing.
    preset.closest('label').hidden = !item.raster;
    el.querySelector('.reset').disabled = item.opts.precision === DEFAULTS.precision && item.opts.preset === DEFAULTS.preset;
  }
}

// Tapping a preview opens it large, with a switch to compare the original and the output.
const viewer = $('#viewer');
$('#viewer-options').append(bindOptions($('#opts').content.firstElementChild.cloneNode(true), () => viewing));
let viewing, viewingWhich;
function showInViewer(which) {
  viewingWhich = which;
  $('#viewer-img').src = viewing.card.querySelector('.' + which).src;
  $('#viewer-img').alt = which === 'orig' ? 'Original' : 'VectorDrawable preview';
  viewer.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-pressed', b.dataset.show === which));
}
function openViewer(item, which) {
  if (!item.card.querySelector('.' + which).src) return; // still converting
  viewing = item;
  showInViewer(which);
  syncOptions(item);
  viewer.showModal();
  syncCaption(item);
}
function syncCaption(item) {
  if (viewing === item) $('#viewer-name').textContent = `${xmlName(item.name)}, ${item.card.querySelector('.status').textContent}`;
}
viewer.querySelectorAll('[data-show]').forEach(b => (b.onclick = () => showInViewer(b.dataset.show)));
// Closing plays the opening in reverse. Escape goes through 'cancel', so it gets the same exit.
function closeViewer() {
  if (reduced()) return viewer.close();
  if (viewer.classList.contains('closing')) return;
  viewer.classList.add('closing');
  viewer.addEventListener('animationend', () => { viewer.classList.remove('closing'); viewer.close(); }, { once: true });
}
viewer.addEventListener('cancel', e => { e.preventDefault(); closeViewer(); });
$('#viewer-close').onclick = closeViewer;
viewer.onclick = e => { if (e.target === viewer) closeViewer(); }; // the dialog box itself is only hit outside .viewer-body
viewer.onkeydown = e => {
  if (e.target.closest('input, select')) return; // arrows belong to the field there
  if (e.key === 'ArrowLeft') showInViewer('orig');
  if (e.key === 'ArrowRight') showInViewer('out');
};

// Empty: show the ways in. Loaded: hide them and show the options and the inputs.
function syncView() {
  const loaded = items.length > 0;
  if (loaded === $('#start').hidden) return;
  $('#start').hidden = loaded;
  $('#work').hidden = !loaded;
  const footer = $('footer');
  footer.classList.remove('arrive');
  void footer.offsetWidth; // restart the animation
  footer.classList.add('arrive');
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

// The class goes on <body> so a drop target shows in both states, not only on the drop zone.
const dragging = on => document.body.classList.toggle('over', on);
// Only files from outside count. Dragged text or a page image would light up the target and drop nothing.
addEventListener('dragover', e => { if (!e.dataTransfer.types.includes('Files')) return; e.preventDefault(); dragging(true); });
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
  // Mobile browsers tint their toolbar with this; follow the page, including a toggled theme.
  $('meta[name=theme-color]').content = getComputedStyle(root).getPropertyValue('--surface').trim();
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
