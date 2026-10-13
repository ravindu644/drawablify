// SVG -> Android VectorDrawable.
// The SVG is rendered inside a sandboxed iframe so the browser itself resolves CSS, units and
// transforms; we only bake the geometry into viewport space and serialize it.
'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ANDROID_NS = 'http://schemas.android.com/apk/res/android';
const SKIP = new Set(['defs', 'clipPath', 'mask', 'symbol', 'pattern', 'marker', 'linearGradient',
  'radialGradient', 'filter', 'metadata', 'title', 'desc', 'style', 'script']);
const CONTAINERS = new Set(['g', 'svg', 'a', 'switch']);
const PCT = 2; // SVGLength.SVG_LENGTHTYPE_PERCENTAGE / SVG_UNIT_TYPE_OBJECTBOUNDINGBOX

const len = a => a.baseVal.value;
const SHAPES = {
  path: e => e.getAttribute('d') || '',
  line: e => `M${len(e.x1)} ${len(e.y1)}L${len(e.x2)} ${len(e.y2)}`,
  polyline: e => { const p = (e.getAttribute('points') || '').trim(); return p && 'M' + p; },
  polygon: e => { const p = (e.getAttribute('points') || '').trim(); return p && 'M' + p + 'Z'; },
  circle: e => {
    const cx = len(e.cx), cy = len(e.cy), r = len(e.r);
    return r > 0 ? `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z` : '';
  },
  ellipse: e => {
    let rx = e.hasAttribute('rx') ? len(e.rx) : null, ry = e.hasAttribute('ry') ? len(e.ry) : null;
    rx ??= ry; ry ??= rx;
    const cx = len(e.cx), cy = len(e.cy);
    return rx > 0 && ry > 0 ? `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z` : '';
  },
  rect: e => {
    const x = len(e.x), y = len(e.y), w = len(e.width), h = len(e.height);
    if (!(w > 0 && h > 0)) return '';
    let rx = e.hasAttribute('rx') ? len(e.rx) : null, ry = e.hasAttribute('ry') ? len(e.ry) : null;
    rx ??= ry ?? 0; ry ??= rx;
    rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
    if (!(rx > 0 && ry > 0)) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    const a = `A${rx} ${ry} 0 0 1`;
    return `M${x + rx} ${y}H${x + w - rx}${a} ${x + w} ${y + ry}V${y + h - ry}${a} ${x + w - rx} ${y + h}` +
      `H${x + rx}${a} ${x} ${y + h - ry}V${y + ry}${a} ${x + rx} ${y}Z`;
  },
};

// Parse SVG path data into absolute segments: M L C Q A Z (H/V -> L, S -> C, T -> Q).
function parsePath(d) {
  const tk = [...d.matchAll(/[MmZzLlHhVvCcSsQqTtAa]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)].map(m => m[0]);
  const out = [];
  let i = 0, cmd = '', prev = '', x = 0, y = 0, sx = 0, sy = 0, px = 0, py = 0;
  const num = () => +tk[i++];
  // Arc flags may be packed without separators ("a1 1 0 0110 10"), so a flag eats a single char.
  const flag = () => {
    const t = tk[i] ?? '';
    if (t.length > 1) { tk[i] = t.slice(1); return +t[0]; }
    i++; return +t;
  };
  while (i < tk.length) {
    if (/^[a-z]$/i.test(tk[i])) cmd = tk[i++];
    else if (!cmd) break;
    const C = cmd.toUpperCase(), rel = cmd !== C, ox = rel ? x : 0, oy = rel ? y : 0;
    if (!out.length && C !== 'M') break;
    let seg;
    switch (C) {
      case 'Z': seg = ['Z']; x = sx; y = sy; cmd = ''; break; // numbers after Z are an error
      case 'M': seg = ['M', ox + num(), oy + num()]; cmd = rel ? 'l' : 'L'; break;
      case 'L': seg = ['L', ox + num(), oy + num()]; break;
      case 'H': seg = ['L', ox + num(), y]; break;
      case 'V': seg = ['L', x, oy + num()]; break;
      case 'C': seg = ['C', ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()]; break;
      case 'S': {
        const r = 'CS'.includes(prev) && prev ? [2 * x - px, 2 * y - py] : [x, y];
        seg = ['C', ...r, ox + num(), oy + num(), ox + num(), oy + num()]; break;
      }
      case 'Q': seg = ['Q', ox + num(), oy + num(), ox + num(), oy + num()]; break;
      case 'T': {
        const r = 'QT'.includes(prev) && prev ? [2 * x - px, 2 * y - py] : [x, y];
        seg = ['Q', ...r, ox + num(), oy + num()]; break;
      }
      case 'A': seg = ['A', num(), num(), num(), flag(), flag(), ox + num(), oy + num()]; break;
    }
    if (!seg.slice(1).every(Number.isFinite)) break; // render up to the first error, like browsers
    out.push(seg);
    if (C === 'M') { sx = seg[1]; sy = seg[2]; }
    if (C !== 'Z') {
      [x, y] = seg.slice(-2);
      if (seg[0] === 'C' || seg[0] === 'Q') [px, py] = seg.slice(-4, -2);
    }
    prev = C;
  }
  return out;
}

