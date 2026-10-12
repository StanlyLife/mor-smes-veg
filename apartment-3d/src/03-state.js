// ---------- default state: Mor Smes veg 11C as surveyed (Anticimex sketch + photos) ----------
// Plan coordinates in metres: x to the right, z down the plan. Top of plan (-z) faces east (balcony, lake).
const SETTINGS = {
  ceilMode: 'flat', ceilH: 2.4, ceilHigh: 3.3, lowSide: 'east', showRoof: false, roofMat: 'roof_membrane',
  extFinish: 'clad_cream', skirting: '#C08A58', cornice: true, wallT: 0.1, hour: 10, season: 'autumn',
  lamps: false, shadows: false, context: true, labels: true, snap: 0.05, balconyFloor: 'deck_dark',
};
const BUILDING = { z0: -0.2, z1: 8.62 };
const BALC = { x0: 3.62, x1: 7.59, z0: -2.2, z1: -0.2 };

const STATE_VERSION = 3;
const WALLPAPER_ROOMS = ['r_living', 'r_dining', 'r_bed1', 'r_bed2', 'r_entry']; // old structured wallpaper (listing)
function defaultState() {
  const W = (id, a, b, t, openings = [], finish = {}) => ({ id, a, b, t, openings, finish });
  const O = (id, type, pos, w, h, sill = 0, extra = {}) => Object.assign({ id, type, pos, w, h, sill }, extra);
  const walls = [
    // kitchen window: the photos show it running from the narrow drawer column almost to the corner (wider than the sketch symbol)
    W('e1a', [-0.1, -0.1], [3.6, -0.1], 0.2, [O('o_kwin', 'window', 2.7, 1.5, 1.15, 0.95, { panes: 1 })]),
    // balcony door: 3.73-4.62 m incl. frame on the sketch, hinged at the kitchen end and drawn opening out onto the balcony (~30°)
    W('e1b', [3.6, -0.1], [6.05, -0.1], 0.2, [O('o_bdoor', 'balcony', 0.575, 0.89, 2.05, 0, { hinge: 'start', swing: -1, open: 30 }), O('o_dwin', 'window', 1.69, 0.95, 1.45, 0.6, { panes: 1 })], { B: 'clad_yellow' }),
    W('e1c', [6.05, -0.1], [8.93, -0.1], 0.2, [O('o_b1win', 'window', 1.115, 1.0, 1.2, 0.85, { panes: 2 })], { B: 'clad_yellow' }),
    W('e2', [8.93, -0.1], [8.93, 8.52], 0.2, [], { B: 'clad_gable' }),
    W('e3', [8.93, 8.52], [1.17, 8.52], 0.2, [O('o_lwin', 'window', 1.33, 2.0, 1.3, 0.78, { panes: 3 }), O('o_b2win', 'window', 5.96, 1.0, 1.2, 0.85, { panes: 2 })]),
    W('e4', [1.17, 8.52], [1.17, 4.19], 0.2, [O('o_front', 'front', 3.62, 0.9, 2.05, 0, { hinge: 'end', swing: 1, open: 0 })]),
    W('e5', [2.11, 4.19], [-0.1, 4.19], 0.14),
    W('e6', [-0.1, 4.19], [-0.1, -0.1], 0.2),
    // kitchen-dining opening 0.86-1.58 m from the window wall (sketch); bathroom door 2.91-3.61 m, the sketch position scaled to the 1.80 m deep bathroom
    W('i1', [3.6, -0.1], [3.6, 4.23], 0.1, [O('o_kdoor', 'opening', 1.32, 0.72, 2.02)]),
    W('i2', [-0.1, 2.27], [3.6, 2.27], 0.1),
    W('i3', [2.11, 2.27], [2.11, 4.19], 0.1, [O('o_bath', 'door', 0.99, 0.7, 2.0, 0, { hinge: 'start', swing: 1, open: 40 })]),
    W('i4', [1.17, 5.40], [3.6, 5.40], 0.1, [O('o_b2door', 'door', 1.12, 0.8, 2.02, 0, { hinge: 'start', swing: 1, open: 80 })]),
    W('i5', [3.6, 5.40], [3.6, 8.52], 0.1),
    // the entrance runs straight into the living room through a 1.09 m full-height passage (sketch, photo 31): no wall or door, only the room boundary
    Object.assign(W('i6', [3.6, 4.23], [3.6, 5.40], 0.1), { open: true }),
    W('i7', [3.6, 4.23], [6.05, 4.23], 0.1, [O('o_dopen', 'opening', 1.25, 1.8, 2.1)]),
    W('i8', [6.05, 4.23], [8.93, 4.23], 0.1),
    // bedroom 1 door shown at 50°: wider than that it would swing into the double bed
    W('i9', [6.05, -0.1], [6.05, 4.23], 0.12, [O('o_b1door', 'door', 2.93, 0.8, 2.02, 0, { hinge: 'start', swing: -1, open: 50 })]),
  ];
  const R = (id, name, anchor, o = {}) => Object.assign({ id, name, anchor, floor: 'oak_honey', wall: 'paint_listing', ceil: 'paint_white', drop: 0, skirt: true }, o);
  const rooms = [
    R('r_kitchen', 'Kjøkken', [1.8, 1.1], { ref: [3.55, 2.22] }), R('r_dining', 'Spisestue', [4.8, 2.1], { ref: [2.34, 4.18] }), R('r_bed1', 'Soverom 1', [7.4, 2.0], { ref: [2.72, 4.18] }),
    R('r_living', 'Stue', [6.2, 6.3], { ref: [5.18, 4.14] }), R('r_bed2', 'Soverom 2', [2.4, 7.0], { ref: [2.28, 2.97] }), R('r_entry', 'Entré', [2.6, 4.8], { ref: [2.60, 1.09], refNote: 'The sketch draws the 2.60 m line from the outside of the front door to the open passage into the living room. Inside the walls the entrance is 2.28 m across and 1.09 m deep, and the hallway toward the bathroom is 1.39 m wide and 1.94 m long.' }),
    R('r_bath', 'Bad', [1.2, 3.5], { floor: 'tile_greige', wall: 'tile_greige', drop: 0.2, skirt: false, ref: [2.06, null], refNote: 'The listing gives 2.06 m wide and 1.32 m for the shower zone (from the pipe shaft to the wall). The whole room is 1.80 m deep.' }),
  ];
  for (const r of rooms) if (WALLPAPER_ROOMS.includes(r.id)) r.wall = 'wallpaper_struct';
  const items = [];
  const I = (type, x, z, rot = 0, o = {}) => { const d = CAT[type]; items.push(Object.assign({ id: uid('i'), type, x, z, rot, w: d.w, d: d.d, h: d.h, y: d.y || 0 }, itemDefaults(d), o)); };
  // ---- Kjøkken: U-shape, white routed "cathedral" fronts, marble-look counter, white 15x15 tiles, double sink
  I('base', 0.3, 1.11, 90, { w: 2.22 });                                            // end run (window wall to sink wall)
  I('base', 0.75, 0.3, 0, { w: 0.3 }); I('oven', 1.2, 0.3, 0);
  I('base', 1.8, 0.3, 0, { style: 'drawers', n: 5 }); I('base', 2.3, 0.3, 0, { w: 0.4, style: 'drawers', n: 3 });
  I('counter_open', 3.025, 0.3, 0, { w: 1.05, unit: 'rack' });                       // extra counter under the window
  I('sink', 1.05, 1.92, 180, { w: 0.9 }); I('dishwasher', 1.8, 1.92, 180); I('base', 2.225, 1.92, 180, { w: 0.25 });
  I('fridge', 2.65, 1.895, 180); I('fridge', 3.25, 1.895, 180);
  I('upper', 2.95, 1.895, 180, { y: 1.88, h: 0.34, w: 1.2, d: 0.6, cornice: true });   // cabinet above the fridges
  I('upper', 0.175, 0.53, 90, { w: 0.36 }); I('upper', 0.175, 1.11, 90, { w: 0.8, glass: true }); I('upper', 0.175, 1.69, 90, { w: 0.36 });
  I('upper_open', 0.625, 0.175, 0, { w: 0.55 }); I('hood', 1.2, 0.175, 0); I('spice', 1.61, 0.175, 0);
  I('upper', 1.125, 2.045, 180, { w: 1.55 }); I('upper_open', 2.1, 2.045, 180, { w: 0.4 });
  I('backsplash', 0.006, 1.11, 90, { w: 2.22 }); I('backsplash', 1.175, 2.214, 180, { w: 2.35 });
  I('backsplash', 0.45, 0.006, 0, { w: 0.9 }); I('backsplash', 1.2, 0.006, 0, { w: 0.6, h: 0.51, c1: 'marble_white' }); I('backsplash', 1.63, 0.006, 0, { w: 0.26 });
  I('spots', 1.8, 1.1, 0);
  // ---- Bad (2019): stone-look tiles, mosaic shower floor, wall-hung toilet, driftwood vanity, LED mirror
  // pipe shaft beside the shower; behind the toilet a full-height installation wall runs from the shaft to the hall wall (sketch), toilet centred on it
  I('box', 0.55, 2.56, 0, { w: 1.1, d: 0.48, h: 2.4, c1: 'tile_greige' }); I('box', 1.58, 2.405, 0, { w: 0.96, d: 0.17, h: 2.4, c1: 'tile_greige' });
  I('toilet', 1.58, 2.75, 0);
  I('shower', 0.42, 3.46, 90, { w: 1.32, d: 0.84 });
  I('vanity', 1.28, 3.89, 180); I('mirror_led', 1.28, 4.11, 180, { w: 0.55 }); I('tall_bath', 1.87, 4.01, 180, { w: 0.34, y: 0.42, h: 1.66 }); // tall cabinet hangs beside the vanity, by the door
  // ---- Entré / gang: white framed sliding wardrobe, black mirror, velvet pouf
  I('closet', 3.31, 3.26, 270, { w: 1.88, d: 0.48, doors: 2, front: 'frame3' }); I('mirror', 2.6, 2.335, 0);
  I('pouf', 2.6, 2.6, 0); I('rug', 1.75, 4.88, 90, { w: 0.6, d: 0.9, pat: 'plain', c1: '#3A3D40' }); I('track', 2.6, 3.4, 90, { w: 0.8 });
  // ---- Spisestue: espresso table for four, beech chairs, striped rug, track light, wall mirror
  I('rug', 4.82, 1.5, 90, { w: 2.3, d: 1.6, pat: 'stripes', c1: '#E6E3DB', c2: '#2F4766' });
  I('dining', 4.82, 1.5, 90);
  I('chair', 4.3, 1.2, 90); I('chair', 4.3, 1.8, 90); I('chair', 5.34, 1.2, 270); I('chair', 5.34, 1.8, 270);
  I('radiator', 5.94, 1.9, 270, { w: 0.8 }); I('track', 4.82, 1.5, 90, { w: 1.2 });
  I('mirror', 5.975, 1.2, 270, { w: 1.0, h: 0.35, y: 1.35 });
  // ---- Stue: blue tufted corner sofa, dark coffee table, cream wave rug, grey TV bench, vintage oak sideboard
  I('rug', 7.45, 6.0, 90, { w: 3.0, d: 2.0 });
  I('sofa_l', 8.355, 5.705, 270, { w: 2.85, side: 'L', cl: 2.1 });
  I('coffee', 7.3, 5.95, 90); I('sideboard', 8.605, 7.85, 270); I('tablelamp', 8.62, 8.05, 270, { y: 0.85, style: 'mushroom', c1: '#C9A04B', c2: '#B38B3E' });
  I('tvbench', 3.85, 6.95, 90); I('tv', 3.86, 6.95, 90);
  I('footstool', 5.6, 8.1, 0); I('radiator', 7.6, 8.37, 180, { w: 1.8 });
  I('pendant', 6.6, 6.35, 0, { style: 'drum', h: 0.3, w: 0.45, c1: '#EDE3D0' });
  I('curtain', 7.6, 8.36, 180, { w: 2.6, c1: '#7A8DA0' });
  I('art', 8.81, 5.6, 270, { w: 0.9, h: 0.6, y: 1.3 }); I('shelf', 8.72, 4.75, 270, { w: 0.6, y: 1.55 });
  // ---- Soverom 1: navy bed base, light headboard, black nightstands, grey lamps, full-width white wardrobe
  I('closet', 7.47, 3.89, 180, { w: 2.72, d: 0.58 });
  I('rug', 7.25, 1.7, 90, { w: 2.3, d: 1.6, pat: 'shag', c1: '#A9A9AB' });
  I('bed_double', 7.805, 1.7, 270); I('nightstand', 8.645, 0.48, 270); I('nightstand', 8.645, 2.92, 270);
  I('tablelamp', 8.645, 0.48, 270, { y: 0.55 }); I('tablelamp', 8.645, 2.92, 270, { y: 0.55 });
  I('radiator', 7.16, 0.05, 0, { w: 1.0 }); I('curtain', 7.16, 0.06, 0, { w: 1.7, c1: '#8A9CB0' });
  I('art', 8.81, 1.7, 270, { w: 1.0, h: 0.7, y: 1.35, c1: '#3F6D86', c2: '#C9A86A' }); I('spots', 7.4, 2.0, 0);
  // ---- Soverom 2 (office): white desk with drawers, beech chair, oak + mirror wardrobe (not included in the sale)
  I('desk', 1.52, 7.7, 90); I('chair', 2.05, 7.75, 270, { c1: 'wood_beech' });
  I('wardrobe', 1.56, 6.35, 90, { w: 1.0, c1: 'wood_oak', mirror: true, sliding: true, doors: 2 });
  I('radiator', 2.97, 8.37, 180, { w: 0.9 }); I('curtain', 2.86, 8.36, 180, { w: 1.38, c1: '#8C8784' });
  I('rug', 2.55, 7.0, 90, { w: 1.5, d: 0.8, pat: 'kilim', c1: '#2D3346', c2: '#E8E6E2' }); I('spots', 2.4, 6.9, 0);
  // ---- Balkong: grill, sage loungers, round rug, flowers
  I('grill', 3.95, -1.5, 90); I('lounger', 6.3, -1.15, 200); I('lounger', 7.05, -0.75, 250); I('side_table', 6.85, -1.55, 0);
  I('rug_round', 6.4, -1.0, 0, { w: 1.5, c1: '#E2D8C6', c2: '#B9A27F' });
  return { v: STATE_VERSION, settings: { ...SETTINGS }, walls, rooms, items };
}

