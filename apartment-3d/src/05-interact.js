// ---------- picking & pointer handling ----------
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ptr = { down: false, id: null, sx: 0, sy: 0, moved: false, drag: null, last: null };
const walk = { pos: [6.2, 6.6], yaw: 0.6, pitch: -0.08, keys: new Set(), pad: new Set(), vel: [0, 0], turnV: 0, glide: 0, goal: null, goalT: 0, stuck: 0 };
const measures = []; let measureStart = null, wallStart = null, cursorPt = null, placing = null, hoverCursor = '';

function setNdc(e) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(ndc, camera); }
function floorHit(e, y = 0) { setNdc(e); FLOOR_PLANE.constant = -y; const v = new THREE.Vector3(); return raycaster.ray.intersectPlane(FLOOR_PLANE, v) ? [v.x, v.z] : null; }
function pick(e) {
  setNdc(e);
  const targets = [groups.helpers, groups.items, groups.openings, groups.walls, groups.struct, groups.floors, groups.ceil, groups.roof];
  const hits = raycaster.intersectObjects(targets, true);
  for (const h of hits) {
    let o = h.object; while (o && !o.userData.kind && !o.userData.itemId && !o.userData.handle) o = o.parent;
    if (!o || !o.visible) continue;
    const u = o.userData;
    if (u.handle) return { kind: 'handle', ...u.handle, point: h.point };
    if (u.itemId) return { kind: 'item', id: u.itemId, point: h.point };
    if (u.kind === 'wall') return { kind: 'wall', id: u.wallId, point: h.point };
    if (u.kind === 'opening') return { kind: 'opening', wallId: u.wallId, opId: u.opId, point: h.point };
    if (u.kind === 'floor' || u.kind === 'ceiling') return { kind: 'room', id: u.roomId, point: h.point, surface: u.kind };
    if (u.kind === 'balcony') return { kind: 'balcony', point: h.point };
    if (u.kind === 'roof') return { kind: 'roof', point: h.point };
  }
  return null;
}
const findWall = id => state.walls.find(w => w.id === id);
const findItem = id => state.items.find(i => i.id === id);
const findRoom = id => state.rooms.find(r => r.id === id);
function snapV(v, e) { const s = state.settings.snap; return e?.altKey || !s ? v : Math.round(v / s) * s; }

// snap a point for wall drawing / measuring: endpoints, wall lines or faces, grid
function snapPoint(p, e, faces) {
  let best = null, bd = 0.15;
  for (const w of state.walls) for (const q of [w.a, w.b]) { const dd = dist(p, q); if (dd < bd) { bd = dd; best = [q[0], q[1]]; } }
  if (best) return best;
  for (const w of state.walls) {
    const { L, d, n } = wallFrame(w), u = projT(p, w.a, w.b) * L; if (u < 0 || u > L) continue;
    const foot = add(w.a, mul(d, u)), off = dot(sub(p, foot), n);
    if (faces) { const s = Math.sign(off) || 1, f = add(foot, mul(n, s * w.t / 2)); if (Math.abs(Math.abs(off) - w.t / 2) < 0.1) return [f[0], f[1]]; }
    else if (Math.abs(off) < w.t / 2 + 0.08) return [foot[0], foot[1]];
  }
  return [snapV(p[0], e), snapV(p[1], e)];
}
function orthoSnap(a, p) { const d = sub(p, a), ang = Math.atan2(d[1], d[0]), st = Math.PI / 4, r = Math.round(ang / st) * st; if (Math.abs(ang - r) < 7 * DEG) { const L = Math.hypot(d[0], d[1]); return [a[0] + Math.cos(r) * L, a[1] + Math.sin(r) * L]; } return p; }

function wallSnapItem(it, def, px, pz) {
  let best = null;
  for (const w of state.walls) {
    if (w.open) continue;
    const { L, d, n } = wallFrame(w), u = projT([px, pz], w.a, w.b) * L; if (u < -0.05 || u > L + 0.05) continue;
    const foot = add(w.a, mul(d, u)), sd = dot(sub([px, pz], foot), n), side = Math.sign(sd) || 1, fd = Math.abs(sd) - w.t / 2;
    if (fd > -0.05 && fd < it.d / 2 + 0.3) { const score = Math.abs(fd - it.d / 2); if (!best || score < best.score) best = { score, n: mul(n, side), foot, t: w.t }; }
  }
  if (!best) return null;
  const pos = add(best.foot, mul(best.n, best.t / 2 + it.d / 2 + 0.002));
  return { x: pos[0], z: pos[1], rot: ((Math.atan2(best.n[0], best.n[1]) / DEG) % 360 + 360) % 360 };
}

