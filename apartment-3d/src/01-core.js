import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ---------- utilities ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = p => p + Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cm = v => Math.round(v * 100);
const fmtM = v => v.toFixed(2) + ' m';
const fmtA = v => v.toFixed(1) + ' m²';
function rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// 2D vector helpers (plan coordinates [x, z])
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const norm = a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function projT(p, a, b) { const ab = sub(b, a); const l2 = dot(ab, ab) || 1e-9; return dot(sub(p, a), ab) / l2; }
function distSeg(p, a, b) { return dist(p, lerp2(a, b, clamp(projT(p, a, b), 0, 1))); }
function pip(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function areaSigned(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
function segInter(a, b, c, d) {
  const r = sub(b, a), s = sub(d, c), den = cross(r, s);
  if (Math.abs(den) < 1e-9) return null;
  const ca = sub(c, a);
  return [cross(ca, s) / den, cross(ca, r) / den];
}
function wallFrame(w) {
  const L = dist(w.a, w.b) || 1e-6;
  const d = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
  return { L, d, n: [-d[1], d[0]] };
}

// ---------- colour helpers (sRGB hex) ----------
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbHex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
function tone(hex, f) { const [r, g, b] = hexRgb(hex); return f >= 0 ? rgbHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) : rgbHex(r * (1 + f), g * (1 + f), b * (1 + f)); }
function rgba(hex, a) { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; }

// ---------- procedural textures ----------
const TS = 1024; // texture canvas size
const PERF = [["moduleStart", Math.round(performance.now())]]; window.__perf = PERF;
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function wrapDraw(S, x, y, w, h, fn) { // draw a shape and its wrapped copies so textures tile seamlessly
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
    if (x + ox > S || x + w + ox < 0 || y + oy > S || y + h + oy < 0) continue;
    fn(x + ox, y + oy);
  }
}
function plankFill(g, x, y, L, h, col, R, horiz, edge = 0.45, knots = true) {
  g.save(); g.beginPath(); g.rect(x, y, L, h); g.clip();
  g.fillStyle = col; g.fillRect(x, y, L, h);
  const lines = 7 + Math.floor(R() * 6);
  for (let i = 0; i < lines; i++) {
    const off = R(), amp = 1 + R() * 3, freq = 0.004 + R() * 0.01, ph = R() * 6, a = 0.05 + R() * 0.12;
    g.strokeStyle = `rgba(60,35,15,${a})`; g.lineWidth = 0.6 + R() * 1.4; g.beginPath();
    for (let s = 0; s <= 40; s++) {
      const t = s / 40;
      if (horiz) { const px = x + t * L, py = y + off * h + Math.sin(px * freq + ph) * amp; s ? g.lineTo(px, py) : g.moveTo(px, py); }
      else { const py = y + t * h, px = x + off * L + Math.sin(py * freq + ph) * amp; s ? g.lineTo(px, py) : g.moveTo(px, py); }
    }
    g.stroke();
  }
  if (knots && R() < 0.18) { g.fillStyle = 'rgba(70,40,20,.28)'; g.beginPath(); g.ellipse(x + R() * L, y + R() * h, 3 + R() * 5, 2 + R() * 3, 0, 0, 7); g.fill(); }
  if (edge > 0) { g.strokeStyle = `rgba(40,25,10,${edge})`; g.lineWidth = 1.5; g.strokeRect(x + .5, y + .5, L - 1, h - 1); }
  g.restore();
}
const GEN = {
  planks(o) { // rows of planks along x; o.vertical rotates them; o.board groups rows into boards (3-strip laminate)
    const size = o.pw * o.rows, ppm = TS / size, c = mkCanvas(TS, TS), g = c.getContext('2d'), R = rng(o.seed || 7);
    const b = mkCanvas(TS, TS), gb = b.getContext('2d');
    for (const ctx of [g, gb]) if (o.vertical) { ctx.translate(TS, 0); ctx.rotate(Math.PI / 2); }
    g.fillStyle = o.base; g.fillRect(0, 0, TS, TS); gb.fillStyle = '#fff'; gb.fillRect(0, 0, TS, TS);
    const edge = o.edge ?? 0.45;
    for (let r = 0; r < o.rows; r++) {
      const y = r * o.pw * ppm, h = o.pw * ppm; let x = -R() * o.pl * ppm;
      while (x < TS) {
        const L = o.pl * ppm * (o.fixed ? 1 : 0.55 + R() * 0.9), col = tone(o.base, (R() - 0.5) * o.vary), seed = R() * 1e9;
        for (const ox of [0, TS, -TS]) if (x + ox < TS && x + L + ox > 0) {
          plankFill(g, x + ox, y, L, h, col, rng(seed), true, edge, o.knots !== false);
          if (edge > 0) { gb.fillStyle = '#000'; gb.fillRect(x + ox + L - 1, y, 2, h); }
        }
        x += L;
      }
      const boardEdge = !o.board || (r + 1) % o.board === 0;
      if (edge > 0) { gb.fillStyle = boardEdge ? '#000' : '#666'; gb.fillRect(0, y + h - 1, TS, 2); }
      if (o.board && boardEdge) { g.fillStyle = 'rgba(35,20,8,.42)'; g.fillRect(0, y + h - 1.5, TS, 2); }
    }
    if (o.gap) { g.fillStyle = o.gap; for (let r = 0; r < o.rows; r++) g.fillRect(0, r * o.pw * ppm, TS, Math.max(2, o.gapW * ppm)); }
    return { c, size: [size, size], bump: edge > 0 ? b : null };
  },
  herring(o) { // 90° herringbone, period 2L x 2L
    const L = o.L, w = o.w, P = 2 * L, ppm = TS / P, c = mkCanvas(TS, TS), g = c.getContext('2d');
    g.fillStyle = tone(o.base, -0.3); g.fillRect(0, 0, TS, TS);
    const k = Math.round(L / w);
    for (let a = -2 * k - 4; a <= 2 * k + 4; a++) for (let b = -3; b <= 3; b++) {
      const x0 = a * w + b * L, y0 = a * w - b * L;
      for (const [x, y, ww, hh, hz] of [[x0, y0, L, w, true], [x0, y0 + w, w, L, false]]) {
        const mx = ((x % P) + P) % P, my = ((y % P) + P) % P;
        const h = strHash(`${Math.round(mx / w)}_${Math.round(my / w)}_${hz}`);
        const col = tone(o.base, ((h % 1000) / 1000 - 0.5) * o.vary);
        wrapDraw(TS, mx * ppm, my * ppm, ww * ppm, hh * ppm, (px, py) => plankFill(g, px, py, ww * ppm, hh * ppm, col, rng(h), hz));
      }
    }
    return { c, size: [P, P] };
  },
  tiles(o) {
    const sx = o.tw * o.cols, sy = o.th * o.rows, px = TS / sx, py = TS / sy, c = mkCanvas(TS, TS), g = c.getContext('2d'), R = rng(o.seed || 3);
    const b = mkCanvas(TS, TS), gb = b.getContext('2d');
    g.fillStyle = o.grout; g.fillRect(0, 0, TS, TS); gb.fillStyle = '#000'; gb.fillRect(0, 0, TS, TS);
    const gp = Math.max(1.5, (o.gw || 0.003) * px);
    for (let r = 0; r < o.rows; r++) {
      const off = (r % 2) * (o.offset || 0) * o.tw;
      for (let cI = -1; cI <= o.cols; cI++) {
        const x = (cI * o.tw + off) * px, y = r * o.th * py, w = o.tw * px, h = o.th * py;
        const col = o.alt && (r + cI) % 2 ? o.alt : tone(o.base, (R() - 0.5) * (o.vary || 0.05));
        // stone-look: diagonal streaks and soft clouds, fixed per tile so wrapped copies match
        const st = o.stone ? Array.from({ length: 16 }, () => [R(), R(), R(), R(), R()]) : null;
        wrapDraw(TS, x, y, w, h, (X, Y) => {
          g.fillStyle = col; g.fillRect(X + gp / 2, Y + gp / 2, w - gp, h - gp);
          gb.fillStyle = '#fff'; gb.fillRect(X + gp / 2, Y + gp / 2, w - gp, h - gp);
          if (st) {
            g.save(); g.beginPath(); g.rect(X + gp / 2, Y + gp / 2, w - gp, h - gp); g.clip();
            const ang = o.stone.ang ?? -0.45;
            for (const [a, bb, cc, dd, ee] of st) {
              const cx = X + a * w, cyy = Y + bb * h, len = (0.4 + cc) * Math.max(w, h), lw = 2 + dd * (ee < 0.7 ? 26 : 3);
              g.strokeStyle = rgba(tone(col, ee < 0.5 ? 0.09 : ee < 0.85 ? -0.07 : -0.16), ee < 0.7 ? 0.32 : 0.45); g.lineWidth = lw; g.lineCap = 'round';
              g.beginPath(); g.moveTo(cx - Math.cos(ang) * len / 2, cyy - Math.sin(ang) * len / 2);
              g.quadraticCurveTo(cx + (dd - 0.5) * 40, cyy + (cc - 0.5) * 40, cx + Math.cos(ang) * len / 2, cyy + Math.sin(ang) * len / 2); g.stroke();
            }
            g.restore();
          }
          if (o.sheen) { const gr = g.createLinearGradient(X, Y, X + w, Y + h); gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(1, 'rgba(0,0,0,.05)'); g.fillStyle = gr; g.fillRect(X + gp / 2, Y + gp / 2, w - gp, h - gp); }
        });
      }
    }
    if (o.speck) speckle(g, o.speck, 900, 1, 2.5, R);
    return { c, size: [sx, sy], bump: b };
  },
  noise(o) {
    const c = mkCanvas(TS, TS), g = c.getContext('2d'), R = rng(o.seed || 5);
    g.fillStyle = o.base; g.fillRect(0, 0, TS, TS);
    if (o.blot) for (let i = 0; i < 260; i++) { const r = 20 + R() * 90, x = R() * TS, y = R() * TS, col = tone(o.base, (R() - 0.5) * o.blot); wrapDraw(TS, x - r, y - r, 2 * r, 2 * r, (X, Y) => { const gr = g.createRadialGradient(X + r, Y + r, 0, X + r, Y + r, r); gr.addColorStop(0, rgba(col, .35)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(X, Y, 2 * r, 2 * r); }); }
    if (o.chips) speckle(g, o.chips, o.chipN || 1400, o.cmin || 2, o.cmax || 7, R);
    if (o.grain) { const id = g.getImageData(0, 0, TS, TS), d = id.data; for (let i = 0; i < d.length; i += 4) { const v = (R() - 0.5) * o.grain; d[i] += v; d[i + 1] += v; d[i + 2] += v; } g.putImageData(id, 0, 0); }
    return { c, size: [o.size, o.size] };
  },
  marble(o) {
    const c = mkCanvas(TS, TS), g = c.getContext('2d'), R = rng(o.seed || 11);
    g.fillStyle = o.base; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < (o.veins || 18); i++) {
      let x = R() * TS, y = R() * TS, a = R() * 6.28; const pts = [];
      for (let s = 0; s < 60; s++) { a += (R() - 0.5) * 0.5; x += Math.cos(a) * 14; y += Math.sin(a) * 14; pts.push([x, y]); }
      const lw = 0.6 + R() * 2.2, al = 0.08 + R() * 0.25;
      for (const ox of [-TS, 0, TS]) for (const oy of [-TS, 0, TS]) {
        g.strokeStyle = rgba(o.vein, al); g.lineWidth = lw; g.beginPath();
        pts.forEach((p, k) => k ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy)); g.stroke();
      }
    }
    return { c, size: [o.size, o.size] };
  },
  stripes(o) {
    const c = mkCanvas(TS, TS), g = c.getContext('2d'); const n = o.n || 8, w = TS / n;
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? o.b : o.a; g.fillRect(i * w, 0, w, TS); }
    if (o.gap) { g.fillStyle = o.gap; for (let i = 0; i < n; i++) g.fillRect(i * w, 0, o.gapPx || 4, TS); }
    return { c, size: [o.size, o.size] };
  },
  boards(o) { // vertical exterior cladding with shadow lines
    const c = mkCanvas(TS, TS), g = c.getContext('2d'), R = rng(o.seed || 9); const n = o.n || 10, w = TS / n;
    for (let i = 0; i < n; i++) { g.fillStyle = tone(o.base, (R() - 0.5) * 0.06); g.fillRect(i * w, 0, w, TS); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(i * w, 0, 3, TS); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(i * w + 3, 0, 2, TS); }
    return { c, size: [o.size, o.size] };
  },
  brick(o) {
    const c = mkCanvas(TS, TS), g = c.getContext('2d'), R = rng(o.seed || 4); const bw = 0.23, bh = 0.075, rows = 16, cols = 5, sx = bw * cols, sy = bh * rows;
    const px = TS / sx, py = TS / sy; g.fillStyle = o.mortar; g.fillRect(0, 0, TS, TS);
    for (let r = 0; r < rows; r++) for (let k = -1; k <= cols; k++) {
      const x = (k * bw + (r % 2) * bw / 2) * px, y = r * bh * py, col = tone(o.base, (R() - 0.5) * 0.18);
      wrapDraw(TS, x, y, bw * px, bh * py, (X, Y) => { g.fillStyle = col; g.fillRect(X + 3, Y + 3, bw * px - 6, bh * py - 6); });
    }
    return { c, size: [sx, sy] };
  },
  deck(o) { // balcony deck tiles with alternating slat direction
    const c = mkCanvas(TS, TS), g = c.getContext('2d'), R = rng(o.seed || 2); const n = 4, s = TS / n, sl = 5;
    g.fillStyle = '#1d1712'; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < sl; k++) {
      const col = tone(o.base, (R() - 0.5) * 0.25), hz = (i + j) % 2;
      const x = hz ? i * s + 3 : i * s + k * s / sl + 3, y = hz ? j * s + k * s / sl + 3 : j * s + 3;
      const w = hz ? s - 6 : s / sl - 6, h = hz ? s / sl - 6 : s - 6;
      plankFill(g, x, y, w, h, col, rng(R() * 1e9), !!hz);
    }
    return { c, size: [1.2, 1.2] };
  },
  leaf(o) {
    const c = mkCanvas(TS, TS), g = c.getContext('2d'), R = rng(o.seed || 8); g.fillStyle = o.base; g.fillRect(0, 0, TS, TS);
    const n = 6, s = TS / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < 3; k++) {
      const x = i * s + s / 2 + (j % 2) * s / 4, y = j * s + s / 2;
      g.save(); g.translate(x, y); g.rotate(k * 2.1 + (i + j)); g.fillStyle = rgba(o.ink, 0.55 + R() * 0.2);
      g.beginPath(); g.ellipse(0, -s * 0.18, s * 0.07, s * 0.2, 0, 0, 7); g.fill(); g.restore();
    }
    return { c, size: [o.size, o.size] };
  },
  seams(o) { // standing-seam metal / membrane roof
    const c = mkCanvas(TS, TS), g = c.getContext('2d'); const n = o.n || 4, w = TS / n;
    g.fillStyle = o.base; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < n; i++) { g.fillStyle = tone(o.base, 0.18); g.fillRect(i * w, 0, 4, TS); g.fillStyle = tone(o.base, -0.25); g.fillRect(i * w + 4, 0, 3, TS); }
    return { c, size: [o.size, o.size] };
  },
};
function speckle(g, colors, n, rmin, rmax, R) {
  for (let i = 0; i < n; i++) { g.fillStyle = colors[Math.floor(R() * colors.length)]; const r = rmin + R() * (rmax - rmin); g.beginPath(); g.ellipse(R() * TS, R() * TS, r, r * (0.5 + R() * 0.5), R() * 3, 0, 7); g.fill(); }
}

