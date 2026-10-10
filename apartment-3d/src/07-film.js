// ---------- renovation film: the living room as listed turned into "Oppussing", stage by stage, from the viewpoint of listing photo 03 ----------
const FILM = { on: false, rec: false, t: 0, T: 56, t0: 0, stage: 0, capA: 0, mats: [], progress: 0 };
const FILM_STAGES = [[0, 'Before'], [4, 'Furniture out'], [7.5, 'Old skirting and crown off'], [9, 'Ceiling lowered 7 cm on levelled battens, cables above'],
  [15, 'Plasterboard ceiling with a curtain pocket at the window'], [20, 'Rehab boards over the old structured wallpaper'], [26, 'Filled and painted, white ceiling and beige walls'],
  [32, 'Click vinyl, dark herringbone'], [38.5, 'New skirting and crown moulding'], [42, 'Wall mouldings'], [45.5, 'Curtains in the pocket, furniture back'], [49.5, 'After']];
// listing photo 03 solved from its wall corners (photo scaled to 2528 px wide): a level camera by the window wall, 98 cm up, about 100° across
const FILM_VIEW = { pos: [4.43, 0.98, 8.4], yaw: -0.873, f: 992, cx: 1292, cy: 886, frame: [55, 120, 2534, 1425] };
const FILM_ROOMS = ['r_living', 'r_dining'];
// the surface cable to the smoke detector in photo 03, rerouted above the new ceiling on to the ceiling light
const FILM_CABLE = [[3.6, 5.4], [4.36, 5.37], [6.6, 6.35]];
const fss = (a, b, x) => clamp((x - a) / (b - a), 0, 1), fease = x => x * x * (3 - 2 * x), SCALEZ = new THREE.Matrix4(), FV = new THREE.Vector3(), FB = new THREE.Box3();
let BOARDTEX = null;
function boardTex() { // 1.2 x 2.4 m rehab board: paper face, darker cut edges, screw rows
  if (BOARDTEX) return BOARDTEX;
  const c = mkCanvas(256, 512), g = c.getContext('2d'), R = rng(61);
  g.fillStyle = '#DCD9D2'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '120,115,105'},${0.04 + R() * 0.05})`; g.fillRect(R() * 256, R() * 512, 1 + R() * 2, 1 + R() * 2); }
  g.fillStyle = 'rgba(90,85,78,.6)'; g.fillRect(0, 0, 2, 512); g.fillRect(254, 0, 2, 512); g.fillRect(0, 0, 256, 1); g.fillRect(0, 511, 256, 1);
  g.fillStyle = 'rgba(60,60,60,.75)'; for (const x of [7, 128, 249]) for (let y = 12; y < 512; y += 43) { g.beginPath(); g.arc(x, y, 1.7, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return (BOARDTEX = t);
}
// the photo's camera, framed to the canvas: the 16:9 frame of the photo, widened (never cropped) to other shapes; level, so verticals stay vertical
function filmCam() {
  const V = FILM_VIEW, sz = renderer.getSize(new THREE.Vector2()), asp = sz.x / Math.max(1, sz.y);
  let [x0, y0, w, h] = V.frame; const mx = x0 + w / 2, my = y0 + h / 2;
  if (asp > w / h) w = h * asp; else h = w / asp;
  x0 = mx - w / 2; y0 = my - h / 2;
  const FW = 2 * Math.max(V.cx - x0, x0 + w - V.cx), FH = 2 * Math.max(V.cy - y0, y0 + h - V.cy);
  persp.fov = 2 * Math.atan(FH / 2 / V.f) / DEG; persp.aspect = FW / FH;
  persp.setViewOffset(FW, FH, x0 - (V.cx - FW / 2), y0 - (V.cy - FH / 2), w, h);
  persp.position.set(...V.pos); persp.up.set(0, 1, 0); persp.lookAt(V.pos[0] + Math.cos(V.yaw), V.pos[1], V.pos[2] + Math.sin(V.yaw));
  persp.updateProjectionMatrix(); persp.updateMatrixWorld();
}
// timing: the parts the camera sees (in the frame, not behind a wall) get evenly spaced start times in `key` order; the rest start with the first
const FRAY = new THREE.Raycaster(), FP = new THREE.Vector3(), FC = new THREE.Vector3();
function filmInView(o) {
  FB.setFromObject(o); if (FB.isEmpty()) return false;
  const P = persp.position, c = Math.cos(FILM_VIEW.yaw), s = Math.sin(FILM_VIEW.yaw); FB.getCenter(FC);
  for (let i = 0; i < 9; i++) {
    if (i < 8) FP.set(i & 1 ? FB.max.x : FB.min.x, i & 2 ? FB.max.y : FB.min.y, i & 4 ? FB.max.z : FB.min.z).lerp(FC, 0.15); else FP.copy(FC);
    if ((FP.x - P.x) * c + (FP.z - P.z) * s < 0.1) continue;
    FV.copy(FP).project(persp); if (Math.abs(FV.x) > 1.02 || Math.abs(FV.y) > 1.02) continue;
    const d = FP.distanceTo(P); FRAY.set(P, FV.copy(FP).sub(P).normalize()); FRAY.far = d - 0.03;
    if (!FRAY.intersectObjects(FILM.occluders, false).length) return true;
  }
  return false;
}
const filmScreenX = o => { FB.setFromObject(o).getCenter(FV); return FV.project(persp).x; };
const filmDist = o => { FB.setFromObject(o).getCenter(FV); return Math.hypot(FV.x - FILM_VIEW.pos[0], FV.z - FILM_VIEW.pos[2]); };
function filmSlots(list, key, t0, span) {
  const vis = list.filter(filmInView).map(o => [key(o), o]).sort((a, b) => a[0] - b[0]);
  list.forEach(o => { o.userData.a = t0; });
  vis.forEach(([, o], k) => { o.userData.a = t0 + span * k / Math.max(1, vis.length - 1); });
}
// boards on every wall face of the given rooms, cut around doors and windows, laid on a 1.2 m grid up to the new ceiling
function filmBoards(roomIds, dropOf) {
  const grp = new THREE.Group(), walls = state.walls.filter(w => !w.open), ext = computeExt(walls), rects = [];
  const m = new THREE.MeshStandardMaterial({ map: boardTex(), roughness: 0.9, clippingPlanes: [FILM.boardPlane] }); FILM.mats.push(m);
  for (const w of walls) {
    const { L, d, n } = wallFrame(w); if (L < 0.05) continue;
    const ht = w.t / 2, e = ext.get(w.id), u0 = -e.s, u1 = L + e.e, P = (u, o) => [w.a[0] + d[0] * u + n[0] * o, w.a[1] + d[1] * u + n[1] * o];
    const ops = (w.openings || []).map(o => ({ o, l: o.pos - o.w / 2, r: o.pos + o.w / 2 }));
    const bps = [u0, u1]; ops.forEach(x => bps.push(x.l, x.r)); junctions(w, walls).forEach(u => { if (u > u0 && u < u1) bps.push(u); });
    const B = [...new Set(bps.map(v => Math.round(v * 1e4) / 1e4))].filter(v => v >= u0 - 1e-3 && v <= u1 + 1e-3).sort((a, b) => a - b);
    for (const s of [1, -1]) for (let i = 0; i < B.length - 1; i++) {
      const ua = B[i], ub = B[i + 1]; if (ub - ua < 0.01) continue;
      const um = (ua + ub) / 2, pp = P(um, s * (ht + 0.06)), room = roomAtPt(pp[0], pp[1]); if (!room || !roomIds.includes(room.id)) continue;
      const top = ceilAt(pp[0], pp[1]) - (dropOf[room.id] ?? room.drop ?? 0), op = ops.find(x => um > x.l && um < x.r);
      const spans = !op ? [[0, top]] : [...(op.o.sill > 0.01 ? [[0, op.o.sill]] : []), ...(op.o.sill + op.o.h < top - 0.01 ? [[op.o.sill + op.o.h, top]] : [])];
      for (const [y0, y1] of spans) rects.push({ ua, ub, y0, y1, s, ht, d, n, P });
    }
  }
  for (const r of rects) for (let k = Math.floor(r.ua / 1.2); k * 1.2 < r.ub; k++) for (let j = 0; j * 2.4 < r.y1; j++) {
    const a = Math.max(r.ua, k * 1.2), b = Math.min(r.ub, (k + 1) * 1.2), y0 = Math.max(r.y0, j * 2.4), y1 = Math.min(r.y1, (j + 1) * 2.4); if (b - a < 0.01 || y1 - y0 < 0.01) continue;
    const geo = new THREE.PlaneGeometry(b - a, y1 - y0), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ((uv.getX(i) ? b : a) - k * 1.2) / 1.2, ((uv.getY(i) ? y1 : y0) - j * 2.4) / 2.4);
    const me = new THREE.Mesh(geo, m), c = r.P((a + b) / 2, r.s * (r.ht + 0.004)), f = [r.n[0] * r.s, r.n[1] * r.s];
    me.userData.p0 = new THREE.Vector3(c[0], (y0 + y1) / 2, c[1]); me.userData.nrm = new THREE.Vector3(f[0], 0, f[1]); me.position.copy(me.userData.p0); me.rotation.y = Math.atan2(f[0], f[1]);
    me.receiveShadow = true; me.visible = false; grp.add(me);
  }
  return grp;
}
// the lowered ceilings of the filmed rooms (current state = the finished flat): levelled battens on shims at 60 cm, plasterboard
// 1.2 x 2.4 m in staggered rows, and the plasterboard edge of the curtain pocket
function filmCeiling() {
  const bat = new THREE.Group(), brd = new THREE.Group(), fascia = [];
  const wood = mat('#D9BC93', 0.85), shim = mat('#B5946A', 0.85), edge = mat('#DCD9D2', 0.9), fm = new THREE.MeshStandardMaterial({ map: boardTex(), roughness: 0.9 }); FILM.mats.push(fm);
  for (const id of FILM_ROOMS) {
    const f = FACES.find(x => x.room.id === id), r = f?.room; if (!f || !(r.drop > 0)) continue;
    const xs = f.face.inner.map(p => p[0]), zs = f.face.inner.map(p => p[1]);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    const top = ceilAt((x0 + x1) / 2, (z0 + z1) / 2), yb = top - r.drop, pw = state.walls.find(w => !w.open && hasPocket(r, w.id));
    let pocket = null;
    if (pw) {
      const horiz = Math.abs(pw.a[1] - pw.b[1]) < Math.abs(pw.a[0] - pw.b[0]);
      if (horiz) { if (pw.a[1] > (z0 + z1) / 2) { z1 -= POCKET_W; pocket = ['z', z1, -1]; } else { z0 += POCKET_W; pocket = ['z', z0, 1]; } }
      else if (pw.a[0] > (x0 + x1) / 2) { x1 -= POCKET_W; pocket = ['x', x1, -1]; } else { x0 += POCKET_W; pocket = ['x', x0, 1]; }
    }
    const BW = 0.048, by0 = yb + 0.0125, by1 = top - 0.01;
    const batten = (cx, cz, lx, lz, lift = 0) => {
      const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(lx, by1 - by0 - lift, lz), wood); b.position.set(cx, (by0 + lift + by1) / 2, cz); g.add(b);
      const along = lx > lz, L = along ? lx : lz;
      for (let s = -L / 2 + 0.15; s < L / 2; s += 0.6) { const sh = new THREE.Mesh(new THREE.BoxGeometry(along ? 0.06 : 0.04, top - by1, along ? 0.04 : 0.06), shim); sh.position.set(cx + (along ? s : 0), (by1 + top) / 2, cz + (along ? 0 : s)); g.add(sh); }
      g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); bat.add(g);
    };
    const bxs = []; for (let x = x0 + BW / 2; x < x1 - BW / 2 + 1e-6; x += 0.6) bxs.push(x); if (x1 - BW / 2 - bxs[bxs.length - 1] > 0.1) bxs.push(x1 - BW / 2);
    for (const x of bxs) batten(x, (z0 + z1) / 2, BW, z1 - z0);
    for (const z of [z0 + BW / 2, z1 - BW / 2]) batten((x0 + x1) / 2, z, x1 - x0 - 2 * BW, BW, 0.002);
    for (let i = 0, x = x0; x < x1 - 0.01; i++, x += 1.2) for (let z = z0 - (i % 2 ? 1.2 : 0); z < z1 - 0.01; z += 2.4) {
      const xa = x, xb = Math.min(x + 1.2, x1), za = Math.max(z, z0), zb = Math.min(z + 2.4, z1); if (xb - xa < 0.02 || zb - za < 0.02) continue;
      const geo = new THREE.PlaneGeometry(xb - xa, zb - za), uv = geo.attributes.uv, pos = geo.attributes.position, cx = (xa + xb) / 2, cz = (za + zb) / 2;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (cx + pos.getX(k) - x) / 1.2, (cz + pos.getY(k) - z) / 2.4);
      const me = new THREE.Mesh(geo, fm); me.rotation.x = Math.PI / 2; me.position.set(cx, yb + 0.0015, cz); me.receiveShadow = true; brd.add(me);
    }
    if (pocket) {
      const [ax, v, sg] = pocket, L = ax === 'z' ? x1 - x0 : z1 - z0, me = new THREE.Mesh(new THREE.BoxGeometry(ax === 'z' ? L : 0.0125, r.drop, ax === 'z' ? 0.0125 : L), edge);
      if (ax === 'z') me.position.set((x0 + x1) / 2, top - r.drop / 2, v + sg * 0.00625); else me.position.set(v + sg * 0.00625, top - r.drop / 2, (z0 + z1) / 2);
      me.castShadow = me.receiveShadow = true; fascia.push(me);
    }
  }
  return { bat, brd, fascia };
}
// the old cable duct and smoke detector on the concrete, the rerouted cable above the battens, and the detector back on the new ceiling
function filmProps(top, drop) {
  const g = new THREE.Group(), white = mat('#F3F2EE', 0.45), led = mat('#8E979C', 0.4), C = FILM_CABLE; g.name = 'film-props'; scene.add(g);
  const dx = C[1][0] - C[0][0], dz = C[1][1] - C[0][1], duct = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(dx, dz), 0.014, 0.024), white);
  duct.position.set((C[0][0] + C[1][0]) / 2, top - 0.007, (C[0][1] + C[1][1]) / 2); duct.rotation.y = -Math.atan2(dz, dx); g.add(duct);
  const det = y => { const d = new THREE.Group(); d.position.set(C[1][0], y, C[1][1]); cy(d, 0.05, 0.056, 0.03, 0, -0.03, 0, white, 32); cy(d, 0.01, 0.01, 0.004, 0.025, -0.034, 0, led, 12); g.add(d); return d; };
  const cables = [];
  for (let i = 0; i < C.length - 1; i++) {
    const a = C[i], b = C[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), geo = new THREE.CylinderGeometry(0.0045, 0.0045, L, 8);
    geo.rotateZ(-Math.PI / 2); geo.translate(L / 2, 0, 0);
    const me = new THREE.Mesh(geo, mat('#45484B', 0.55)); me.position.set(a[0], top - 0.005, a[1]); me.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); g.add(me); cables.push(me);
  }
  const old = [duct, det(top)]; old.forEach(o => { o.userData.y0 = o.position.y; });
  return { old, det: det(top - drop), cables };
}
function filmBuild() {
  FILM.saved = { state, mode: view.mode, pos: persp.position.clone(), target: controls.target.clone(), fov: persp.fov };
  view.sel = null; view.furniture = true; if (view.low) { view.low = false; $('#lowBtn').classList.remove('on'); }
  if (view.mode !== '3d') setView('3d');
  renderer.localClippingEnabled = true; FILM.mats = [];
  FILM.floorPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), -1); FILM.ceilPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), -1);
  FILM.paintPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -3); FILM.boardPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 3);
  const grp = name => { const g = new THREE.Group(); g.name = name; scene.add(g); return g; };
  const clip = (m, planes, top) => { const c = m.clone(); c.clippingPlanes = planes; if (top) { c.polygonOffset = true; c.polygonOffsetFactor = -1; c.polygonOffsetUnits = -2; } FILM.mats.push(c); return c; };
  const clipAll = (g, planes, top) => g.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(m => clip(m, planes, top)) : clip(o.material, planes, top); });
  // the finished flat: walls, trim and mouldings, floors, ceilings and the furniture of the filmed rooms, each kept in its own group
  const before = defaultState(), after = rehabState(), dropOf = Object.fromEntries(after.rooms.map(r => [r.id, r.drop || 0]));
  state = after; syncRooms(); refreshFaces(); buildWalls(); buildFloors(); buildItems();
  const aw = grp('film-walls'), at = grp('film-trim'), af = grp('film-floors'), ac = grp('film-ceil'), ai = grp('film-items'), ak = grp('film-ceilwork');
  aw.add(...groups.walls.children); at.add(...groups.trim.children); af.add(...groups.floors.children); ac.add(...groups.ceil.children); clear(groups.openings);
  FILM.itemsIn = after.items.filter(it => !isFixture(it) && FILM_ROOMS.includes(roomAtPt(it.x, it.z)?.id)).map(it => itemObjs.get(it.id)).filter(Boolean);
  if (FILM.itemsIn.length) ai.add(...FILM.itemsIn);
  const cw = filmCeiling(); ak.add(cw.bat, cw.brd, ...cw.fascia); FILM.ceil = cw;
  // the flat as listed, in the normal scene
  state = before; syncRooms(); rebuild({ all: true }); updateSun();
  clipAll(aw, [FILM.paintPlane], true);
  for (const g of [af, ac]) for (const o of [...g.children]) if (o.userData.roomId === 'r_bath') { g.remove(o); o.geometry?.dispose(); }
  for (const o of af.children) { o.position.y = 0.0025; o.material = clip(o.material, [FILM.floorPlane]); }
  clipAll(ac, [FILM.ceilPlane], true);
  FILM.newTrim = []; const bars = [];
  at.traverse(o => { if (!o.isMesh) return; if (o.geometry.type === 'ExtrudeGeometry') { o.userData.base = o.matrix.clone(); FILM.newTrim.push(o); } else bars.push(o); o.visible = false; });
  FILM.panels = []; for (let k = 0; k < bars.length; k += 4) { const pg = new THREE.Group(); at.add(pg); bars.slice(k, k + 4).forEach(m => { m.visible = true; pg.add(m); }); pg.visible = false; FILM.panels.push(pg); }
  FILM.oldTrim = [...groups.trim.children];
  FILM.items = state.items.filter(it => !isFixture(it) && FILM_ROOMS.includes(roomAtPt(it.x, it.z)?.id)).map(it => itemObjs.get(it.id)).filter(Boolean);
  [...FILM.items, ...FILM.itemsIn].forEach(o => { o.userData.y0 = o.position.y; });
  FILM.boards = filmBoards(FILM_ROOMS, dropOf); FILM.boards.name = 'film-boards'; scene.add(FILM.boards);
  FILM.props = filmProps(ceilAt(6, 6), dropOf.r_living);
  // start times, in the order the camera sees things happen
  filmCam(); scene.updateMatrixWorld(true); FILM.occluders = aw.children;
  // the footstool right by the camera was moved out of the listing photo; it stays out of the film too
  const near = o => filmDist(o) < 1.3; for (const o of [...FILM.items, ...FILM.itemsIn]) if (near(o)) o.visible = false;
  FILM.items = FILM.items.filter(o => !near(o)); FILM.itemsIn = FILM.itemsIn.filter(o => !near(o));
  filmSlots(FILM.items, filmDist, 4.1, 3.0);
  filmSlots(cw.bat.children, filmScreenX, 10.9, 3.6);
  filmSlots(cw.brd.children, o => -filmDist(o), 15.2, 3.6);
  filmSlots(FILM.boards.children, filmScreenX, 20.2, 5.2);
  filmSlots(FILM.newTrim, o => (o.userData.base.elements[13] > 1 ? 10 : 0) + filmScreenX(o), 38.7, 2.8);
  filmSlots(FILM.panels, filmScreenX, 42.2, 3.0);
  filmSlots(FILM.itemsIn, o => -filmDist(o), 45.7, 3.2);
  [...cw.bat.children, ...cw.brd.children].forEach(o => { o.userData.p0 = o.position.clone(); });
}
function filmApply(t) {
  FILM.t = t; filmCam();
  const pop = (o, a, out, dy = 0.4) => { const q = fss(a, a + 0.35, t), s = out ? 1 - q : q; o.visible = s > 0.001; o.position.y = o.userData.y0 + (1 - fease(s)) * dy; o.scale.setScalar(0.8 + 0.2 * fease(s)); };
  const rise = (o, a, d, dur = 0.4) => { const q = fss(a, a + dur, t); o.visible = q > 0; o.position.y = o.userData.p0.y - (1 - fease(q)) * d; return q; };
  FILM.items.forEach(o => pop(o, o.userData.a, true));
  FILM.itemsIn.forEach(o => pop(o, o.userData.a, false));
  FILM.oldTrim.forEach((o, k) => { o.visible = t < 7.6 + 1.3 * k / Math.max(1, FILM.oldTrim.length - 1); });
  // ceiling: duct and detector down, cable rerouted, battens up, plasterboard up, the pocket edge, then paint from the dining room toward the camera
  const P = FILM.props, C = FILM.ceil;
  P.old.forEach((o, k) => pop(o, 9.1 + k * 0.25, true, -0.35));
  P.cables.forEach((o, k) => { const q = fss(9.7 + k * 0.6, 10.3 + k * 0.6, t); o.visible = q > 0; o.scale.x = Math.max(q, 1e-3); });
  C.bat.children.forEach(o => rise(o, o.userData.a, 0.3));
  C.brd.children.forEach(o => { rise(o, o.userData.a, 0.45); if (t > 28) o.visible = false; });
  C.fascia.forEach(o => { o.visible = t > 19; });
  FILM.ceilPlane.constant = -0.5 + 9.3 * fease(fss(26.2, 27.8, t));
  P.det.visible = t > 27.9; P.det.scale.setScalar(0.8 + 0.2 * fease(fss(27.9, 28.2, t)));
  FILM.boards.children.forEach(m => { const a = m.userData.a, q = fss(a, a + 0.4, t); m.visible = q > 0; m.position.copy(m.userData.p0).addScaledVector(m.userData.nrm, (1 - fease(q)) * 0.5); });
  const h = 2.45 - 2.55 * fease(fss(27.9, 31.8, t)); FILM.paintPlane.constant = -h; FILM.boardPlane.constant = h; // walls painted from the ceiling down
  FILM.floorPlane.constant = Math.floor((-0.6 + 9.5 * fss(32.2, 38.2, t)) / 0.12) * 0.12; // vinyl laid row by row from the balcony side
  FILM.newTrim.forEach(m => { const q = fease(fss(m.userData.a, m.userData.a + 0.6, t)); m.visible = q > 0; if (q > 0) { m.matrix.copy(m.userData.base).multiply(SCALEZ.makeScale(1, 1, Math.max(q, 0.001))); m.matrixWorldNeedsUpdate = true; } });
  FILM.panels.forEach(g => { g.visible = t >= g.userData.a; });
  let st = 0; while (st < FILM_STAGES.length - 1 && t >= FILM_STAGES[st + 1][0]) st++;
  FILM.stage = st; FILM.capA = Math.min(fss(FILM_STAGES[st][0], FILM_STAGES[st][0] + 0.4, t), st < FILM_STAGES.length - 1 ? 1 - fss(FILM_STAGES[st + 1][0] - 0.3, FILM_STAGES[st + 1][0], t) : 1);
  markDirty();
}
const filmNum = st => st > 0 && st < FILM_STAGES.length - 1 ? String(st).padStart(2, '0') : '';
function filmCaption() { const b = $('#filmCap'); b.style.opacity = FILM.capA; $('.num', b).textContent = filmNum(FILM.stage); $('.txt', b).textContent = FILM_STAGES[FILM.stage][1]; }
function filmCaptionCanvas(g, W, H) {
  const s = H / 720, txt = FILM_STAGES[FILM.stage][1], num = filmNum(FILM.stage);
  g.save(); g.textBaseline = 'middle';
  g.font = `500 ${Math.round(17 * s)}px "Instrument Sans", sans-serif`; const brand = 'Mor Smes veg 11C · Stue · Oppussing', bwid = g.measureText(brand).width;
  g.fillStyle = 'rgba(16,18,19,.55)'; g.beginPath(); g.roundRect(32 * s, 28 * s, bwid + 28 * s, 36 * s, 18 * s); g.fill(); g.fillStyle = '#F4F1EA'; g.fillText(brand, 46 * s, 46 * s);
  if (FILM.capA > 0) {
    g.globalAlpha = FILM.capA; g.font = `600 ${Math.round(30 * s)}px "Bricolage Grotesque", "Instrument Sans", sans-serif`;
    const pad = 20 * s, tw = g.measureText(txt).width, nw = num ? 52 * s : 0, bh = 62 * s, x = 32 * s, y = H - bh - 34 * s;
    g.fillStyle = 'rgba(16,18,19,.74)'; g.beginPath(); g.roundRect(x, y, tw + 2 * pad + nw, bh, 14 * s); g.fill();
    g.fillStyle = '#F4F1EA'; g.fillText(txt, x + pad + nw, y + bh / 2 + 1 * s);
    if (num) { g.font = `500 ${Math.round(22 * s)}px "IBM Plex Mono", monospace`; g.fillStyle = '#E3B13A'; g.fillText(num, x + pad, y + bh / 2 + 1 * s); }
  }
  g.restore();
}
function filmTick() {
  if (FILM.paused) { filmApply(FILM.t); filmCaption(); return; }
  const ft = (performance.now() - FILM.t0) / 1000;
  if (ft > FILM.T + 2) { filmStop(); return; }
  filmApply(Math.min(ft, FILM.T)); filmCaption();
}
async function filmPlay() {
  if (FILM.on) return;
  document.body.classList.add('filming'); $('#filmBtn').textContent = 'Stop'; $('#filmCap').style.opacity = 0;
  await new Promise(r => setTimeout(r, 40));
  filmBuild(); FILM.on = true; FILM.paused = false; controls.enabled = false; FILM.t0 = performance.now(); filmApply(0);
}
function filmStop() {
  if (!FILM.on) return;
  FILM.on = false; FILM.rec = false;
  for (const name of ['film-walls', 'film-trim', 'film-floors', 'film-ceil', 'film-items', 'film-ceilwork', 'film-boards', 'film-props']) { const g = scene.getObjectByName(name); if (g) { clear(g); scene.remove(g); } }
  FILM.mats.forEach(m => m.dispose()); FILM.mats = [];
  const S = FILM.saved; state = S.state; syncRooms(); view.sel = null;
  persp.clearViewOffset(); persp.fov = S.fov; persp.updateProjectionMatrix(); persp.position.copy(S.pos); controls.target.copy(S.target); controls.enabled = true; controls.update();
  rebuild({ all: true }); updateSun(); if (S.mode !== '3d') setView(S.mode);
  document.body.classList.remove('filming'); $('#filmBtn').textContent = 'Film'; renderLeft(); renderInspector(); onResize();
}
// render the film frame by frame (fixed time step) and post each frame as a JPEG to `url` (the local dev server saves them for ffmpeg)
async function filmRecord(o = {}) {
  const W = o.w || 1920, H = o.h || 1080, fps = o.fps || 30, url = o.url || '/__film/';
  await filmPlay(); FILM.rec = true; FILM.progress = 0; FILM.done = false;
  const pr = renderer.getPixelRatio(); renderer.setPixelRatio(1); renderer.setSize(W, H, false); if (composer) { composer.setPixelRatio(1); composer.setSize(W, H); }
  const out = mkCanvas(W, H), g = out.getContext('2d'), N = Math.round((FILM.T + 1) * fps);
  for (let i = 0; i < N && FILM.rec; i++) {
    filmApply(Math.min(i / fps, FILM.T)); renderFrame(); g.drawImage(renderer.domElement, 0, 0, W, H); filmCaptionCanvas(g, W, H);
    const blob = await new Promise(r => out.toBlob(r, 'image/jpeg', 0.92));
    await fetch(url + 'f' + String(i).padStart(5, '0') + '.jpg', { method: 'POST', body: blob });
    FILM.progress = (i + 1) / N;
  }
  renderer.setPixelRatio(pr); if (composer) composer.setPixelRatio(pr);
  if (o.done && FILM.rec) await fetch(url + 'done.txt', { method: 'POST', body: String(N) });
  FILM.rec = false; filmStop(); FILM.done = true;
}
// one 1920 x 1080 frame at time t posted to the dev server, optionally with the listing photo laid over it to check the camera
async function filmShot(t, name, overlay = 0) {
  const W = 1920, H = 1080; FILM.paused = true; renderer.setPixelRatio(1); renderer.setSize(W, H, false); if (composer) { composer.setPixelRatio(1); composer.setSize(W, H); }
  filmApply(t); renderFrame();
  const c = mkCanvas(W, H), g = c.getContext('2d'); g.drawImage(renderer.domElement, 0, 0, W, H);
  if (overlay) { const im = new Image(); im.src = '/listing/images/03.jpg'; await im.decode(); const [x0, y0, w] = FILM_VIEW.frame, k = W / w; g.globalAlpha = overlay; g.drawImage(im, -x0 * k, -y0 * k, 2528 * k, 1686 * k); g.globalAlpha = 1; }
  filmCaptionCanvas(g, W, H);
  await fetch('/__film/' + name, { method: 'POST', body: await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9)) });
  onResize();
}
window.__film = { play: filmPlay, stop: filmStop, record: filmRecord, shot: filmShot, seek(t) { FILM.paused = t != null; if (t != null) FILM.t = t; else FILM.t0 = performance.now() - FILM.t * 1000; markDirty(); }, get state() { return FILM; } };
