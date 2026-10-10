// ---------- pieces for the "Renovated" design: walnut, travertine, bronze and linen (from the client's mood renders) ----------
M('herring_warm', 'Herringbone oak, warm brown', 'f', { gen: 'herring', o: { base: '#85562F', vary: 0.24, w: 0.09, L: 0.54, contrast: 0.34, seed: 31 }, rough: 0.82, bump: 1, rot: -45 });
M('herring_dark', 'Herringbone oak, dark brown', 'f', { gen: 'herring', o: { base: '#5C3B28', vary: 0.2, w: 0.09, L: 0.54, contrast: 0.32, seed: 32 }, rough: 0.82, bump: 1, rot: -45 });
M('paint_taupe', 'Taupe', 'wc', { color: '#806E5D', rough: 0.9 });
M('paint_beige', 'Beige', 'wc', { color: '#CBBDA6', rough: 0.9 });
M('vinyl_herring_dark', 'Click vinyl, dark herringbone', 'f', { gen: 'herring', o: { base: '#523829', vary: 0.16, w: 0.12, L: 0.6, contrast: 0.26, seed: 41 }, rough: 0.75, bump: 1, rot: -45 });
M('wallpaper_struct', 'White structured wallpaper (current)', 'w', { gen: 'struct', o: { base: '#ECEAE4', size: 0.5 }, rough: 0.88, bump: 1.4 });
GEN.struct = o => { // embossed vinyl wallpaper: irregular raised blobs a few millimetres across; tiles every o.size metres
  const S = 512, mk = () => { const c = mkCanvas(S, S); return [c, c.getContext('2d')]; }, [c, g] = mk(), [b, gb] = mk(), D = g.createImageData(S, S), B = gb.createImageData(S, S), base = hexRgb(o.base); ntab();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const q = (y * S + x) * 4, r = clamp((nt(x, y) * 0.55 + nt(x * 2 + 77, y * 2 + 31) * 0.45 - 0.44) * 4.5, 0, 1), k = 0.94 + 0.06 * r;
    D.data[q] = base[0] * k; D.data[q + 1] = base[1] * k; D.data[q + 2] = base[2] * k; D.data[q + 3] = 255; B.data[q] = B.data[q + 1] = B.data[q + 2] = 50 + 190 * r; B.data[q + 3] = 255;
  }
  g.putImageData(D, 0, 0); gb.putImageData(B, 0, 0); return { c, size: [o.size, o.size], bump: b };
};
M('paint_greige_warm', 'Warm greige', 'wc', { color: '#B3A690', rough: 0.9 });
M('tile_white_vert', 'White tile 7.5×30, vertical stack', 'w', { gen: 'tiles', o: { base: '#F4F2EC', grout: '#E2DED5', tw: 0.075, th: 0.3, cols: 12, rows: 3, vary: 0.035, sheen: 1, gw: 0.002 }, rough: 0.18, bump: 1.2 });
M('quartz_white', 'White quartz', 'k', { gen: 'marble', o: { base: '#F2F0EB', vein: '#B5B0A6', size: 1.4, veins: 12 }, rough: 0.2 });
M('travertine', 'Travertine', 'mk', { gen: 'travertine', o: { base: '#DDD1BC', size: 1.5 }, rough: 0.6, bump: 1 });
M('wood_walnut_mid', 'Walnut veneer, medium', 'm', veneer('#7A5843', { seed: 33, vary: 0.05, cathedral: 0.15, contrast: 0.24 }));
M('ceramic_speckle', 'Speckled ceramic', 'm', { gen: 'noise', o: { base: '#DDD6C9', size: 0.4, chips: ['#8E8576', '#A79E8E', '#5F584E'], chipN: 2500, cmin: 1, cmax: 2.5, grain: 8 }, rough: 0.45 });
GEN.travertine = o => { // banded limestone with small open pores (not tiled: one tile covers 1.5 m)
  const S = 512, mk = () => { const c = mkCanvas(S, S); return [c, c.getContext('2d')]; }, [c, g] = mk(), [b, gb] = mk();
  const D = g.createImageData(S, S), B = gb.createImageData(S, S), lt = hexRgb(o.base), dk = hexRgb(tone(o.base, -0.13));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const q = (y * S + x) * 4, band = fbm(x / 220 + 3, y / 7 + fbm(x / 90, y / 60, 2) * 4, 3), cloud = fbm(x / 50 + 11, y / 50 + 5, 2);
    const t = clamp(0.5 + (band - 0.5) * 1.6 + (cloud - 0.5) * 0.4, 0, 1), pore = vnoise(x / 3, y / 1.4) > 0.84 && band < 0.5, k = pore ? 0.78 : 1, n = 10 * (vnoise(x / 1.3, y / 1.3) - 0.5);
    for (let ch = 0; ch < 3; ch++) D.data[q + ch] = (dk[ch] + (lt[ch] - dk[ch]) * t) * k + n;
    D.data[q + 3] = 255; B.data[q] = B.data[q + 1] = B.data[q + 2] = pore ? 40 : 190 + 40 * t; B.data[q + 3] = 255;
  }
  g.putImageData(D, 0, 0); gb.putImageData(B, 0, 0); return { c, size: [o.size, o.size], bump: b };
};
META.add('lampI'); META.add('lampR');
const BRONZE = mat('#94704A', 0.32, 0.85);