// ---------- noise + per-pixel wood engine (grain, pores, bevelled seams, relief and gloss maps) ----------
const NP = new Uint16Array(512), NV = new Float32Array(256);
{ const R = rng(1337), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) NP[i] = p[i & 255]; for (let i = 0; i < 256; i++) NV[i] = R(); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = NV[NP[NP[X] + Y]], b = NV[NP[NP[X + 1] + Y]], c = NV[NP[NP[X] + Y + 1]], d = NV[NP[NP[X + 1] + Y + 1]];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 3) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }
// precomputed periodic fbm field (512 x 512 samples, 2 per noise unit) for fast lookups in the texture generators
const NTS = 512; let NT = null;
function ntab() { if (NT) return NT; NT = new Float32Array(NTS * NTS); for (let y = 0; y < NTS; y++) for (let x = 0; x < NTS; x++) { let s = 0, a = 0.5, f = 1, n = 0; for (let o = 0; o < 4; o++) { s += a * vnoise(x / 2 * f, y / 2 * f); n += a; a *= 0.5; f *= 2; } NT[y * NTS + x] = s / n; } return NT; }
function nt(x, y) { const T = NT; x %= NTS; y %= NTS; if (x < 0) x += NTS; if (y < 0) y += NTS; const xi = x | 0, yi = y | 0, xf = x - xi, yf = y - yi, x1 = xi + 1 === NTS ? 0 : xi + 1, y1 = yi + 1 === NTS ? 0 : yi + 1; const a = T[yi * NTS + xi], b = T[yi * NTS + x1], c = T[y1 * NTS + xi], d = T[y1 * NTS + x1]; return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; }
// write one board into colour/relief/gloss buffers (wraps around the canvas edges so the texture tiles)
function woodRect(D, B, Rg, S, x0, y0, w, h, horiz, ppm, col, seed, o) {
  const R = rng(seed >>> 0), ox = R() * 180, oy = R() * 180, cath = R() < (o.cathedral ?? 0.4), k = 0.6 + R() * 1.6, ringF = (o.rings ?? 36) * (0.8 + R() * 0.5);
  const con = o.contrast ?? 0.3, dk = hexRgb(tone(col, -con)), lt = hexRgb(tone(col, con * 0.35)), bev = o.bevel ?? 0.0012;
  const Lm = (horiz ? w : h) / ppm, Wm = (horiz ? h : w) / ppm, gloss = 0.85 + R() * 0.3; ntab();
  for (let j = 0; j < h; j++) {
    const py = ((y0 + j) % S + S) % S;
    for (let i = 0; i < w; i++) {
      const px = ((x0 + i) % S + S) % S, q = py * S + px, a = (horiz ? i : j) / ppm, b = (horiz ? j : i) / ppm;
      const warp = nt((a * 0.8 + ox) * 2, (b * 5 + oy) * 2);
      const bb = b + (cath ? (a - Lm * 0.5) * (a - Lm * 0.5) * 0.12 * k : 0);
      const ring = 0.5 + 0.5 * Math.sin((bb * ringF + warp * 4.5) * 6.2832);
      const streak = nt((a * 1.4 + ox) * 2, (b * 90 + oy) * 2);
      let t = 0.5 * streak + 0.5 * ring * ring;
      if (NV[(((a * 260 + ox) | 0) * 31 + ((b * 1500 + oy) | 0) * 17) & 255] > 0.9) t *= 0.62; // pores
      t = clamp(t, 0, 1);
      const e = Math.min(a, Lm - a, b, Wm - b), ef = bev > 0 && e < bev ? 0.5 + 0.5 * e / bev : 1;
      D[q * 4] = (dk[0] + (lt[0] - dk[0]) * t) * ef; D[q * 4 + 1] = (dk[1] + (lt[1] - dk[1]) * t) * ef; D[q * 4 + 2] = (dk[2] + (lt[2] - dk[2]) * t) * ef; D[q * 4 + 3] = 255;
      const bv = bev > 0 && e < bev ? 255 * (e / bev) * 0.8 : 205 + 40 * t; B[q * 4] = B[q * 4 + 1] = B[q * 4 + 2] = bv; B[q * 4 + 3] = 255;
      const rv = clamp((150 + 70 * (1 - t)) * gloss, 0, 255); Rg[q * 4] = Rg[q * 4 + 1] = Rg[q * 4 + 2] = bev > 0 && e < bev ? 235 : rv; Rg[q * 4 + 3] = 255;
    }
  }
}
function woodCanvases(S, draw, vertical) {
  const mk = () => { const c = mkCanvas(S, S); return [c, c.getContext('2d')]; };
  const [c, g] = mk(), [b, gb] = mk(), [r, gr] = mk();
  const D = g.createImageData(S, S), B = gb.createImageData(S, S), Rg = gr.createImageData(S, S);
  draw(D.data, B.data, Rg.data);
  g.putImageData(D, 0, 0); gb.putImageData(B, 0, 0); gr.putImageData(Rg, 0, 0);
  if (!vertical) return { c, bump: b, rough: r };
  const rot = src => { const [d, gd] = mk(); gd.translate(S, 0); gd.rotate(Math.PI / 2); gd.drawImage(src, 0, 0); return d; };
  return { c: rot(c), bump: rot(b), rough: rot(r) };
}
function groove(D, B, Rg, S, y, h, alpha) { // darker line across the canvas (board edges in strip floors, gaps in decking)
  for (let j = y; j < y + h; j++) { const py = ((j % S) + S) % S; for (let x = 0; x < S; x++) { const q = (py * S + x) * 4; D[q] *= alpha; D[q + 1] *= alpha; D[q + 2] *= alpha; B[q] = B[q + 1] = B[q + 2] = 0; Rg[q] = Rg[q + 1] = Rg[q + 2] = 240; } }
}
GEN.planks = o => { // rows of boards along x; o.board = strips per board (3-strip laminate), o.vertical rotates
  const S = o.res || TS, size = o.pw * o.rows, ppm = S / size, R = rng(o.seed || 7);
  const out = woodCanvases(S, (D, B, Rg) => {
    for (let r = 0; r < o.rows; r++) {
      const y = Math.round(r * o.pw * ppm), h = Math.round((r + 1) * o.pw * ppm) - y; let x = -R() * o.pl * ppm;
      while (x < S) { const L = o.pl * ppm * (o.fixed ? 1 : 0.55 + R() * 0.9), col = tone(o.base, (R() - 0.5) * o.vary); woodRect(D, B, Rg, S, Math.round(x), y, Math.round(L), h, true, ppm, col, R() * 4e9, o); x += L; }
      if (o.board && (r + 1) % o.board === 0) groove(D, B, Rg, S, y + h - 1, 2, 0.55);
      if (o.gap) groove(D, B, Rg, S, y + h - Math.max(2, Math.round(o.gapW * ppm)), Math.max(2, Math.round(o.gapW * ppm)), 0.3);
    }
  }, o.vertical);
  return { ...out, size: [size, size] };
};
GEN.herring = o => { // 90° herringbone: cell = horizontal plank [0,L]x[0,w] + vertical plank [L,L+w]x[w-L,w], lattice (w,w) and (L,-L); repeats every 2L x 2L
  const S = o.res || TS, L = o.L, w = o.w, P = 2 * L, ppm = S / P, k = Math.round(L / w), R = rng(o.seed || 17);
  const out = woodCanvases(S, (D, B, Rg) => {
    for (let a = 0; a < 2 * k; a++) {
      const x0 = a * w, y0 = a * w;
      woodRect(D, B, Rg, S, Math.round(x0 * ppm), Math.round(y0 * ppm), Math.round(L * ppm), Math.round(w * ppm), true, ppm, tone(o.base, (R() - 0.5) * o.vary), R() * 4e9, o);
      woodRect(D, B, Rg, S, Math.round((x0 + L) * ppm), Math.round((y0 + w - L) * ppm), Math.round(w * ppm), Math.round(L * ppm), false, ppm, tone(o.base, (R() - 0.5) * o.vary), R() * 4e9, o);
    }
  });
  return { ...out, size: [P, P] };
};
GEN.deck = o => { // balcony deck tiles: 30 cm squares of five slats, alternating direction
  const S = o.res || TS, size = 1.2, ppm = S / size, n = 4, cell = S / n, sl = 5, R = rng(o.seed || 2);
  const out = woodCanvases(S, (D, B, Rg) => {
    for (let q = 0; q < D.length; q += 4) { D[q] = 25; D[q + 1] = 20; D[q + 2] = 16; D[q + 3] = 255; B[q] = B[q + 1] = B[q + 2] = 0; B[q + 3] = 255; Rg[q] = Rg[q + 1] = Rg[q + 2] = 240; Rg[q + 3] = 255; }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let s = 0; s < sl; s++) {
      const hz = (i + j) % 2, gap = 4, sw = cell / sl;
      const x = Math.round(hz ? i * cell + gap : i * cell + s * sw + gap / 2), y = Math.round(hz ? j * cell + s * sw + gap / 2 : j * cell + gap);
      const ww = Math.round(hz ? cell - 2 * gap : sw - gap), hh = Math.round(hz ? sw - gap : cell - 2 * gap);
      woodRect(D, B, Rg, S, x, y, ww, hh, !!hz, ppm, tone(o.base, (R() - 0.5) * 0.3), R() * 4e9, { ...o, bevel: 0.002, contrast: 0.35 });
    }
  });
  return { ...out, size: [size, size] };
};
// woven fabric: heathered colour modulation + weave relief (tile = 20 cm)
let FABTEX = null;
function fabricTex() {
  if (FABTEX) return FABTEX;
  const S = 256, mk = () => { const c = mkCanvas(S, S); return [c, c.getContext('2d')]; }, [c, g] = mk(), [b, gb] = mk();
  const DI = g.createImageData(S, S), BI = gb.createImageData(S, S), D = DI.data, Bd = BI.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const q = (y * S + x) * 4, over = ((x >> 1) + (y >> 1)) & 1, th = over ? 0.5 + 0.5 * Math.sin((y % 2 + 0.5) * Math.PI) : 0.5 + 0.5 * Math.sin((x % 2 + 0.5) * Math.PI);
    const slub = fbm(x / 9, y / 3, 2), hv = 222 + 30 * slub + 6 * th;
    D[q] = D[q + 1] = D[q + 2] = clamp(hv, 0, 255); D[q + 3] = 255;
    Bd[q] = Bd[q + 1] = Bd[q + 2] = 110 + 120 * th * (0.7 + 0.3 * slub); Bd[q + 3] = 255;
  }
  g.putImageData(DI, 0, 0); gb.putImageData(BI, 0, 0);
  const t1 = new THREE.CanvasTexture(c), t2 = new THREE.CanvasTexture(b);
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.anisotropy = 4; }
  t1.colorSpace = THREE.SRGBColorSpace;
  return (FABTEX = { map: t1, bump: t2 });
}
function fab(c, kind = 'woven') { // upholstery and textiles
  if (!isHexC(c)) return getMat(c);
  const key = 'fab|' + kind + '|' + c; if (MATC.has(key)) return MATC.get(key);
  const T = fabricTex(), velvet = kind === 'velvet', linen = kind === 'linen';
  const m = new THREE.MeshPhysicalMaterial({ color: c, map: T.map, bumpMap: T.bump, bumpScale: velvet ? 0.0006 : linen ? 0.0025 : 0.0018, roughness: velvet ? 0.75 : 0.92, sheen: velvet ? 1 : 0.6, sheenRoughness: velvet ? 0.32 : 0.55, sheenColor: new THREE.Color(tone(c, velvet ? 0.45 : 0.3)) });
  m.envMapIntensity = ENV_I.v; MATC.set(key, m); return m;
}
const isHexC = c => typeof c === 'string' && c[0] === '#';
// subtle roller texture for painted walls and ceilings
let PAINTBUMP = null;
function paintBump() {
  if (PAINTBUMP) return PAINTBUMP;
  const S = 512, c = mkCanvas(S, S), g = c.getContext('2d'), DI = g.createImageData(S, S), D = DI.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const q = (y * S + x) * 4, v = 120 + 90 * fbm(x / 6 + 3, y / 6 + 7, 3) + 30 * vnoise(x / 1.7, y / 1.7); D[q] = D[q + 1] = D[q + 2] = v; D[q + 3] = 255; }
  g.putImageData(DI, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.5, 2.5); return (PAINTBUMP = t);
}
// project UVs from object space so textures keep real-world scale on any shape (1 unit = 1 m); vgrain turns grain vertical on side faces
function worldUV(geo, vgrain = false) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv; if (!uv || !n) return geo;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i), p.getZ(i));
    else if (ax >= az) vgrain ? uv.setXY(i, p.getY(i), p.getZ(i)) : uv.setXY(i, p.getZ(i), p.getY(i));
    else vgrain ? uv.setXY(i, p.getY(i), p.getX(i)) : uv.setXY(i, p.getX(i), p.getY(i));
  }
  uv.needsUpdate = true; return geo;
}
const hasTex = m => !Array.isArray(m) && (m.map || m.bumpMap);
// puffy cushion / pillow: two bulging surfaces joined at a pinched seam
function pillowGeo(w, h, t, seg = 18) {
  const pos = [], idx = [], n = seg + 1;
  for (const side of [1, -1]) for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) {
    const u = i / seg * 2 - 1, v = j / seg * 2 - 1, puff = Math.pow(Math.max(0, (1 - u * u) * (1 - v * v)), 0.45);
    pos.push(u * w / 2 * (1 - 0.06 * (1 - v * v)), v * h / 2 * (1 - 0.06 * (1 - u * u)), side * t / 2 * puff);
  }
  for (const [s, off] of [[1, 0], [-1, n * n]]) for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
    const a = off + j * n + i, b = a + 1, c = a + n, d = c + 1;
    if (s > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); return worldUV(g);
}
// draped duvet: flat top with soft wrinkles that folds down over the sides and foot of the mattress
function duvetGeo(w, d, drop, seed) {
  const R = rng(seed), seg = 40, pos = [], idx = [], ox = R() * 50, oy = R() * 50, W = w + 2 * drop, D = d + drop;
  for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) {
    const sx = -W / 2 + W * i / seg, sz = -d / 2 + D * j / seg;
    let x = sx, y = 0, z = sz;
    if (Math.abs(sx) > w / 2) { const over = Math.abs(sx) - w / 2; x = Math.sign(sx) * (w / 2 + 0.02 + over * 0.12); y = -over; }
    if (sz > d / 2) { const over = sz - d / 2; z = d / 2 + 0.02 + over * 0.12; y = Math.min(y, -over); if (Math.abs(sx) > w / 2) y = -Math.max(Math.abs(sx) - w / 2, over); }
    const wr = (fbm(sx * 3 + ox, sz * 2 + oy, 3) - 0.5) * 0.05 + Math.sin(sx * 9 + sz * 4) * 0.004;
    pos.push(x, y + wr + 0.01, z);
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, e = c + 1; idx.push(a, c, b, b, c, e); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); return worldUV(g);
}
function lathe(points, seg = 32) { return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg); }
function roundRect(w, d, r) { const s = new THREE.Shape(), x = -w / 2, y = -d / 2; r = Math.min(r, w / 2, d / 2); s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
// horizontal slab with rounded corners and softened edges (table tops, counters, shelves)
function slab(g, w, d, t, x, y, z, m, r = 0.02, bevel = 0.004) {
  const geo = new THREE.ExtrudeGeometry(roundRect(w - 2 * bevel, d - 2 * bevel, r), { depth: t - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, bevel, 0); if (hasTex(m)) worldUV(geo);
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); g.add(me); return me;
}
function tube(g, pts, r, m, seg = 24) { const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, 10, false); const me = new THREE.Mesh(geo, m); g.add(me); return me; }
// square leg that tapers towards the floor
function sqLeg(g, top, bot, h, x, y, z, m) { const geo = new THREE.CylinderGeometry(top * 0.7071, bot * 0.7071, h, 4, 1); geo.rotateY(Math.PI / 4); if (hasTex(m)) worldUV(geo, true); const me = new THREE.Mesh(geo, m); me.position.set(x, y + h / 2, z); g.add(me); return me; }