canvas.addEventListener('pointerdown', e => {
  ptr.down = true; ptr.id = e.pointerId; ptr.sx = e.clientX; ptr.sy = e.clientY; ptr.moved = false; ptr.drag = null; ptr.button = e.button;
  canvas.focus({ preventScroll: true });
  if (view.mode === 'walk') { ptr.drag = { kind: 'look', yaw: walk.yaw, pitch: walk.pitch }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; return; }
  if (e.button !== 0 || view.tool !== 'select' || placing) return;
  const h = pick(e);
  if (h?.kind === 'handle') { startHandleDrag(h, e); e.stopImmediatePropagation(); return; }
  if (h?.kind === 'item' && view.lock) return; // locked: a click still selects it, a drag turns the view
  if (h?.kind === 'item') {
    const it = findItem(h.id); select({ kind: 'item', id: it.id });
    const f = floorHit(e, 0); if (!f) return;
    ptr.drag = { kind: 'item', id: it.id, off: [it.x - f[0], it.z - f[1]], start: JSON.stringify(it) };
    controls.enabled = false; canvas.setPointerCapture(e.pointerId); e.stopImmediatePropagation(); return;
  }
  if (h?.kind === 'opening' && view.sel?.kind === 'opening' && view.sel.opId === h.opId) {
    ptr.drag = { kind: 'opening', wallId: h.wallId, opId: h.opId }; controls.enabled = false; canvas.setPointerCapture(e.pointerId); e.stopImmediatePropagation();
  }
});
canvas.addEventListener('pointermove', e => {
  ptr.last = e;
  if (ptr.down && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 4) ptr.moved = true;
  const dr = ptr.drag;
  if (dr?.kind === 'look') { const k = persp.fov * DEG / Math.max(320, canvas.clientHeight) * 1.3; walk.yaw = dr.yaw + (e.clientX - ptr.sx) * k; walk.pitch = clamp(dr.pitch + (e.clientY - ptr.sy) * k, -1.3, 1.3); markDirty(); return; }
  if (dr?.kind === 'item' && ptr.moved) {
    const it = findItem(dr.id), def = CAT[it.type], f = floorHit(e, 0); if (!f) return;
    let x = snapV(f[0] + dr.off[0], e), z = snapV(f[1] + dr.off[1], e);
    if (def.wallSnap && !e.altKey) { const s = wallSnapItem(it, def, x, z); if (s) { x = s.x; z = s.z; it.rot = Math.round(s.rot); } }
    it.x = x; it.z = z; moveItemObj(it); refreshSelection(true); return;
  }
  if (dr?.kind === 'opening') {
    const w = findWall(dr.wallId), o = w.openings.find(q => q.id === dr.opId), f = floorHit(e, 0); if (!f) return;
    const { L } = wallFrame(w); o.pos = clamp(snapV(projT(f, w.a, w.b) * L, e), o.w / 2 + 0.02, L - o.w / 2 - 0.02); buildWalls(); refreshSelection(true); return;
  }
  if (dr?.kind === 'handle') { moveHandle(e); return; }
  if (view.mode === 'walk') return;
  if (placing) { updateGhost(e); return; }
  if (view.tool === 'wall' || view.tool === 'measure') {
    const f = floorHit(e, 0); if (!f) return;
    let p = snapPoint(f, e, view.tool === 'measure');
    const st = view.tool === 'wall' ? wallStart : measureStart;
    if (st && !e.shiftKey && view.tool === 'wall') p = orthoSnap(st, p);
    cursorPt = p; drawToolPreview(); return;
  }
  if (!ptr.down) { const h = pick(e); const c = (h?.kind === 'item' && !view.lock) || h?.kind === 'handle' ? 'grab' : h ? 'pointer' : ''; if (c !== hoverCursor) { hoverCursor = c; canvas.style.cursor = c; } }
});
function endPointer(e) {
  if (!ptr.down) return; ptr.down = false;
  const dr = ptr.drag; ptr.drag = null; controls.enabled = view.mode !== 'walk'; if (dr?.kind === 'look') canvas.style.cursor = 'grab';
  try { canvas.releasePointerCapture(e.pointerId); } catch { }
  if (dr?.kind === 'item') { if (ptr.moved) commit(); return; }
  if (dr?.kind === 'opening') { if (ptr.moved) commit(); else renderInspector(); return; }
  if (dr?.kind === 'handle') { endHandleDrag(); return; }
  if (ptr.moved || e.type === 'pointercancel') return;
  onClick(e);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('dblclick', () => { if (view.tool === 'wall') { wallStart = null; drawToolPreview(); } });
canvas.addEventListener('contextmenu', e => { if (view.tool === 'wall' && wallStart) { e.preventDefault(); wallStart = null; drawToolPreview(); } });

function onClick(e) {
  if (placing) { placeAt(e); return; }
  if (view.mode === 'walk') { // a click on the floor (or a rug) walks there; furniture and walls still select
    const h = pick(e), it = h?.kind === 'item' && findItem(h.id);
    if (h && ((h.kind === 'room' && h.surface === 'floor') || h.kind === 'balcony' || (it && (it.type.startsWith('rug') || it.h < 0.05)))) { select(null); walkTo([h.point.x, h.point.z]); return; }
  }
  if (view.tool === 'wall' && view.mode !== 'walk') {
    const f = floorHit(e, 0); if (!f) return;
    let p = snapPoint(f, e, false); if (wallStart && !e.shiftKey) p = orthoSnap(wallStart, p);
    if (!wallStart) { wallStart = p; drawToolPreview(); return; }
    if (dist(wallStart, p) < 0.1) { wallStart = null; drawToolPreview(); return; }
    state.walls.push({ id: uid('w'), a: [+wallStart[0].toFixed(3), +wallStart[1].toFixed(3)], b: [+p[0].toFixed(3), +p[1].toFixed(3)], t: state.settings.wallT, openings: [], finish: {} });
    syncRooms(); rebuild({ walls: true, items: true }); commit();
    const closed = state.walls.some(w => w.id !== state.walls[state.walls.length - 1].id && (dist(w.a, p) < 0.02 || dist(w.b, p) < 0.02 || distSeg(p, w.a, w.b) < 0.02));
    wallStart = closed ? null : p; drawToolPreview(); return;
  }
  if (view.tool === 'measure' && view.mode !== 'walk') {
    const f = floorHit(e, 0); if (!f) return; const p = snapPoint(f, e, true);
    if (!measureStart) measureStart = p; else { measures.push([measureStart, p]); measureStart = null; }
    drawToolPreview(); renderHint(); return;
  }
  const h = pick(e);
  if (!h) { select(null); return; }
  if (h.kind === 'item') select({ kind: 'item', id: h.id });
  else if (h.kind === 'wall') {
    const w = findWall(h.id), { L, n } = wallFrame(w), p = [h.point.x, h.point.z];
    select({ kind: 'wall', id: h.id, side: dot(sub(p, w.a), n) >= 0 ? 'A' : 'B', at: clamp(projT(p, w.a, w.b) * L, 0, L) });
  }
  else if (h.kind === 'opening') select({ kind: 'opening', wallId: h.wallId, opId: h.opId });
  else if (h.kind === 'room') select(h.id ? { kind: 'room', id: h.id, surface: h.surface } : null);
  else if (h.kind === 'balcony') select({ kind: 'balcony' });
  else if (h.kind === 'roof') select({ kind: 'roof' });
}

// ---------- wall endpoint handles ----------
function startHandleDrag(h, e) {
  const w = findWall(h.wallId), P = w[h.end], f = floorHit(e, 0);
  const shared = []; for (const o of state.walls) for (const end of ['a', 'b']) if (dist(o[end], P) < 0.02) shared.push([o, end]);
  ptr.drag = { kind: 'handle', shared, off: f ? sub(P, f) : [0, 0], orig: [P[0], P[1]], other: w[h.end === 'a' ? 'b' : 'a'] };
  controls.enabled = false; canvas.setPointerCapture(e.pointerId);
}
function moveHandle(e) {
  const dr = ptr.drag, f = floorHit(e, 0); if (!f) return;
  let p = add(f, dr.off), best = null, bd = 0.12;
  for (const w of state.walls) for (const q of [w.a, w.b]) { if (dr.shared.some(([o, end]) => o[end] === q)) continue; const dd = dist(p, q); if (dd < bd) { bd = dd; best = q; } }
  p = best ? [best[0], best[1]] : e.shiftKey ? p : orthoSnap(dr.other, [snapV(p[0], e), snapV(p[1], e)]);
  for (const [o, end] of dr.shared) o[end] = [+p[0].toFixed(3), +p[1].toFixed(3)];
  refreshFaces(); buildWalls(); buildFloors(); refreshSelection(true);
}
function endHandleDrag() { if (!ptr.moved) return; syncRooms(); rebuild({ walls: true, items: true }); commit(); renderInspector(); }

// ---------- placing new items ----------
let ghost = null;
function startPlacing(type) {
  cancelTools(); const d = CAT[type]; placing = { type };
  if (!view.furniture && !isFixture({ type })) setFurniture(true);
  const it = newItem(type, CENTER.x, CENTER.z); placing.item = it;
  ghost = makeItemObj(it); ghost.traverse(m => { if (m.isMesh) { m.material = Array.isArray(m.material) ? m.material : m.material; m.castShadow = false; } });
  groups.helpers.add(ghost);
  const c = floorHit({ clientX: canvas.getBoundingClientRect().left + canvas.clientWidth / 2, clientY: canvas.getBoundingClientRect().top + canvas.clientHeight / 2 }, 0);
  if (c) { it.x = c[0]; it.z = c[1]; ghost.position.set(it.x, itemY(it), it.z); }
  renderHint(); markDirty(); if (matchMedia('(max-width:860px)').matches) $('#left').classList.remove('open');
  toast(`Click the floor to place: ${d.name}`);
}
function newItem(type, x, z) {
  const d = CAT[type];
  return { id: uid('i'), type, x, z, rot: 0, w: d.w, d: d.d, h: d.h, y: d.y || 0, ...itemDefaults(d) };
}
function updateGhost(e) {
  const it = placing.item, d = CAT[it.type], f = floorHit(e, 0); if (!f) return;
  it.x = snapV(f[0], e); it.z = snapV(f[1], e);
  if (d.wallSnap && !e.altKey) { const s = wallSnapItem(it, d, it.x, it.z); if (s) { it.x = s.x; it.z = s.z; it.rot = Math.round(s.rot); } }
  ghost.position.set(it.x, itemY(it), it.z); ghost.rotation.y = it.rot * DEG; markDirty();
}
function placeAt(e) {
  updateGhost(e); const it = { ...placing.item, id: uid('i') };
  state.items.push(it); rebuildItem(it); commit();
  if (e.shiftKey) { placing.item = { ...placing.item }; return; }
  cancelTools(); select({ kind: 'item', id: it.id });
}
function cancelTools() {
  if (ghost) { groups.helpers.remove(ghost); ghost = null; }
  placing = null; wallStart = null; measureStart = null; cursorPt = null; drawToolPreview(); renderHint();
}

// ---------- helper visuals: selection, handles, tool previews ----------
const ACCENT = () => cssVar('--accent');
const lineMat = () => new THREE.LineBasicMaterial({ color: ACCENT(), depthTest: false, transparent: true });
const selGroup = new THREE.Group(), toolGroup = new THREE.Group(); groups.helpers.add(selGroup, toolGroup);
function boxLines(w, h, d) { return new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), lineMat()); }