// ---------- room detection: faces of the planar wall graph ----------
function analyzeWalls(walls) {
  const tol = 0.02, pieces = [];
  for (const w of walls) {
    const L = dist(w.a, w.b); if (L < 0.05) continue;
    const ts = [0, 1];
    for (const o of walls) {
      if (o === w) continue;
      for (const p of [o.a, o.b]) if (distSeg(p, w.a, w.b) < tol) ts.push(clamp(projT(p, w.a, w.b), 0, 1));
      const ii = segInter(w.a, w.b, o.a, o.b);
      if (ii && ii[0] > 1e-4 && ii[0] < 1 - 1e-4 && ii[1] > -1e-4 && ii[1] < 1 + 1e-4) ts.push(ii[0]);
    }
    ts.sort((a, b) => a - b);
    const u = []; for (const t of ts) if (!u.length || (t - u[u.length - 1]) * L > tol) u.push(t);
    for (let i = 0; i < u.length - 1; i++) pieces.push({ p0: lerp2(w.a, w.b, u[i]), p1: lerp2(w.a, w.b, u[i + 1]), wall: w });
  }
  const nodes = [];
  const nodeOf = p => { for (let i = 0; i < nodes.length; i++) if (dist(nodes[i], p) < tol) return i; nodes.push([p[0], p[1]]); return nodes.length - 1; };
  const em = new Map();
  for (const pc of pieces) { const i = nodeOf(pc.p0), j = nodeOf(pc.p1); if (i === j) continue; const k = i < j ? i + '_' + j : j + '_' + i; if (!em.has(k)) em.set(k, { i, j, wall: pc.wall }); }
  let edges = [...em.values()];
  for (let changed = true; changed;) {
    const deg = new Map(); edges.forEach(e => { deg.set(e.i, (deg.get(e.i) || 0) + 1); deg.set(e.j, (deg.get(e.j) || 0) + 1); });
    const ne = edges.filter(e => deg.get(e.i) > 1 && deg.get(e.j) > 1); changed = ne.length !== edges.length; edges = ne;
  }
  const out = new Map();
  for (const e of edges) for (const [u, v] of [[e.i, e.j], [e.j, e.i]]) {
    const a = nodes[u], b = nodes[v]; if (!out.has(u)) out.set(u, []);
    out.get(u).push({ to: v, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), wall: e.wall });
  }
  out.forEach(l => l.sort((p, q) => p.ang - q.ang));
  const seen = new Set(), faces = [];
  out.forEach((list, u0) => list.forEach(h0 => {
    if (seen.has(u0 + '>' + h0.to)) return;
    const poly = [], ws = []; let cu = u0, ch = h0;
    for (let guard = 0; guard < 400; guard++) {
      const k = cu + '>' + ch.to; if (seen.has(k)) break; seen.add(k);
      poly.push(nodes[cu]); ws.push(ch.wall);
      const v = ch.to, lst = out.get(v), idx = lst.findIndex(x => x.to === cu);
      const nx = lst[(idx - 1 + lst.length) % lst.length]; cu = v; ch = nx;
    }
    if (poly.length >= 3) faces.push({ poly, ws, area: areaSigned(poly) });
  }));
  if (!faces.length) return { rooms: [], outer: [] };
  const big = faces.reduce((a, b) => Math.abs(b.area) > Math.abs(a.area) ? b : a);
  const sg = -Math.sign(big.area);
  const norm1 = f => { if (f.area >= 0) return f; const n = f.poly.length; return { poly: [...f.poly].reverse(), ws: f.poly.map((_, k) => f.ws[(2 * n - 2 - k) % n]), area: -f.area }; };
  const roomsF = faces.filter(f => Math.sign(f.area) === sg && Math.abs(f.area) > 0.25).map(norm1);
  const outer = faces.filter(f => Math.sign(f.area) !== sg && Math.abs(f.area) > 0.25).map(norm1);
  for (const f of roomsF) { f.inner = offsetPoly(f.poly, f.ws, 1); f.innerArea = Math.abs(areaSigned(f.inner)); }
  return { rooms: roomsF, outer };
}
function offsetPoly(poly, ws, dir) { // dir 1 = inward (by half wall thickness), -1 = outward; poly must be CCW (positive area)
  const n = poly.length, lines = [];
  for (let k = 0; k < n; k++) { const a = poly[k], b = poly[(k + 1) % n], d = norm(sub(b, a)), inw = mul([-d[1], d[0]], dir); lines.push({ p: add(a, mul(inw, (ws[k]?.t || 0.1) / 2)), d }); }
  const res = [];
  for (let k = 0; k < n; k++) {
    const L1 = lines[(k - 1 + n) % n], L2 = lines[k], den = cross(L1.d, L2.d);
    if (Math.abs(den) < 1e-6) { res.push(L2.p); continue; }
    const t = cross(sub(L2.p, L1.p), L2.d) / den; res.push(add(L1.p, mul(L1.d, t)));
  }
  return res;
}
function interiorPoint(poly) {
  const c = poly.reduce((s, p) => add(s, p), [0, 0]).map(v => v / poly.length);
  if (pip(c, poly)) return c;
  const tris = THREE.ShapeUtils.triangulateShape(poly.map(p => new THREE.Vector2(p[0], p[1])), []);
  let best = null, ba = 0;
  for (const t of tris) { const [a, b, d] = t.map(i => poly[i]); const ar = Math.abs(areaSigned([a, b, d])); if (ar > ba) { ba = ar; best = [(a[0] + b[0] + d[0]) / 3, (a[1] + b[1] + d[1]) / 3]; } }
  return best || c;
}
// assign stored room records to faces (pure); unmatched faces get a temporary record
function matchRooms(faces, rooms) {
  const used = new Set();
  return faces.map(f => {
    const inside = rooms.filter(r => !used.has(r.id) && pip(r.anchor, f.poly));
    inside.forEach(r => used.add(r.id));
    return { face: f, room: inside[0] || null, merged: inside.slice(1) };
  });
}
// commit room records to the current wall layout (merge, split, create, drop)
function syncRooms() {
  const { rooms: faces } = analyzeWalls(state.walls);
  const m = matchRooms(faces, state.rooms), next = [];
  let n = 1;
  for (const x of m) {
    let r = x.room;
    if (!r) {
      while (state.rooms.some(q => q.name === 'Room ' + n) || next.some(q => q.name === 'Room ' + n)) n++;
      r = { id: uid('r'), name: 'Room ' + n, anchor: interiorPoint(x.face.inner), floor: 'oak_honey', wall: 'paint_white', ceil: 'paint_white', drop: 0, skirt: true };
    } else if (x.merged.length) {
      const names = [r.name, ...x.merged.map(q => q.name)];
      r = { ...r, name: [...new Set(names)].join(' + ') };
    }
    if (!pip(r.anchor, x.face.poly)) r = { ...r, anchor: interiorPoint(x.face.inner) };
    next.push(r);
  }
  state.rooms = next;
}