// ---------- material library ----------
// cats: f = floor, w = wall, c = ceiling, k = countertop, x = exterior, r = roof, d = deck, m = furniture surface
// "(current)" finishes are matched to the listing photos (median colours sampled from the images).
const MATS = {};
function M(key, name, cats, o) { MATS[key] = Object.assign({ key, name, cats }, o); }
const PAINTS = [
  ['paint_listing', 'White paint', '#EEEEEB'], ['paint_white', 'Chalk white', '#F3F1EA'], ['paint_warm', 'Warm white', '#EEE7DA'],
  ['paint_greige', 'Greige', '#CEC5B6'], ['paint_sand', 'Sand', '#D9C4A3'], ['paint_sage', 'Sage', '#A8B49F'],
  ['paint_forest', 'Forest', '#3E584A'], ['paint_dusty', 'Dusty blue', '#93A8B9'], ['paint_navy', 'Navy', '#2D3D54'],
  ['paint_clay', 'Clay', '#B77457'], ['paint_blush', 'Blush', '#E1C1B5'], ['paint_ochre', 'Ochre', '#C8962F'],
  ['paint_charcoal', 'Charcoal', '#44494C'],
];
PAINTS.forEach(([k, n, c]) => M(k, n, 'wc', { color: c, rough: 0.9 }));
const wood = (base, extra = {}, rough = 0.55) => ({ gen: 'planks', o: Object.assign({ base, vary: 0.16, pw: 0.19, pl: 1.28, rows: 12 }, extra), rough, bump: 1.2 });
const veneer = (base, extra = {}) => ({ gen: 'planks', o: Object.assign({ base, vary: 0.06, pw: 0.12, pl: 2.4, rows: 10, fixed: true, bevel: 0, contrast: 0.22, cathedral: 0.7, res: 512 }, extra), rough: 0.55, bump: 0.6 });
// floors
M('oak_honey', 'Honey oak 3-strip laminate (current)', 'f', wood('#BC8452', { pw: 0.066, rows: 36, pl: 0.5, board: 3, vary: 0.22, bevel: 0.0006, contrast: 0.32, rings: 44, seed: 3, res: 2048 }, 0.36));
M('oak_natural', 'Natural oak planks', 'fk', wood('#D0AC7C', { seed: 4 }));
M('oak_white', 'White-oiled oak', 'f', wood('#E2D4BD', { vary: 0.09, seed: 5 }));
M('oak_smoked', 'Smoked oak', 'f', wood('#8A6A4E', { seed: 6 }));
M('walnut', 'Walnut', 'fk', wood('#5D4231', { seed: 7 }));
M('oak_wide', 'Wide oak boards', 'f', wood('#CCA575', { pw: 0.24, pl: 2.2, rows: 10, seed: 8 }));
M('vinyl_grey', 'Grey vinyl planks', 'f', wood('#A29D95', { vary: 0.1, seed: 9 }));
M('herring_oak', 'Herringbone oak', 'f', { gen: 'herring', o: { base: '#C9A06F', vary: 0.22, w: 0.1, L: 0.6 }, rough: 0.55, bump: 1, rot: -45 });
M('herring_light', 'Herringbone light oak', 'f', { gen: 'herring', o: { base: '#DCC39E', vary: 0.14, w: 0.1, L: 0.6 }, rough: 0.55, bump: 1, rot: -45 });
// tiles
M('tile_greige', 'Stone-look tile 30×60 (current bath)', 'fw', { gen: 'tiles', o: { base: '#C3B6A8', grout: '#B2A597', tw: 0.6, th: 0.3, cols: 2, rows: 4, offset: 0.5, vary: 0.05, gw: 0.003, stone: { ang: -0.42 } }, rough: 0.45, bump: 1.5 });
M('mosaic_greige', 'Stone mosaic 5×5 (current shower floor)', 'fw', { gen: 'tiles', o: { base: '#BFB2A4', grout: '#A99B8C', tw: 0.05, th: 0.05, cols: 20, rows: 20, vary: 0.12, gw: 0.004 }, rough: 0.55, bump: 1.5 });
M('tile_white_15', 'White tile 15×15 (current kitchen)', 'w', { gen: 'tiles', o: { base: '#F2F2EE', grout: '#D8D7D1', tw: 0.15, th: 0.15, cols: 6, rows: 6, vary: 0.015, sheen: 1, gw: 0.003 }, rough: 0.18, bump: 1.2 });
M('tile_white_sq', 'White tile 20×20', 'fw', { gen: 'tiles', o: { base: '#F0F0EC', grout: '#D5D5CF', tw: 0.2, th: 0.2, cols: 5, rows: 5, vary: 0.02, sheen: 1 }, rough: 0.3, bump: 1.2 });
M('tile_subway', 'White subway tile', 'w', { gen: 'tiles', o: { base: '#F2F1EC', grout: '#D3D1CA', tw: 0.15, th: 0.075, cols: 6, rows: 12, offset: 0.5, vary: 0.03, sheen: 1 }, rough: 0.2, bump: 1.2 });
M('tile_green', 'Green glazed tile', 'w', { gen: 'tiles', o: { base: '#6C8A73', grout: '#DAD6CC', tw: 0.15, th: 0.075, cols: 6, rows: 12, offset: 0.5, vary: 0.1, sheen: 1 }, rough: 0.2, bump: 1.2 });
M('tile_dark', 'Dark stone tile 60×60', 'fw', { gen: 'tiles', o: { base: '#4A4C4E', grout: '#3A3B3C', tw: 0.6, th: 0.6, cols: 2, rows: 2, vary: 0.05, speck: ['rgba(255,255,255,.05)', 'rgba(0,0,0,.08)'] }, rough: 0.5, bump: 1.2 });
M('tile_terracotta', 'Terracotta tile', 'f', { gen: 'tiles', o: { base: '#B4684B', grout: '#C9B9A7', tw: 0.2, th: 0.2, cols: 5, rows: 5, vary: 0.14 }, rough: 0.7, bump: 1.2 });
M('tile_checker', 'Black and white checker', 'f', { gen: 'tiles', o: { base: '#EFEDE7', alt: '#25272A', grout: '#9C9A94', tw: 0.3, th: 0.3, cols: 4, rows: 4, vary: 0.01 }, rough: 0.35, bump: 1.2 });
M('terrazzo', 'Terrazzo', 'fk', { gen: 'noise', o: { base: '#E6E1D8', size: 1, chips: ['#B8A898', '#8D99A0', '#D3B69C', '#6E6965', '#F7F5F0'], chipN: 2200 }, rough: 0.4 });
M('concrete', 'Polished concrete', 'fwk', { gen: 'noise', o: { base: '#A8A6A0', size: 2, blot: 0.14, grain: 10 }, rough: 0.6 });
M('microcement', 'Light microcement', 'fw', { gen: 'noise', o: { base: '#D2CDC4', size: 2, blot: 0.08, grain: 6 }, rough: 0.7 });
M('carpet_grey', 'Grey carpet', 'f', { gen: 'noise', o: { base: '#8B8E8C', size: 1, grain: 26 }, rough: 1 });
M('marble_white', 'Marble-look laminate (current counter)', 'wk', { gen: 'marble', o: { base: '#EBE9E4', vein: '#74777E', size: 1.0, veins: 30 }, rough: 0.3 });
// walls and ceilings
M('wood_panel', 'Oak panel, vertical', 'wc', wood('#C7A27A', { pw: 0.12, rows: 12, pl: 2.4, vertical: true, fixed: true, seed: 12 }));
M('slats_dark', 'Dark ribbed slats', 'w', { gen: 'stripes', o: { a: '#5B4332', b: '#4E392B', n: 12, size: 0.6, gap: '#1A1410', gapPx: 22 }, rough: 0.6 });
M('brick_white', 'White-washed brick', 'w', { gen: 'brick', o: { base: '#E8E3DB', mortar: '#CCC6BC' }, rough: 0.9 });
M('brick_red', 'Red brick', 'w', { gen: 'brick', o: { base: '#9A4E39', mortar: '#C8BFB2' }, rough: 0.9 });
M('wallpaper_stripe', 'Striped wallpaper', 'w', { gen: 'stripes', o: { a: '#E7E1D4', b: '#D2C6B0', n: 10, size: 0.8 }, rough: 0.9 });
M('wallpaper_leaf', 'Leaf wallpaper', 'w', { gen: 'leaf', o: { base: '#DCE3D7', ink: '#8BA389', size: 0.7 }, rough: 0.9 });
M('ceil_boards', 'White ceiling boards (balcony)', 'c', wood('#E9E7E0', { vary: 0.03, pw: 0.12, rows: 12, pl: 3.6, fixed: true, seed: 13, contrast: 0.05, bevel: 0.003, res: 512 }, 0.8));
// outside
M('clad_cream', 'Light boards (current facade)', 'x', { gen: 'boards', o: { base: '#DAD5C9', size: 1.2 }, rough: 0.85 });
M('clad_yellow', 'Yellow boards (current balcony)', 'x', { gen: 'boards', o: { base: '#D9A425', size: 1.2 }, rough: 0.8 });
M('clad_gable', 'Red-brown boards (current gable)', 'x', { gen: 'boards', o: { base: '#A6553F', size: 1.2 }, rough: 0.85 });
M('clad_grey', 'Grey boards', 'x', { gen: 'boards', o: { base: '#8E9395', size: 1.2 }, rough: 0.85 });
M('clad_white', 'White boards', 'x', { gen: 'boards', o: { base: '#EEECE6', size: 1.2 }, rough: 0.85 });
M('clad_black', 'Black boards', 'x', { gen: 'boards', o: { base: '#2C2E30', size: 1.2 }, rough: 0.85 });
M('clad_red', 'Falu red boards', 'x', { gen: 'boards', o: { base: '#8C3A2D', size: 1.2 }, rough: 0.85 });
M('ct_white', 'White solid surface', 'k', { color: '#F3F3F1', rough: 0.3 });
M('ct_black', 'Black stone', 'k', { color: '#232425', rough: 0.3 });
M('ct_steel', 'Stainless steel', 'k', { color: '#B7BBBE', rough: 0.35, metal: 0.8 });
M('deck_dark', 'Dark deck tiles (current)', 'd', { gen: 'deck', o: { base: '#5E4334' }, rough: 0.8 });
M('deck_light', 'Light deck tiles', 'd', { gen: 'deck', o: { base: '#9C7A56' }, rough: 0.8 });
M('deck_grey', 'Grey composite', 'd', wood('#6E6A66', { pw: 0.14, rows: 10, pl: 2.8, vary: 0.08, gap: '#2a2826', gapW: 0.006 }));
M('roof_membrane', 'Dark membrane (current)', 'r', { gen: 'seams', o: { base: '#3A3D40', size: 4, n: 4 }, rough: 0.9 });
M('roof_black', 'Black standing seam', 'r', { gen: 'seams', o: { base: '#232527', size: 2, n: 4 }, rough: 0.5, metal: 0.3 });
M('roof_red', 'Red standing seam', 'r', { gen: 'seams', o: { base: '#7C2E25', size: 2, n: 4 }, rough: 0.5, metal: 0.2 });
M('roof_sedum', 'Green sedum roof', 'r', { gen: 'noise', o: { base: '#6C8848', size: 2, blot: 0.3, chips: ['#8DA552', '#556F35', '#A7744A'], chipN: 3000 }, rough: 1 });
// furniture surfaces (wood veneers)
M('wood_oak', 'Oak veneer', 'm', veneer('#C29766', { seed: 21 }));
M('wood_oak_grey', 'Grey-washed oak', 'm', veneer('#BBAA8E', { seed: 22 }));
M('wood_driftwood', 'Driftwood oak (current vanity)', 'm', veneer('#8D8176', { seed: 23, vary: 0.1 }));
M('wood_beech', 'Beech', 'm', veneer('#D3AF84', { seed: 24 }));
M('wood_walnut', 'Walnut veneer', 'm', veneer('#5C4030', { seed: 25 }));
M('wood_espresso', 'Espresso stained wood', 'm', veneer('#3A2B24', { seed: 26, vary: 0.05 }));
M('wood_honey', 'Honey oak (current skirting)', 'm', veneer('#B98250', { seed: 27 }));
M('wood_white', 'White-painted wood', 'm', veneer('#F0EEE9', { seed: 28, contrast: 0.03 }));
const matKeys = cat => Object.values(MATS).filter(m => m.cats.includes(cat)).map(m => m.key);