// soft light wash (LED strips, lit shelves, wall lights), drawn only while the lamps are on; faces +z
const GLOWTEX = {};
function glowTex(kind) {
  if (GLOWTEX[kind]) return GLOWTEX[kind];
  const c = mkCanvas(128, 128), g = c.getContext('2d');
  if (kind === 'radial') { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }
  else {
    const v = g.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.3, 'rgba(255,255,255,.45)'); v.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = v; g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = 'destination-in'; const h = g.createLinearGradient(0, 0, 128, 0); h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.12, 'rgba(0,0,0,1)'); h.addColorStop(0.88, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = h; g.fillRect(0, 0, 128, 128);
  }
  return (GLOWTEX[kind] = new THREE.CanvasTexture(c));
}
function glow(g, w, h, x, y, z, color = '#ffcf8f', a = 0.5, kind = 'top') {
  if (!LAMPS_ON.v) return null;
  const m = new THREE.MeshBasicMaterial({ map: glowTex(kind), color, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false });
  const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); me.position.set(x, y + h / 2, z); me.userData.ns = true; me.userData.noAO = true; g.add(me); return me;
}
const ledMat = () => LAMPS_ON.v ? new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd9a0', emissiveIntensity: 1.6 }) : mat('#d9d4ca', 0.5);

// ---------- small styling objects ----------
const VASES = [[[0, 0], [0.05, 0], [0.075, 0.05], [0.085, 0.11], [0.06, 0.17], [0.03, 0.2], [0.032, 0.22], [0, 0.22]], [[0, 0], [0.04, 0], [0.09, 0.06], [0.1, 0.1], [0.09, 0.14], [0.05, 0.17], [0.045, 0.19], [0, 0.19]], [[0, 0], [0.035, 0], [0.04, 0.12], [0.045, 0.24], [0.035, 0.26], [0, 0.26]]];
function vase(g, x, y, z, s, m, shape = 0) { const me = new THREE.Mesh(lathe(VASES[shape % 3].map(([r, h]) => [r * s, h * s]), 32), m); me.position.set(x, y, z); g.add(me); return me; }
const BOOKC = ['#6B5A48', '#C9BBA2', '#3F4A3C', '#8A6D50', '#E6DFD2', '#5A4A42', '#A39885'];
function bookStack(g, x, y, z, n, R) { // lying books; returns the height of the top
  let yy = y;
  for (let i = 0; i < n; i++) { const t = 0.022 + R() * 0.018, b = bx(g, 0.22 + R() * 0.06, t, 0.16 + R() * 0.05, x + (R() - 0.5) * 0.02, yy, z + (R() - 0.5) * 0.02, mat(BOOKC[Math.floor(R() * BOOKC.length)], 0.8), { r: 0.002 }); b.rotation.y = (R() - 0.5) * 0.2; yy += t; }
  return yy;
}
function booksUpright(g, x, y, z, n, R) { let xx = x; for (let i = 0; i < n; i++) { const t = 0.02 + R() * 0.02, h = 0.18 + R() * 0.06; bx(g, t, h, 0.15 + R() * 0.04, xx, y, z, mat(BOOKC[Math.floor(R() * BOOKC.length)], 0.8), { r: 0.002 }); xx += t + 0.002; } return xx; }
const BOTTLE = lathe([[0, 0], [0.037, 0], [0.038, 0.2], [0.03, 0.235], [0.013, 0.262], [0.013, 0.31], [0, 0.31]], 24);
const WINEGLASS = lathe([[0, 0], [0.035, 0], [0.035, 0.003], [0.005, 0.008], [0.004, 0.1], [0.022, 0.11], [0.038, 0.15], [0.034, 0.205], [0.0335, 0.205], [0.036, 0.15], [0.02, 0.112], [0, 0.112]], 24);
const BOTTLEM = ['#2a1a12', '#1f2a1c', '#3b1a1c', '#6e4a1c'].map(c => { const m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }); m.envMapIntensity = 1; return m; });
function bottle(g, x, y, z, k) { const b = new THREE.Mesh(BOTTLE, BOTTLEM[k % BOTTLEM.length]); b.position.set(x, y, z); g.add(b); cy(g, 0.0385, 0.0385, 0.07, x, y + 0.06, z, mat(['#EDE6D6', '#D8C9A6', '#F3F0E8'][k % 3], 0.8), 24); }
function wineGlass(g, x, y, z) { const m = new THREE.Mesh(WINEGLASS, GLASS); m.position.set(x, y, z); g.add(m); }
function bowl(g, x, y, z, r, m) { const me = new THREE.Mesh(lathe([[0, 0], [r * 0.45, 0], [r * 0.85, r * 0.22], [r, r * 0.5], [r * 0.96, r * 0.52], [r * 0.8, r * 0.27], [r * 0.4, r * 0.08], [0, r * 0.07]], 40), m); me.position.set(x, y, z); g.add(me); return me; }
function candle(g, x, y, z, h = 0.08, r = 0.028) {
  cy(g, r, r, h, x, y, z, mat('#F2EDE3', 0.7), 20);
  if (LAMPS_ON.v) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffb347', emissiveIntensity: 3 })); f.scale.y = 2; f.position.set(x, y + h + 0.016, z); f.userData.ns = true; g.add(f); }
}
function candlestick(g, x, y, z, h) { const m = new THREE.Mesh(lathe([[0, 0], [0.04, 0], [0.04, 0.008], [0.012, 0.02], [0.009, h * 0.5], [0.014, h * 0.55], [0.008, h * 0.6], [0.008, h - 0.012], [0.018, h - 0.008], [0.018, h], [0, h]], 24), BRASS); m.position.set(x, y, z); g.add(m); candle(g, x, y + h, z, 0.2, 0.011); }