// ---------- room dimensions: one chain per wall face, split at doors, windows and openings ----------
const OPN = { door: 'door', window: 'window', opening: 'opening', balcony: 'balcony door', front: 'front door' };
function compass(out) { // outward direction of a wall face -> which wall it is (top of the plan is east)
  const a = Math.atan2(out[1], out[0]) / DEG, names = [[0, 'South'], [90, 'West'], [180, 'North'], [-180, 'North'], [-90, 'East'], [45, 'South-west'], [135, 'North-west'], [-45, 'South-east'], [-135, 'North-east']];
  return names.reduce((b, n) => Math.abs(n[0] - a) < Math.abs(b[0] - a) ? n : b)[1];
}
// how far the neighbouring walls reach into an open passage at each end (its clear width is the length minus both)
function openEnds(w) { const f = p => Math.max(0, ...state.walls.filter(o => o !== w && !o.open && distSeg(p, o.a, o.b) < 0.02).map(o => o.t / 2)); return [f(w.a), f(w.b)]; }
const openClear = w => dist(w.a, w.b) - openEnds(w).reduce((a, b) => a + b, 0);
function polyEdges(poly) { // poly: counter-clockwise (positive area) inner outline; merges straight runs, splits at openings
  const P = areaSigned(poly) < 0 ? [...poly].reverse() : poly, n = P.length, raw = [];
  for (let k = 0; k < n; k++) { const a = P[k], b = P[(k + 1) % n]; if (dist(a, b) > 0.005) raw.push({ a, b }); }
  const same = (e1, e2) => { const d1 = norm(sub(e1.b, e1.a)), d2 = norm(sub(e2.b, e2.a)); return dot(d1, d2) > 0.999 && Math.abs(cross(d1, sub(e2.b, e1.a))) < 0.004; };
  const m = [];
  for (const e of raw) { const last = m[m.length - 1]; if (last && same(last, e)) last.b = e.b; else m.push({ ...e }); }
  if (m.length > 1 && same(m[m.length - 1], m[0])) { const l = m.pop(); m[0].a = l.a; }
  return m.map(e => {
    const L = dist(e.a, e.b), d = norm(sub(e.b, e.a)), inw = [-d[1], d[0]], cuts = [];
    for (const w of state.walls) {
      const fr = wallFrame(w); if (Math.abs(cross(fr.d, d)) > 0.01) continue;
      if (w.open) { // the whole wall is a passage
        if (Math.abs(Math.abs(dot(sub(w.a, e.a), inw)) - w.t / 2) > 0.03) continue;
        const [ua, ub] = openEnds(w), L6 = dist(w.a, w.b);
        let t0 = dot(sub(add(w.a, mul(fr.d, ua)), e.a), d), t1 = dot(sub(add(w.a, mul(fr.d, L6 - ub)), e.a), d); if (t0 > t1) [t0, t1] = [t1, t0];
        if (t1 > 0.01 && t0 < L - 0.01) cuts.push({ t0: Math.max(0, t0), t1: Math.min(L, t1), type: 'opening', sill: 0 });
        continue;
      }
      for (const o of w.openings || []) {
        const pc = add(w.a, mul(fr.d, o.pos)); if (Math.abs(Math.abs(dot(sub(pc, e.a), inw)) - w.t / 2) > 0.06) continue;
        let t0 = dot(sub(add(w.a, mul(fr.d, o.pos - o.w / 2)), e.a), d), t1 = dot(sub(add(w.a, mul(fr.d, o.pos + o.w / 2)), e.a), d);
        if (t0 > t1) [t0, t1] = [t1, t0];
        if (t1 <= 0.01 || t0 >= L - 0.01) continue;
        cuts.push({ t0: Math.max(0, t0), t1: Math.min(L, t1), type: o.type, sill: o.sill || 0 });
      }
    }
    cuts.sort((x, y) => x.t0 - y.t0);
    const segs = []; let t = 0;
    for (const c of cuts) { if (c.t0 > t + 0.005) segs.push({ t0: t, t1: c.t0, type: 'wall' }); segs.push(c); t = Math.max(t, c.t1); }
    if (L > t + 0.005) segs.push({ t0: t, t1: L, type: 'wall' });
    return { a: e.a, b: e.b, L, d, inw, segs, name: compass(mul(inw, -1)) };
  });
}
const FAT = new Set(); // screen-space line materials that need the canvas size
function fatMat(color, width) { const m = new LineMaterial({ color, linewidth: width, depthTest: false, transparent: true }); m.resolution.set(canvas.clientWidth || 1, canvas.clientHeight || 1); FAT.add(m); return m; }
function fatLines(pairs, m) { if (!pairs.length) return; const g = new LineSegmentsGeometry(); g.setPositions(pairs.flatMap(v => [v.x, v.y, v.z])); const l = new LineSegments2(g, m); l.renderOrder = 998; selGroup.add(l); }
function drawEdgeDims(edges) {
  const y = 0.03, off = 0.24, off2 = off + 0.3, wallP = [], openP = [], tickP = [], totP = [];
  const at = (e, t, o) => { const p = add(add(e.a, mul(e.d, t)), mul(e.inw, o)); return new THREE.Vector3(p[0], y, p[1]); };
  for (const e of edges) {
    for (const sg of e.segs) {
      (sg.type === 'wall' ? wallP : openP).push(at(e, sg.t0, off), at(e, sg.t1, off));
      for (const t of [sg.t0, sg.t1]) tickP.push(at(e, t, 0.02), at(e, t, off + 0.07));
      const len = sg.t1 - sg.t0;
      dimLabels.push({ p: at(e, (sg.t0 + sg.t1) / 2, off), text: sg.type === 'wall' ? `${len.toFixed(2)} m` : `${OPN[sg.type]} ${len.toFixed(2)}`, cls: sg.type === 'wall' ? 'seg' : 'op' });
    }
    if (e.segs.length > 1) { // overall corner-to-corner length, one step further into the room
      totP.push(at(e, 0, off2), at(e, e.L, off2));
      for (const t of [0, e.L]) tickP.push(at(e, t, off + 0.07), at(e, t, off2 + 0.07));
      dimLabels.push({ p: at(e, e.L / 2, off2), text: `${e.L.toFixed(2)} m total`, cls: 'tot' });
    }
  }
  const acc = ACCENT();
  fatLines(wallP, fatMat(acc, 2.5)); fatLines(openP, fatMat(cssVar('--blue'), 3.5)); fatLines(totP, fatMat(cssVar('--ink'), 2.5)); fatLines(tickP, fatMat(acc, 1.5));
}
function refreshSelection(light) {
  clear(selGroup); FAT.forEach(m => m.dispose()); FAT.clear(); const s = view.sel; dimLabels.length = 0;
  if (!s) { markDirty(); return; }
  if (s.kind === 'item') {
    const o = itemObjs.get(s.id); if (!o) { view.sel = null; return; }
    const it = findItem(s.id), b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const l = boxLines(sz.x + 0.02, sz.y + 0.02, sz.z + 0.02); l.position.copy(c); l.renderOrder = 999; selGroup.add(l);
    dimLabels.push({ p: new THREE.Vector3(c.x, b.max.y + 0.15, c.z), text: `${cm(it.w)} × ${cm(it.d)} × ${cm(it.h)} cm`, hot: true });
  } else if (s.kind === 'wall' || s.kind === 'opening') {
    const w = findWall(s.kind === 'wall' ? s.id : s.wallId); if (!w) { view.sel = null; return; }
    const { L, d, n } = wallFrame(w), mid = lerp2(w.a, w.b, 0.5), top = ceilAt(mid[0], mid[1]);
    if (s.kind === 'wall') {
      const bh = w.open ? 0.04 : Math.min(top, view.low ? 1.05 : top) + 0.02, l = boxLines(L, bh, w.t + 0.02); l.position.set(mid[0], bh / 2, mid[1]); l.rotation.y = Math.atan2(-d[1], d[0]); l.renderOrder = 999; selGroup.add(l);
      for (const end of ['a', 'b']) {
        const p = w[end], hm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: ACCENT(), depthTest: false }));
        hm.position.set(p[0], (view.low ? 1.05 : ceilAt(p[0], p[1])) + 0.18, p[1]); hm.renderOrder = 1000; hm.userData.handle = { wallId: w.id, end }; selGroup.add(hm);
        const st = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p[0], 0, p[1]), hm.position.clone()]), lineMat()); st.renderOrder = 999; selGroup.add(st);
      }
      dimLabels.push({ p: new THREE.Vector3(mid[0], (w.open ? 0.4 : top + 0.35), mid[1]), text: w.open ? `${fmtM(openClear(w))} · open passage` : `${fmtM(L)} · ${cm(w.t)} cm thick`, hot: true });
    } else {
      const o = w.openings.find(q => q.id === s.opId); if (!o) { view.sel = null; return; }
      const c = add(w.a, mul(d, o.pos)), l = boxLines(o.w + 0.04, o.h + 0.04, w.t + 0.08); l.position.set(c[0], (o.sill || 0) + o.h / 2, c[1]); l.rotation.y = Math.atan2(-d[1], d[0]); l.renderOrder = 999; selGroup.add(l);
      dimLabels.push({ p: new THREE.Vector3(c[0], (o.sill || 0) + o.h + 0.2, c[1]), text: `${cm(o.w)} × ${cm(o.h)} cm`, hot: true });
    }
  } else if (s.kind === 'room') {
    const f = FACES.find(x => x.room.id === s.id); if (!f) { view.sel = null; return; }
    const pts = f.face.inner.map(p => new THREE.Vector3(p[0], 0.03, p[1])); pts.push(pts[0].clone());
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat()); l.renderOrder = 999; selGroup.add(l);
    drawEdgeDims(polyEdges(f.face.inner));
  } else if (s.kind === 'balcony') {
    const B = BALC, poly = [[B.x0, B.z0], [B.x1, B.z0], [B.x1, B.z1], [B.x0, B.z1]], pts = [...poly, poly[0]].map(p => new THREE.Vector3(p[0], 0, p[1]));
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat()); l.renderOrder = 999; selGroup.add(l);
    drawEdgeDims(polyEdges(poly));
  }
  markDirty();
}
function drawToolPreview() {
  clear(toolGroup); toolLabels.length = 0;
  const lm = lineMat();
  for (const [a, b] of measures) addMeasure(a, b, false);
  const st = view.tool === 'wall' ? wallStart : view.tool === 'measure' ? measureStart : null;
  if (cursorPt && (view.tool === 'wall' || view.tool === 'measure')) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.11, 24), new THREE.MeshBasicMaterial({ color: ACCENT(), depthTest: false, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2; r.position.set(cursorPt[0], 0.02, cursorPt[1]); r.renderOrder = 1000; toolGroup.add(r);
  }
  if (st && cursorPt) {
    if (view.tool === 'wall') {
      const L = dist(st, cursorPt); if (L > 0.01) {
        const d = norm(sub(cursorPt, st)), mid = lerp2(st, cursorPt, 0.5), H = view.low ? 1.05 : state.settings.ceilH;
        const m = new THREE.Mesh(new THREE.BoxGeometry(L, H, state.settings.wallT), new THREE.MeshBasicMaterial({ color: ACCENT(), transparent: true, opacity: 0.35, depthWrite: false }));
        m.position.set(mid[0], H / 2, mid[1]); m.rotation.y = Math.atan2(-d[1], d[0]); toolGroup.add(m);
        toolLabels.push({ p: new THREE.Vector3(mid[0], H + 0.2, mid[1]), text: fmtM(L), hot: true });
      }
    } else addMeasure(st, cursorPt, true);
  }
  markDirty();
}
function addMeasure(a, b, live) {
  const pts = [new THREE.Vector3(a[0], 0.04, a[1]), new THREE.Vector3(b[0], 0.04, b[1])];
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat()); l.renderOrder = 999; toolGroup.add(l);
  for (const p of [a, b]) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: ACCENT(), depthTest: false })); t.position.set(p[0], 0.04, p[1]); t.renderOrder = 1000; toolGroup.add(t); }
  const m = lerp2(a, b, 0.5); toolLabels.push({ p: new THREE.Vector3(m[0], 0.12, m[1]), text: fmtM(dist(a, b)), hot: live });
}