// Endpoint-parameterized SVG arc -> list of cubic beziers [x1,y1,x2,y2,x,y].
function arcToCubics(x1, y1, rx, ry, rot, fa, fs, x2, y2) {
  if (x1 === x2 && y1 === y2) return [];
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (!rx || !ry) return [[x1, y1, x2, y2, x2, y2]];
  const phi = rot * Math.PI / 180, s = Math.sin(phi), c = Math.cos(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = c * dx + s * dy, y1p = -s * dx + c * dy;
  const lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const k = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = k * rx * y1p / ry, cyp = -k * ry * x1p / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9), step = dt / n, h = 4 / 3 * Math.tan(step / 4);
  const P = (ux, uy) => [cx + c * rx * ux - s * ry * uy, cy + s * rx * ux + c * ry * uy];
  const out = [];
  for (let j = 0, t = t1; j < n; j++, t += step) {
    const c1 = Math.cos(t), s1 = Math.sin(t), c2 = Math.cos(t + step), s2 = Math.sin(t + step);
    out.push([...P(c1 - h * s1, s1 + h * c1), ...P(c2 + h * s2, s2 - h * c2), ...P(c2, s2)]);
  }
  out[out.length - 1].splice(4, 2, x2, y2); // land exactly on the endpoint
  return out;
}

let frame;
function sandboxDoc() {
  if (!frame) {
    frame = document.createElement('iframe');
    // No allow-scripts: nothing inside the user's SVG can run, but we can still read its DOM.
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;height:1000px;border:0';
    document.body.append(frame);
  }
  return frame.contentDocument;
}

function svgToVector(src, { precision = 2 } = {}) {
  const parsed = new DOMParser().parseFromString(src, 'image/svg+xml');
  const err = parsed.querySelector('parsererror');
  if (err) throw Error('Not valid SVG: ' + err.textContent.trim().split('\n')[0]);
  if (parsed.documentElement.localName !== 'svg') throw Error('Root element is not <svg>');
  const doc = sandboxDoc();
  const svg = doc.importNode(parsed.documentElement, true);
  doc.body.replaceChildren(svg);
  try { return convert(svg, doc, precision); } finally { svg.remove(); }
}

