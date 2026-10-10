// ---------- furniture & fixtures: parametric builders ----------
// Local frame: footprint centred on origin, back at -d/2, front at +d/2, floor at y = 0. Sizes in metres, real-world defaults.
const CAT = {};
const CATS = ['Living', 'Dining', 'Bedroom', 'Kitchen', 'Bath', 'Outdoor', 'Decor', 'Structure'];
function def(type, o) { CAT[type] = Object.assign({ type, colors: [], params: [], wallSnap: false, y: 0 }, o); }
const META = new Set(['type', 'name', 'cat', 'colors', 'params', 'wallSnap', 'build', 'hang', 'lamp', 'y', 'w', 'd', 'h']);
function itemDefaults(d) { const o = {}; for (const k in d) if (!META.has(k)) o[k] = d[k]; return o; }
const G = () => new THREE.Group();
const LAMPS_ON = { v: false };
const isHex = c => typeof c === 'string' && c[0] === '#';
function shadeMat(c, double = true) {
  const m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.9, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), side: double ? THREE.DoubleSide : THREE.FrontSide, transmission: 0 });
  if (LAMPS_ON.v) { m.emissive = new THREE.Color('#ffd9a0'); m.emissiveIntensity = 0.9; }
  m.envMapIntensity = ENV_I.v; return m;
}
const woodOr = (c, r = 0.5) => isHex(c) ? mat(c, r) : getMat(c);
const BLACKM = mat('#1d1e21', 0.42, 0.55), BRASS = mat('#b8955c', 0.3, 0.9), CHROME = mat('#dfe3e6', 0.1, 1);
const PORC = new THREE.MeshPhysicalMaterial({ color: '#fbfbf9', roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08 }); MATC.set('porcelain', PORC);
const OPAL = new THREE.MeshPhysicalMaterial({ color: '#f6f2ea', roughness: 0.35, transmission: 0, emissive: '#000000' }); MATC.set('opal', OPAL);