// ---------- views & cameras ----------
let controls;
function makeControls() {
  controls = new OrbitControls(persp, canvas);
  controls.target.copy(CENTER); controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.maxPolarAngle = 88 * DEG; controls.minDistance = 1.5; controls.maxDistance = 70; controls.screenSpacePanning = true;
  controls.addEventListener('change', markDirty);
}
function fitOrtho() {
  const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1, a = w / h, bw = 11.5, bh = 12.2;
  let hh = bh / 2; if (hh * a < bw / 2) hh = bw / 2 / a;
  Object.assign(ortho, { left: -hh * a, right: hh * a, top: hh, bottom: -hh }); ortho.updateProjectionMatrix();
}
const saved3d = { pos: persp.position.clone(), target: CENTER.clone() };
// top-down pan/zoom for the plan view (screen up = east, like the floor-plan sketch)
class PlanControls {
  constructor(cam, el) {
    this.cam = cam; this.el = el; this.enabled = true; this.target = new THREE.Vector3(4.4, 0, 3.0); this.ptrs = new Map(); this.changed = true; this.pinch = null;
    this.h = { down: e => this.down(e), move: e => this.move(e), up: e => this.up(e), wheel: e => this.wheel(e) };
    el.addEventListener('pointerdown', this.h.down); el.addEventListener('pointermove', this.h.move);
    el.addEventListener('pointerup', this.h.up); el.addEventListener('pointercancel', this.h.up); el.addEventListener('wheel', this.h.wheel, { passive: false });
    this.apply();
  }
  apply() { const c = this.cam; c.position.set(this.target.x, 60, this.target.z); c.rotation.set(-Math.PI / 2, 0, 0); c.updateProjectionMatrix(); c.updateMatrixWorld(); this.changed = true; }
  perPx() { const c = this.cam; return (c.right - c.left) / c.zoom / (this.el.clientWidth || 1); }
  down(e) { if (!this.enabled) return; this.ptrs.set(e.pointerId, [e.clientX, e.clientY]); try { this.el.setPointerCapture(e.pointerId); } catch { } if (this.ptrs.size === 2) this.pinch = this.dist2(); }
  move(e) {
    if (!this.enabled || !this.ptrs.has(e.pointerId)) return;
    const prev = this.ptrs.get(e.pointerId), cur = [e.clientX, e.clientY]; this.ptrs.set(e.pointerId, cur);
    if (this.ptrs.size === 1) { const k = this.perPx(); this.target.x -= (cur[0] - prev[0]) * k; this.target.z -= (cur[1] - prev[1]) * k; this.apply(); }
    else if (this.ptrs.size === 2) { const d = this.dist2(); if (this.pinch) this.zoomBy(d / this.pinch); this.pinch = d; }
  }
  up(e) { this.ptrs.delete(e.pointerId); if (this.ptrs.size < 2) this.pinch = null; }
  dist2() { const [a, b] = [...this.ptrs.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  zoomBy(f, cx, cy) {
    const c = this.cam, z0 = c.zoom, z1 = clamp(z0 * f, 0.4, 10);
    if (cx !== undefined) { const r = this.el.getBoundingClientRect(), nx = (cx - r.left) / r.width - 0.5, ny = (cy - r.top) / r.height - 0.5; this.target.x += nx * (c.right - c.left) * (1 / z0 - 1 / z1); this.target.z += ny * (c.top - c.bottom) * (1 / z0 - 1 / z1); }
    c.zoom = z1; this.apply();
  }
  wheel(e) { if (!this.enabled) return; e.preventDefault(); this.zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }
  update() { const ch = this.changed; this.changed = false; return ch; }
  dispose() { const el = this.el, h = this.h; el.removeEventListener('pointerdown', h.down); el.removeEventListener('pointermove', h.move); el.removeEventListener('pointerup', h.up); el.removeEventListener('pointercancel', h.up); el.removeEventListener('wheel', h.wheel); }
}
function setView(mode) {
  if (mode === view.mode) return;
  const prev = view.mode;
  if (prev === '3d') { saved3d.pos.copy(persp.position); saved3d.target.copy(controls.target); }
  if (mode === 'walk' && prev !== 'walk') {
    const t = [controls.target.x, controls.target.z];
    if (roomAtPt(t[0], t[1])) walk.pos = [t[0], t[1]];
    if (prev === '3d') { const dx = controls.target.x - persp.position.x, dz = controls.target.z - persp.position.z; walk.yaw = Math.atan2(-dx, -dz); }
    walk.pitch = -0.05; walkStop();
  }
  view.mode = mode; cancelTools();
  if (mode === 'walk' && view.tool !== 'select') setTool('select');
  view.underlay = mode === 'plan' && view.underlay;
  controls.dispose();
  if (mode === 'plan') {
    camera = ortho; fitOrtho(); ortho.position.set(4.4, 60, 3.0); ortho.zoom = 1; ortho.updateProjectionMatrix();
    controls = new PlanControls(ortho, canvas);
  } else {
    camera = persp; makeControls(); persp.fov = mode === 'walk' ? 68 : 50; persp.updateProjectionMatrix();
    if (mode === 'walk') walkSettle();
    if (mode === '3d') { persp.position.copy(saved3d.pos); controls.target.copy(saved3d.target); }
    controls.enabled = mode === '3d';
  }
  EDGE.color.set(mode === 'plan' ? '#30383c' : '#F4F3EF');
  $$('#viewSeg button').forEach(b => b.classList.toggle('on', b.dataset.view === mode));
  $('#walkpad').hidden = mode !== 'walk'; canvas.style.cursor = mode === 'walk' ? 'grab' : ''; if (mode !== 'walk') walkStop();
  updateSun(); rebuild({ all: true }); updateUnderlay(); renderHint(); onResize();
}
function setTool(t) {
  if (view.mode === 'walk' && t !== 'select') setView('3d');
  view.tool = t; cancelTools();
  $$('#toolSeg button').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  if (t !== 'select') select(null);
  canvas.style.cursor = t === 'select' ? '' : 'crosshair'; renderHint();
}

// ---------- walk mode ----------
// a body that keeps 30 cm off walls (16 cm at door jambs), eases in and out of motion and slides along walls and furniture; doorways and open passages are gaps in the walls
const WALK_R = 0.3, WALK_JAMB_R = 0.16, WALK_FURN_R = 0.18, WALK_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
function walkSolids() {
  const out = [];
  for (const w of state.walls) {
    if (w.open) continue;
    const { L, d } = wallFrame(w), P = u => [w.a[0] + d[0] * u, w.a[1] + d[1] * u];
    const gaps = (w.openings || []).filter(o => o.sill < 0.05 && o.h > 1.7).map(o => [o.pos - o.w / 2, o.pos + o.w / 2]).sort((p, q) => p[0] - q[0]);
    let u = 0;
    for (const [g0, g1] of gaps) { if (g0 > u + 0.01) out.push([P(u), P(g0), w.t / 2]); u = Math.max(u, g1); }
    if (L > u + 0.01) out.push([P(u), P(L), w.t / 2]);
  }
  return out;
}
function walkBoxes() { // furniture you cannot walk through, as turned boxes (rugs, low and hanging things left out)
  const out = [];
  for (const it of state.items) {
    const d = CAT[it.type]; if (!d || !itemShown(it) || d.hang || it.type.startsWith('rug') || it.h < 0.3 || (it.y || 0) > 1.2 || it.type === 'shower') continue;
    const r = (it.rot || 0) * DEG, c = Math.cos(r), s = Math.sin(r);
    out.push({ x: it.x, z: it.z, c, s, hw: it.w / 2, hd: it.d / 2 });
    if (it.type === 'sofa_l') { const cl = it.cl || 1.8, lx = (it.side === 'R' ? -1 : 1) * (-it.w / 2 + it.d / 2), lz = -it.d / 2 + cl / 2; out.push({ x: it.x + lx * c + lz * s, z: it.z - lx * s + lz * c, c, s, hw: it.d / 2, hd: cl / 2 }); }
  }
  return out;
}
function pushSeg(p, [a, b, ht], r) {
  const vx = b[0] - a[0], vz = b[1] - a[1], t = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / Math.max(1e-9, vx * vx + vz * vz), 0, 1);
  const cx = a[0] + vx * t, cz = a[1] + vz * t, ex = p[0] - cx, ez = p[1] - cz, d = Math.hypot(ex, ez), rr = (t > 0 && t < 1 ? r : Math.min(r, WALK_JAMB_R)) + ht;
  return d >= rr || d < 1e-6 ? p : [cx + ex / d * rr, cz + ez / d * rr];
}
function pushBox(p, b, r) {
  const dx = p[0] - b.x, dz = p[1] - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
  const ex = lx - clamp(lx, -b.hw, b.hw), ez = lz - clamp(lz, -b.hd, b.hd), d = Math.hypot(ex, ez);
  if (d >= r || d < 1e-6) return p; // clear of it, or already standing inside it (free to walk out)
  const k = (r - d) / d, nx = lx + ex * k, nz = lz + ez * k;
  return [b.x + nx * b.c + nz * b.s, b.z - nx * b.s + nz * b.c];
}
const walkInside = p => !!roomAtPt(p[0], p[1]) || inBalcony(p[0], p[1]);
const walkFree = p => walkInside(p) && !itemBlocked(p, WALK_FURN_R) && walkSolids().every(s => pushSeg(p, s, WALK_R) === p && distSeg(p, s[0], s[1]) > s[2]);
function walkMove(mx, mz) {
  const S = walkSolids(), B = walkBoxes(), n = Math.max(1, Math.ceil(Math.hypot(mx, mz) / 0.06));
  let p = walk.pos;
  for (let i = 0; i < n; i++) {
    let q = [p[0] + mx / n, p[1] + mz / n];
    for (let k = 0; k < 3; k++) { for (const s of S) q = pushSeg(q, s, WALK_R); for (const bx of B) q = pushBox(q, bx, WALK_FURN_R); }
    if (!walkInside(q)) { const qa = [q[0], p[1]], qb = [p[0], q[1]]; q = walkInside(qa) ? qa : walkInside(qb) ? qb : p; }
    p = q;
  }
  const got = Math.hypot(p[0] - walk.pos[0], p[1] - walk.pos[1]); walk.pos = p; return got;
}
function walkSettle() { // step out of a wall or a sofa to the nearest free spot
  if (walkFree(walk.pos)) return;
  const [x0, z0] = walk.pos;
  for (let r = 0.1; r < 3; r += 0.1) for (let i = 0; i < 24; i++) { const p = [x0 + Math.cos(i * Math.PI / 12) * r, z0 + Math.sin(i * Math.PI / 12) * r]; if (walkFree(p)) { walk.pos = p; return; } }
  goToRoom('r_living');
}
function walkStop() { walk.vel = [0, 0]; walk.turnV = 0; walk.glide = 0; walk.goal = null; GOAL_MARK.visible = false; }
function walkTo(p) { if (!walkInside(p)) return; walk.goal = p; walk.goalT = 0; walk.stuck = 0; walk.glide = 0; GOAL_MARK.position.set(p[0], 0.012, p[1]); GOAL_MARK.visible = true; markDirty(); }
const GOAL_MARK = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.15, 40), new THREE.MeshBasicMaterial({ color: '#E3B13A', transparent: true, opacity: 0.9, depthWrite: false }));
GOAL_MARK.rotation.x = -Math.PI / 2; GOAL_MARK.visible = false; GOAL_MARK.userData.noAO = true; scene.add(GOAL_MARK);
function walkInput() {
  const k = walk.keys, pd = walk.pad, on = (...c) => c.some(x => k.has(x));
  return {
    f: (on('KeyW', 'ArrowUp') || pd.has('fwd') ? 1 : 0) - (on('KeyS', 'ArrowDown') || pd.has('back') ? 1 : 0),
    s: (on('KeyD') ? 1 : 0) - (on('KeyA') ? 1 : 0),
    turn: (on('ArrowLeft', 'KeyQ') || pd.has('left') ? 1 : 0) - (on('ArrowRight', 'KeyE') || pd.has('right') ? 1 : 0),
    run: on('ShiftLeft', 'ShiftRight'),
  };
}
function stepWalk(dt) {
  const { f, s, turn, run } = walkInput(), fx = -Math.sin(walk.yaw), fz = -Math.cos(walk.yaw), rx = -fz, rz = fx;
  let tx = 0, tz = 0;
  if (f || s) { const sp = (run ? 2.8 : 1.4) / Math.hypot(f, s); tx = (fx * f + rx * s) * sp; tz = (fz * f + rz * s) * sp; if (walk.goal) { walk.goal = null; GOAL_MARK.visible = false; } walk.glide = 0; }
  else if (walk.goal) {
    const dx = walk.goal[0] - walk.pos[0], dz = walk.goal[1] - walk.pos[1], d = Math.hypot(dx, dz); walk.goalT += dt;
    if (d < 0.05 || walk.goalT > 10 || walk.stuck > 0.35) { walk.goal = null; GOAL_MARK.visible = false; } else { const v = Math.min(1.5, d * 2.2 + 0.12); tx = dx / d * v; tz = dz / d * v; }
  }
  const ease = 1 - Math.exp(-dt * 10);
  walk.vel[0] += (tx - walk.vel[0]) * ease; walk.vel[1] += (tz - walk.vel[1]) * ease;
  if (!tx && !tz && Math.hypot(walk.vel[0], walk.vel[1]) < 0.01) walk.vel = [0, 0];
  walk.turnV += (turn * (run ? 2.6 : 1.7) - walk.turnV) * (1 - Math.exp(-dt * 12)); if (!turn && Math.abs(walk.turnV) < 0.01) walk.turnV = 0;
  walk.yaw += walk.turnV * dt;
  let mx = walk.vel[0] * dt, mz = walk.vel[1] * dt;
  if (walk.glide) { const g = Math.abs(walk.glide) < 0.004 ? walk.glide : walk.glide * (1 - Math.exp(-dt * 7)); walk.glide -= g; mx += fx * g; mz += fz * g; }
  if (mx || mz) { const want = Math.hypot(mx, mz), got = walkMove(mx, mz); walk.stuck = got < want * 0.25 ? walk.stuck + dt : 0; if (walk.stuck > 0.35) { walk.vel = [0, 0]; walk.glide = 0; } }
  return !!(mx || mz || walk.turnV || GOAL_MARK.visible);
}
function itemBlocked(p, pad = 0.12) {
  for (const it of state.items) {
    const d = CAT[it.type]; if (!d || !itemShown(it) || d.hang || it.type.startsWith('rug') || it.h < 0.3 || (it.y || 0) > 1.2 || it.type === 'shower') continue;
    const a = (it.rot || 0) * DEG, dx = p[0] - it.x, dz = p[1] - it.z, lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a);
    if (Math.abs(lx) < it.w / 2 + pad && Math.abs(lz) < it.d / 2 + pad) return true;
    if (it.type === 'sofa_l') { const cl = it.cl || 1.8, sx = it.side === 'R' ? -1 : 1, cx = sx * (-it.w / 2 + it.d / 2), cz = -it.d / 2 + cl / 2; if (Math.abs(lx - cx) < it.d / 2 + pad && Math.abs(lz - cz) < cl / 2 + pad) return true; }
  }
  return false;
}
function rayWallDist(p, dir) {
  let best = 8;
  for (const w of state.walls) { if (w.open) continue; const ii = segInter(p, add(p, mul(dir, 20)), w.a, w.b); if (ii && ii[0] > 0 && ii[1] >= 0 && ii[1] <= 1) best = Math.min(best, ii[0] * 20); }
  return best;
}
function goToRoom(id) {
  const f = FACES.find(x => x.room.id === id); if (!f) return;
  if (view.mode !== 'walk') setView('walk');
  // stand where the room looks longest: free floor, away from walls, facing the deepest view
  const inner = f.face.inner, xs = inner.map(q => q[0]), zs = inner.map(q => q[1]);
  let best = null;
  for (let x = Math.min(...xs) + 0.35; x < Math.max(...xs) - 0.3; x += 0.2) for (let z = Math.min(...zs) + 0.35; z < Math.max(...zs) - 0.3; z += 0.2) {
    const p = [x, z]; if (!pip(p, inner) || !walkFree(p) || itemBlocked(p, 0.3)) continue;
    for (let i = 0; i < 16; i++) { const y = i * Math.PI / 8, dd = rayWallDist(p, [-Math.sin(y), -Math.cos(y)]); if (!best || dd > best.s) best = { p, y, s: dd }; }
  }
  if (!best) best = { p: interiorPoint(inner), y: walk.yaw };
  walkStop(); walk.pos = best.p; walk.yaw = best.y; walk.pitch = -0.08; markDirty();
}