const TEX = new Map(), MATC = new Map(), ENV_I = { v: 0.5 };
let maxAniso = 4;
function texFor(key) {
  if (TEX.has(key)) return TEX.get(key);
  const def = MATS[key], t0 = performance.now(); const { c, size, bump, rough } = GEN[def.gen](def.o); PERF.push([key, Math.round(performance.now() - t0)]);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  t.repeat.set(1 / size[0], 1 / size[1]);
  let bt = null; if (bump && def.bump) { bt = new THREE.CanvasTexture(bump); bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.anisotropy = maxAniso; bt.repeat.set(1 / size[0], 1 / size[1]); }
  let rt = null; if (rough) { rt = new THREE.CanvasTexture(rough); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.anisotropy = maxAniso; rt.repeat.set(1 / size[0], 1 / size[1]); }
  if (def.rot) for (const x of [t, bt, rt]) if (x) x.rotation = def.rot * DEG;
  const r = { t, c, size, bt, rt }; TEX.set(key, r); return r;
}
function getMat(key) {
  if (!key) key = 'paint_white';
  if (MATC.has(key)) return MATC.get(key);
  let m;
  if (key[0] === '#') m = new THREE.MeshStandardMaterial({ color: key, roughness: 0.9, bumpMap: paintBump(), bumpScale: 0.006 });
  else {
    const def = MATS[key] || MATS.paint_white;
    const T = def.gen ? texFor(def.key) : null;
    m = T ? new THREE.MeshStandardMaterial({ map: T.t, roughness: T.rt ? Math.min(1, (def.rough ?? 0.8) / 0.72) : def.rough ?? 0.8, roughnessMap: T.rt, metalness: def.metal ?? 0, bumpMap: T.bt, bumpScale: (def.bump || 1) * 0.004 })
      : new THREE.MeshStandardMaterial({ color: def.color, roughness: def.rough ?? 0.9, metalness: def.metal ?? 0, bumpMap: !def.metal && /[wc]/.test(def.cats) ? paintBump() : null, bumpScale: 0.006 });
  }
  m.envMapIntensity = ENV_I.v; m.userData.key = key; MATC.set(key, m); return m;
}
function mat(c, rough = 0.8, metal = 0) { // item colour: hex or a library key
  if (!c) c = '#cccccc';
  if (c[0] !== '#') return getMat(c);
  const k = c + '|' + rough + '|' + metal;
  if (!MATC.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal }); m.envMapIntensity = ENV_I.v; MATC.set(k, m); }
  return MATC.get(k);
}
const SWATCH = new Map();
function swatchCss(key) {
  if (!key) return 'background:var(--panel-2)';
  if (key[0] === '#') return `background:${key}`;
  const def = MATS[key]; if (!def) return 'background:#ccc';
  if (!def.gen) return `background:${def.color}`;
  if (!SWATCH.has(key)) {
    const { c, size } = TEX.has(key) ? TEX.get(key) : GEN[def.gen]({ ...def.o, res: 256 }), s = mkCanvas(64, 64), g = s.getContext('2d');
    const cw = c.width * Math.min(1, 0.9 / size[0]), ch = c.height * Math.min(1, 0.9 / size[1]);
    g.drawImage(c, 0, 0, cw, ch, 0, 0, 64, 64); SWATCH.set(key, s.toDataURL('image/jpeg', 0.8));
  }
  return `background-image:url(${SWATCH.get(key)})`;
}
const matName = k => !k ? 'Room default' : k[0] === '#' ? 'Custom colour ' + k.toUpperCase() : (MATS[k]?.name || k);