function convert(svg, doc, precision) {
  const win = doc.defaultView;
  const warn = new Set();
  const fmt = n => { const s = String(+n.toFixed(precision)); return s === '-0' ? '0' : s; };
  const toM = m => new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]);
  const idOf = v => /url\(\s*["']?#([^"')]+)/.exec(v)?.[1];
  const obbMatrix = el => { const b = el.getBBox(); return new DOMMatrix([b.width, 0, 0, b.height, b.x, b.y]); };
  const listM = l => { const t = l?.baseVal.consolidate(); return t ? toM(t.matrix) : new DOMMatrix(); }; // SVGAnimatedTransformList -> DOMMatrix

  expandUse(svg, doc, warn);

  // Size: absolute width/height win; viewBox defines the viewport; fall back to the content bbox.
  const abs = k => svg.hasAttribute(k) && svg[k].baseVal.unitType !== PCT ? svg[k].baseVal.value : null;
  let W = abs('width'), H = abs('height');
  const v = svg.viewBox.baseVal;
  let vb = v && v.width > 0 && v.height > 0 ? { x: v.x, y: v.y, w: v.width, h: v.height } : null;
  if (!vb && W && H) vb = { x: 0, y: 0, w: W, h: H };
  if (!vb) { const b = svg.getBBox(); vb = { x: b.x, y: b.y, w: b.width || 1, h: b.height || 1 }; }
  W ??= H ? H * vb.w / vb.h : vb.w;
  H ??= W * vb.h / vb.w;
  svg.setAttribute('width', vb.w);
  svg.setAttribute('height', vb.h);

  const base = new DOMMatrix().translate(-vb.x, -vb.y).multiply(toM(svg.getScreenCTM()).inverse());
  const ctm = el => base.multiply(toM(el.getScreenCTM()));

  function pathData(d, m) {
    const id = Math.abs(m.a - 1) + Math.abs(m.b) + Math.abs(m.c) + Math.abs(m.d - 1) + Math.abs(m.e) + Math.abs(m.f) < 1e-9;
    const P = (x, y) => fmt(m.a * x + m.c * y + m.e) + ' ' + fmt(m.b * x + m.d * y + m.f);
    let s = '', cx = 0, cy = 0, sx = 0, sy = 0;
    for (const [c, ...a] of parsePath(d)) {
      if (c === 'Z') { s += 'Z'; cx = sx; cy = sy; continue; }
      if (c === 'A' && id) s += 'A' + a.slice(0, 5).map(fmt).join(' ') + ' ' + P(a[5], a[6]);
      else if (c === 'A') for (const b of arcToCubics(cx, cy, ...a)) s += 'C' + P(b[0], b[1]) + ' ' + P(b[2], b[3]) + ' ' + P(b[4], b[5]);
      else { s += c; for (let k = 0; k < a.length; k += 2) s += (k ? ' ' : '') + P(a[k], a[k + 1]); }
      if (c === 'M') { sx = a[0]; sy = a[1]; }
      [cx, cy] = a.slice(-2);
    }
    return s;
  }

  function color(v, alpha) {
    let n = (v.match(/-?[\d.]+(?:e-?\d+)?/g) || []).map(Number);
    if (v.startsWith('color(srgb ')) n = [n[0] * 255, n[1] * 255, n[2] * 255, n[3] ?? 1];
    else if (!v.startsWith('rgb')) { warn.add(`Color "${v}" is not supported; used black.`); n = [0, 0, 0]; }
    const [r, g, b, a = 1] = n, A = Math.min(1, Math.max(0, a * alpha));
    const h = x => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0');
    return ('#' + (A < 1 ? h(A * 255) : '') + h(r) + h(g) + h(b)).toUpperCase();
  }

  function stopsOf(g) {
    for (let i = 0; g && i < 10; i++) {
      const s = [...g.children].filter(c => c.localName === 'stop');
      if (s.length) return s;
      const ref = g.getAttribute('href') || g.getAttribute('xlink:href') || '';
      g = ref.startsWith('#') && doc.getElementById(ref.slice(1));
    }
    return [];
  }

  function gradient(g, el, m, alpha) {
    const stops = stopsOf(g);
    if (!stops.length) return null;
    let last = 0;
    const items = stops.map(s => {
      const cs = win.getComputedStyle(s);
      last = Math.max(last, Math.min(1, Math.max(0, s.offset.baseVal)));
      return { offset: last, color: color(cs.getPropertyValue('stop-color'), +cs.getPropertyValue('stop-opacity') * alpha) };
    });
    if (items.length === 1) return { color: items[0].color };
    const obb = g.gradientUnits.baseVal === PCT;
    const L = k => { const l = g[k].baseVal; return obb && l.unitType === PCT ? l.valueInSpecifiedUnits / 100 : l.value; };
    let G = m;
    if (obb) G = G.multiply(obbMatrix(el));
    G = G.multiply(listM(g.gradientTransform));
    const pt = (x, y) => [fmt(G.a * x + G.c * y + G.e), fmt(G.b * x + G.d * y + G.f)];
    const tile = ['clamp', 'clamp', 'mirror', 'repeat'][g.spreadMethod.baseVal] || 'clamp';
    if (g.localName === 'linearGradient') {
      const [startX, startY] = pt(L('x1'), L('y1')), [endX, endY] = pt(L('x2'), L('y2'));
      return { gradient: { type: 'linear', startX, startY, endX, endY, tileMode: tile, items } };
    }
    if (g.hasAttribute('fx') || g.hasAttribute('fy')) warn.add('Radial gradient focal point (fx/fy) is not supported on Android; ignored.');
    if (Math.abs(Math.hypot(G.a, G.b) - Math.hypot(G.c, G.d)) > 1e-6) warn.add('Elliptical radial gradients are approximated as circles.');
    const [centerX, centerY] = pt(L('cx'), L('cy'));
    const gradientRadius = fmt(L('r') * Math.sqrt(Math.abs(G.a * G.d - G.b * G.c)));
    return { gradient: { type: 'radial', centerX, centerY, gradientRadius, tileMode: tile, items } };
  }

  function paint(v, alpha, el, m) {
    if (!v || v === 'none' || alpha <= 0) return null;
    if (v.startsWith('url(')) {
      const ref = doc.getElementById(idOf(v) || '');
      if (ref && /Gradient$/.test(ref.localName)) return gradient(ref, el, m, alpha);
      const fallback = v.match(/(?:rgba?|color)\([^)]*\)/)?.[0];
      warn.add(ref ? `<${ref.localName}> paint is not supported; ` + (fallback ? 'used its fallback color.' : 'skipped.')
        : `Paint ${v} references a missing element.`);
      return fallback ? { color: color(fallback, alpha) } : null;
    }
    return { color: color(v, alpha) };
  }

  function clipFor(el, cs) {
    const v = cs.clipPath;
    if (!v || v === 'none') return null;
    const c = doc.getElementById(idOf(v) || '');
    if (!c || c.localName !== 'clipPath') { warn.add(`clip-path "${v}" is not supported; ignored.`); return null; }
    let G = ctm(el);
    if (c.clipPathUnits.baseVal === PCT) G = G.multiply(obbMatrix(el));
    G = G.multiply(listM(c.transform));
    let d = '';
    for (const s of c.children) if (SHAPES[s.localName]) d += pathData(SHAPES[s.localName](s), G.multiply(listM(s.transform)));
    return d || 'M0 0'; // an empty clip path hides everything
  }

  function shape(el, cs, opacity, list) {
    const d = SHAPES[el.localName](el);
    if (!d || cs.visibility !== 'visible') return;
    const m = ctm(el);
    const fill = paint(cs.fill, +cs.fillOpacity * opacity, el, m);
    const stroke = paint(cs.stroke, +cs.strokeOpacity * opacity, el, m);
    if (!fill && !stroke) return;
    const n = { d: pathData(d, m), fill, stroke };
    if (!n.d) return;
    if (fill && cs.fillRule === 'evenodd') n.evenOdd = true;
    if (stroke) {
      n.width = parseFloat(cs.strokeWidth) * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
      n.cap = cs.strokeLinecap;
      n.join = cs.strokeLinejoin;
      n.miter = +cs.strokeMiterlimit;
      if (cs.strokeDasharray !== 'none') warn.add('Dashed strokes (stroke-dasharray) are not supported; drawn solid.');
    }
    if ([cs.markerStart, cs.markerMid, cs.markerEnd].some(x => x && x !== 'none')) warn.add('Markers are not supported; ignored.');
    list.push(n);
  }

  function walk(parent, list, opacity) {
    for (const el of parent.children) {
      const tag = el.localName;
      if (el.namespaceURI !== SVG_NS || SKIP.has(tag)) continue;
      const cs = win.getComputedStyle(el);
      if (cs.display === 'none') continue;
      const o = opacity * +cs.opacity;
      if (cs.mask && cs.mask !== 'none') warn.add('Masks are not supported; ignored.');
      if (cs.filter && cs.filter !== 'none') warn.add('Filters are not supported; ignored.');
      let target = list;
      const clip = clipFor(el, cs);
      if (clip) { const g = { clip, children: [] }; list.push(g); target = g.children; }
      if (SHAPES[tag]) shape(el, cs, o, target);
      else if (CONTAINERS.has(tag)) walk(el, target, o);
      else warn.add(`<${tag}> is not supported` + (tag === 'text' ? ' (convert text to outlines first)' : '') + '; skipped.');
    }
  }

  const nodes = [];
  walk(svg, nodes, 1);
  if (!nodes.length) warn.add('No visible shapes found.');
  return { xml: serialize(nodes, W, H, vb, fmt), warnings: [...warn] };
}