// fit the view to a room (or the balcony) so its measurements are readable, leaving room for the side panels
function frameRoom(id) {
  const f = id === 'balcony' ? { face: { inner: [[BALC.x0, BALC.z0], [BALC.x1, BALC.z0], [BALC.x1, BALC.z1], [BALC.x0, BALC.z1]] } } : FACES.find(x => x.room.id === id);
  if (!f) return;
  const xs = f.face.inner.map(p => p[0]), zs = f.face.inner.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), l = Math.max(...zs) - Math.min(...zs), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cz = (Math.max(...zs) + Math.min(...zs)) / 2;
  const cr = canvas.getBoundingClientRect(), lr = $('#left').getBoundingClientRect(), ir = $('#insp').getBoundingClientRect();
  const wide = cr.width > 860, x0 = wide && lr.width ? lr.right - cr.left : 0, x1 = wide && ir.width ? ir.left - cr.left : cr.width;
  if (view.mode === 'plan') {
    const c = controls, fw = Math.max(120, x1 - x0), zx = (ortho.right - ortho.left) * fw / cr.width / (w + 1.4), zy = (ortho.top - ortho.bottom) / (l + 1.4);
    c.cam.zoom = clamp(Math.min(zx, zy), 0.4, 10);
    const perPx = (ortho.right - ortho.left) / c.cam.zoom / cr.width;
    c.target.set(cx - ((x0 + x1) / 2 - cr.width / 2) * perPx, 0, cz); c.apply();
  } else if (view.mode === '3d') {
    const dir = persp.position.clone().sub(controls.target).normalize();
    if (dir.y < 0.55) { dir.y = 0.55; dir.normalize(); }
    controls.target.set(cx, 0.4, cz); persp.position.copy(controls.target).addScaledVector(dir, Math.max(w, l) * 1.5 + 2.5); controls.update();
  }
  markDirty();
}