// ---------- door and front textures: routed kitchen doors, panel doors, wardrobe frames, leaded glass ----------
function frontMat(kind, w, h, color) {
  const key = `f|${kind}|${w.toFixed(2)}|${h.toFixed(2)}|${color}`;
  if (MATC.has(key)) return MATC.get(key);
  const ppm = 520, cw = clamp(Math.round(w * ppm), 16, 1280), ch = clamp(Math.round(h * ppm), 16, 1280), sx = cw / w, sy = ch / h;
  const cv = mkCanvas(cw, ch), g = cv.getContext('2d'), X = v => v * sx, Y = v => v * sy;
  g.fillStyle = color; g.fillRect(0, 0, cw, ch);
  const groove = path => { g.lineJoin = 'round'; g.save(); g.translate(1.6, 1.8); g.strokeStyle = 'rgba(0,0,0,.24)'; g.lineWidth = 5; path(); g.stroke(); g.restore(); g.save(); g.translate(-1.2, -1.2); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2.5; path(); g.stroke(); g.restore(); };
  const rrect = (x0, y0, x1, y1, r) => () => { g.beginPath(); g.roundRect(X(x0), Y(y0), X(x1 - x0), Y(y1 - y0), r); };
  const cath = (m, arch, wave) => () => { // cathedral outline: arched top with shoulders, wavy bottom (as on the kitchen doors)
    const x0 = X(m), x1 = X(w - m), y0 = Y(m), y1 = Y(h - m), cx = (x0 + x1) / 2, a = Y(arch), wv = Y(wave);
    g.beginPath(); g.moveTo(x0, y1 - wv * 0.15); g.lineTo(x0, y0 + a);
    g.bezierCurveTo(x0 + (cx - x0) * 0.04, y0 + a * 0.2, cx - (cx - x0) * 0.62, y0, cx, y0);
    g.bezierCurveTo(cx + (x1 - cx) * 0.62, y0, x1 - (x1 - cx) * 0.04, y0 + a * 0.2, x1, y0 + a);
    g.lineTo(x1, y1 - wv * 0.15);
    g.bezierCurveTo(x1 - (x1 - cx) * 0.3, y1 + wv * 0.15, cx + (x1 - cx) * 0.4, y1 - wv, cx, y1 - wv);
    g.bezierCurveTo(cx - (cx - x0) * 0.4, y1 - wv, x0 + (cx - x0) * 0.3, y1 + wv * 0.15, x0, y1 - wv * 0.15);
    g.closePath();
  };
  const raised = (x0, y0, x1, y1) => { // raised panel, light from the top left
    const a = X(x0), b = Y(y0), c = X(x1), d = Y(y1), bv = 9;
    const gr = g.createLinearGradient(a, b, c, d); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.05)'); g.fillStyle = gr; g.fillRect(a + bv, b + bv, c - a - 2 * bv, d - b - 2 * bv);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(a, b); g.lineTo(c, b); g.lineTo(c - bv, b + bv); g.lineTo(a + bv, b + bv); g.lineTo(a + bv, d - bv); g.lineTo(a, d); g.fill();
    g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.moveTo(c, b); g.lineTo(c, d); g.lineTo(a, d); g.lineTo(a + bv, d - bv); g.lineTo(c - bv, d - bv); g.lineTo(c - bv, b + bv); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.5; g.strokeRect(a, b, c - a, d - b);
  };
  if (kind === 'cath') { if (w >= 0.3) groove(cath(0.055, Math.min(0.045, h * 0.065), Math.min(0.04, h * 0.06))); else groove(rrect(0.04, 0.05, w - 0.04, h - 0.05, 10)); }
  else if (kind === 'drawer') groove(rrect(0.035, Math.min(0.03, h * 0.18), w - 0.035, h - Math.min(0.03, h * 0.18), 8));
  else if (kind === 'glass') {
    const path = cath(0.065, Math.min(0.05, h * 0.07), Math.min(0.045, h * 0.065));
    g.save(); path(); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#6a6655'); gr.addColorStop(0.5, '#4d4a3e'); gr.addColorStop(1, '#3a3830'); g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
    for (const f of [0.36, 0.66]) { g.fillStyle = 'rgba(232,214,160,.6)'; g.fillRect(0, ch * f, cw, 5); for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(240,240,236,${0.35 + 0.1 * (i % 3)})`; g.fillRect(cw * (0.1 + i * 0.14), ch * f - 30, cw * 0.08, 30); } }
    const sh = g.createLinearGradient(0, 0, cw, ch); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, cw, ch);
    g.strokeStyle = 'rgba(250,250,247,.85)'; g.lineWidth = 3;
    for (const f of [1 / 3, 2 / 3]) { g.beginPath(); g.moveTo(cw * f, 0); g.lineTo(cw * f, ch); g.stroke(); g.beginPath(); g.moveTo(0, ch * f); g.lineTo(cw, ch * f); g.stroke(); }
    g.fillStyle = '#fff'; for (const fx of [1 / 3, 2 / 3]) for (const fy of [1 / 3, 2 / 3]) { g.beginPath(); g.arc(cw * fx, ch * fy, 5, 0, 7); g.fill(); }
    g.restore(); groove(path);
  }
  else if (kind === 'fluted') { // vertical reeds over straight grain
    plankFill(g, 0, 0, cw, ch, color, rng(strHash(key)), false, 0, false);
    const n = Math.max(4, Math.round(w / 0.026)), pw = cw / n;
    for (let i = 0; i < n; i++) { const x0 = i * pw, gr = g.createLinearGradient(x0, 0, x0 + pw, 0); gr.addColorStop(0, 'rgba(0,0,0,.34)'); gr.addColorStop(0.2, 'rgba(255,255,255,.08)'); gr.addColorStop(0.45, 'rgba(255,255,255,.16)'); gr.addColorStop(0.8, 'rgba(0,0,0,.06)'); gr.addColorStop(1, 'rgba(0,0,0,.36)'); g.fillStyle = gr; g.fillRect(x0, 0, pw, ch); }
  }
  else if (kind === 'panel3') { const m = 0.11; for (const [lo, hi] of [[0.58, 0.92], [0.34, 0.52], [0.07, 0.28]]) raised(m, h * (1 - hi), w - m, h * (1 - lo)); }
  else if (kind === 'panel1') raised(0.06, 0.06, w - 0.06, h - 0.06);
  else if (kind === 'frame3') { const m = 0.07, s = (h - 2 * m) / 3; for (let i = 0; i < 3; i++) groove(rrect(m, m + i * s + 0.01, w - m, m + (i + 1) * s - 0.01, 2)); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  const bt = new THREE.CanvasTexture(cv); bt.anisotropy = maxAniso;
  const mm = new THREE.MeshStandardMaterial({ map: t, bumpMap: kind === 'glass' ? null : bt, bumpScale: 0.008, roughness: kind === 'glass' ? 0.12 : 0.42 }); mm.envMapIntensity = ENV_I.v; MATC.set(key, mm); return mm;
}
// a door/drawer front with its pattern on the +z face (and -z when both = true); softened edges
function front(g, w, h, t, x, y, z, color, kind = 'flat', both = false) {
  const side = isHex(color) ? mat(color, 0.42) : getMat(color);
  const fm = !isHex(color) || kind === 'flat' ? side : frontMat(kind, w, h, color);
  const geo = new RoundedBoxGeometry(w, h, t, 2, Math.min(0.003, t / 2 - 1e-4));
  if (!isHex(color)) worldUV(geo, true);
  const me = new THREE.Mesh(geo, [side, side, side, side, fm, both ? fm : side]); me.position.set(x, y + h / 2, z); g.add(me);
  if (!isHex(color) && kind !== 'flat') { const p = bx(g, w - 0.12, h - 0.12, 0.008, x, y + 0.06, z + t / 2, side, { r: 0.003, vgrain: true }); p.userData.ns = true; }
  return me;
}
const KNOB = (() => { const g = lathe([[0, 0], [0.005, 0], [0.005, 0.012], [0.012, 0.017], [0.015, 0.024], [0.013, 0.029], [0, 0.031]], 20); g.rotateX(Math.PI / 2); return g; })();
function handle(g, type, x, y, z, w, horiz, m = STEEL, len = 0.2) {
  if (type === 'none') return;
  if (type === 'bar') {
    const L = horiz ? Math.min(0.42, w * 0.6) : len, bar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, L, 14), m);
    if (horiz) bar.rotation.z = Math.PI / 2; bar.position.set(x, y, z + 0.03); g.add(bar);
    for (const s of [-1, 1]) { const so = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 10), m); so.rotation.x = Math.PI / 2; so.position.set(x + (horiz ? s * L * 0.42 : 0), y + (horiz ? 0 : s * L * 0.42), z + 0.015); g.add(so); }
    return;
  }
  const k = new THREE.Mesh(KNOB, m); k.position.set(x, y, z); g.add(k);
}
// doors or drawers across a cabinet front. o: { kind, knob, upper, z }
function cabinetFronts(g, w, h, d, y, c, n, drawers, o = {}) {
  const kind = o.kind || 'flat', z = o.z ?? d / 2, knob = o.knob || 'knob';
  if (drawers) {
    const dh = h / drawers;
    for (let i = 0; i < drawers; i++) { const yy = y + i * dh + 0.002; front(g, w - 0.004, dh - 0.004, 0.019, 0, yy, z, c, kind === 'flat' ? 'flat' : 'drawer'); handle(g, knob, 0, yy + dh * (knob === 'bar' ? 0.78 : 0.6), z + 0.0095, w, true); }
    return;
  }
  const dw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + dw * (i + 0.5), s = n === 1 ? 1 : (i % 2 ? -1 : 1);
    front(g, dw - 0.004, h - 0.004, 0.019, x, y + 0.002, z, c, kind === 'shaker' ? 'drawer' : kind);
    handle(g, knob, x + s * (dw / 2 - 0.045), o.upper ? y + 0.07 : y + h - 0.08, z + 0.0095, dw, false);
  }
}

// ---------- seating ----------
function cushion(g, w, h, d, x, y, z, m, r = 0.06) { return bx(g, w, h, d, x, y, z, m, { r: Math.min(r, h / 2 - 0.002), seg: 4 }); }
function pillow(g, w, h, t, x, y, z, m, rx = 0, rz = 0, ry = 0) { const me = new THREE.Mesh(pillowGeo(w, h, t), m); me.position.set(x, y + h / 2, z); me.rotation.set(rx, ry, rz); g.add(me); return me; }
function tuft(g, m, x0, x1, y0, y1, z, nx, ny, parent) { const geo = new THREE.SphereGeometry(0.009, 10, 8); for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const b = new THREE.Mesh(geo, m); b.position.set(x0 + (x1 - x0) * (i + 0.5) / nx + (j % 2 ? (x1 - x0) / nx / 2 * 0 : 0), y0 + (y1 - y0) * (j + 0.5) / ny, z); b.scale.z = 0.5; (parent || g).add(b); } }
function woodLegs(g, w, d, h, m, inset = 0.05) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, 0.018, 0.012, h, sx * (w / 2 - inset), 0, sz * (d / 2 - inset), m, 16); }
function backCushion(g, f, fb, w, h, x, y, z, rot, rotY = 0) { // tilted back cushion with button tufting
  const c = new THREE.Group(); c.position.set(x, y, z); c.rotation.order = 'YXZ'; c.rotation.set(rot, rotY, 0); g.add(c);
  cushion(c, w, h, 0.16, 0, 0, 0, f, 0.07);
  tuft(g, fb, -w / 2 + 0.07, w / 2 - 0.07, 0.1, h - 0.08, 0.079, Math.max(2, Math.round(w / 0.22)), 2, c);
  return c;
}
function sofa(p) {
  const g = G(), f = fab(p.c1), fb = fab(tone(p.c1, -0.3)), l = woodOr(p.c2), { w, d, h } = p, arm = 0.14, leg = 0.13;
  cushion(g, w, 0.2, d, 0, leg, 0, f, 0.025);
  cushion(g, w, h - leg - 0.02, 0.17, 0, leg, -d / 2 + 0.085, f, 0.05);
  for (const s of [-1, 1]) { cushion(g, arm, 0.6 - leg, d, s * (w / 2 - arm / 2), leg, 0, f, 0.06); }
  const n = Math.max(1, Math.round((w - 2 * arm) / 0.62)), cw = (w - 2 * arm) / n, sy = leg + 0.2;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + arm + cw * (i + 0.5);
    cushion(g, cw - 0.012, 0.15, d - 0.2, x, sy, 0.09, f, 0.06);
    backCushion(g, f, fb, cw - 0.02, h - sy - 0.18, x, sy + 0.13, -d / 2 + 0.24, -0.12);
  }
  woodLegs(g, w, d, leg, l);
  if (p.c3 && w > 1.2) { const pm = fab(p.c3, 'velvet'); for (const s of [-1, 1]) pillow(g, 0.45, 0.45, 0.16, s * (w / 2 - arm - 0.3), sy + 0.13, -d / 2 + 0.36, pm, -0.28, s * 0.1); }
  return g;
}
function sofaL(p) {
  const g = G(), f = fab(p.c1), fb = fab(tone(p.c1, -0.3)), l = woodOr(p.c2), { w, d, h } = p, cl = Math.max(p.cl || 1.8, d + 0.5), arm = 0.14, leg = 0.13, bk = 0.17;
  const x0 = -w / 2, z0 = -d / 2, sy = leg + 0.2;
  cushion(g, w, 0.2, d, 0, leg, 0, f, 0.025); cushion(g, d, 0.2, cl - d + 0.02, x0 + d / 2, leg, z0 + d + (cl - d) / 2 - 0.01, f, 0.025);
  cushion(g, w, h - leg - 0.02, bk, 0, leg, z0 + bk / 2, f, 0.05); cushion(g, bk, h - leg - 0.02, cl, x0 + bk / 2, leg, z0 + cl / 2, f, 0.05);
  cushion(g, arm, 0.6 - leg, d, w / 2 - arm / 2, leg, 0, f, 0.06); cushion(g, d, 0.6 - leg, arm, x0 + d / 2, leg, z0 + cl - arm / 2, f, 0.06);
  const mainS = x0 + d, mainL = w / 2 - arm - mainS, n = Math.max(1, Math.round(mainL / 0.62));
  for (let i = 0; i < n; i++) { const x = mainS + mainL / n * (i + 0.5); cushion(g, mainL / n - 0.012, 0.15, d - bk - 0.02, x, sy, z0 + bk + (d - bk) / 2, f, 0.06); backCushion(g, f, fb, mainL / n - 0.02, h - sy - 0.18, x, sy + 0.13, z0 + bk + 0.07, -0.12); }
  cushion(g, d - bk - 0.012, 0.15, d - bk - 0.02, x0 + bk + (d - bk) / 2, sy, z0 + bk + (d - bk) / 2, f, 0.06);
  backCushion(g, f, fb, d - bk - 0.04, h - sy - 0.18, x0 + bk + (d - bk) / 2, sy + 0.13, z0 + bk + 0.07, -0.12);
  const retS = z0 + d, retL = cl - d - arm, m2 = Math.max(1, Math.round(retL / 0.62));
  for (let i = 0; i < m2; i++) { const z = retS + retL / m2 * (i + 0.5); cushion(g, d - bk - 0.02, 0.15, retL / m2 - 0.012, x0 + bk + (d - bk) / 2, sy, z, f, 0.06); backCushion(g, f, fb, retL / m2 - 0.02, h - sy - 0.18, x0 + bk + 0.07, sy + 0.13, z, -0.12, Math.PI / 2); }
  woodLegs(g, w, d, leg, l); cy(g, 0.018, 0.012, leg, x0 + 0.05, 0, z0 + cl - 0.05, l, 16); cy(g, 0.018, 0.012, leg, x0 + d - 0.05, 0, z0 + cl - 0.05, l, 16);
  if (p.c3) { const pm = fab(p.c3, 'velvet'); [[mainS + mainL - 0.35, z0 + 0.34, 0], [x0 + 0.34, z0 + d + 0.25, Math.PI / 2], [mainS + 0.45, z0 + 0.34, 0.12]].forEach(([x, z, r]) => pillow(g, 0.45, 0.45, 0.16, x, sy + 0.13, z, pm, -0.28, 0, r)); }
  if (p.side === 'R') g.scale.x = -1;
  return g;
}
function table(p, round) {
  const g = G(), m = woodOr(p.c1, 0.45), l = woodOr(p.c2 || p.c1, 0.45), { w, d, h } = p;
  if (round) {
    const r = w / 2, top = lathe([[0, h - 0.035], [r - 0.012, h - 0.035], [r, h - 0.028], [r, h - 0.008], [r - 0.008, h], [0, h]], 64); if (hasTex(m)) worldUV(top); g.add(new THREE.Mesh(top, m));
    const ped = lathe([[0.02, 0], [Math.min(0.26, r * 0.55), 0], [Math.min(0.26, r * 0.55), 0.015], [0.06, 0.04], [0.035, 0.12], [0.03, h - 0.1], [0.06, h - 0.045], [0, h - 0.035]], 40); if (hasTex(l)) worldUV(ped, true); g.add(new THREE.Mesh(ped, l));
  } else if (p.style === 'soft') {
    slab(g, w, d, 0.034, 0, h - 0.034, 0, m, 0.14, 0.008);
    bx(g, w - 0.36, 0.06, d - 0.3, 0, h - 0.094, 0, l, { r: 0.004 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const lg = cy(g, 0.028, 0.016, h - 0.034, sx * (w / 2 - 0.15), 0, sz * (d / 2 - 0.13), l, 16); lg.rotation.z = -sx * 0.035; lg.rotation.x = sz * 0.035; }
  } else {
    slab(g, w, d, 0.032, 0, h - 0.032, 0, m, 0.035, 0.006);
    for (const s of [-1, 1]) { bx(g, w - 0.2, 0.07, 0.022, 0, h - 0.105, s * (d / 2 - 0.08), l, { r: 0.004 }); bx(g, 0.022, 0.07, d - 0.2, s * (w / 2 - 0.08), h - 0.105, 0, l, { r: 0.004 }); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) sqLeg(g, 0.05, 0.03, h - 0.032, sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08), l);
  }
  return g;
}
function chair(p) { // dining chair: tapered legs, upholstered seat, curved top rail and spindles (as in the dining room)
  const g = G(), m = woodOr(p.c1, 0.45), s = fab(p.c2), { w, d, h } = p, sh = 0.43, back = -d / 2 + 0.03, lean = 0.08;
  bx(g, w, 0.04, d - 0.03, 0, sh - 0.04, 0.005, m, { r: 0.008 });
  cushion(g, w - 0.03, 0.045, d - 0.07, 0, sh - 0.005, 0.02, s, 0.02);
  for (const sx of [-1, 1]) {
    sqLeg(g, 0.036, 0.026, sh - 0.04, sx * (w / 2 - 0.025), 0, d / 2 - 0.035, m);
    const post = sqLeg(g, 0.032, 0.03, h, sx * (w / 2 - 0.025), 0, back, m); post.rotation.x = -lean * 0.5; post.position.z = back - Math.sin(lean * 0.5) * h / 2;
  }
  const railGeo = new THREE.BoxGeometry(w - 0.02, 0.065, 0.022, 16, 1, 1), rp = railGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) { const x = rp.getX(i); rp.setZ(i, rp.getZ(i) - 0.05 * (x / (w / 2)) * (x / (w / 2)) * -1 - 0.05); }
  railGeo.computeVertexNormals(); if (hasTex(m)) worldUV(railGeo); const rail = new THREE.Mesh(railGeo, m); rail.position.set(0, h - 0.04, back - lean * 0.45 + 0.05); g.add(rail);
  for (let i = 0; i < 5; i++) { const x = -w / 2 + 0.07 + i * (w - 0.14) / 4, sp = cy(g, 0.009, 0.009, h - sh - 0.08, x, sh + 0.02, back - 0.005, m, 10); sp.rotation.x = -lean * 0.45; sp.position.z = back + (0.05 * (x / (w / 2)) ** 2 - 0.036) / 2; }
  return g;
}
// ---------- lamps ----------
function lampShade(g, rTop, rBot, hgt, y, c) { const geo = lathe([[rBot, 0], [rTop, hgt]], 48); const me = new THREE.Mesh(geo, shadeMat(c)); me.position.y = y; g.add(me); const rim = new THREE.Mesh(new THREE.TorusGeometry(rBot, 0.003, 6, 48), mat('#d8d4cc', 0.5)); rim.rotation.x = Math.PI / 2; rim.position.y = y; g.add(rim); const rim2 = rim.clone(); rim2.geometry = new THREE.TorusGeometry(rTop, 0.003, 6, 48); rim2.position.y = y + hgt; g.add(rim2); return me; }
// ---------- beds & storage ----------
function bed(p) {
  const g = G(), base = fab(p.c2), { w, d, h } = p;
  cushion(g, w, 0.27, d - 0.1, 0, 0.05, 0.05, base, 0.03); woodLegs(g, w - 0.04, d - 0.2, 0.05, BLACKM, 0.06);
  const mat2 = new THREE.MeshPhysicalMaterial({ color: '#f3f2ee', roughness: 0.95, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), bumpMap: fabricTex().bump, bumpScale: 0.0015 }); MATC.set('mattress', mat2);
  cushion(g, w - 0.02, 0.22, d - 0.13, 0, 0.31, 0.055, mat2, 0.06);
  const dm = fab(p.c1, 'linen').clone(); dm.side = THREE.DoubleSide; MATC.set('duvet' + p.c1, dm);
  const duv = new THREE.Mesh(duvetGeo(w, d * 0.68, 0.17, strHash(p.id || 'bed')), dm); duv.position.set(0, 0.55, d / 2 - d * 0.34 - 0.03); g.add(duv);
  const fold = cushion(g, w + 0.03, 0.05, 0.22, 0, 0.54, d / 2 - d * 0.68 + 0.06, fab(p.c1, 'linen'), 0.024); fold.rotation.x = 0.05;
  const pn = w > 1.2 ? 2 : 1, pw = w > 1.2 ? (w - 0.2) / 2 : w - 0.16;
  for (let i = 0; i < pn; i++) pillow(g, pw, 0.42, 0.17, pn === 2 ? (i ? 1 : -1) * (pw / 2 + 0.04) : 0, 0.47, -d / 2 + 0.33, fab('#F4F3EF', 'linen'), -1.25);
  if (w > 1.2) pillow(g, 0.45, 0.32, 0.13, w * 0.1, 0.55, -d / 2 + 0.52, fab('#2E3A55', 'velvet'), -0.35);
  cushion(g, w, h - 0.03, 0.1, 0, 0.03, -d / 2 + 0.05, fab(p.c3 || p.c2), 0.04);
  return g;
}
function wardrobe(p) {
  const g = G(), c = p.c1, { w, h, d } = p, fk = p.front || 'flat';
  bx(g, w, h, d - 0.03, 0, 0, -0.015, woodOr(c, 0.5), { vgrain: true });
  const n = p.doors || Math.max(1, Math.round(w / 0.9)), dw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + dw * (i + 0.5), z = d / 2 - 0.02 + (p.sliding ? (i % 2) * 0.025 : 0);
    if (p.mirror && i === Math.floor(n / 2)) { bx(g, dw - 0.006, h - 0.02, 0.018, x, 0.01, z, mat('#DADAD6', 0.4), { r: 0.003 }); bx(g, dw - 0.04, h - 0.06, 0.004, x, 0.03, z + 0.011, MIRROR); }
    else front(g, dw - 0.006, h - 0.02, 0.018, x, 0.01, z, c, fk);
    if (!p.sliding) handle(g, 'bar', x + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), h * 0.5, z + 0.009, dw, false, STEEL, 0.3);
    else bx(g, 0.012, 0.18, 0.006, x + (i % 2 ? -1 : 1) * (dw / 2 - 0.03), h * 0.48, z + 0.012, mat('#cfcfcb', 0.4, 0.5));
  }
  if (p.sliding) { bx(g, w, 0.045, d * 0.4, 0, h - 0.045, d / 2 - d * 0.2, mat('#d4d3cf', 0.35, 0.5)); bx(g, w, 0.012, d * 0.3, 0, 0, d / 2 - d * 0.15, mat('#d4d3cf', 0.35, 0.5)); }
  return g;
}
const RUGTEX = new Map();
function rugMat(pat, c1, c2, w, d) {
  const k = pat + c1 + c2 + w.toFixed(2) + d.toFixed(2); if (RUGTEX.has(k)) return RUGTEX.get(k);
  const S = 1024, cv = mkCanvas(S, S), g = cv.getContext('2d'); g.fillStyle = c1; g.fillRect(0, 0, S, S);
  if (pat === 'stripes') { g.fillStyle = c2; for (let i = 0; i < 9; i++) g.fillRect(i * 116 + 36, 0, 44 + (i % 3) * 12, S); for (let i = 0; i < 9; i++) g.fillRect(i * 116 + 96, 0, 7, S); }
  if (pat === 'border') { g.strokeStyle = c2; g.lineWidth = 52; g.strokeRect(80, 80, S - 160, S - 160); g.lineWidth = 12; g.strokeRect(168, 168, S - 336, S - 336); }
  if (pat === 'waves') { g.strokeStyle = c2; g.lineWidth = 9; for (let i = -6; i < 30; i++) { g.beginPath(); for (let x = 0; x <= S; x += 16) g.lineTo(x, i * 40 + Math.sin(x / 70) * 22 + Math.sin(x / 23 + i) * 4); g.stroke(); } }
  if (pat === 'kilim') { g.fillStyle = c2; for (let r = 0; r < 12; r++) for (let c = 0; c < 8; c++) { const x = c * 128 + 64, y = r * 85 + 42; g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x + 40, y); g.lineTo(x, y + 30); g.lineTo(x - 40, y); g.closePath(); if ((r + c) % 2) g.fill(); else { g.lineWidth = 8; g.strokeStyle = c2; g.stroke(); } } }
  if (pat === 'chunky') { // hand-knotted wool: rows of soft loops
    for (let y = 0; y < S + 22; y += 22) for (let x = ((y / 22) % 2) * 9 - 9; x < S + 18; x += 18) { const gr = g.createRadialGradient(x - 2, y - 3, 1, x, y, 13); gr.addColorStop(0, tone(c1, 0.12)); gr.addColorStop(0.65, c1); gr.addColorStop(1, tone(c1, -0.25)); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 10, 12.5, 0, 0, 7); g.fill(); }
  }
  if (pat === 'jute') { // chunky basket weave
    const s = 32, R2 = rng(9);
    for (let y = 0; y < S; y += s) for (let x = 0; x < S; x += s) { const hz = ((x + y) / s) % 2; for (let k = 0; k < 4; k++) { const col = tone(k % 2 ? c1 : c2, (R2() - 0.5) * 0.12), gr = hz ? g.createLinearGradient(0, y + k * 8, 0, y + k * 8 + 8) : g.createLinearGradient(x + k * 8, 0, x + k * 8 + 8, 0); gr.addColorStop(0, tone(col, -0.25)); gr.addColorStop(0.5, tone(col, 0.1)); gr.addColorStop(1, tone(col, -0.25)); g.fillStyle = gr; if (hz) g.fillRect(x, y + k * 8, s, 8); else g.fillRect(x + k * 8, y, 8, s); } }
  }
  const R = rng(5), id = g.getImageData(0, 0, S, S), dd = id.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const q = (y * S + x) * 4, v = (R() - 0.5) * (pat === 'shag' || pat === 'jute' ? 46 : 22) + (vnoise(x / 2.2, y / 6) - 0.5) * 18; dd[q] += v; dd[q + 1] += v; dd[q + 2] += v; }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.repeat.set(1 / w, 1 / d); t.offset.set(0.5, 0.5);
  const b = new THREE.CanvasTexture(cv); b.repeat.copy(t.repeat); b.offset.copy(t.offset);
  const m = new THREE.MeshStandardMaterial({ map: t, bumpMap: b, bumpScale: pat === 'shag' || pat === 'chunky' ? 0.012 : pat === 'jute' ? 0.008 : 0.005, roughness: 1 }); m.envMapIntensity = ENV_I.v * 0.5; RUGTEX.set(k, m); return m;
}
function rug(g, w, d, p, round) {
  const m = rugMat(p.pat, p.c1, p.c2, w, d), th = p.pat === 'shag' ? 0.025 : p.pat === 'chunky' ? 0.02 : 0.01;
  const shape = round ? new THREE.Shape().absarc(0, 0, w / 2, 0, Math.PI * 2) : roundRect(w, d, 0.02);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 2, curveSegments: 48 });
  geo.rotateX(-Math.PI / 2); const me = new THREE.Mesh(geo, m); me.userData.ns = true; g.add(me);
  const uv = geo.attributes.uv, pos = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i));
  if (!round && (p.pat === 'stripes' || p.pat === 'kilim')) { const fr = mat(tone(p.c1, 0.05), 0.95); for (const s of [-1, 1]) for (let i = 0; i < Math.floor(w / 0.025); i++) { const f = bx(g, 0.004, 0.003, 0.05, -w / 2 + 0.0125 + i * 0.025, 0, s * (d / 2 + 0.025), fr); f.userData.ns = true; } }
  return me;
}
function curtain(p) { // gathered panels with irregular folds, hem and rings on a brass rod, or hung from a track hidden in a ceiling pocket
  const g = G(), key = 'cur|' + p.c1;
  if (!MATC.has(key)) { const m = fab(p.c1, 'linen').clone(); m.side = THREE.DoubleSide; MATC.set(key, m); }
  const pocket = p.mount === 'pocket', m = MATC.get(key), pw = Math.min(0.55, p.w * 0.24), ph = p.h - (pocket ? 0.016 : 0.06), R = rng(strHash(p.id || 'c'));
  for (const s of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(pw, ph, 48, 12), pos = geo.attributes.position, ph1 = R() * 6, ph2 = R() * 6;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), u = x / pw + 0.5, fall = 0.75 + 0.25 * (0.5 - y / ph); pos.setZ(i, (Math.sin(u * Math.PI * 9 + ph1) * 0.028 + Math.sin(u * Math.PI * 17 + ph2) * 0.008) * fall); }
    geo.computeVertexNormals(); worldUV(geo);
    const me = new THREE.Mesh(geo, m); me.position.set(s * (p.w / 2 - pw / 2), 0.012 + ph / 2, 0); g.add(me);
    if (!pocket) for (let i = 0; i < 9; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 16), BRASS); ring.position.set(s * (p.w / 2 - pw / 2) - pw / 2 + i * pw / 8, p.h - 0.02, -0.01); g.add(ring); }
  }
  if (pocket) return g;
  const rod = cy(g, 0.01, 0.01, p.w + 0.12, 0, 0, -0.01, BRASS, 16); rod.rotation.z = Math.PI / 2; rod.position.y = p.h - 0.02;
  for (const s of [-1, 1]) { blob(g, 0.022, s * (p.w / 2 + 0.07), p.h - 0.02, -0.01, BRASS); bx(g, 0.012, 0.05, 0.07, s * (p.w / 2 - 0.02), p.h - 0.035, -0.035, BRASS); }
  return g;
}
function artMat(c1, c2, seed) {
  const k = 'art' + c1 + c2 + seed; if (RUGTEX.has(k)) return RUGTEX.get(k);
  const cv = mkCanvas(512, 512), g = cv.getContext('2d'), R = rng(seed), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, tone(c1, 0.4)); gr.addColorStop(0.6, tone(c1, 0.1)); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.strokeStyle = rgba(i % 3 ? c2 : tone(c1, -0.35), 0.2 + R() * 0.45); g.lineWidth = 1.5 + R() * 9; g.lineCap = 'round'; g.beginPath(); const x = R() * 512; g.moveTo(x, 512); g.quadraticCurveTo(x + (R() - 0.5) * 120, 330, x + (R() - 0.5) * 80, 120 + R() * 240); g.stroke(); }
  const id = g.getImageData(0, 0, 512, 512), d = id.data; for (let i = 0; i < d.length; i += 4) { const v = (vnoise((i / 4) % 512 / 1.5, Math.floor(i / 2048) / 1.5) - 0.5) * 14; d[i] += v; d[i + 1] += v; d[i + 2] += v; } g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.004, roughness: 0.75 }); RUGTEX.set(k, m); return m;
}

// ---------- kitchen ----------
function counterTop(g, w, d, y, m) { // 30 mm laminate top with a rounded front edge
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2 - 0.01, 0); s.quadraticCurveTo(d / 2, 0, d / 2, 0.01); s.lineTo(d / 2, 0.02); s.quadraticCurveTo(d / 2, 0.03, d / 2 - 0.01, 0.03); s.lineTo(-d / 2, 0.03); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 6 }); geo.rotateY(-Math.PI / 2); geo.translate(w / 2, 0, 0); worldUV(geo);
  const me = new THREE.Mesh(geo, m); me.position.y = y; g.add(me); return me;
}
function faucet(g, x, y, z, reach = 0.2, hgt = 0.3) {
  cy(g, 0.024, 0.027, 0.05, x, y, z, CHROME, 24);
  tube(g, [[x, y + 0.04, z], [x, y + hgt * 0.75, z], [x, y + hgt, z + reach * 0.35], [x, y + hgt * 0.9, z + reach * 0.85], [x, y + hgt * 0.72, z + reach]], 0.011, CHROME, 40);
  const lv = bx(g, 0.012, 0.012, 0.09, x + 0.03, y + 0.06, z - 0.02, CHROME, { r: 0.005 }); lv.rotation.x = 0.4;
}
function baseCab(p, kind) {
  const g = G(), c = p.c1, body = mat(c, 0.5), { w, d } = p, H = 0.88, fk = p.front || 'cath', z = d / 2 - 0.011;
  counterTop(g, w, d, H, mat(p.c2, 0.3));
  if (kind === 'open') {
    bx(g, 0.02, H, d - 0.03, w / 2 - 0.01, 0, -0.015, body, { r: 0.002 });
    const uw = p.unit === 'drawers' ? Math.min(0.5, w * 0.45) : 0.16, u = G();
    bx(u, uw, 0.1, d - 0.08, 0, 0, -0.03, DARK); bx(u, uw, H - 0.1, d - 0.03, 0, 0.1, -0.015, body, { r: 0.002 });
    if (p.unit === 'drawers') cabinetFronts(u, uw, H - 0.1, d, 0.1, c, 1, 3, { kind: fk, z, knob: p.knob });
    else { const hole = mat(tone(c, -0.18), 0.7); for (let i = 0; i < 4; i++) { bx(u, uw - 0.03, 0.14, 0.01, 0, 0.14 + i * 0.18, -d / 2 + 0.05, hole); const b = cy(u, 0.035, 0.035, uw - 0.04, 0, 0, 0.05, mat(['#3a2a22', '#5a6b3a', '#7a2e2a', '#2b3a2f'][i], 0.15, 0.1), 16); b.rotation.z = Math.PI / 2; b.position.set(0, 0.21 + i * 0.18, 0.03); } }
    u.position.x = -w / 2 + uw / 2; g.add(u);
    return g;
  }
  bx(g, w, 0.1, d - 0.08, 0, 0, -0.03, DARK);
  bx(g, w, H - 0.1, d - 0.02, 0, 0.1, -0.01, body, { r: 0.002 });
  if (kind === 'oven') {
    const glass = new THREE.MeshPhysicalMaterial({ color: '#0e0f11', roughness: 0.05, clearcoat: 1, metalness: 0.2 }); MATC.set('ovenglass', glass);
    bx(g, w - 0.01, 0.6, 0.02, 0, 0.11, d / 2 - 0.006, glass, { r: 0.004 });
    bx(g, w - 0.12, 0.3, 0.003, 0, 0.25, d / 2 + 0.005, mat('#2a2622', 0.3));
    handle(g, 'bar', 0, 0.66, d / 2 + 0.004, w * 1.3, true, STEEL);
    bx(g, w - 0.01, 0.11, 0.02, 0, 0.73, d / 2 - 0.006, mat('#1b1c1f', 0.35, 0.3), { r: 0.004 });
    bx(g, 0.08, 0.025, 0.002, 0, 0.775, d / 2 + 0.005, mat('#e8662e', 0.4));
    for (const s of [-1, 1]) { const k = cy(g, 0.016, 0.016, 0.02, s * 0.2, 0, 0, CHROME, 20); k.rotation.x = Math.PI / 2; k.position.set(s * 0.2, 0.785, d / 2 + 0.012); }
    slab(g, 0.58, 0.51, 0.006, 0, H + 0.03, 0, glass, 0.012, 0.002);
    for (const [x, z2, r] of [[-0.14, -0.11, 0.09], [0.15, -0.11, 0.07], [-0.14, 0.13, 0.07], [0.15, 0.12, 0.095]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0015, 4, 48), mat('#5d5f63', 0.4)); ring.rotation.x = Math.PI / 2; ring.position.set(x, H + 0.0365, z2); g.add(ring); }
    bx(g, 0.2, 0.001, 0.03, 0, H + 0.036, 0.23, mat('#8a8c90', 0.4));
  } else if (kind === 'sink') {
    cabinetFronts(g, w, H - 0.1, d, 0.1, c, Math.max(1, Math.round(w / 0.45)), 0, { kind: fk, z, knob: p.knob });
    const pw = Math.min(w - 0.04, 1.0), bowl = mat('#8a8f94', 0.22, 0.9), drain = mat('#3d4044', 0.3, 0.8);
    slab(g, pw, 0.5, 0.006, 0, H + 0.028, 0.01, STEEL, 0.02, 0.002);
    for (const bxx of [pw / 2 - 0.2, pw / 2 - 0.55]) if (bxx - 0.17 > -pw / 2) {
      slab(g, 0.33, 0.38, 0.002, bxx, H + 0.0345, 0.02, bowl, 0.05, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.003, 6, 24), CHROME); ring.rotation.x = Math.PI / 2; ring.position.set(bxx, H + 0.037, 0.12); g.add(ring); cy(g, 0.026, 0.026, 0.001, bxx, H + 0.036, 0.12, drain, 20);
    }
    for (let i = 0; i < 7; i++) bx(g, 0.006, 0.003, 0.34, -pw / 2 + 0.05 + i * 0.03, H + 0.034, 0.02, mat('#a7acb0', 0.25, 0.85), { r: 0.0015 });
    faucet(g, pw / 2 - 0.38, H + 0.034, -0.2, 0.2, 0.32);
  } else if (kind === 'dish') {
    front(g, w - 0.004, H - 0.18, 0.019, 0, 0.102, z, c, 'flat');
    bx(g, w - 0.004, 0.075, 0.02, 0, H - 0.078, z, mat('#1c1d20', 0.3), { r: 0.003 });
    bx(g, 0.06, 0.008, 0.002, w / 2 - 0.08, H - 0.045, z + 0.011, mat('#76e0a0', 0.4));
    if (p.knob !== 'none') handle(g, 'bar', 0, H - 0.11, z + 0.0095, w, true);
  } else cabinetFronts(g, w, H - 0.1, d, 0.1, c, Math.max(1, Math.round(w / 0.45)), p.style === 'drawers' ? (p.n || 4) : 0, { kind: fk, z, knob: p.knob });
  return g;
}
function cornice(g, w, d, y, m) { // small cove moulding on top of wall cabinets
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.03, 0); s.quadraticCurveTo(0.012, 0.012, 0.03, 0.045); s.lineTo(0, 0.045); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: w + 0.04, bevelEnabled: false, curveSegments: 6 }); geo.rotateY(-Math.PI / 2); geo.translate((w + 0.04) / 2, 0, 0);
  const me = new THREE.Mesh(geo, m); me.position.set(0, y, d / 2 - 0.01); g.add(me);
  bx(g, w + 0.02, 0.012, d + 0.01, 0, y + 0.045, 0.005, m);
}
function upperCab(p) {
  const g = G(), c = p.c1, { w, h, d } = p, z = d / 2 - 0.011, fk = p.front || 'cath', body = mat(c, 0.5);
  if (p.glass && fk === 'flat') { for (const s of [-1, 1]) bx(g, 0.018, h, d - 0.02, s * (w / 2 - 0.009), 0, -0.01, body, { vgrain: true }); bx(g, w, 0.018, d - 0.02, 0, 0, -0.01, body); bx(g, w, 0.018, d - 0.02, 0, h - 0.018, -0.01, body); bx(g, w, h, 0.01, 0, 0, -d / 2 + 0.005, body); } // hollow behind clear glass
  else bx(g, w, h, d - 0.02, 0, 0, -0.01, body, { r: 0.002 });
  const n = Math.max(1, Math.round(w / 0.42));
  if (p.glass && fk === 'flat') glassDoors(g, p, n, z);
  else if (p.glass) {
    const dw = w / n, inside = mat('#e9e3d2', 0.6); bx(g, w - 0.04, h - 0.04, 0.005, 0, 0.02, -d / 2 + 0.02, inside);
    for (let i = 0; i < n; i++) { front(g, dw - 0.004, h - 0.004, 0.019, -w / 2 + dw * (i + 0.5), 0.002, z, c, 'glass'); handle(g, p.knob || 'knob', -w / 2 + dw * (i + 0.5) + (n === 1 || i % 2 === 0 ? 1 : -1) * (dw / 2 - 0.045), 0.07, z + 0.0095, dw, false); }
  } else cabinetFronts(g, w, h, d, 0, c, n, 0, { kind: fk, upper: true, z, knob: p.knob });
  if (p.cornice !== false) cornice(g, w, d, h, body);
  const led = LAMPS_ON.v ? new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffe7b8', emissiveIntensity: 1.2 }) : mat('#e9e6dd', 0.5);
  bx(g, w - 0.06, 0.008, 0.03, 0, -0.008, d / 2 - 0.07, led);
  if (p.y > 1.2 && p.y < 1.7) glow(g, w - 0.02, 0.5, 0, -0.5, -d / 2 + 0.016, '#ffd29a', 0.4); // light wash on the splashback
  return g;
}
function upperOpen(p) {
  const g = G(), m = mat(p.c1, 0.5), { w, h, d } = p, R = rng(strHash(p.id || 'o'));
  for (const s of [-1, 1]) bx(g, 0.018, h, d, s * (w / 2 - 0.009), 0, 0, m, { r: 0.002 });
  bx(g, w, 0.018, d, 0, 0, 0, m); bx(g, w, 0.018, d, 0, h - 0.018, 0, m); bx(g, w, h, 0.01, 0, 0, -d / 2 + 0.005, isHex(p.c1) ? mat(tone(p.c1, -0.05), 0.6) : getMat(p.c1));
  for (let i = 1; i < 3; i++) bx(g, w - 0.036, 0.016, d - 0.02, 0, i * h / 3, 0, m, { r: 0.002 });
  if (w > 0.45) bx(g, 0.016, h - 0.036, d - 0.02, 0, 0.018, 0, m);
  for (let i = 0; i < 3; i++) { // a few plates, bowls and mugs
    const y = 0.018 + i * h / 3 + (i ? 0.016 : 0), x = -w / 4 + (R() - 0.5) * 0.05;
    if (i === 0) for (let k = 0; k < 6; k++) cy(g, 0.11, 0.1, 0.012, x, y + k * 0.013, 0, PORC, 32);
    else if (i === 1) { const bwl = lathe([[0.03, 0], [0.06, 0.01], [0.075, 0.05], [0.072, 0.052], [0.055, 0.012], [0.025, 0.004]], 32); for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(bwl, PORC); b.position.set(x, y + k * 0.03, 0); g.add(b); } }
    else for (let k = 0; k < 2; k++) { cy(g, 0.04, 0.036, 0.09, x + k * 0.1, y, 0.02, mat(['#2f4766', '#d9d4ca'][k], 0.3), 24); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16, Math.PI), mat(['#2f4766', '#d9d4ca'][k], 0.3)); hd.rotation.z = -Math.PI / 2; hd.position.set(x + k * 0.1 + 0.04, y + 0.045, 0.02); g.add(hd); }
  }
  if (p.cornice !== false) cornice(g, w, d, h, m);
  return g;
}
// ---------- bathroom ----------
function toilet(p) {
  const g = G(), { w, d } = p;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), PORC); bowl.scale.set(w, 0.3, d - 0.06); bowl.rotation.x = Math.PI; bowl.position.set(0, 0.4, 0.03); g.add(bowl);
  bx(g, w * 0.82, 0.22, 0.12, 0, 0.2, -d / 2 + 0.06, PORC, { r: 0.04 });
  const seat = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 12, 48), PORC); seat.scale.set(w * 0.98, (d - 0.08), 0.12); seat.rotation.x = Math.PI / 2; seat.position.set(0, 0.405, 0.035); g.add(seat);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.012, 48), PORC); lid.scale.set(w * 1.05, 1, d - 0.06); lid.position.set(0, 0.415, 0.03); g.add(lid);
  bx(g, 0.25, 0.165, 0.012, 0, 0.92, -d / 2 + 0.006, PORC, { r: 0.006 });
  for (const s of [-1, 1]) { const b = cy(g, 0.045, 0.045, 0.006, s * 0.055, 0, 0, mat('#e8e8e5', 0.25), 24); b.rotation.x = Math.PI / 2; b.position.set(s * 0.055, 1.0, -d / 2 + 0.014); }
  return g;
}
function basinTop(g, w, d, y) { // cast vanity top with a shallow oval basin
  slab(g, w + 0.01, d + 0.01, 0.05, 0, y - 0.05, 0, PORC, 0.015, 0.006);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#eef0f0', 0.18)); dish.scale.set(w * 0.6, 0.06, d * 0.55); dish.rotation.x = Math.PI; dish.position.set(0, y + 0.001, 0.025); g.add(dish);
  cy(g, 0.016, 0.016, 0.002, 0, y - 0.058, 0.025, CHROME, 16);
}
// ---------- outdoor ----------
function lounger(p) {
  const g = G(), f = woodOr(p.c2, 0.6), { w, d } = p;
  for (const s of [-1, 1]) { bx(g, 0.035, 0.035, d, s * (w / 2 - 0.02), 0.33, 0, f, { r: 0.006 }); sqLeg(g, 0.035, 0.035, 0.36, s * (w / 2 - 0.02), 0, d / 2 - 0.05, f); sqLeg(g, 0.035, 0.035, 0.6, s * (w / 2 - 0.02), 0, -d / 2 + 0.07, f); bx(g, 0.035, 0.03, d * 0.7, s * (w / 2 - 0.02), 0.58, 0.02, f, { r: 0.006 }); }
  for (let i = 0; i < 7; i++) bx(g, w - 0.06, 0.016, 0.06, 0, 0.35, -d / 2 + 0.2 + i * 0.085, f, { r: 0.004 });
  const back = new THREE.Group(); back.position.set(0, 0.36, -d / 2 + 0.12); back.rotation.x = -0.32; g.add(back);
  for (let i = 0; i < 6; i++) bx(back, w - 0.06, 0.06, 0.016, 0, 0.05 + i * 0.085, 0, f, { r: 0.004 });
  const cm = fab(p.c1); cushion(g, w - 0.1, 0.07, d - 0.28, 0, 0.365, 0.1, cm, 0.03);
  const bc = new THREE.Group(); bc.position.set(0, 0.4, -d / 2 + 0.16); bc.rotation.x = -0.32; g.add(bc); cushion(bc, w - 0.12, 0.44, 0.07, 0, 0, 0.04, cm, 0.03);
  pillow(g, 0.4, 0.3, 0.12, 0, 0.47, -d / 2 + 0.3, fab('#E8EEE8'), -0.5);
  return g;
}

const C = { fab: 'Fabric', legs: 'Legs', pil: 'Pillows', body: 'Body', top: 'Top', front: 'Fronts', counter: 'Countertop', frame: 'Frame', seat: 'Seat', main: 'Colour', duvet: 'Duvet', base: 'Bed base', head: 'Headboard' };
const SIDE = { k: 'side', label: 'Corner side', type: 'select', opts: [['L', 'Left'], ['R', 'Right']] };
const FRONTS = { k: 'front', label: 'Front style', type: 'select', opts: [['cath', 'Routed, arched (current)'], ['shaker', 'Shaker'], ['flat', 'Flat']] };
// Living
def('sofa', { name: '3-seat sofa', cat: 'Living', w: 2.04, d: 0.89, h: 0.78, c1: '#5D6A80', c2: 'wood_walnut', c3: '#D19A35', colors: [['c1', C.fab], ['c2', C.legs, 'm'], ['c3', C.pil]], wallSnap: true, build: sofa });
def('sofa2', { name: '2-seat sofa', cat: 'Living', w: 1.64, d: 0.89, h: 0.78, c1: '#8C8478', c2: 'wood_walnut', c3: '#C9B79C', colors: [['c1', C.fab], ['c2', C.legs, 'm'], ['c3', C.pil]], wallSnap: true, build: sofa });
def('sofa_l', { name: 'Corner sofa', cat: 'Living', w: 2.85, d: 0.95, h: 0.78, cl: 2.1, side: 'L', c1: '#5D6A80', c2: 'wood_walnut', c3: '#D19A35', colors: [['c1', C.fab], ['c2', C.legs, 'm'], ['c3', C.pil]], params: [SIDE, { k: 'cl', label: 'Return length', type: 'len', min: 1.2, max: 3.5 }], wallSnap: true, build: sofaL });
def('armchair', { name: 'Armchair', cat: 'Living', w: 0.78, d: 0.84, h: 0.78, c1: '#B8A68C', c2: 'wood_walnut', colors: [['c1', C.fab], ['c2', C.legs, 'm']], build: sofa });
def('footstool', { name: 'Upholstered footstool', cat: 'Living', w: 0.9, d: 0.45, h: 0.43, c1: '#435473', c2: 'wood_walnut', colors: [['c1', C.fab], ['c2', C.legs, 'm']], build: p => { const g = G(), f = fab(p.c1, 'velvet'); cushion(g, p.w, p.h - 0.13, p.d, 0, 0.13, 0, f, 0.05); const top = new THREE.Group(); top.position.y = p.h + 0.001; top.rotation.x = -Math.PI / 2; g.add(top); tuft(g, fab(tone(p.c1, -0.35)), -p.w / 2 + 0.07, p.w / 2 - 0.07, -p.d / 2 + 0.07, p.d / 2 - 0.07, 0, 6, 2, top); woodLegs(g, p.w, p.d, 0.13, woodOr(p.c2)); return g; } });
def('pouf', { name: 'Round pouf', cat: 'Living', w: 0.4, d: 0.4, h: 0.42, c1: '#1E2230', colors: [['c1', C.fab]], build: p => { const g = G(), r = p.w / 2, f = fab(p.c1, 'velvet'); const body = lathe([[0, 0], [r - 0.02, 0], [r, 0.02], [r + 0.005, p.h * 0.5], [r, p.h - 0.03], [r - 0.04, p.h - 0.002], [0, p.h + 0.005]], 48); g.add(new THREE.Mesh(body, f)); for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), fab(tone(p.c1, -0.4))); const a = i / 6 * Math.PI * 2; b.position.set(Math.cos(a) * r * 0.5, p.h - 0.002, Math.sin(a) * r * 0.5); g.add(b); } return g; } });
def('coffee', { name: 'Coffee table', cat: 'Living', w: 1.2, d: 0.6, h: 0.45, c1: 'wood_espresso', colors: [['c1', C.main, 'm']], build: p => { const g = G(), m = woodOr(p.c1, 0.4); slab(g, p.w, p.d, 0.035, 0, p.h - 0.035, 0, m, 0.012, 0.005); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, 0.045, p.h - 0.035, 0.045, sx * (p.w / 2 - 0.04), 0, sz * (p.d / 2 - 0.04), m, { r: 0.006, vgrain: true }); for (const s of [-1, 1]) bx(g, p.w - 0.1, 0.03, 0.022, 0, 0.1, s * (p.d / 2 - 0.04), m, { r: 0.004 }); const n = 8; for (let i = 0; i < n; i++) bx(g, p.w - 0.1, 0.016, (p.d - 0.12) / n - 0.012, 0, 0.13, -p.d / 2 + 0.06 + (i + 0.5) * (p.d - 0.12) / n, m, { r: 0.003 }); return g; } });
def('coffee_round', { name: 'Round coffee table', cat: 'Living', w: 0.8, d: 0.8, h: 0.42, c1: 'wood_oak', c2: '#2a2a2a', colors: [['c1', C.top, 'm'], ['c2', C.legs, 'm']], build: p => table(p, true) });
def('tvbench', { name: 'TV bench', cat: 'Living', w: 1.5, d: 0.4, h: 0.45, c1: '#7E766E', c2: '#2a2a2a', colors: [['c1', C.body, 'm'], ['c2', C.legs, 'm']], wallSnap: true, build: p => { const g = G(); bx(g, p.w, p.h - 0.08, p.d - 0.02, 0, 0.08, -0.01, woodOr(p.c1, 0.5), { r: 0.006 }); cabinetFronts(g, p.w - 0.02, p.h - 0.11, p.d, 0.095, p.c1, 3, 0, { kind: 'flat', knob: 'none', z: p.d / 2 - 0.01 }); for (let i = 0; i < 3; i++) bx(g, 0.12, 0.012, 0.006, -p.w / 3 + i * p.w / 3, p.h - 0.06, p.d / 2 + 0.001, mat(tone(isHex(p.c1) ? p.c1 : '#7E766E', -0.2), 0.5)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, 0.012, 0.012, 0.08, sx * (p.w / 2 - 0.05), 0, sz * (p.d / 2 - 0.06), woodOr(p.c2, 0.4), 12); return g; } });
def('tv', { name: 'TV 55"', cat: 'Living', w: 1.23, d: 0.06, h: 0.71, y: 0.45, c1: '#111214', colors: [['c1', C.frame]], wallSnap: true, build: p => { const g = G(), f = mat(p.c1, 0.35, 0.3); bx(g, p.w, p.h, 0.012, 0, 0.06, 0.012, f, { r: 0.004 }); bx(g, p.w * 0.7, p.h * 0.6, 0.035, 0, 0.06 + p.h * 0.2, -0.01, f, { r: 0.01 }); const scr = new THREE.MeshPhysicalMaterial({ color: '#07090c', roughness: 0.06, clearcoat: 1, metalness: 0.1 }); bx(g, p.w - 0.012, p.h - 0.012, 0.002, 0, 0.066, 0.0185, scr); if (p.y < 0.9) for (const s of [-1, 1]) { const ft = bx(g, 0.05, 0.065, 0.22, s * (p.w / 2 - 0.12), 0, 0.01, f, { r: 0.006 }); ft.rotation.z = s * 0.3; } return g; } });
def('bookshelf', { name: 'Bookshelf', cat: 'Living', w: 0.8, d: 0.28, h: 2.02, c1: '#F2F1ED', colors: [['c1', C.body, 'm']], wallSnap: true, build: p => { const g = G(), m = woodOr(p.c1, 0.5), { w, d, h } = p, R = rng(strHash(p.id || 'b')); for (const s of [-1, 1]) bx(g, 0.018, h, d, s * (w / 2 - 0.009), 0, 0, m, { r: 0.002, vgrain: true }); bx(g, w, 0.018, d, 0, h - 0.018, 0, m); bx(g, w, h, 0.006, 0, 0, -d / 2 + 0.003, m); const n = Math.max(2, Math.round(h / 0.36)); for (let i = 0; i < n; i++) { const y = 0.05 + i * (h - 0.06) / n; bx(g, w - 0.036, 0.018, d - 0.02, 0, y, 0, m); let x = -w / 2 + 0.03; while (x < w / 2 - 0.07 && i > 0) { const bw = 0.018 + R() * 0.035, bh = 0.18 + R() * 0.1, bd = d * (0.6 + R() * 0.2); const bk = bx(g, bw, bh, bd, x + bw / 2, y + 0.018, -d / 2 + bd / 2 + 0.01, mat(['#7a3b2e', '#2e4a5c', '#c9b79c', '#3d5a40', '#d9a23a', '#e6e2da', '#22262d'][Math.floor(R() * 7)], 0.7), { r: 0.003 }); if (R() < 0.08) bk.rotation.z = 0.15; x += bw + 0.003; if (R() < 0.07) x += 0.12; } } return g; } });
def('sideboard', { name: 'Sideboard', cat: 'Living', w: 1.0, d: 0.45, h: 0.85, c1: 'wood_oak_grey', c2: 'wood_oak_grey', colors: [['c1', C.body, 'm'], ['c2', C.legs, 'm']], wallSnap: true, build: p => { const g = G(), m = woodOr(p.c1, 0.55); bx(g, p.w, p.h - 0.16, p.d - 0.02, 0, 0.12, -0.01, m, { r: 0.004 }); slab(g, p.w + 0.04, p.d + 0.025, 0.03, 0, p.h - 0.035, 0, m, 0.01, 0.008); bx(g, p.w + 0.01, 0.025, p.d + 0.005, 0, 0.11, 0, m, { r: 0.006 }); cabinetFronts(g, p.w, p.h - 0.2, p.d, 0.14, p.c1, 2, 0, { kind: 'panel1', z: p.d / 2 - 0.01, knob: 'knob' }); g.children.filter(o => o.geometry === KNOB).forEach(k => k.material = BRASS); const leg = lathe([[0.012, 0], [0.018, 0.01], [0.024, 0.045], [0.02, 0.08], [0.026, 0.105], [0.022, 0.12]], 20); if (hasTex(woodOr(p.c2))) worldUV(leg, true); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(leg, woodOr(p.c2, 0.55)); l.position.set(sx * (p.w / 2 - 0.05), 0, sz * (p.d / 2 - 0.05)); g.add(l); } return g; } });
def('floorlamp', { name: 'Floor lamp', cat: 'Living', w: 0.42, d: 0.42, h: 1.6, c1: '#EFE8DA', c2: '#2a2a2a', colors: [['c1', 'Shade'], ['c2', C.frame]], lamp: true, build: p => { const g = G(), m = mat(p.c2, 0.35, 0.6); g.add(new THREE.Mesh(lathe([[0, 0], [0.15, 0], [0.155, 0.008], [0.14, 0.022], [0.02, 0.03], [0, 0.03]], 40), m)); cy(g, 0.01, 0.01, p.h - 0.32, 0, 0.03, 0, m, 12); lampShade(g, 0.15, 0.2, 0.3, p.h - 0.31, p.c1); return g; } });
def('tablelamp', { name: 'Table lamp', cat: 'Decor', w: 0.26, d: 0.26, h: 0.45, y: 0.55, c1: '#8E9196', c2: '#202020', style: 'drum', colors: [['c1', 'Shade'], ['c2', 'Base']], params: [{ k: 'style', label: 'Shape', type: 'select', opts: [['drum', 'Drum shade'], ['mushroom', 'Mushroom']] }], lamp: true, build: p => { const g = G(), bm = mat(p.c2, 0.3, 0.6); if (p.style === 'mushroom') { g.add(new THREE.Mesh(lathe([[0, 0], [0.07, 0], [0.072, 0.008], [0.012, 0.02], [0.008, p.h * 0.6], [0, p.h * 0.6]], 32), bm)); const sh = new THREE.Mesh(lathe([[0, p.h], [0.05, p.h - 0.005], [0.1, p.h - 0.03], [p.w * 0.5, p.h * 0.62], [0.005, p.h * 0.6]], 48), shadeMat(p.c1, false)); g.add(sh); } else { g.add(new THREE.Mesh(lathe([[0, 0], [0.065, 0], [0.065, 0.015], [0.012, 0.03], [0.009, p.h * 0.58], [0, p.h * 0.58]], 32), bm)); lampShade(g, p.w * 0.36, p.w * 0.5, p.h * 0.42, p.h * 0.58, p.c1); } return g; } });
def('rug', { name: 'Rug', cat: 'Living', w: 2.4, d: 1.7, h: 0.01, c1: '#E4E0D8', c2: '#B9B2A8', pat: 'waves', colors: [['c1', 'Base'], ['c2', 'Pattern']], params: [{ k: 'pat', label: 'Pattern', type: 'select', opts: [['plain', 'Plain'], ['stripes', 'Stripes'], ['border', 'Border'], ['waves', 'Waves'], ['kilim', 'Kilim'], ['shag', 'Shaggy'], ['chunky', 'Chunky wool knit'], ['jute', 'Jute weave']] }], build: p => { const g = G(); rug(g, p.w, p.d, p); return g; } });
def('rug_round', { name: 'Round rug', cat: 'Living', w: 1.6, d: 1.6, h: 0.01, c1: '#D8CBB4', c2: '#B9A27F', pat: 'border', colors: [['c1', 'Base'], ['c2', 'Pattern']], build: p => { const g = G(); rug(g, p.w, p.w, p, true); return g; } });
def('radiator', { name: 'Radiator', cat: 'Living', w: 1.2, d: 0.1, h: 0.5, y: 0.15, c1: '#F1F0EC', colors: [['c1', C.main]], wallSnap: true, build: p => { const g = G(), m = mat(p.c1, 0.35); for (const z of [0.022, -0.022]) { bx(g, p.w, p.h, 0.016, 0, 0, z, m, { r: 0.005 }); const n = Math.floor(p.w / 0.033); for (let i = 0; i < n; i++) bx(g, 0.012, p.h - 0.03, 0.006, -p.w / 2 + 0.017 + i * 0.033, 0.015, z + Math.sign(z) * 0.009, m, { r: 0.002 }); } const gr = mat(tone(p.c1, -0.25), 0.5); bx(g, p.w - 0.02, 0.004, 0.04, 0, p.h - 0.002, 0, gr); for (let i = 0; i < Math.floor(p.w / 0.02); i++) bx(g, 0.004, 0.006, 0.04, -p.w / 2 + 0.015 + i * 0.02, p.h - 0.001, 0, m); const v = cy(g, 0.016, 0.016, 0.06, -p.w / 2 - 0.02, p.h - 0.08, 0.01, CHROME, 16); cy(g, 0.022, 0.022, 0.05, -p.w / 2 - 0.02, p.h - 0.02, 0.01, mat('#f4f4f2', 0.3), 20); cy(g, 0.009, 0.009, p.y || 0.15, -p.w / 2 - 0.02, -(p.y || 0.15), -0.01, CHROME, 10); cy(g, 0.009, 0.009, p.y || 0.15, p.w / 2 + 0.02, -(p.y || 0.15), -0.01, CHROME, 10); return g; } });
def('curtain', { name: 'Curtains', cat: 'Living', w: 1.6, d: 0.12, h: 2.28, c1: '#7A8DA0', mount: 'rod', colors: [['c1', C.fab]], params: [{ k: 'mount', label: 'Hung from', type: 'select', opts: [['rod', 'Rod on the wall'], ['pocket', 'Track in a ceiling pocket']] }], wallSnap: true, build: curtain });
// Dining
def('dining', { name: 'Dining table', cat: 'Dining', w: 1.2, d: 0.8, h: 0.75, c1: 'wood_espresso', colors: [['c1', C.main, 'm']], build: p => table(p) });
def('dining_round', { name: 'Round dining table', cat: 'Dining', w: 1.1, d: 1.1, h: 0.75, c1: 'wood_beech', c2: 'wood_beech', colors: [['c1', C.top, 'm'], ['c2', 'Base', 'm']], build: p => table(p, true) });
def('chair', { name: 'Dining chair', cat: 'Dining', w: 0.44, d: 0.51, h: 0.92, c1: 'wood_beech', c2: '#A9A49B', colors: [['c1', C.frame, 'm'], ['c2', C.seat]], build: chair });
def('stool', { name: 'Bar stool', cat: 'Dining', w: 0.4, d: 0.4, h: 0.66, c1: '#2a2a2a', c2: 'wood_oak', colors: [['c1', C.frame], ['c2', C.seat, 'm']], build: p => { const g = G(), m = mat(p.c1, 0.4, 0.5); g.add(new THREE.Mesh(lathe([[0, p.h - 0.04], [0.17, p.h - 0.04], [0.18, p.h - 0.03], [0.18, p.h - 0.01], [0.17, p.h], [0, p.h]], 40), woodOr(p.c2, 0.45))); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const l = cy(g, 0.012, 0.012, p.h - 0.04, Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14, m, 10); l.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08); } const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.007, 8, 40), m); ring.rotation.x = Math.PI / 2; ring.position.y = 0.25; g.add(ring); return g; } });
def('bench', { name: 'Bench', cat: 'Dining', w: 1.2, d: 0.35, h: 0.45, c1: 'wood_oak', colors: [['c1', C.main, 'm']], build: p => { const g = G(), m = woodOr(p.c1, 0.5); slab(g, p.w, p.d, 0.04, 0, p.h - 0.04, 0, m, 0.01, 0.005); for (const s of [-1, 1]) bx(g, 0.04, p.h - 0.04, p.d - 0.06, s * (p.w / 2 - 0.1), 0, 0, m, { r: 0.004, vgrain: true }); return g; } });
def('pendant', { name: 'Ceiling lamp', cat: 'Dining', w: 0.45, d: 0.45, h: 0.7, hang: true, c1: '#EDE6D6', c2: '#2a2a2a', style: 'dome', colors: [['c1', 'Shade'], ['c2', 'Cord']], params: [{ k: 'style', label: 'Shape', type: 'select', opts: [['drum', 'Drum'], ['dome', 'Dome'], ['globe', 'Globe']] }, { k: 'h', label: 'Drop from ceiling', type: 'len', min: 0.2, max: 1.6 }], lamp: true, build: p => { const g = G(), r = p.w / 2, sh = p.style === 'drum' ? 0.2 : p.style === 'dome' ? r * 0.65 : r * 2; cy(g, 0.003, 0.003, Math.max(0.02, p.h - sh), 0, sh, 0, mat(p.c2, 0.5), 6); g.add(Object.assign(new THREE.Mesh(lathe([[0, p.h], [0.055, p.h], [0.055, p.h - 0.015], [0.045, p.h - 0.025], [0, p.h - 0.025]], 24), mat(p.c2, 0.4, 0.3)))); if (p.style === 'dome') { const m = new THREE.Mesh(lathe([[0.015, sh], [0.05, sh - 0.01], [r * 0.7, sh * 0.55], [r * 0.95, sh * 0.12], [r, 0], [r - 0.004, 0]], 48), mat(p.c1, 0.4, 0.2)); m.material = m.material.clone(); m.material.side = THREE.DoubleSide; g.add(m); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), LAMPS_ON.v ? new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe2b0', emissiveIntensity: 2 }) : OPAL); bulb.position.y = sh * 0.35; g.add(bulb); } else if (p.style === 'globe') blob(g, r, 0, r, 0, shadeMat(p.c1, false)); else { lampShade(g, r, r, sh, 0, p.c1); const dif = cy(g, r - 0.006, r - 0.006, 0.003, 0, 0.004, 0, OPAL, 48); dif.userData.ns = true; } return g; } });
def('track', { name: 'Track light', cat: 'Dining', w: 1.2, d: 0.06, h: 0.16, hang: true, c1: '#F2F2F0', c2: '#F2F2F0', colors: [['c1', 'Rail'], ['c2', 'Spots']], lamp: true, build: p => { const g = G(), rm = mat(p.c1, 0.4), sm = mat(p.c2, 0.4); bx(g, p.w, 0.028, 0.034, 0, p.h - 0.028, 0, rm, { r: 0.006 }); const head = lathe([[0, 0], [0.028, 0], [0.032, 0.01], [0.032, 0.085], [0.024, 0.1], [0, 0.1]], 24); const n = Math.max(2, Math.round(p.w / 0.35)); for (let i = 0; i < n; i++) { const x = -p.w / 2 + (i + 0.5) * p.w / n; cy(g, 0.007, 0.007, 0.045, x, p.h - 0.075, 0, sm, 8); const s = new THREE.Mesh(head, sm); s.position.set(x, p.h - 0.075, 0); s.rotation.x = Math.PI - 0.55 - (i % 2) * 0.3; s.rotation.z = (i - n / 2 + 0.5) * 0.18; g.add(s); } return g; } });
def('spots', { name: 'Ceiling spots', cat: 'Decor', w: 0.3, d: 0.3, h: 0.14, hang: true, c1: '#F2F2F0', colors: [['c1', C.main]], lamp: true, build: p => { const g = G(), m = mat(p.c1, 0.4); g.add(new THREE.Mesh(lathe([[0, p.h], [0.085, p.h], [0.085, p.h - 0.012], [0.07, p.h - 0.02], [0, p.h - 0.02]], 32), m)); const head = lathe([[0, 0], [0.026, 0], [0.03, 0.01], [0.03, 0.075], [0.022, 0.09], [0, 0.09]], 24); for (let i = 0; i < 3; i++) { const a = i * 2.094, s = new THREE.Mesh(head, m); s.position.set(Math.cos(a) * 0.055, p.h - 0.035, Math.sin(a) * 0.055); s.rotation.set(Math.PI + Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(s); } return g; } });
// Bedroom
def('bed_double', { name: 'Double bed 180', cat: 'Bedroom', w: 1.8, d: 2.05, h: 1.05, c1: '#E3E5EA', c2: '#2F3446', c3: '#E8E4DC', colors: [['c1', C.duvet], ['c2', C.base], ['c3', C.head]], wallSnap: true, build: bed });
def('bed_single', { name: 'Single bed 90', cat: 'Bedroom', w: 0.9, d: 2.05, h: 0.9, c1: '#C9D4DC', c2: '#E8E6E0', c3: '#E8E6E0', colors: [['c1', C.duvet], ['c2', C.base], ['c3', C.head]], wallSnap: true, build: bed });
def('nightstand', { name: 'Nightstand', cat: 'Bedroom', w: 0.4, d: 0.35, h: 0.55, c1: '#26262B', colors: [['c1', C.main]], wallSnap: true, build: p => { const g = G(), m = mat(p.c1, 0.4, 0.4); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, 0.016, p.h, 0.016, sx * (p.w / 2 - 0.008), 0, sz * (p.d / 2 - 0.008), m, { r: 0.003 }); for (const y of [0.07, p.h - 0.016]) for (const sz of [-1, 1]) bx(g, p.w, 0.016, 0.016, 0, y, sz * (p.d / 2 - 0.008), m, { r: 0.003 }); bx(g, p.w - 0.01, 0.014, p.d - 0.01, 0, p.h - 0.015, 0, m, { r: 0.003 }); bx(g, p.w - 0.03, 0.14, p.d - 0.03, 0, p.h - 0.17, 0, m, { r: 0.004 }); front(g, p.w - 0.035, 0.125, 0.012, 0, p.h - 0.165, p.d / 2 - 0.01, isHex(p.c1) ? tone(p.c1, 0.06) : p.c1, 'flat'); bx(g, 0.06, 0.012, 0.012, 0, p.h - 0.11, p.d / 2 + 0.002, BRASS, { r: 0.004 }); bx(g, p.w - 0.02, 0.01, p.d - 0.02, 0, 0.075, 0, m); return g; } });
def('wardrobe', { name: 'Wardrobe', cat: 'Bedroom', w: 1.0, d: 0.58, h: 2.01, c1: '#F1F0EC', front: 'flat', colors: [['c1', C.front, 'm']], wallSnap: true, params: [{ k: 'doors', label: 'Doors', type: 'int', min: 1, max: 6 }, { k: 'sliding', label: 'Sliding doors', type: 'bool' }, { k: 'mirror', label: 'Mirror door', type: 'bool' }, { k: 'front', label: 'Door style', type: 'select', opts: [['flat', 'Flat'], ['frame3', 'Framed panels'], ['panel1', 'Raised panel']] }], build: wardrobe });
def('closet', { name: 'Built-in sliding wardrobe', cat: 'Bedroom', w: 2.7, d: 0.58, h: 2.36, c1: '#F2F1ED', sliding: true, doors: 3, front: 'flat', colors: [['c1', C.front, 'm']], wallSnap: true, params: [{ k: 'doors', label: 'Doors', type: 'int', min: 1, max: 6 }, { k: 'mirror', label: 'Mirror door', type: 'bool' }, { k: 'front', label: 'Door style', type: 'select', opts: [['flat', 'Flat'], ['frame3', 'Framed panels'], ['panel1', 'Raised panel']] }], build: wardrobe });
def('dresser', { name: 'Chest of drawers', cat: 'Bedroom', w: 0.8, d: 0.48, h: 0.78, c1: '#E9E4DA', colors: [['c1', C.main, 'm']], wallSnap: true, build: p => { const g = G(), m = woodOr(p.c1, 0.5); bx(g, p.w, p.h - 0.1, p.d - 0.02, 0, 0.08, -0.01, m, { r: 0.004 }); slab(g, p.w + 0.02, p.d + 0.01, 0.022, 0, p.h - 0.022, 0, m, 0.006, 0.005); cabinetFronts(g, p.w - 0.02, p.h - 0.12, p.d, 0.09, p.c1, 1, 4, { kind: 'flat', knob: 'knob', z: p.d / 2 - 0.01 }); woodLegs(g, p.w, p.d, 0.08, m, 0.04); return g; } });
def('desk', { name: 'Desk with drawers', cat: 'Bedroom', w: 1.4, d: 0.5, h: 0.75, c1: '#F1F0EC', c2: '#F1F0EC', colors: [['c1', C.top, 'm'], ['c2', C.body, 'm']], wallSnap: true, build: p => { const g = G(), m = woodOr(p.c2, 0.45); slab(g, p.w, p.d, 0.03, 0, p.h - 0.03, 0, woodOr(p.c1, 0.4), 0.006, 0.004); bx(g, 0.025, p.h - 0.03, p.d - 0.04, -p.w / 2 + 0.03, 0, 0, m, { r: 0.003 }); bx(g, p.w - 0.5, 0.1, 0.02, -0.18, p.h - 0.13, -p.d / 2 + 0.03, m, { r: 0.003 }); const g2 = G(); bx(g2, 0.4, 0.6, p.d - 0.06, 0, 0.07, -0.01, m, { r: 0.004 }); cabinetFronts(g2, 0.4, 0.58, p.d - 0.04, 0.075, isHex(p.c2) ? p.c2 : '#F1F0EC', 1, 3, { kind: 'flat', knob: 'bar' }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), BLACKM); w.position.set(sx * 0.16, 0.03, sz * (p.d / 2 - 0.08)); g2.add(w); } g2.position.x = p.w / 2 - 0.22; g.add(g2); return g; } });
def('office_chair', { name: 'Office chair', cat: 'Bedroom', w: 0.62, d: 0.62, h: 1.0, c1: '#5E6670', c2: '#2a2a2a', colors: [['c1', C.seat], ['c2', C.frame]], build: p => { const g = G(), m = mat(p.c2, 0.4, 0.4), f = fab(p.c1); for (let i = 0; i < 5; i++) { const a = i * 1.2566, b = bx(g, 0.3, 0.025, 0.04, Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15, m, { r: 0.008 }); b.rotation.y = -a; const w = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 10), BLACKM); w.position.set(Math.cos(a) * 0.29, 0.027, Math.sin(a) * 0.29); g.add(w); } cy(g, 0.022, 0.03, 0.34, 0, 0.08, 0, CHROME, 16); cushion(g, 0.5, 0.08, 0.48, 0, 0.42, 0.02, f, 0.035); const bk = new THREE.Group(); bk.position.set(0, 0.55, -0.22); bk.rotation.x = -0.12; g.add(bk); cushion(bk, 0.46, 0.45, 0.07, 0, 0, 0, f, 0.03); bx(g, 0.05, 0.16, 0.03, 0, 0.42, -0.24, m); for (const s of [-1, 1]) { bx(g, 0.03, 0.18, 0.03, s * 0.24, 0.46, -0.02, m, { r: 0.008 }); bx(g, 0.06, 0.025, 0.24, s * 0.24, 0.64, 0.02, mat('#1c1c1c', 0.6), { r: 0.01 }); } return g; } });
// Kitchen (fronts default to the routed, arched style seen in the photos)
const KC = [['c1', C.front], ['c2', C.counter, 'k']];
const kdef = (type, name, w, kind, extra = {}) => def(type, Object.assign({ name, cat: 'Kitchen', w, d: 0.6, h: 0.91, c1: '#F2F2EF', c2: 'marble_white', front: 'cath', colors: KC, wallSnap: true, params: [FRONTS], build: p => baseCab(p, kind) }, extra));
kdef('base', 'Base cabinet', 0.6, 'doors', { style: 'doors', n: 4, params: [FRONTS, { k: 'style', label: 'Front', type: 'select', opts: [['doors', 'Doors'], ['drawers', 'Drawers']] }, { k: 'n', label: 'Drawers', type: 'int', min: 2, max: 6 }] });
kdef('sink', 'Sink cabinet, double bowl', 0.9, 'sink');
kdef('oven', 'Oven + induction hob', 0.6, 'oven');
kdef('dishwasher', 'Dishwasher', 0.6, 'dish');
kdef('counter_open', 'Counter, open below', 1.05, 'open', { unit: 'rack', params: [{ k: 'unit', label: 'End unit', type: 'select', opts: [['rack', 'Bottle rack'], ['drawers', 'Drawers'], ['none', 'None']] }] });
def('island', { name: 'Kitchen island', cat: 'Kitchen', w: 1.8, d: 0.9, h: 0.91, c1: '#2F3B45', c2: 'oak_natural', colors: KC, build: p => { const g = G(); bx(g, p.w - 0.1, 0.1, p.d - 0.4, 0, 0, -0.15, DARK); bx(g, p.w - 0.1, 0.78, p.d - 0.35, 0, 0.1, -0.15, mat(p.c1, 0.5), { r: 0.003 }); const f = G(); cabinetFronts(f, p.w - 0.1, 0.76, p.d - 0.35, 0.11, p.c1, 1, 3, { kind: 'flat', knob: 'bar' }); f.position.z = -0.15; f.rotation.y = Math.PI; g.add(f); slab(g, p.w, p.d, 0.04, 0, 0.88, 0, mat(p.c2, 0.4), 0.01, 0.005); return g; } });
def('fridge', { name: 'Fridge, tall', cat: 'Kitchen', w: 0.6, d: 0.65, h: 1.86, c1: '#F4F4F1', colors: [['c1', C.front]], wallSnap: true, build: p => { const g = G(), m = mat(p.c1, 0.3); bx(g, p.w, p.h, p.d - 0.05, 0, 0, -0.025, m, { r: 0.006 }); bx(g, p.w - 0.004, p.h - 0.01, 0.05, 0, 0.005, p.d / 2 - 0.025, m, { r: 0.012 }); handle(g, 'bar', -p.w / 2 + 0.05, p.h * 0.55, p.d / 2, 0.6, false, STEEL, 0.7); return g; } });
def('upper', { name: 'Wall cabinet', cat: 'Kitchen', w: 0.8, d: 0.35, h: 0.78, y: 1.42, c1: '#F2F2EF', glass: false, front: 'cath', cornice: true, colors: [['c1', C.front]], params: [{ k: 'glass', label: 'Glass doors', type: 'bool' }, { k: 'cornice', label: 'Top moulding', type: 'bool' }, FRONTS], wallSnap: true, build: upperCab });
def('upper_open', { name: 'Open wall shelves', cat: 'Kitchen', w: 0.5, d: 0.35, h: 0.78, y: 1.42, c1: '#F2F2EF', cornice: true, colors: [['c1', C.main, 'm']], params: [{ k: 'cornice', label: 'Top moulding', type: 'bool' }], wallSnap: true, build: upperOpen });
def('spice', { name: 'Narrow drawer column', cat: 'Kitchen', w: 0.22, d: 0.35, h: 0.78, y: 1.42, c1: '#F2F2EF', colors: [['c1', C.front]], wallSnap: true, build: p => { const g = G(), m = mat(p.c1, 0.5); bx(g, p.w, p.h, p.d - 0.02, 0, 0, -0.01, m, { r: 0.002 }); cabinetFronts(g, p.w, p.h, p.d, 0, p.c1, 1, 5, { kind: 'drawer', z: p.d / 2 - 0.011 }); cornice(g, p.w, p.d, p.h, m); return g; } });
def('hood', { name: 'Cooker hood + cabinet', cat: 'Kitchen', w: 0.6, d: 0.35, h: 0.78, y: 1.42, c1: '#F2F2EF', colors: [['c1', C.front]], wallSnap: true, build: p => { const g = G(), c = p.c1, m = mat(c, 0.5); bx(g, p.w, 0.1, p.d + 0.1, 0, 0, 0.05, m, { r: 0.008 }); const grill = mat('#7f8488', 0.45, 0.7); bx(g, p.w - 0.05, 0.004, p.d, 0, -0.003, 0.06, grill, { r: 0.002 }); for (let i = 0; i < 9; i++) bx(g, 0.004, 0.002, p.d - 0.02, -p.w / 2 + 0.06 + i * (p.w - 0.12) / 8, -0.005, 0.06, mat('#4b4f52', 0.5, 0.6)); bx(g, 0.035, 0.012, 0.003, p.w / 2 - 0.08, 0.045, p.d / 2 + 0.1, mat('#2b2b2b', 0.4)); bx(g, p.w, p.h - 0.1, p.d - 0.02, 0, 0.1, -0.01, m, { r: 0.002 }); cabinetFronts(g, p.w, p.h - 0.1, p.d, 0.1, c, 1, 0, { kind: 'cath', upper: true, z: p.d / 2 - 0.011 }); cornice(g, p.w, p.d, p.h, m); return g; } });
def('backsplash', { name: 'Wall tiles / panel', cat: 'Kitchen', w: 1.2, d: 0.012, h: 0.51, y: 0.91, c1: 'tile_white_15', colors: [['c1', 'Surface', 'w']], wallSnap: true, build: p => { const g = G(); const m = bx(g, p.w, p.h, 0.012, 0, 0, 0, mat(p.c1), { uv: true }); m.userData.ns = true; return g; } });
// Bath
def('toilet', { name: 'Wall-hung toilet', cat: 'Bath', w: 0.36, d: 0.52, h: 0.42, c1: '#FBFBF9', colors: [['c1', C.main]], wallSnap: true, build: toilet });
def('vanity', { name: 'Vanity with basin', cat: 'Bath', w: 0.8, d: 0.46, h: 0.88, c1: 'wood_driftwood', colors: [['c1', C.body, 'm']], wallSnap: true, build: p => { const g = G(), m = woodOr(p.c1, 0.5); bx(g, p.w, 0.42, p.d - 0.02, 0, p.h - 0.47, -0.01, m, { r: 0.003 }); cabinetFronts(g, p.w, 0.42, p.d, p.h - 0.47, p.c1, 1, 2, { kind: 'flat', knob: 'bar', z: p.d / 2 - 0.01 }); basinTop(g, p.w, p.d, p.h); faucet(g, 0, p.h, -p.d / 2 + 0.07, 0.13, 0.18); return g; } });
def('tall_bath', { name: 'Tall wall cabinet', cat: 'Bath', w: 0.3, d: 0.22, h: 1.2, y: 0.95, c1: 'wood_driftwood', colors: [['c1', C.body, 'm']], wallSnap: true, build: p => { const g = G(); bx(g, p.w, p.h, p.d - 0.02, 0, 0, -0.01, woodOr(p.c1, 0.5), { r: 0.003, vgrain: true }); front(g, p.w - 0.004, p.h - 0.004, 0.018, 0, 0.002, p.d / 2 - 0.01, p.c1, 'flat'); handle(g, 'bar', -p.w / 2 + 0.04, 0.22, p.d / 2 + 0.0, 0.3, false); return g; } });
def('shower', { name: 'Shower with glass doors', cat: 'Bath', w: 1.2, d: 0.9, h: 2.0, c1: 'mosaic_greige', side: 'none', colors: [['c1', 'Floor', 'f']], params: [{ k: 'side', label: 'Side glass', type: 'select', opts: [['none', 'None'], ['L', 'Left'], ['R', 'Right']] }], build: p => { const g = G(), { w, d, h } = p; const fl = bx(g, w, 0.008, d, 0, 0, 0, mat(p.c1), { uv: true }); fl.userData.ns = true; bx(g, 0.12, 0.003, 0.12, 0, 0.008, 0.1, mat('#6b7073', 0.3, 0.8), { r: 0.005 }); for (const [x, o] of [[-w / 4 + 0.01, -0.015], [w / 4 - 0.01, 0.015]]) { const gl = bx(g, w / 2 + 0.04, h - 0.05, 0.008, x, 0.03, d / 2 + o, GLASS); gl.userData.ns = true; gl.userData.noAO = true; bx(g, 0.02, h - 0.05, 0.016, x + (x < 0 ? -1 : 1) * (w / 4 + 0.01), 0.03, d / 2 + o, CHROME, { r: 0.004 }); } bx(g, w, 0.03, 0.05, 0, h - 0.02, d / 2, CHROME, { r: 0.006 }); for (const s of [-1, 1]) bx(g, 0.03, h, 0.05, s * (w / 2 - 0.015), 0, d / 2, CHROME, { r: 0.006 }); if (p.side !== 'none') { const s = p.side === 'L' ? -1 : 1; const gl = bx(g, 0.008, h - 0.05, d, s * w / 2, 0.03, 0, GLASS); gl.userData.ns = true; gl.userData.noAO = true; } cy(g, 0.012, 0.012, 1.15, w * 0.2, 0.9, -d / 2 + 0.04, CHROME, 12); cy(g, 0.13, 0.13, 0.01, 0, h + 0.06, -d / 2 + 0.25, CHROME, 40); tube(g, [[0, h + 0.07, -d / 2 + 0.25], [0, h + 0.09, -d / 2 + 0.1], [0, h + 0.07, -d / 2 + 0.04], [w * 0.2, h - 0.2, -d / 2 + 0.04]], 0.01, CHROME); bx(g, 0.2, 0.06, 0.06, w * 0.2, 1.05, -d / 2 + 0.04, CHROME, { r: 0.012 }); tube(g, [[w * 0.2, 1.05, -d / 2 + 0.07], [w * 0.2 + 0.05, 0.75, -d / 2 + 0.12], [w * 0.2 - 0.05, 0.6, -d / 2 + 0.1], [w * 0.2, 1.6, -d / 2 + 0.07]], 0.006, mat('#cfd3d6', 0.25, 0.9), 40); return g; } });
def('bathtub', { name: 'Bathtub', cat: 'Bath', w: 1.7, d: 0.75, h: 0.58, c1: '#FBFBF9', colors: [['c1', C.main]], wallSnap: true, build: p => { const g = G(); bx(g, p.w, p.h, p.d, 0, 0, 0, PORC, { r: 0.04, seg: 4 }); const inner = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#eef2f3', 0.1)); inner.scale.set(p.w - 0.16, 0.42, p.d - 0.16); inner.rotation.x = Math.PI; inner.position.y = p.h + 0.001; g.add(inner); return g; } });
def('washer', { name: 'Washing machine', cat: 'Bath', w: 0.6, d: 0.6, h: 0.85, c1: '#F7F7F5', colors: [['c1', C.main]], wallSnap: true, build: p => { const g = G(); bx(g, p.w, p.h, p.d, 0, 0, 0, mat(p.c1, 0.3), { r: 0.015 }); const r = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 16, 48), CHROME); r.position.set(0, 0.42, p.d / 2 + 0.012); g.add(r); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#25343d', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 })); dome.scale.y = 0.25; dome.rotation.x = Math.PI / 2; dome.position.set(0, 0.42, p.d / 2 + 0.01); g.add(dome); bx(g, 0.18, 0.07, 0.01, -p.w / 2 + 0.12, p.h - 0.11, p.d / 2, mat('#ececea', 0.35), { r: 0.006 }); bx(g, p.w - 0.25, 0.07, 0.006, 0.08, p.h - 0.11, p.d / 2 + 0.001, mat('#d8d8d5', 0.4)); const k = cy(g, 0.025, 0.025, 0.02, 0.18, 0, 0, CHROME, 24); k.rotation.x = Math.PI / 2; k.position.set(0.18, p.h - 0.075, p.d / 2 + 0.01); return g; } });
def('mirror_led', { name: 'Mirror with light', cat: 'Bath', w: 0.6, d: 0.04, h: 0.75, y: 1.05, c1: '#d9d9d6', colors: [['c1', C.frame]], wallSnap: true, build: p => { const g = G(); bx(g, p.w, p.h, 0.025, 0, 0, 0, mat(p.c1, 0.4), { r: 0.012 }); bx(g, p.w - 0.01, p.h - 0.01, 0.004, 0, 0.005, 0.0125, MIRROR, { r: 0.004 }); const led = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.9 }); for (const s of [-1, 1]) bx(g, 0.022, p.h - 0.16, 0.003, s * (p.w / 2 - 0.07), 0.08, 0.015, led, { r: 0.002 }); return g; } });
def('towel', { name: 'Heated towel rail', cat: 'Bath', w: 0.5, d: 0.08, h: 0.9, y: 0.4, c1: '#c8ccce', colors: [['c1', C.main]], wallSnap: true, build: p => { const g = G(), m = mat(p.c1, 0.2, 0.9); for (const s of [-1, 1]) cy(g, 0.012, 0.012, p.h, s * p.w / 2, 0, 0.03, m, 12); for (let i = 0; i < 7; i++) { const b = cy(g, 0.008, 0.008, p.w, 0, 0, 0.03, m, 10); b.rotation.z = Math.PI / 2; b.position.y = 0.06 + i * (p.h - 0.1) / 6; } return g; } });
// Outdoor
def('grill', { name: 'Gas grill', cat: 'Outdoor', w: 1.32, d: 0.62, h: 1.15, c1: '#1E1F21', c2: '#9AA0A4', colors: [['c1', C.body], ['c2', 'Doors']], build: p => { const g = G(), m = mat(p.c1, 0.45, 0.35), H = p.h; bx(g, 0.66, 0.6, 0.55, 0, 0.1, 0, m, { r: 0.01 }); for (const s of [-1, 1]) bx(g, 0.305, 0.52, 0.012, s * 0.158, 0.13, 0.28, mat(p.c2, 0.3, 0.75), { r: 0.006 }); for (const s of [-1, 1]) handle(g, 'bar', s * 0.03, 0.55, 0.286, 0.1, false, STEEL); bx(g, 0.68, 0.2, 0.57, 0, 0.7, 0, m, { r: 0.015 }); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.68, 40, 1, false, 0, Math.PI), m); lid.rotation.z = Math.PI / 2; lid.scale.set(1, 1, 0.85); lid.position.y = 0.9; g.add(lid); handle(g, 'bar', 0, 1.0, 0.27, 0.9, true, STEEL); for (const s of [-1, 1]) slab(g, (p.w - 0.68) / 2, 0.46, 0.025, s * (0.34 + (p.w - 0.68) / 4), 0.875, 0, mat('#55595d', 0.4, 0.5), 0.01, 0.004); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, 0.03, 0.03, 0.1, sx * 0.28, 0, sz * 0.22, BLACKM, 16); for (let i = 0; i < 3; i++) { const k = cy(g, 0.022, 0.022, 0.025, 0, 0, 0, mat('#b3271e', 0.5), 16); k.rotation.x = Math.PI / 2; k.position.set(-0.16 + i * 0.16, 0.8, 0.295); } return g; } });
def('lounger', { name: 'Lounge chair', cat: 'Outdoor', w: 0.66, d: 0.85, h: 0.85, c1: '#E3E6DF', c2: '#9FB2A0', colors: [['c1', 'Cushion'], ['c2', C.frame, 'm']], build: lounger });
def('side_table', { name: 'Side table', cat: 'Outdoor', w: 0.45, d: 0.45, h: 0.5, c1: 'wood_oak', c2: 'wood_oak', colors: [['c1', C.top, 'm'], ['c2', C.legs, 'm']], build: p => table(p, true) });
// Decor
def('art', { name: 'Wall art', cat: 'Decor', w: 0.9, d: 0.03, h: 0.6, y: 1.25, c1: '#7FA3C2', c2: '#D2C08F', c3: '#F4F2EC', colors: [['c1', 'Colour 1'], ['c2', 'Colour 2'], ['c3', C.frame]], wallSnap: true, build: p => { const g = G(), fm = mat(p.c3, 0.45); for (const [w, h, x, y] of [[p.w, 0.025, 0, 0], [p.w, 0.025, 0, p.h - 0.025], [0.025, p.h, -p.w / 2 + 0.0125, 0], [0.025, p.h, p.w / 2 - 0.0125, 0]]) bx(g, w, h, 0.03, x, y, 0, fm, { r: 0.004 }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(p.w - 0.05, p.h - 0.05), artMat(p.c1, p.c2, strHash(p.id || 'a'))); pl.position.set(0, p.h / 2, 0.006); g.add(pl); bx(g, p.w - 0.05, p.h - 0.05, 0.01, 0, 0.025, -0.006, mat('#e8e4dc', 0.9)); return g; } });
def('shelf', { name: 'Wall shelf', cat: 'Decor', w: 0.8, d: 0.22, h: 0.03, y: 1.5, c1: '#F1F0EC', colors: [['c1', C.main, 'm']], wallSnap: true, build: p => { const g = G(), m = woodOr(p.c1, 0.5); slab(g, p.w, p.d, 0.025, 0, 0, 0, m, 0.004, 0.003); for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(p.d - 0.04, 0); sh.quadraticCurveTo(0.02, -0.02, 0, -0.15); sh.closePath(); const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.018, bevelEnabled: false }); const b = new THREE.Mesh(geo, m); b.rotation.y = -Math.PI / 2; b.position.set(s * (p.w / 2 - 0.12) - 0.009, 0, -p.d / 2); g.add(b); } return g; } });
def('mirror', { name: 'Mirror', cat: 'Decor', w: 0.4, d: 0.03, h: 1.3, y: 0.5, c1: '#1f1f1f', colors: [['c1', C.frame]], wallSnap: true, build: p => { const g = G(); bx(g, p.w, p.h, 0.022, 0, 0, 0, mat(p.c1, 0.4, 0.3), { r: 0.006 }); bx(g, p.w - 0.03, p.h - 0.03, 0.004, 0, 0.015, 0.012, MIRROR); return g; } });
// Structure
def('box', { name: 'Box / built-in', cat: 'Structure', w: 1.0, d: 0.5, h: 2.4, c1: '#F1F0EB', colors: [['c1', 'Surface', 'w']], build: p => { const g = G(); bx(g, p.w, p.h, p.d, 0, 0, 0, mat(p.c1), { uv: true }); return g; } });
def('column', { name: 'Column', cat: 'Structure', w: 0.3, d: 0.3, h: 2.4, c1: '#F1F0EB', colors: [['c1', 'Surface', 'w']], build: p => { const g = G(); bx(g, p.w, p.h, p.d, 0, 0, 0, mat(p.c1), { uv: true }); return g; } });