function expandUse(svg, doc, warn) {
  // Inline every <use> as a <g>; capped so self-referencing or exponential <use> bombs can't hang us.
  for (let n = 0, u; (u = svg.querySelector('use')); n++) {
    if (n > 2000) { warn.add('Too many <use> expansions; rest skipped.'); svg.querySelectorAll('use').forEach(e => e.remove()); break; }
    const ref = (u.getAttribute('href') || u.getAttribute('xlink:href') || '');
    const target = ref.startsWith('#') && doc.getElementById(ref.slice(1));
    const g = doc.createElementNS(SVG_NS, 'g');
    for (const a of u.attributes) if (!/^(x|y|width|height|href|xlink:href|id)$/.test(a.name)) g.setAttribute(a.name, a.value);
    const x = len(u.x), y = len(u.y);
    if (x || y) g.setAttribute('transform', (u.getAttribute('transform') || '') + ` translate(${x} ${y})`);
    if (target && !target.contains(u)) {
      if (target.localName === 'symbol') {
        const s = doc.createElementNS(SVG_NS, 'svg');
        for (const k of ['viewBox', 'preserveAspectRatio']) if (target.hasAttribute(k)) s.setAttribute(k, target.getAttribute(k));
        s.setAttribute('width', u.getAttribute('width') || '100%');
        s.setAttribute('height', u.getAttribute('height') || '100%');
        for (const c of target.children) s.append(c.cloneNode(true));
        g.append(s);
      } else {
        const c = target.cloneNode(true);
        c.removeAttribute('id');
        g.append(c);
      }
    }
    u.replaceWith(g);
  }
}