// ---------- labels overlay ----------
const labelsEl = $('#labels'), labelPool = [], dimLabels = [], toolLabels = [];
function drawLabels() {
  const W = canvas.clientWidth, H = canvas.clientHeight, list = [], sk = view.sel?.kind, focus = sk === 'room' ? view.sel.id : sk === 'balcony' ? '-' : null;
  if (state.settings.labels && view.mode !== 'walk') for (const f of FACES) {
    const r = f.room; if (!r.id || (focus && r.id !== focus)) continue;
    const ip = r.anchor && pip(r.anchor, f.face.inner) ? r.anchor : interiorPoint(f.face.inner);
    const xs = f.face.inner.map(p => p[0]), zs = f.face.inner.map(p => p[1]);
    const dims = view.mode === 'plan' ? ` · ${(Math.max(...xs) - Math.min(...xs)).toFixed(2)} × ${(Math.max(...zs) - Math.min(...zs)).toFixed(2)}` : '';
    list.push({ cls: 'room', p: new THREE.Vector3(ip[0], 0.1, ip[1]), html: `<b>${esc(r.name)}</b><i>${fmtA(f.face.innerArea)}${dims}</i>` });
  }
  for (const l of [...dimLabels, ...toolLabels]) list.push({ cls: 'dim' + (l.hot ? ' hot' : '') + (l.cls ? ' ' + l.cls : ''), p: l.p, html: esc(l.text) });
  while (labelPool.length < list.length) { const el = document.createElement('div'); labelsEl.appendChild(el); labelPool.push(el); }
  const v = new THREE.Vector3(), placed = [];
  labelPool.forEach((el, i) => {
    const l = list[i]; if (!l) { el.hidden = true; return; }
    v.copy(l.p).project(camera);
    if (v.z > 1 || v.z < -1) { el.hidden = true; return; }
    el.hidden = false;
    const cls = 'lbl ' + l.cls; if (el.className !== cls) { el.className = cls; el._w = 0; }
    if (el._h !== l.html) { el.innerHTML = l.html; el._h = l.html; el._w = 0; }
    if (!el._w) { el._w = el.offsetWidth; el._ht = el.offsetHeight; }
    const x = (v.x + 1) / 2 * W; let y = (1 - v.y) / 2 * H;
    if (l.cls.startsWith('dim')) for (let k = 0; k < 10; k++) { // nudge labels that would cover one already placed
      const hit = placed.find(p => Math.abs(p.x - x) < (p.w + el._w) / 2 + 3 && Math.abs(p.y - y) < (p.h + el._ht) / 2 + 2);
      if (!hit) break; y = hit.y + (y >= hit.y ? 1 : -1) * ((hit.h + el._ht) / 2 + 3);
    }
    placed.push({ x, y, w: el._w, h: el._ht });
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
  });
}