const GLASS = new THREE.MeshPhysicalMaterial({ color: '#eef6f8', transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0, depthWrite: false, side: THREE.DoubleSide, specularIntensity: 0.5, envMapIntensity: 0.45 });
const MIRROR = new THREE.MeshStandardMaterial({ color: '#cfd8dc', roughness: 0.05, metalness: 0.9 });
const STEEL = mat('#b9bec2', 0.35, 0.8);
const DARK = mat('#1b1c1e', 0.4);
const EDGE = new THREE.MeshStandardMaterial({ color: '#F4F3EF', roughness: 0.9 });

// Mesh builder: quads grouped by material key
class MB {
  constructor() { this.g = new Map(); }
  quad(mk, p0, p1, p2, p3, nrm, uv) {
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const cl = Math.hypot(c[0], c[1], c[2]);
    let P = [p0, p1, p2, p3];
    if (cl < 1e-9) { const e3 = [p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]]; if (Math.hypot(...e3) < 1e-9) return; }
    let a = this.g.get(mk); if (!a) { a = { p: [], n: [], u: [] }; this.g.set(mk, a); }
    const U = uv || [[0, 0], [1, 0], [1, 1], [0, 1]];
    const flip = cl > 1e-9 && (c[0] * nrm[0] + c[1] * nrm[1] + c[2] * nrm[2]) < 0;
    const tris = flip ? [[0, 2, 1], [0, 3, 2]] : [[0, 1, 2], [0, 2, 3]];
    for (const t of tris) for (const i of t) { a.p.push(P[i][0], P[i][1], P[i][2]); a.n.push(nrm[0], nrm[1], nrm[2]); a.u.push(U[i][0], U[i][1]); }
  }
  mesh(matFn) {
    const geo = new THREE.BufferGeometry(), P = [], N = [], U = [], mats = [];
    let i = 0;
    for (const [k, a] of this.g) { geo.addGroup(P.length / 3, a.p.length / 3, i++); for (const v of a.p) P.push(v); for (const v of a.n) N.push(v); for (const v of a.u) U.push(v); mats.push(matFn(k)); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    return new THREE.Mesh(geo, mats);
  }
}
// box helpers for items: bottom at y, centred on x/z
function boxUV(geo, w, h, d) {
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
}
function bx(g, w, h, d, x, y, z, m, o = {}) {
  let geo;
  if (o.r) geo = new RoundedBoxGeometry(w, h, d, o.seg || 3, Math.min(o.r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  else geo = new THREE.BoxGeometry(w, h, d);
  if (!o.nouv && (o.uv || hasTex(m))) worldUV(geo, o.vgrain);
  const me = new THREE.Mesh(geo, m); me.position.set(x, y + h / 2, z); g.add(me); return me;
}
function cy(g, rt, rb, h, x, y, z, m, seg = 24) { const geo = new THREE.CylinderGeometry(rt, rb, h, seg); if (hasTex(m)) worldUV(geo, true); const me = new THREE.Mesh(geo, m); me.position.set(x, y + h / 2, z); g.add(me); return me; }
function blob(g, r, x, y, z, m, sx = 1, sy = 1, sz = 1) { const me = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); me.position.set(x, y, z); me.scale.set(sx, sy, sz); g.add(me); return me; }
function legs4(g, w, d, h, m, r = 0.018) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, r, r * 0.8, h, sx * w / 2, 0, sz * d / 2, m, 10); }