function serialize(nodes, W, H, vb, fmt) {
  let aapt = false;
  const attrs = (ind, list) => list.filter(([, v]) => v != null).map(([k, v]) => `\n${ind}    ${k}="${v}"`).join('');
  const gradientXml = (name, g, ind) => {
    aapt = true;
    const { type, items, ...geo } = g;
    return `${ind}<aapt:attr name="${name}">\n${ind}  <gradient${attrs(ind + '  ', [['android:type', type], ...Object.entries(geo).map(([k, v]) => ['android:' + k, v])])}>\n` +
      items.map(i => `${ind}    <item android:offset="${fmt(i.offset)}" android:color="${i.color}"/>\n`).join('') +
      `${ind}  </gradient>\n${ind}</aapt:attr>\n`;
  };
  const node = (n, ind) => {
    if (n.children) {
      return `${ind}<group>\n${ind}  <clip-path${attrs(ind + '  ', [['android:pathData', n.clip]])}/>\n` +
        n.children.map(c => node(c, ind + '  ')).join('') + `${ind}</group>\n`;
    }
    let inner = '';
    const color = (name, p) => {
      if (!p) return null;
      if (p.color) return p.color;
      inner += gradientXml('android:' + name, p.gradient, ind + '  ');
      return null;
    };
    const s = n.stroke;
    const a = attrs(ind, [
      ['android:pathData', n.d],
      ['android:fillColor', color('fillColor', n.fill)],
      ['android:fillType', n.evenOdd ? 'evenOdd' : null],
      ['android:strokeColor', color('strokeColor', s)],
      ['android:strokeWidth', s ? fmt(n.width) : null],
      ['android:strokeLineCap', s && n.cap !== 'butt' ? n.cap : null],
      ['android:strokeLineJoin', s && (n.join === 'round' || n.join === 'bevel') ? n.join : null],
      ['android:strokeMiterLimit', s && n.miter !== 4 ? fmt(n.miter) : null],
    ]);
    return inner ? `${ind}<path${a}>\n${inner}${ind}</path>\n` : `${ind}<path${a}/>\n`;
  };
  const body = nodes.map(n => node(n, '  ')).join('');
  return `<vector xmlns:android="${ANDROID_NS}"` + (aapt ? '\n    xmlns:aapt="http://schemas.android.com/aapt"' : '') +
    `\n    android:width="${fmt(W)}dp"\n    android:height="${fmt(H)}dp"` +
    `\n    android:viewportWidth="${fmt(vb.w)}"\n    android:viewportHeight="${fmt(vb.h)}">\n${body}</vector>\n`;
}