// ---------- plan underlay (original Anticimex sketch, local copy only) ----------
const UNDER = { ok: false, ppm: 95.3, ox: 140, oy: 397, natW: 1131 };
function updateUnderlay() {
  const on = view.mode === 'plan' && view.underlay && UNDER.ok; $('#underlay').hidden = !on;
  if (!on) return;
  const img = $('#underImg'), W = canvas.clientWidth, H = canvas.clientHeight, k = (img.naturalWidth || UNDER.natW) / UNDER.natW;
  const hw = (ortho.right - ortho.left) / 2 / ortho.zoom, hh = (ortho.top - ortho.bottom) / 2 / ortho.zoom;
  const sx = W / (2 * hw), sy = H / (2 * hh), cx = ortho.position.x, cz = ortho.position.z;
  const wx = -UNDER.ox / UNDER.ppm, wz = -UNDER.oy / UNDER.ppm;
  img.style.left = ((wx - (cx - hw)) * sx) + 'px'; img.style.top = ((wz - (cz - hh)) * sy) + 'px';
  img.style.width = ((img.naturalWidth || UNDER.natW) / k / UNDER.ppm * sx) + 'px';
}

// ---------- render loop ----------
let lastT = performance.now(), walkFt = 1 / 60, walkFast = false, wasActive = false;
function frame(t) {
  if (FILM.rec) { requestAnimationFrame(frame); return; } // the recorder renders frames itself
  const raw = (t - lastT) / 1000, dt = Math.min(0.05, raw); lastT = t;
  let moving = false;
  if (FILM.on) filmTick();
  else if (view.mode === 'walk') {
    moving = stepWalk(dt);
    persp.position.set(walk.pos[0], 1.62, walk.pos[1]); persp.rotation.order = 'YXZ'; persp.rotation.set(walk.pitch, walk.yaw, 0);
  } else if (controls.update()) moving = true;
  // while walking, if full-quality frames come slower than about 40 a second, draw plain frames in motion and the full one when you stop
  const active = view.mode === 'walk' && !FILM.on && (moving || ptr.drag?.kind === 'look');
  if (active) { walkFt += (raw - walkFt) * 0.08; if (walkFt > 0.026) walkFast = true; }
  if (wasActive && !active) dirty = true; wasActive = active;
  if (moving || dirty || window.__live) {
    const tf = performance.now(); renderFrame(active && walkFast); if (PERF.length < 60) PERF.push(["frame", Math.round(performance.now() - tf)]); if (!frame.shown) { frame.shown = true; $("#loading").hidden = true; } drawLabels(); if (view.mode === 'plan') updateUnderlay(); dirty = false;
  }
  requestAnimationFrame(frame);
}
function onResize() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h || FILM.rec) return;
  renderer.setSize(w, h, false); persp.aspect = w / h; persp.updateProjectionMatrix(); FAT.forEach(m => m.resolution.set(w, h)); if (composer) composer.setSize(w, h);
  if (view.mode === 'plan') { const z = ortho.zoom; fitOrtho(); ortho.zoom = z; ortho.updateProjectionMatrix(); }
  markDirty();
}
new ResizeObserver(onResize).observe(stage);