// ---------- lights ----------
function sconce(p) { // bronze wall light with a frosted glass cylinder
  const g = G(), m = mat(p.c2, 0.32, 0.85), { d, h } = p, zc = d / 2 - 0.045, ya = h * 0.26;
  bx(g, 0.07, 0.16, 0.012, 0, ya - 0.08, -d / 2 + 0.006, m, { r: 0.004 });
  const arm = cy(g, 0.007, 0.007, d - 0.05, 0, 0, 0, m, 10); arm.rotation.x = Math.PI / 2; arm.position.set(0, ya, -d / 2 + 0.012 + (d - 0.05) / 2);
  cy(g, 0.03, 0.022, 0.03, 0, ya - 0.02, zc, m, 24);
  cy(g, 0.034, 0.034, h * 0.64, 0, ya + 0.01, zc, shadeMat(p.c1, false), 32);
  cy(g, 0.037, 0.037, 0.008, 0, ya + 0.01 + h * 0.64, zc, m, 24);
  glow(g, 0.7, 0.9, 0, ya + 0.15 - 0.45, -d / 2 + 0.002, '#ffcf8f', 0.45, 'radial');
  return g;
}
function petalGeo(len, wid, cup, lift) { // one petal: tapered at the hub, rounded tip, cupped across, tip curling up
  const geo = new THREE.PlaneGeometry(1, 1, 10, 16), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * 2, t = pos.getY(i) + 0.5, hw = wid / 2 * Math.pow(Math.sin(Math.PI * (0.12 + 0.82 * t)), 0.75);
    pos.setXYZ(i, 0.03 + t * len, cup * u * u * (hw / (wid / 2)) + lift * t * t, u * hw);
  }
  geo.computeVertexNormals(); return geo;
}
function petalLamp(p) { // petal ceiling light: n linen petals around a bronze hub; 'flush' sits close to the ceiling
  const g = G(), r = p.w / 2, n = p.petals || 8, metal = mat(p.c2, 0.32, 0.85), sh = shadeMat(p.c1), flush = p.style === 'flush';
  const hubY = flush ? 0.07 : 0.1, len = r * 0.9, pg = petalGeo(len, len * (flush ? 0.66 : 0.58), 0.03, flush ? 0.09 : 0.07);
  g.add(new THREE.Mesh(lathe([[0, p.h], [0.07, p.h], [0.07, p.h - 0.012], [0.055, p.h - 0.022], [0, p.h - 0.022]], 32), metal));
  cy(g, 0.006, 0.006, Math.max(0.01, p.h - hubY - 0.02), 0, hubY, 0, metal, 10);
  g.add(new THREE.Mesh(lathe([[0, hubY - 0.035], [0.03, hubY - 0.03], [0.045, hubY - 0.005], [0.03, hubY + 0.02], [0, hubY + 0.025]], 32), metal));
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(pg, sh); m.position.y = hubY - 0.012; m.rotation.order = 'YZX'; m.rotation.y = (i + 0.5) * 2 * Math.PI / n; m.rotation.z = flush ? 0.32 : 0.14; g.add(m); }
  if (LAMPS_ON.v) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffd9a0', emissiveIntensity: 2.2 })); b.position.y = hubY + 0.01; b.userData.ns = true; g.add(b); }
  return g;
}
// ---------- living room ----------
function displayUnit(p) { // walnut cabinet with open shelves above, LED strip under every shelf
  const g = G(), { w, d, h } = p, body = woodOr(p.c1, 0.45), top = woodOr(p.c2, 0.35), back = woodOr(p.c3 || p.c1, 0.55), R = rng(strHash(p.id || 'disp'));
  const baseH = 0.88, sd = Math.min(0.32, d - 0.06), zc = -d / 2 + sd / 2, led = ledMat();
  bx(g, w - 0.04, 0.08, d - 0.06, 0, 0, -0.03, DARK);
  bx(g, w, baseH - 0.11, d - 0.02, 0, 0.08, -0.01, body, { vgrain: true });
  slab(g, w + 0.01, d + 0.005, 0.03, 0, baseH - 0.03, 0, top, 0.004, 0.003);
  const n = Math.max(1, Math.round(w / 0.42)), dw = w / n;
  for (let i = 0; i < n; i++) { const x = -w / 2 + dw * (i + 0.5); front(g, dw - 0.004, baseH - 0.115, 0.019, x, 0.082, d / 2 - 0.0095, p.c1, 'flat'); bx(g, 0.012, 0.12, 0.012, x + (n === 1 || i % 2 === 0 ? 1 : -1) * (dw / 2 - 0.04), baseH - 0.3, d / 2 + 0.012, BRONZE, { r: 0.004 }); }
  const y0 = baseH, H = h - y0, ns = 3;
  bx(g, w - 0.04, H - 0.03, 0.014, 0, y0, -d / 2 + 0.007, back, { vgrain: true });
  for (const s of [-1, 1]) bx(g, 0.022, H, sd, s * (w / 2 - 0.011), y0, zc, body, { vgrain: true });
  bx(g, w, 0.03, sd, 0, h - 0.03, zc, body);
  const lv = [...Array(ns)].map((_, i) => y0 + (H - 0.03) * (i + 1) / (ns + 1));
  for (const y of lv) slab(g, w - 0.044, sd - 0.01, 0.025, 0, y, zc - 0.005, body, 0.002, 0.003);
  const floors = [y0, ...lv.map(v => v + 0.025)], tops = [...lv, h - 0.03], xl = -w / 2 + 0.07, xr = w / 2 - 0.07, zs = zc + 0.01;
  for (let i = 0; i < floors.length; i++) {
    const y = floors[i], yc = tops[i];
    bx(g, w - 0.08, 0.005, 0.02, 0, yc - 0.006, zc + sd / 2 - 0.035, led);
    glow(g, w - 0.05, (yc - y) * 0.96, 0, y, -d / 2 + 0.016, '#ffc98a', 0.55);
    if (p.fill === 'bar') {
      if (i === 0) for (let k = 0; k < 3; k++) bottle(g, xl + 0.02 + k * 0.09, y, zs, k + 1);
      else if (i === 1) { const m = Math.max(2, Math.floor((xr - xl) / 0.085)); for (let k = 0; k < m; k++) bottle(g, xl + 0.02 + k * (xr - xl - 0.04) / (m - 1), y, zs, k); }
      else if (i === 2) { const m = Math.max(2, Math.floor((xr - xl) / 0.08)); for (let k = 0; k < m; k++) wineGlass(g, xl + 0.02 + k * (xr - xl - 0.04) / (m - 1), y, zs); }
      else { vase(g, xl + 0.06, y, zs, 0.9, GLASS, 1); bottle(g, xr - 0.05, y, zs, 2); }
    } else if (p.fill !== 'none') {
      const cer = () => mat(['#D9D2C5', '#6E5B4A', '#2E2B28', '#B9A48A'][Math.floor(R() * 4)], 0.4);
      if (i === 0) { bookStack(g, xl + 0.1, y, zs, 3, R); vase(g, xr - 0.07, y, zs, 1.1, cer(), 1); }
      else if (i === 1) { vase(g, xl + 0.08, y, zs, 0.9, cer(), 0); bowl(g, xr - 0.1, y, zs, 0.08, cer()); }
      else if (i === 2) { booksUpright(g, xl, y, zs, 6, R); vase(g, xr - 0.06, y, zs, 0.7, cer(), 2); }
      else { vase(g, (xl + xr) / 2, y, zs, 1.0, cer(), R() < 0.5 ? 0 : 1); }
    }
  }
  return g;
}
function coffeeBlock(p) { // thick stone top on two plinths
  const g = G(), m = woodOr(p.c1, 0.5), { w, d, h } = p, t = 0.08;
  bx(g, w, t, d, 0, h - t, 0, m, { r: 0.01 });
  for (const s of [-1, 1]) bx(g, 0.22, h - t, d * 0.66, s * (w / 2 - 0.3), 0, 0, m, { r: 0.006 });
  if (p.decor) { const R = rng(strHash(p.id || 'cb')), yb = bookStack(g, -w * 0.18, h, -0.03, 2, R); candle(g, -w * 0.18 + 0.06, yb, 0.0, 0.07); candle(g, -w * 0.18 - 0.04, yb, -0.05, 0.1); bowl(g, w * 0.24, h, 0.08, 0.11, BRONZE); vase(g, w * 0.06, h, -0.14, 0.95, mat('#5E4A38', 0.35), 1); }
  return g;
}
// ---------- dining ----------
function chairUph(p) { // upholstered chair with a wrap-around back on tapered walnut legs
  const g = G(), wd = woodOr(p.c1, 0.45), f = fab(p.c2), { w, d, h } = p, sh = 0.47;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = cy(g, 0.016, 0.011, sh - 0.075, sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.065), wd, 12); l.rotation.x = sz * 0.05; l.rotation.z = -sx * 0.03; }
  cushion(g, w, 0.1, d - 0.04, 0, sh - 0.1, 0.02, f, 0.04);
  const bw = w + 0.01, bh = h - sh + 0.07, geo = new THREE.BoxGeometry(bw, bh, 0.055, 18, 6, 1), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), u = x / (bw / 2), t = (y + bh / 2) / bh; pos.setX(i, x * (1 - 0.08 * t)); pos.setZ(i, pos.getZ(i) + 0.075 * u * u); pos.setY(i, y - 0.03 * u * u * t); }
  geo.computeVertexNormals(); worldUV(geo);
  const back = new THREE.Mesh(geo, f); back.position.set(0, sh - 0.07 + bh / 2, -d / 2 + 0.04); back.rotation.x = -0.1; g.add(back);
  return g;
}
function sideboardFluted(p) { // reeded walnut doors on tapered legs
  const g = G(), { w, d, h } = p, body = woodOr(p.c2, 0.45), leg = 0.16;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = sqLeg(g, 0.04, 0.026, leg, sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06), body); l.rotation.z = -sx * 0.06; }
  bx(g, w, h - leg - 0.025, d - 0.02, 0, leg, -0.01, body, { r: 0.004 });
  slab(g, w + 0.01, d + 0.005, 0.025, 0, h - 0.025, 0, body, 0.006, 0.004);
  const n = Math.max(1, Math.round(w / 0.45)), dw = w / n;
  for (let i = 0; i < n; i++) front(g, dw - 0.006, h - leg - 0.05, 0.022, -w / 2 + dw * (i + 0.5), leg + 0.012, d / 2 - 0.006, p.c1, 'fluted');
  if (p.decor) { const R = rng(strHash(p.id || 'sb')); bookStack(g, -w * 0.1, h, 0.0, 2, R); bowl(g, w * 0.08, h, 0.02, 0.12, mat('#3A332C', 0.35)); candlestick(g, w * 0.25, h, -0.06, 0.18); candlestick(g, w * 0.3, h, -0.02, 0.15); vase(g, w * 0.42, h, -0.05, 1.1, mat('#5E4A38', 0.35), 0); }
  return g;
}
function lampCeramic(p) { // table lamp: speckled ceramic body, linen drum shade
  const g = G(), base = woodOr(p.c2, 0.45);
  g.add(new THREE.Mesh(lathe([[0, 0], [0.07, 0], [0.105, 0.04], [0.125, 0.13], [0.115, 0.22], [0.07, 0.29], [0.035, 0.31], [0.035, 0.33], [0, 0.33]], 40), base));
  cy(g, 0.012, 0.012, 0.06, 0, 0.33, 0, BRASS, 12);
  lampShade(g, p.w * 0.4, p.w * 0.5, 0.27, p.h - 0.28, p.c1);
  blob(g, 0.012, 0, p.h + 0.005, 0, BRASS);
  return g;
}
// ---------- kitchen ----------
function tallCab(p) { // full-height column (pantry or integrated fridge) with two flat doors
  const g = G(), { w, h, d } = p, body = mat(p.c1, 0.5), z = d / 2 - 0.011, lo = (h - 0.1) * 0.62;
  bx(g, w - 0.02, 0.1, d - 0.08, 0, 0, -0.03, DARK);
  bx(g, w, h - 0.1, d - 0.02, 0, 0.1, -0.01, body, { vgrain: true });
  front(g, w - 0.004, lo - 0.004, 0.019, 0, 0.102, z, p.c1, 'flat');
  front(g, w - 0.004, h - 0.1 - lo - 0.006, 0.019, 0, 0.1 + lo + 0.002, z, p.c1, 'flat');
  if (p.knob && p.knob !== 'none') { handle(g, p.knob, -w / 2 + 0.045, 0.1 + lo - 0.25, z + 0.0095, w, false, STEEL, 0.4); handle(g, p.knob, -w / 2 + 0.045, 0.1 + lo + 0.12, z + 0.0095, w, false); }
  return g;
}
function glassDoors(g, p, n, z) { // framed clear-glass doors with a lit interior, glasses and white dishes
  const { w, h, d } = p, dw = w / n, fm = mat(p.c1, 0.42), inside = woodOr(p.c1, 0.55), R = rng(strHash(p.id || 'gd')), fw = 0.05;
  bx(g, w - 0.036, h - 0.036, 0.006, 0, 0.018, -d / 2 + 0.016, mat('#E9E2D4', 0.6));
  for (const y of [h / 3, 2 * h / 3]) slab(g, w - 0.04, d - 0.07, 0.014, 0, y, -0.02, inside, 0.002, 0.002);
  const led = ledMat();
  for (let k = 0; k < 3; k++) {
    const y = k === 0 ? 0.018 : k * h / 3 + 0.014, yc = k === 2 ? h - 0.018 : (k + 1) * h / 3;
    bx(g, w - 0.06, 0.005, 0.015, 0, yc - 0.006, d / 2 - 0.06, led); glow(g, w - 0.05, (yc - y) * 0.95, 0, y, -d / 2 + 0.02, '#ffd29a', 0.6);
    const xs = -w / 2 + 0.08, xe = w / 2 - 0.08;
    if (k === 2) { const m = Math.max(2, Math.floor((xe - xs) / 0.08)); for (let i = 0; i < m; i++) wineGlass(g, xs + i * (xe - xs) / (m - 1), y, -0.03); }
    else if (k === 1) { for (let i = 0; i < 2; i++) bowl(g, xs + 0.04 + i * 0.16, y, -0.03, 0.065, PORC); for (let i = 0; i < 3; i++) cy(g, 0.04, 0.036, 0.09, xe - 0.02 - i * 0.09, y, -0.02, PORC, 24); }
    else { for (let i = 0; i < 6; i++) cy(g, 0.11, 0.1, 0.012, xs + 0.1, y + i * 0.013, -0.04, PORC, 32); for (let i = 0; i < 3; i++) bowl(g, xe - 0.08, y + i * 0.03, -0.03, 0.07, PORC); }
  }
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + dw * (i + 0.5);
    bx(g, dw - 0.004, fw, 0.019, x, 0.002, z, fm); bx(g, dw - 0.004, fw, 0.019, x, h - fw - 0.002, z, fm);
    for (const s of [-1, 1]) bx(g, fw, h - 2 * fw - 0.004, 0.019, x + s * (dw / 2 - fw / 2 - 0.002), fw + 0.002, z, fm);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(dw - 2 * fw, h - 2 * fw - 0.004), GLASS); pane.position.set(x, h / 2, z + 0.004); pane.userData.noAO = true; g.add(pane);
    if (p.knob && p.knob !== 'none') handle(g, p.knob, x + (n === 1 || i % 2 === 0 ? 1 : -1) * (dw / 2 - 0.03), 0.08, z + 0.0095, dw, false);
  }
}
// misty landscape painting (as above the sofa and the sideboard in the renders)
function landscapeMat(c1, c2, seed, aspect) {
  const k = 'land' + c1 + c2 + seed + aspect.toFixed(2); if (RUGTEX.has(k)) return RUGTEX.get(k);
  const W = 1024, H = Math.round(W / aspect), cv = mkCanvas(W, H), g = cv.getContext('2d'), R = rng(seed), hz = H * (0.5 + R() * 0.08);
  const sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, tone(c1, -0.08)); sky.addColorStop(1, tone(c1, 0.3)); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { g.fillStyle = rgba(tone(c1, R() < 0.5 ? 0.35 : -0.12), 0.1); g.beginPath(); g.ellipse(R() * W, R() * hz * 0.9, 60 + R() * 160, 10 + R() * 30, 0, 0, 7); g.fill(); }
  const ridge = (y0, amp, col, a, f) => { g.fillStyle = rgba(col, a); g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 6) g.lineTo(x, y0 - amp * fbm(x / f + y0, y0 * 0.01, 3)); g.lineTo(W, H); g.fill(); };
  ridge(hz, H * 0.14, mixHex(c1, c2, 0.3), 0.55, 220); ridge(hz + H * 0.04, H * 0.1, mixHex(c1, c2, 0.5), 0.7, 140);
  const water = tone(c1, 0.22), wx = W * (0.35 + R() * 0.3); g.fillStyle = water; g.beginPath(); g.moveTo(wx - W * 0.04, hz + H * 0.05); g.bezierCurveTo(wx + W * 0.1, hz + H * 0.15, wx - W * 0.3, hz + H * 0.3, wx - W * 0.15, H); g.lineTo(wx + W * 0.35, H); g.bezierCurveTo(wx + W * 0.05, hz + H * 0.3, wx + W * 0.2, hz + H * 0.14, wx + W * 0.04, hz + H * 0.05); g.fill();
  for (let i = 0; i < 40; i++) { g.strokeStyle = rgba(tone(c1, 0.4), 0.25); g.lineWidth = 1 + R() * 2; const y = hz + H * 0.08 + R() * H * 0.4, x = wx - W * 0.1 + (R() - 0.5) * W * 0.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + R() * 50, y); g.stroke(); }
  const tree = (cx, cy, r, dark) => { for (let i = 0; i < 260; i++) { const a = R() * 6.28, rr = r * Math.sqrt(R()); g.fillStyle = rgba(tone(c2, (R() - 0.5) * 0.5 - (dark ? 0.25 : 0)), 0.18 + R() * 0.2); g.beginPath(); g.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 1.2, 4 + R() * 12, 3 + R() * 8, R() * 3, 0, 7); g.fill(); } g.strokeStyle = rgba(tone(c2, -0.5), 0.5); g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy + r * 0.6); g.lineTo(cx + (R() - 0.5) * 6, cy + r * 1.6); g.stroke(); };
  for (let i = 0; i < 9; i++) { const left = i < 5, cx = left ? R() * W * 0.32 : W * (0.68 + R() * 0.32), r = H * (0.08 + R() * 0.1); tree(cx, hz - r * 0.2 + R() * H * 0.12, r, false); }
  for (let i = 0; i < 6; i++) tree(W * (0.15 + R() * 0.7), hz - H * 0.02, H * 0.04, false);
  g.fillStyle = rgba(tone(c2, -0.35), 0.75); g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H - H * 0.08 - H * 0.06 * fbm(x / 90, 7, 2)); g.lineTo(W, H); g.fill();
  const id = g.getImageData(0, 0, W, H), dd = id.data; for (let i = 0; i < dd.length; i += 4) { const p = i / 4, v = (vnoise((p % W) / 1.6, Math.floor(p / W) / 1.6) - 0.5) * 16; dd[i] += v; dd[i + 1] += v; dd[i + 2] += v; } g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  const m = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.003, roughness: 0.7 }); RUGTEX.set(k, m); return m;
}
function landscapeArt(p) {
  const g = G(), fm = mat(p.c3, 0.35, 0.6), fw = 0.035;
  for (const [w, h, x, y] of [[p.w, fw, 0, 0], [p.w, fw, 0, p.h - fw], [fw, p.h, -p.w / 2 + fw / 2, 0], [fw, p.h, p.w / 2 - fw / 2, 0]]) bx(g, w, h, 0.04, x, y, 0, fm, { r: 0.004 });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(p.w - 2 * fw, p.h - 2 * fw), landscapeMat(p.c1, p.c2, strHash(p.id || 'l'), (p.w - 2 * fw) / (p.h - 2 * fw))); pl.position.set(0, p.h / 2, 0.004); g.add(pl);
  bx(g, p.w - 2 * fw, p.h - 2 * fw, 0.012, 0, fw, -0.008, mat('#e8e4dc', 0.9));
  return g;
}
{ const base = CAT.art.build; CAT.art.style = 'abstract'; CAT.art.params = [{ k: 'style', label: 'Motif', type: 'select', opts: [['abstract', 'Abstract'], ['landscape', 'Misty landscape']] }]; CAT.art.build = p => p.style === 'landscape' ? landscapeArt(p) : base(p); }
CAT.dining.style = 'classic'; CAT.dining.params = [{ k: 'style', label: 'Shape', type: 'select', opts: [['classic', 'Square legs, apron'], ['soft', 'Rounded corners, tapered legs']] }];
const KNOBS = { k: 'knob', label: 'Handles', type: 'select', opts: [['knob', 'Knobs (current)'], ['bar', 'Bar handles'], ['none', 'Handleless']] };
for (const t of ['base', 'sink', 'oven', 'dishwasher', 'counter_open', 'upper']) CAT[t].params = [...CAT[t].params, KNOBS];