// VectorDrawable XML (our output subset) -> SVG string, so the preview shows what Android will draw.
function vectorToSvg(xml) {
  const v = new DOMParser().parseFromString(xml, 'application/xml').documentElement;
  const A = (e, k) => e.getAttributeNS(ANDROID_NS, k);
  const css = c => c && (c.length === 9 ? '#' + c.slice(3) + c.slice(1, 3) : c); // #AARRGGBB -> #RRGGBBAA
  let defs = '', n = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  const paint = (p, k) => {
    const g = [...p.children].find(c => c.getAttribute('name') === 'android:' + k)?.firstElementChild;
    if (!g) return css(A(p, k)) || 'none';
    const id = 'g' + n++, spread = { mirror: 'reflect', repeat: 'repeat' }[A(g, 'tileMode')] || 'pad';
    const stops = [...g.children].map(i => `<stop offset="${esc(A(i, 'offset'))}" stop-color="${esc(css(A(i, 'color')))}"/>`).join('');
    defs += A(g, 'type') === 'radial'
      ? `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" spreadMethod="${spread}" cx="${esc(A(g, 'centerX'))}" cy="${esc(A(g, 'centerY'))}" r="${esc(A(g, 'gradientRadius'))}">${stops}</radialGradient>`
      : `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" spreadMethod="${spread}" x1="${esc(A(g, 'startX'))}" y1="${esc(A(g, 'startY'))}" x2="${esc(A(g, 'endX'))}" y2="${esc(A(g, 'endY'))}">${stops}</linearGradient>`;
    return `url(#${id})`;
  };
  const conv = el => [...el.children].map(c => {
    if (c.localName === 'group') {
      const cp = [...c.children].find(x => x.localName === 'clip-path');
      if (!cp) return `<g>${conv(c)}</g>`;
      const id = 'c' + n++;
      defs += `<clipPath id="${id}"><path d="${esc(A(cp, 'pathData'))}"/></clipPath>`;
      return `<g clip-path="url(#${id})">${conv(c)}</g>`;
    }
    if (c.localName !== 'path') return '';
    const a = {
      d: A(c, 'pathData'), fill: paint(c, 'fillColor'), 'fill-rule': A(c, 'fillType') === 'evenOdd' ? 'evenodd' : null,
      stroke: paint(c, 'strokeColor'), 'stroke-width': A(c, 'strokeWidth'), 'stroke-linecap': A(c, 'strokeLineCap'),
      'stroke-linejoin': A(c, 'strokeLineJoin'), 'stroke-miterlimit': A(c, 'strokeMiterLimit'),
    };
    return '<path' + Object.entries(a).filter(([, x]) => x).map(([k, x]) => ` ${k}="${esc(x)}"`).join('') + '/>';
  }).join('');
  const body = conv(v);
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${esc(A(v, 'viewportWidth'))} ${esc(A(v, 'viewportHeight'))}"` +
    ` width="${esc(parseFloat(A(v, 'width')))}" height="${esc(parseFloat(A(v, 'height')))}"><defs>${defs}</defs>${body}</svg>`;
}