// ---------- keyboard ----------
const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
const textEntry = () => { const a = document.activeElement; return a?.tagName === 'TEXTAREA' || (a?.tagName === 'INPUT' && !/^(range|checkbox|radio|color|button)$/.test(a.type)); };
addEventListener('keydown', e => {
  if (FILM.on) { if (e.key === 'Escape') filmStop(); return; }
  // walking keys go by key position (any keyboard layout) and reach the walk unless you are typing in a text field
  if (view.mode === 'walk' && WALK_CODES.has(e.code) && !e.ctrlKey && !e.metaKey && !e.altKey && !textEntry()) {
    walk.keys.add(e.code); e.preventDefault(); if (/^(SELECT|BUTTON)$/.test(document.activeElement?.tagName) || document.activeElement?.type === 'range') document.activeElement.blur(); markDirty(); return;
  }
  if (typing()) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (k === 'escape') { if (placing || wallStart || measureStart) cancelTools(); else if (view.tool !== 'select') setTool('select'); else select(null); return; }
  const s = view.sel;
  if (s?.kind === 'item') {
    const it = findItem(s.id);
    if (mod && k === 'd') { e.preventDefault(); duplicateItem(it); return; }
    if (view.lock && (['r', 'q', 'e', 'delete', 'backspace'].includes(k) || k.startsWith('arrow'))) { e.preventDefault(); return; }
    if (k === 'r') { it.rot = ((it.rot + (e.shiftKey ? -90 : 90)) % 360 + 360) % 360; moveItemObj(it); refreshSelection(); commit(); renderInspector(); return; }
    if (k === 'q' || k === 'e') { it.rot = ((it.rot + (k === 'q' ? 15 : -15)) % 360 + 360) % 360; moveItemObj(it); refreshSelection(); commit(); renderInspector(); return; }
    if (k.startsWith('arrow')) { e.preventDefault(); const st = e.shiftKey ? 0.1 : 0.01; if (k === 'arrowleft') it.x -= st; if (k === 'arrowright') it.x += st; if (k === 'arrowup') it.z -= st; if (k === 'arrowdown') it.z += st; moveItemObj(it); refreshSelection(); commit(); return; }
  }
  if (placing && k === 'r') { placing.item.rot = (placing.item.rot + 90) % 360; ghost.rotation.y = placing.item.rot * DEG; markDirty(); return; }
  if (k === 'delete' || k === 'backspace') { deleteSelection(); return; }
  if (mod) return;
  if (k === 'v') setTool('select'); else if (k === 'w') setTool('wall'); else if (k === 'm') setTool('measure');
  else if (k === 'l') toggleLow(); else if (k === 'f') setFurniture(!view.furniture); else if (k === 'k') setLock(!view.lock); else if (k === 'g') setShadows(!state.settings.shadows); else if (k === '1') setView('3d'); else if (k === '2') setView('plan'); else if (k === '3') setView('walk');
});
addEventListener('keyup', e => { walk.keys.delete(e.code); if (e.key === 'Shift') { walk.keys.delete('ShiftLeft'); walk.keys.delete('ShiftRight'); } });
addEventListener('blur', () => walk.keys.clear()); document.addEventListener('visibilitychange', () => walk.keys.clear());
// scroll (mouse wheel or trackpad) glides forward and back
canvas.addEventListener('wheel', e => { if (view.mode !== 'walk' || FILM.on) return; e.preventDefault(); walk.goal = null; GOAL_MARK.visible = false; walk.glide = clamp(walk.glide - e.deltaY * (e.deltaMode === 1 ? 0.06 : 0.0022), -2.5, 2.5); markDirty(); }, { passive: false });
$$('#walkpad button').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); walk.pad.add(k); b.setPointerCapture(e.pointerId); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => walk.pad.delete(k));
});
function setLock(on) {
  view.lock = on; const b = $('#lockBtn'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  LS.set(PFX + 'lock', on ? '1' : '0'); hoverCursor = ''; canvas.style.cursor = '';
}
function setFurniture(on) {
  view.furniture = on; const b = $('#furnBtn'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  applyFurniture();
  if (view.sel?.kind === 'item') { const it = findItem(view.sel.id); if (it && !itemShown(it)) select(null); }
}
function setShadows(on) {
  const S = state.settings; S.shadows = on;
  if (on) S.hour = goldenHour(S.season);
  updateSun(); commit(); if (curTab === 'build') renderLeft();
  if (on) { const h = Math.floor(S.hour), m = Math.round((S.hour - h) * 60); toast('Golden hour, ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' (' + S.season + ')'); }
}
function toggleLow() { view.low = !view.low; $('#lowBtn').classList.toggle('on', view.low); $('#lowBtn').setAttribute('aria-pressed', view.low); rebuild({ walls: true }); }