def('sconce', { name: 'Wall light', cat: 'Living', w: 0.1, d: 0.16, h: 0.34, y: 1.45, c1: '#F4EBDD', c2: '#94704A', lamp: true, lampI: 0.9, lampR: 3.5, colors: [['c1', 'Glass'], ['c2', 'Metal']], wallSnap: true, build: sconce });
def('petal', { name: 'Petal ceiling light', cat: 'Dining', w: 0.7, d: 0.7, h: 0.75, hang: true, c1: '#EADBC2', c2: '#94704A', style: 'pendant', petals: 8, lamp: true, colors: [['c1', 'Petals'], ['c2', 'Metal']], params: [{ k: 'style', label: 'Mount', type: 'select', opts: [['pendant', 'Pendant'], ['flush', 'Close to the ceiling']] }, { k: 'h', label: 'Drop from ceiling', type: 'len', min: 0.2, max: 1.6 }, { k: 'petals', label: 'Petals', type: 'int', min: 5, max: 12 }], build: petalLamp });
def('display', { name: 'Lit display shelving', cat: 'Living', w: 0.8, d: 0.42, h: 2.25, c1: 'wood_walnut', c2: 'wood_walnut', c3: 'wood_walnut', fill: 'decor', colors: [['c1', C.body, 'm'], ['c2', C.top, 'm'], ['c3', 'Back panel', 'm']], params: [{ k: 'fill', label: 'Contents', type: 'select', opts: [['decor', 'Vases and books'], ['bar', 'Bar: bottles and glasses'], ['none', 'Empty']] }], wallSnap: true, build: displayUnit });
def('coffee_block', { name: 'Stone coffee table', cat: 'Living', w: 1.2, d: 0.7, h: 0.4, c1: 'travertine', decor: true, colors: [['c1', C.main, 'm']], params: [{ k: 'decor', label: 'Styling (books, candles, bowl)', type: 'bool' }], build: coffeeBlock });
def('side_drum', { name: 'Drum side table', cat: 'Living', w: 0.4, d: 0.4, h: 0.55, c1: '#94704A', colors: [['c1', C.main]], build: p => { const g = G(), m = mat(p.c1, 0.3, 0.85), r = p.w / 2, h = p.h; g.add(new THREE.Mesh(lathe([[0, 0], [r * 0.85, 0], [r * 0.85, 0.012], [r * 0.6, 0.05], [r * 0.48, h * 0.45], [r * 0.6, h - 0.09], [r * 0.98, h - 0.035], [r, h], [0, h]], 48), m)); return g; } });
def('chair_uph', { name: 'Upholstered dining chair', cat: 'Dining', w: 0.5, d: 0.56, h: 0.86, c1: 'wood_walnut', c2: '#D9D0C1', colors: [['c1', C.legs, 'm'], ['c2', C.seat]], build: chairUph });
def('sideboard_fluted', { name: 'Fluted sideboard', cat: 'Living', w: 1.8, d: 0.45, h: 0.8, c1: '#5E4231', c2: 'wood_walnut', decor: true, colors: [['c1', C.front], ['c2', C.body, 'm']], params: [{ k: 'decor', label: 'Styling (candles, bowl, books)', type: 'bool' }], wallSnap: true, build: sideboardFluted });
def('lamp_ceramic', { name: 'Ceramic table lamp', cat: 'Decor', w: 0.4, d: 0.4, h: 0.66, y: 0.8, c1: '#EFE6D6', c2: 'ceramic_speckle', lamp: true, colors: [['c1', 'Shade'], ['c2', 'Base', 'm']], build: lampCeramic });
def('tall_cab', { name: 'Tall cabinet / built-in fridge', cat: 'Kitchen', w: 0.6, d: 0.6, h: 2.36, c1: '#F2F2EF', knob: 'bar', colors: [['c1', C.front]], params: [KNOBS], wallSnap: true, build: tallCab });
