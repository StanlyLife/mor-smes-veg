// ---------- history ----------
let history = [], future = [], lastSnap = null;
function commit() {
  const s = JSON.stringify(state); if (s === lastSnap) return;
  history.push(lastSnap); if (history.length > 150) history.shift(); future = []; lastSnap = s;
  updateUndo(); scheduleSave(); renderLeftLight();
}
function undo() { if (!history.length) return; future.push(lastSnap); lastSnap = history.pop(); state = JSON.parse(lastSnap); afterReplace(); }
function redo() { if (!future.length) return; history.push(lastSnap); lastSnap = future.pop(); state = JSON.parse(lastSnap); afterReplace(); }
function afterReplace() { validSel(); updateSun(); rebuild({ all: true }); renderLeft(); renderInspector(); updateUndo(); scheduleSave(); }
function updateUndo() { $('#undoBtn').disabled = !history.length; $('#redoBtn').disabled = !future.length; }
function validSel() {
  const s = view.sel; if (!s) return;
  const ok = s.kind === 'item' ? findItem(s.id) : s.kind === 'wall' ? findWall(s.id) : s.kind === 'opening' ? findWall(s.wallId)?.openings.find(o => o.id === s.opId) : s.kind === 'room' ? findRoom(s.id) : true;
  if (!ok) view.sel = null;
}

// ---------- small UI helpers ----------
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
function confirmBtn(btn, label, fn) { btn.addEventListener('click', () => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = label; fn(); return; } btn.dataset.armed = 1; btn.textContent = 'Click again to confirm'; setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = label; } }, 3500); }); }
const QUICK = ['#F2F1ED', '#E7E2D7', '#D9C3A0', '#C4864A', '#5D4231', '#2B2B2B', '#5B6E86', '#3E584A', '#7FA090', '#B77457', '#D9A23A', '#8C8478'];
function swGrid(id, keys, cur, o = {}) {
  let h = `<div class="sw-grid" data-sw="${id}">`;
  if (o.def) h += `<button class="sw def${!cur ? ' on' : ''}" data-key="" title="Use the room's finish">Room</button>`;
  for (const k of keys) h += `<button class="sw${k === cur ? ' on' : ''}" data-key="${k}" title="${esc(matName(k))}" aria-label="${esc(matName(k))}" style="${swatchCss(k)}"></button>`;
  if (o.custom) h += `<input type="color" id="${id}-custom" value="${cur && cur[0] === '#' ? cur : '#d8d2c6'}" title="Custom colour" aria-label="Custom colour">`;
  return h + `</div><div class="swname" id="${id}-name">${esc(o.def && !cur ? 'Room default' : matName(cur))}</div>`;
}
function bindSw(root, id, fn) {
  const g = root.querySelector(`[data-sw="${id}"]`); if (!g) return;
  g.addEventListener('click', e => { const b = e.target.closest('button[data-key]'); if (b) fn(b.dataset.key || null, false); });
  const c = root.querySelector('#' + id + '-custom'); if (c) { c.addEventListener('input', () => fn(c.value, true)); c.addEventListener('change', () => fn(c.value, false)); }
}
const wallKeys = () => [...PAINTS.map(p => p[0]), ...matKeys('w').filter(k => !k.startsWith('paint_'))];

// ---------- selection & inspector ----------
function select(s) {
  view.sel = s; refreshSelection(); renderInspector(); renderHint();
  if (curTab === 'rooms') renderLeft();
}
function deleteSelection() {
  const s = view.sel; if (!s) return;
  if (s.kind === 'item') { state.items = state.items.filter(i => i.id !== s.id); const o = itemObjs.get(s.id); if (o) { groups.items.remove(o); itemObjs.delete(s.id); } }
  else if (s.kind === 'wall') { state.walls = state.walls.filter(w => w.id !== s.id); syncRooms(); rebuild({ walls: true, items: true }); }
  else if (s.kind === 'opening') { const w = findWall(s.wallId); w.openings = w.openings.filter(o => o.id !== s.opId); rebuild({ walls: true }); }
  else return;
  view.sel = null; commit(); refreshSelection(); renderInspector(); renderHint(); markDirty();
}
function duplicateItem(it) { const c = { ...it, id: uid('i'), x: it.x + 0.3, z: it.z + 0.3 }; state.items.push(c); rebuildItem(c); commit(); select({ kind: 'item', id: c.id }); }
const insp = $('#insp');
function head(title, sub) { return `<div class="ihead"><h3>${title}${sub ? `<small>${sub}</small>` : ''}</h3><button class="btn icon-only" id="inspClose" aria-label="Close">✕</button></div>`; }
function renderInspector() {
  const s = view.sel; if (!s || view.tool !== 'select') { insp.hidden = true; return; }
  let h = '';
  if (s.kind === 'item') h = itemPanel(findItem(s.id));
  else if (s.kind === 'wall') h = wallPanel(findWall(s.id), s);
  else if (s.kind === 'opening') { const w = findWall(s.wallId); h = openingPanel(w, w?.openings.find(o => o.id === s.opId)); }
  else if (s.kind === 'room') h = roomPanel(findRoom(s.id), s);
  else if (s.kind === 'balcony') h = balconyPanel();
  else if (s.kind === 'roof') h = roofPanel();
  if (!h) { insp.hidden = true; return; }
  insp.innerHTML = h; insp.hidden = false;
  $('#inspClose', insp).onclick = () => select(null);
  wire[s.kind]?.(s);
}
function sideRooms(w, s) {
  const { L, d, n } = wallFrame(w), names = new Set();
  for (let i = 1; i < 10; i++) { const u = L * i / 10, p = add(add(w.a, mul(d, u)), mul(n, s * (w.t / 2 + 0.06))); const r = roomAtPt(p[0], p[1]); names.add(r ? r.name : 'Outside'); }
  return [...names].join(' / ');
}
function itemPanel(it) {
  if (!it) return ''; const d = CAT[it.type];
  let h = head(esc(d.name), d.cat) + '<div class="pbody">';
  h += `<div class="sec"><h4>Size (cm)</h4><div class="grid3">
    <label class="field"><span>Width</span><input type="number" id="it-w" min="5" step="1" value="${cm(it.w)}"></label>
    <label class="field"><span>Depth</span><input type="number" id="it-d" min="1" step="1" value="${cm(it.d)}"></label>
    <label class="field"><span>${d.hang ? 'Drop' : 'Height'}</span><input type="number" id="it-h" min="1" step="1" value="${cm(it.h)}"></label></div>
    ${d.hang ? '' : `<label class="field"><span>Height above floor (cm)</span><input type="number" id="it-y" min="0" step="1" value="${cm(it.y || 0)}"></label>`}</div>`;
  h += `<div class="sec"><h4>Rotation</h4><div class="row"><input type="range" id="it-rot" min="0" max="359" step="1" value="${Math.round(it.rot)}" style="flex:1"><span class="kbd" id="it-rotv">${Math.round(it.rot)}°</span><button class="btn" id="it-r90">+90°</button></div></div>`;
  for (const [k, label, cat] of d.colors) {
    h += `<div class="sec"><h4>${esc(label)}</h4>`;
    if (cat) h += swGrid('itc-' + k, cat === 'w' ? wallKeys() : cat === 'm' ? [...matKeys('m'), ...QUICK] : matKeys(cat), it[k], { custom: true });
    else h += `<div class="sw-grid" data-sw="itc-${k}">${QUICK.map(c => `<button class="sw${c === it[k] ? ' on' : ''}" data-key="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" id="itc-${k}-custom" value="${it[k] && it[k][0] === '#' ? it[k] : '#888888'}" aria-label="Custom colour"></div>`;
    h += '</div>';
  }
  for (const p of d.params || []) {
    if (p.k === 'h') continue;
    const v = it[p.k] ?? d[p.k];
    if (p.type === 'select') h += `<label class="field"><span>${p.label}</span><select id="itp-${p.k}">${p.opts.map(([a, b]) => `<option value="${a}"${a === v ? ' selected' : ''}>${b}</option>`).join('')}</select></label>`;
    else if (p.type === 'bool') h += `<label class="check"><input type="checkbox" id="itp-${p.k}"${v ? ' checked' : ''}> ${p.label}</label>`;
    else if (p.type === 'int') h += `<label class="field"><span>${p.label}</span><input type="number" id="itp-${p.k}" min="${p.min}" max="${p.max}" step="1" value="${v || Math.max(1, Math.round(it.w / 0.9))}"></label>`;
    else if (p.type === 'len') h += `<label class="field"><span>${p.label} (cm)</span><input type="number" id="itp-${p.k}" min="${cm(p.min)}" max="${cm(p.max)}" step="1" value="${cm(v)}"></label>`;
  }
  h += `<div class="row"><button class="btn" id="it-dup">Duplicate</button><button class="btn danger" id="it-del">Remove</button></div></div>`;
  return h;
}
const wire = {
  item(s) {
    const it = findItem(s.id), d = CAT[it.type], live = (fn, rebuildObj = true) => e => { fn(e.target); rebuildObj ? rebuildItem(it) : moveItemObj(it); refreshSelection(); if (e.type === 'change') commit(); };
    for (const k of ['w', 'd', 'h']) { const el = $('#it-' + k, insp); const f = live(t => { const v = parseFloat(t.value); if (v > 0) it[k] = v / 100; }); el.addEventListener('input', f); el.addEventListener('change', f); }
    const y = $('#it-y', insp); if (y) { const f = live(t => { it.y = Math.max(0, parseFloat(t.value) || 0) / 100; }, false); y.addEventListener('input', f); y.addEventListener('change', f); }
    const r = $('#it-rot', insp), f = live(t => { it.rot = +t.value; $('#it-rotv', insp).textContent = it.rot + '°'; }, false); r.addEventListener('input', f); r.addEventListener('change', f);
    $('#it-r90', insp).onclick = () => { it.rot = (it.rot + 90) % 360; moveItemObj(it); refreshSelection(); commit(); renderInspector(); };
    for (const [k] of d.colors) bindSw(insp, 'itc-' + k, (v, isLive) => { it[k] = v; rebuildItem(it); refreshSelection(); if (!isLive) { commit(); renderInspector(); } });
    for (const p of d.params || []) {
      const el = $('#itp-' + p.k, insp); if (!el) continue;
      el.addEventListener('change', () => { it[p.k] = p.type === 'bool' ? el.checked : p.type === 'int' ? parseInt(el.value) : p.type === 'len' ? (parseFloat(el.value) || 0) / 100 : el.value; rebuildItem(it); refreshSelection(); commit(); });
    }
    $('#it-dup', insp).onclick = () => duplicateItem(it);
    $('#it-del', insp).onclick = deleteSelection;
  },
  wall(s) {
    const w = findWall(s.id);
    const setOpen = on => { w.open = on; if (on) w.openings = []; else delete w.open; rebuild({ walls: true }); syncRooms(); commit(); renderInspector(); refreshSelection(); toast(on ? 'Open passage' : 'Wall built'); };
    if (w.open) { $('#wl-close', insp).onclick = () => setOpen(false); confirmBtn($('#wl-del', insp), 'Remove the line', deleteSelection); return; }
    $('#wl-open', insp).onclick = () => setOpen(true);
    const t = $('#wl-t', insp), apply = e => { const v = parseFloat(t.value); if (v >= 3) { w.t = v / 100; rebuild({ walls: true }); if (e.type === 'change') { syncRooms(); commit(); } } };
    t.addEventListener('input', apply); t.addEventListener('change', apply);
    for (const side of ['A', 'B']) bindSw(insp, 'wf-' + side, (v, isLive) => { w.finish = w.finish || {}; if (v) w.finish[side] = v; else delete w.finish[side]; buildWalls(); refreshSelection(); if (!isLive) { commit(); renderInspector(); } });
    $$('[data-op]', insp).forEach(b => b.onclick = () => select({ kind: 'opening', wallId: w.id, opId: b.dataset.op }));
    $$('[data-add]', insp).forEach(b => b.onclick = () => addOpening(w, b.dataset.add, s.at));
    confirmBtn($('#wl-del', insp), 'Delete wall', deleteSelection);
  },
  opening(s) {
    const w = findWall(s.wallId), o = w.openings.find(q => q.id === s.opId), { L } = wallFrame(w);
    const upd = (e, fn) => { fn(); o.pos = clamp(o.pos, o.w / 2 + 0.02, L - o.w / 2 - 0.02); buildWalls(); refreshSelection(); if (e.type === 'change') { commit(); renderInspector(); } };
    const num = (id, fn) => { const el = $(id, insp); if (!el) return; const f = e => upd(e, () => fn(parseFloat(el.value))); el.addEventListener('input', f); el.addEventListener('change', f); };
    num('#op-w', v => { if (v >= 30) o.w = v / 100; }); num('#op-h', v => { if (v >= 20) o.h = v / 100; }); num('#op-s', v => { if (v >= 0) o.sill = v / 100; });
    num('#op-pos', v => { o.pos = v / 100 + o.w / 2; }); num('#op-open', v => { o.open = v; });
    const ty = $('#op-type', insp); ty.addEventListener('change', e => upd(e, () => { o.type = ty.value; Object.assign(o, OPENING_DEFAULTS[ty.value], { pos: o.pos }); }));
    for (const id of ['hinge', 'swing', 'panes']) { const el = $('#op-' + id, insp); if (el) el.addEventListener('change', e => upd(e, () => { o[id] = id === 'hinge' ? el.value : parseInt(el.value); })); }
    bindSw(insp, 'op-col', (v, isLive) => { o.color = v; buildWalls(); if (!isLive) commit(); });
    $('#op-wall', insp).onclick = () => select({ kind: 'wall', id: w.id, side: 'A', at: o.pos });
    $('#op-del', insp).onclick = deleteSelection;
  },
  room(s) {
    const r = findRoom(s.id);
    const nm = $('#rm-name', insp); nm.addEventListener('change', () => { r.name = nm.value.trim() || r.name; commit(); markDirty(); renderLeft(); });
    nm.addEventListener('input', () => { r.name = nm.value; markDirty(); });
    bindSw(insp, 'rf', (v) => { r.floor = v; buildFloors(); commit(); renderInspector(); renderLeft(); });
    bindSw(insp, 'rw', (v, isLive) => { r.wall = v; buildWalls(); if (!isLive) { commit(); renderInspector(); } });
    bindSw(insp, 'rc', (v, isLive) => { r.ceil = v; buildFloors(); if (!isLive) { commit(); renderInspector(); } });
    const dr = $('#rm-drop', insp), f = e => { r.drop = clamp(parseFloat(dr.value) || 0, 0, 80) / 100; rebuild({ walls: true, items: true }); if (e.type === 'change') commit(); };
    dr.addEventListener('input', f); dr.addEventListener('change', f);
    $('#rm-pocket', insp)?.addEventListener('change', e => { if (e.target.value) { r.pocket = e.target.value; if ((r.drop || 0) < 0.05) r.drop = 0.07; } else delete r.pocket; rebuild({ walls: true, items: true }); commit(); renderInspector(); });
    $('#rm-skirt', insp).addEventListener('change', e => { r.skirt = e.target.checked; buildWalls(); commit(); });
    $('#rm-panels', insp).addEventListener('change', e => { if (e.target.value) r.panels = e.target.value; else delete r.panels; buildWalls(); commit(); });
    $('#rm-allfloor', insp).onclick = () => { state.rooms.forEach(q => { if (q.id !== 'r_bath' || q.id === r.id) q.floor = r.floor; }); buildFloors(); commit(); renderLeft(); toast('Floor applied to all rooms except the bathroom'); };
    $('#rm-clear', insp).onclick = () => { let n = 0; for (const w of state.walls) for (const side of ['A', 'B']) { if (!w.finish?.[side]) continue; const { L, d, n: nn } = wallFrame(w), sg = side === 'A' ? 1 : -1, p = add(add(w.a, mul(d, L / 2)), mul(nn, sg * (w.t / 2 + 0.06))); if (roomAtPt(p[0], p[1])?.id === r.id) { delete w.finish[side]; n++; } } buildWalls(); commit(); toast(n ? `Cleared ${n} wall override${n > 1 ? 's' : ''}` : 'No wall overrides in this room'); };
    $('#rm-walk', insp).onclick = () => goToRoom(r.id);
    $('#rm-plan', insp).onclick = () => { if (view.mode !== 'plan') setView('plan'); frameRoom(r.id); };
    $$('[data-photo]', insp).forEach(b => b.onclick = () => openPhoto(+b.dataset.photo, 'listing'));
    $$('[data-render]', insp).forEach(b => b.onclick = () => openPhoto(+b.dataset.render, 'renders'));
  },
  balcony() { bindSw(insp, 'bf', v => { state.settings.balconyFloor = v; buildBalcony(); commit(); renderInspector(); }); },
  roof() {
    bindSw(insp, 'rfm', v => { state.settings.roofMat = v; buildRoof(); commit(); renderInspector(); });
    $('#rf-show', insp).addEventListener('change', e => { state.settings.showRoof = e.target.checked; buildRoof(); commit(); });
  },
};
function wallPanel(w, s) {
  if (!w) return ''; const { L } = wallFrame(w), ext = !roomAtPt(...(() => { const { d, n } = wallFrame(w), p = add(add(w.a, mul(d, L / 2)), mul(n, -(w.t / 2 + 0.06))); return p; })());
  if (w.open) return head('Open passage', `${fmtM(openClear(w))} wide between the wall corners`) + `<div class="pbody"><div class="row"><button class="btn" id="wl-close">Build a wall here</button><button class="btn danger" id="wl-del">Remove the line</button></div></div>`;
  let h = head('Wall', `${fmtM(L)} long · ${cm(w.t)} cm thick`) + '<div class="pbody">';
  h += `<label class="field"><span>Thickness (cm)</span><input type="number" id="wl-t" min="3" max="60" step="1" value="${cm(w.t)}"></label>`;
  const order = s.side === 'B' ? ['B', 'A'] : ['A', 'B'];
  for (const side of order) h += `<div class="sec"><h4>Face toward ${esc(sideRooms(w, side === 'A' ? 1 : -1))}${side === s.side ? ' · clicked' : ''}</h4>${swGrid('wf-' + side, [...wallKeys(), ...matKeys('x')], w.finish?.[side] || null, { def: true, custom: true })}</div>`;
  h += `<div class="sec"><h4>Doors and windows</h4><div class="list">${(w.openings || []).map(o => `<button class="li" data-op="${o.id}"><span class="nm">${OPENING_NAMES[o.type]}</span><span class="val">${cm(o.w)} × ${cm(o.h)}</span></button>`).join('') || '<p class="note">None in this wall.</p>'}</div>
    <div class="row"><button class="btn" data-add="door">+ Door</button><button class="btn" data-add="window">+ Window</button><button class="btn" data-add="opening">+ Opening</button></div></div>`;
  h += `<div class="sec"><div class="row"><button class="btn" id="wl-open">Make it an open passage</button><button class="btn danger" id="wl-del">Delete wall</button></div></div></div>`;
  return h;
}
const OPENING_NAMES = { door: 'Door', window: 'Window', opening: 'Open passage', balcony: 'Balcony door', front: 'Entrance door' };
const OPENING_DEFAULTS = { door: { w: 0.8, h: 2.02, sill: 0, hinge: 'start', swing: 1, open: 75 }, window: { w: 1.0, h: 1.2, sill: 0.85, panes: 2 }, opening: { w: 0.9, h: 2.05, sill: 0 }, balcony: { w: 0.85, h: 2.05, sill: 0, hinge: 'start', swing: -1, open: 0 }, front: { w: 0.9, h: 2.05, sill: 0, hinge: 'start', swing: 1, open: 0 } };
function addOpening(w, type, at) {
  const { L } = wallFrame(w), o = { id: uid('o'), type, pos: 0, ...OPENING_DEFAULTS[type] };
  o.pos = clamp(at ?? L / 2, o.w / 2 + 0.02, L - o.w / 2 - 0.02);
  if (o.w > L - 0.04) { toast('This wall is too short for that opening'); return; }
  w.openings = w.openings || []; w.openings.push(o); rebuild({ walls: true }); commit(); select({ kind: 'opening', wallId: w.id, opId: o.id });
}
function openingPanel(w, o) {
  if (!w || !o) return ''; const { L } = wallFrame(w), isDoor = ['door', 'balcony', 'front'].includes(o.type);
  let h = head(OPENING_NAMES[o.type], `in a ${fmtM(L)} wall`) + '<div class="pbody">';
  h += `<label class="field"><span>Type</span><select id="op-type">${Object.entries(OPENING_NAMES).map(([k, v]) => `<option value="${k}"${k === o.type ? ' selected' : ''}>${v}</option>`).join('')}</select></label>`;
  h += `<div class="grid3"><label class="field"><span>Width</span><input type="number" id="op-w" min="30" step="1" value="${cm(o.w)}"></label><label class="field"><span>Height</span><input type="number" id="op-h" min="20" step="1" value="${cm(o.h)}"></label><label class="field"><span>Sill</span><input type="number" id="op-s" min="0" step="1" value="${cm(o.sill || 0)}"></label></div>`;
  h += `<label class="field"><span>Distance from wall end (cm)</span><input type="range" id="op-pos" min="2" max="${Math.max(2, cm(L - o.w) - 2)}" step="1" value="${cm(o.pos - o.w / 2)}"></label>`;
  if (isDoor) h += `<div class="grid2"><label class="field"><span>Hinge side</span><select id="op-hinge"><option value="start"${o.hinge !== 'end' ? ' selected' : ''}>Left end</option><option value="end"${o.hinge === 'end' ? ' selected' : ''}>Right end</option></select></label>
    <label class="field"><span>Opens into</span><select id="op-swing"><option value="1"${o.swing !== -1 ? ' selected' : ''}>${esc(sideRooms(w, 1))}</option><option value="-1"${o.swing === -1 ? ' selected' : ''}>${esc(sideRooms(w, -1))}</option></select></label></div>
    <label class="field"><span>Open angle</span><input type="range" id="op-open" min="0" max="110" step="5" value="${o.open || 0}"></label>`;
  if (o.type === 'window') h += `<label class="field"><span>Panes</span><select id="op-panes">${[1, 2, 3, 4].map(n => `<option${n === (o.panes || 1) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`;
  if (o.type !== 'opening') h += `<div class="sec"><h4>${isDoor ? 'Door colour' : 'Frame colour'}</h4><div class="sw-grid" data-sw="op-col">${['#F4F3EF', '#E7E6E1', '#2B2B2B', '#5D4231', '#C4864A', '#3E584A', '#2D3D54'].map(c => `<button class="sw${c === o.color ? ' on' : ''}" data-key="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" id="op-col-custom" value="${o.color || '#f4f3ef'}" aria-label="Custom colour"></div></div>`;
  h += `<div class="row"><button class="btn" id="op-wall">Edit the wall</button><button class="btn danger" id="op-del">Remove</button></div></div>`;
  return h;
}
function roomPanel(r, s) {
  if (!r) return ''; const f = FACES.find(x => x.room.id === r.id);
  let h = `<div class="ihead"><h3 style="display:flex;flex-direction:column;gap:2px"><input type="text" id="rm-name" value="${esc(r.name)}" aria-label="Room name" style="font:700 15px var(--font-display)"><small>${f ? fmtA(f.face.innerArea) + ' inside walls' : ''}</small></h3><button class="btn icon-only" id="inspClose" aria-label="Close">✕</button></div><div class="pbody">`;
  if (f) h += dimsSection(f.face.inner, r.ref, r.refNote, r);
  h += `<div class="sec"><h4>Floor</h4>${swGrid('rf', matKeys('f'), r.floor)}</div>`;
  h += `<div class="sec"><h4>Walls</h4>${swGrid('rw', wallKeys(), r.wall, { custom: true })}</div>`;
  const pw = f ? [...new Set(f.face.ws)].filter(w => w && !w.open && (w.openings || []).some(o => o.type === 'window' || o.type === 'balcony')) : [], ip = f ? interiorPoint(f.face.poly) : [0, 0];
  const compass = w => { const m = [(w.a[0] + w.b[0]) / 2 - ip[0], (w.a[1] + w.b[1]) / 2 - ip[1]]; return Math.abs(m[0]) > Math.abs(m[1]) ? (m[0] > 0 ? 'south' : 'north') : (m[1] > 0 ? 'west' : 'east'); };
  const pocketSel = pw.length || r.pocket ? `<label class="field"><span>Curtain pocket</span><select id="rm-pocket">${[['', 'None'], ...pw.map(w => [w.id, 'Along the ' + compass(w) + ' windows'])].map(([k, v]) => `<option value="${k}"${(r.pocket || '') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>` : '';
  h += `<div class="sec"><h4>Ceiling</h4>${swGrid('rc', matKeys('c'), r.ceil, { custom: true })}<label class="field"><span>Lowered ceiling (cm below main ceiling)</span><input type="number" id="rm-drop" min="0" max="80" step="1" value="${cm(r.drop || 0)}"></label>${pocketSel}</div>`;
  h += `<label class="check"><input type="checkbox" id="rm-skirt"${r.skirt !== false ? ' checked' : ''}> Skirting boards</label>`;
  h += `<label class="field"><span>Wall panelling (mouldings in the wall colour)</span><select id="rm-panels">${[['', 'None'], ['tall', 'Tall frame panels'], ['dado', 'Dado rail with panels above and below']].map(([k, v]) => `<option value="${k}"${(r.panels || '') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>`;
  h += `<div class="row"><button class="btn primary" id="rm-plan">Measure in plan</button><button class="btn" id="rm-walk">Walk here</button><button class="btn" id="rm-allfloor">Use floor everywhere</button><button class="btn" id="rm-clear">Reset wall faces</button></div>`;
  const ph = photosOk ? PHOTOS.map((p, i) => [p, i]).filter(([p]) => p[1] === r.name) : [];
  const rr = RENDERS.map((p, i) => [p, i]).filter(([p]) => p[1] === r.name);
  if (rr.length) h += `<div class="sec"><h4>Renovated</h4><div class="photos renders">${rr.map(([p, i]) => `<button data-render="${i}" aria-label="${esc(p[2])}"><img src="${RENDER_BASE}${p[0]}.webp" alt="${esc(p[2])}" loading="lazy"></button>`).join('')}</div></div>`;
  if (ph.length) h += `<div class="sec"><h4>Photos from the listing</h4><div class="photos">${ph.map(([p, i]) => `<button data-photo="${i}" aria-label="${esc(p[2])}"><img src="${PHOTO_BASE}${p[0]}.jpg" alt="${esc(p[2])}" loading="lazy"></button>`).join('')}</div></div>`;
  return h + '</div>';
}
// measurements of a room: overall size vs the listing, then every wall face as a chain split at openings
function dimsSection(poly, ref, refNote, room) {
  const edges = polyEdges(poly), xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
  const W = Math.max(...xs) - Math.min(...xs), L = Math.max(...zs) - Math.min(...zs);
  let h = `<div class="sec"><h4>Measurements inside the walls</h4><dl class="facts"><dt>Size as on the floor plan</dt><dd>${W.toFixed(2)} × ${L.toFixed(2)} m</dd>`;
  if (ref) {
    const ok = Math.abs(W - ref[0]) < 0.006 && (ref[1] == null || Math.abs(L - ref[1]) < 0.006);
    h += `<dt>Listing says</dt><dd>${ref[0].toFixed(2)}${ref[1] != null ? ' × ' + ref[1].toFixed(2) + ' m' : ' m wide'} <span class="${ok ? 'ok' : 'warn'}">${ok ? '✓' : '≠'}</span></dd>`;
  }
  if (room) {
    const cs = poly.map(p => ceilAt(p[0], p[1]) - (room.drop || 0)), lo = Math.min(...cs), hi = Math.max(...cs);
    h += `<dt>Ceiling height</dt><dd>${hi - lo < 0.01 ? lo.toFixed(2) : lo.toFixed(2) + '–' + hi.toFixed(2)} m</dd>`;
  }
  h += `</dl><div>`;
  for (const e of edges) h += `<div class="dimrow"><span>${e.name} wall</span><span class="dl">${e.L.toFixed(2)} m</span>${e.segs.length > 1 ? `<span class="dc">${e.segs.map(sg => sg.type === 'wall' ? (sg.t1 - sg.t0).toFixed(2) : `<i>${OPN[sg.type]} ${(sg.t1 - sg.t0).toFixed(2)}</i>`).join(' · ')}</span>` : ''}</div>`;
  return h + `</div></div>`;
}
function balconyPanel() {
  return head('Balkong', '3.97 × 2.00 m · covered · faces east') + `<div class="pbody">${dimsSection([[BALC.x0, BALC.z0], [BALC.x1, BALC.z0], [BALC.x1, BALC.z1], [BALC.x0, BALC.z1]], [3.97, 2.0])}<div class="sec"><h4>Deck</h4>${swGrid('bf', matKeys('d'), state.settings.balconyFloor)}</div></div>`;
}
function roofPanel() {
  return head('Roof', 'Mono-pitch (pulttak), membrane') + `<div class="pbody"><label class="check"><input type="checkbox" id="rf-show"${state.settings.showRoof ? ' checked' : ''}> Show roof</label><div class="sec"><h4>Roofing</h4>${swGrid('rfm', matKeys('r'), state.settings.roofMat)}</div></div>`;
}

// ---------- hint bar ----------
function renderHint() {
  const h = $('#hint'); let txt = '', extra = '';
  if (placing) txt = `Placing ${CAT[placing.type].name}`;
  else if (view.tool === 'wall') { txt = 'Drawing walls'; extra = '<button class="btn" id="hintDone">Done</button>'; }
  else if (view.tool === 'measure') { txt = 'Measuring'; if (measures.length) extra = '<button class="btn" id="hintClear">Clear</button>'; }
  else if (view.mode === 'walk') { extra = `<select id="hintRoom" aria-label="Go to room"><option value="">Go to room…</option>${FACES.filter(f => f.room.id).map(f => `<option value="${f.room.id}">${esc(f.room.name)}</option>`).join('')}</select>`; }
  else if (view.mode === 'plan') { if (UNDER.ok) extra = `<label class="check" style="font-size:12px"><input type="checkbox" id="hintUnder"${view.underlay ? ' checked' : ''}> Original plan</label>`; }
  h.innerHTML = txt || extra ? `${txt ? `<span class="txt">${txt}</span>` : ''}${extra}` : '';
  $('#hintDone')?.addEventListener('click', () => setTool('select'));
  $('#hintClear')?.addEventListener('click', () => { measures.length = 0; drawToolPreview(); renderHint(); });
  $('#hintRoom')?.addEventListener('change', e => { if (e.target.value) goToRoom(e.target.value); e.target.value = ''; e.target.blur(); canvas.focus({ preventScroll: true }); });
  $('#hintUnder')?.addEventListener('change', e => { view.underlay = e.target.checked; FLOORT.clear(); updateSky(); rebuild({ all: true }); updateUnderlay(); });
}

// ---------- left panel ----------
let curTab = 'rooms', furnCat = 'All', furnQ = '';
try { curTab = localStorage.getItem('msv11c.tab') || 'rooms'; } catch { }
function renderLeft() {
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === curTab));
  const el = $('#leftBody'); el.innerHTML = ({ rooms: roomsTab, furnish: furnishTab, build: buildTab, listing: listingTab }[curTab])();
  ({ rooms: wireRooms, furnish: wireFurnish, build: wireBuild, listing: wireListing }[curTab])(el);
}
function renderLeftLight() { if (curTab === 'rooms') renderLeft(); }
$$('.tabs button').forEach(b => b.onclick = () => { curTab = b.dataset.tab; try { localStorage.setItem('msv11c.tab', curTab); } catch { } renderLeft(); });
function roomsTab() {
  const fs = FACES.filter(f => f.room.id);
  return `<div class="sec"><h4>Rooms</h4><div class="list">${fs.map(f => `<button class="li${view.sel?.kind === 'room' && view.sel.id === f.room.id ? ' on' : ''}" data-room="${f.room.id}"><span class="chip" style="${swatchCss(f.room.floor)}"></span><span class="nm">${esc(f.room.name)}</span><span class="val">${fmtA(f.face.innerArea)}</span></button>`).join('')}
    <button class="li${view.sel?.kind === 'balcony' ? ' on' : ''}" data-balc="1"><span class="chip" style="${swatchCss(state.settings.balconyFloor)}"></span><span class="nm">Balkong</span><span class="val">7.9 m²</span></button></div></div>`;
}
function wireRooms(el) {
  $$('[data-room]', el).forEach(b => { b.onclick = () => { select({ kind: 'room', id: b.dataset.room }); frameRoom(b.dataset.room); }; b.ondblclick = () => goToRoom(b.dataset.room); });
  $('[data-balc]', el).onclick = () => { select({ kind: 'balcony' }); frameRoom('balcony'); };
}
function furnishTab() {
  const q = furnQ.toLowerCase(), list = Object.values(CAT).filter(d => (furnCat === 'All' || d.cat === furnCat) && (!q || d.name.toLowerCase().includes(q)));
  return `<input type="search" id="furnQ" placeholder="Search furniture" value="${esc(furnQ)}" aria-label="Search furniture">
    <div class="chips">${['All', ...CATS].map(c => `<button data-cat="${c}" class="${c === furnCat ? 'on' : ''}">${c}</button>`).join('')}</div>
    <div class="cards">${list.map(d => `<button class="card" data-type="${d.type}"><img alt="" data-thumb="${d.type}" ${THUMBS.has(d.type) ? `src="${THUMBS.get(d.type)}"` : ''}><b>${esc(d.name)}</b><small>${cm(d.w)} × ${cm(d.d)} cm</small></button>`).join('') || '<p class="note">Nothing matches.</p>'}</div>`;
}
function wireFurnish(el) {
  const q = $('#furnQ', el); q.addEventListener('input', () => { furnQ = q.value; const pos = q.selectionStart; renderLeft(); const n = $('#furnQ'); n.focus(); n.setSelectionRange(pos, pos); });
  $$('[data-cat]', el).forEach(b => b.onclick = () => { furnCat = b.dataset.cat; renderLeft(); });
  $$('[data-type]', el).forEach(b => b.onclick = () => startPlacing(b.dataset.type));
  const imgs = $$('img[data-thumb]:not([src])', el); let i = 0;
  const step = () => { if (i >= imgs.length) return; const im = imgs[i++]; if (im.isConnected) im.src = thumbFor(im.dataset.thumb); setTimeout(step, 0); }; step();
}
let thumbR = null; const THUMBS = new Map();
function thumbFor(type) {
  if (THUMBS.has(type)) return THUMBS.get(type);
  try {
    if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setSize(160, 120); thumbR.outputColorSpace = THREE.SRGBColorSpace; thumbR.toneMapping = THREE.ACESFilmicToneMapping; }
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#8a8070', 1.7)); const dl = new THREE.DirectionalLight('#ffffff', 2.2); dl.position.set(3, 5, 4); sc.add(dl);
    const it = newItem(type, 0, 0); it.id = 'thumb-' + type; const o = CAT[type].build(it); sc.add(o);
    const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()), r = Math.max(0.15, b.getSize(new THREE.Vector3()).length() / 2);
    const cam = new THREE.PerspectiveCamera(32, 4 / 3, 0.01, 100); cam.position.set(c.x + r * 1.7, c.y + r * 1.3, c.z + r * 2.4); cam.lookAt(c);
    thumbR.render(sc, cam); const url = thumbR.domElement.toDataURL('image/png'); THUMBS.set(type, url); o.traverse(m => m.geometry?.dispose()); return url;
  } catch { return ''; }
}
function buildTab() {
  const S = state.settings, hh = Math.floor(S.hour), mm = Math.round((S.hour - hh) * 60);
  return `<div class="sec"><h4>Ceiling and roof</h4>
    <div class="seg" role="group"><button id="b-flat" class="${S.ceilMode === 'flat' ? 'on' : ''}">Flat ceiling</button><button id="b-vault" class="${S.ceilMode === 'vaulted' ? 'on' : ''}">Open to roof</button></div>
    <label class="field"><span>${S.ceilMode === 'vaulted' ? 'Height at low side' : 'Ceiling height'}: <b id="b-chv">${S.ceilH.toFixed(2)} m</b></span><input type="range" id="b-ch" min="2.2" max="3.2" step="0.01" value="${S.ceilH}"></label>
    ${S.ceilMode === 'vaulted' ? `<label class="field"><span>Height at high side: <b id="b-hhv">${S.ceilHigh.toFixed(2)} m</b></span><input type="range" id="b-hh" min="2.5" max="4.5" step="0.01" value="${S.ceilHigh}"></label>` : ''}
    <label class="field"><span>Roof slopes down toward</span><select id="b-low"><option value="east"${S.lowSide === 'east' ? ' selected' : ''}>East (balcony side)</option><option value="west"${S.lowSide === 'west' ? ' selected' : ''}>West (living room side)</option></select></label>
    <label class="check"><input type="checkbox" id="b-roof"${S.showRoof ? ' checked' : ''}> Show the roof from outside</label>
    <label class="check"><input type="checkbox" id="b-corn"${S.cornice ? ' checked' : ''}> Ceiling mouldings</label>
    <label class="field"><span>Moulding style</span><select id="b-trim"><option value="simple"${S.trim !== 'classic' ? ' selected' : ''}>Simple: low skirting, small cove (as listed)</option><option value="classic"${S.trim === 'classic' ? ' selected' : ''}>Classic: 12 cm skirting, crown moulding</option></select></label></div>
    <div class="sec"><h4>Walls</h4><div class="row"><button class="btn" id="b-draw">Draw a new wall</button><label class="field" style="flex:1"><span>New wall thickness</span><select id="b-wt">${[0.07, 0.1, 0.15, 0.2].map(v => `<option value="${v}"${v === S.wallT ? ' selected' : ''}>${cm(v)} cm</option>`).join('')}</select></label></div>
    <h4>Skirting boards</h4><div class="sw-grid" data-sw="b-sk">${['#EEEDE8', '#FFFFFF', '#C4864A', '#D0AC7C', '#5D4231', '#2B2B2B'].map(c => `<button class="sw${c === S.skirting ? ' on' : ''}" data-key="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" id="b-sk-custom" value="${S.skirting}" aria-label="Custom colour"></div>
    <h4>Outside cladding</h4>${swGrid('b-ext', matKeys('x'), S.extFinish)}</div>
    <div class="sec"><h4>Daylight</h4>
    <label class="field"><span>Time of day: <b id="b-hrv">${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}</b></span><input type="range" id="b-hr" min="5" max="22" step="0.25" value="${S.hour}"></label>
    <label class="field"><span>Season</span><select id="b-season">${[['winter', 'Winter (Dec)'], ['spring', 'Spring (Mar)'], ['summer', 'Summer (Jun)'], ['autumn', 'Autumn (Sep)']].map(([k, v]) => `<option value="${k}"${k === S.season ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" id="b-lamps"${S.lamps ? ' checked' : ''}> Lamps on</label></div>
    <div class="sec"><h4>View</h4>
    <label class="check"><input type="checkbox" id="b-hq"${QUALITY.high ? ' checked' : ''}> High-quality rendering (soft shadows in corners and under furniture)</label>
    <label class="check"><input type="checkbox" id="b-labels"${S.labels ? ' checked' : ''}> Room names and areas</label>
    <label class="check"><input type="checkbox" id="b-ctx"${S.context ? ' checked' : ''}> Building and surroundings</label>
    <label class="field"><span>Snap to grid</span><select id="b-snap">${[[0, 'Off'], [0.01, '1 cm'], [0.05, '5 cm'], [0.1, '10 cm']].map(([v, l]) => `<option value="${v}"${v === S.snap ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <div class="sec"><h4>Start over</h4><button class="btn danger" id="b-reset">Reset this design to the listing</button></div>`;
}
function wireBuild(el) {
  const S = state.settings, all = () => { rebuild({ all: true }); };
  $('#b-flat', el).onclick = () => { S.ceilMode = 'flat'; all(); commit(); renderLeft(); };
  $('#b-vault', el).onclick = () => { S.ceilMode = 'vaulted'; all(); commit(); renderLeft(); };
  const rng2 = (id, key, lab) => { const r = $(id, el); if (!r) return; r.addEventListener('input', () => { S[key] = +r.value; $(lab, el).textContent = S[key].toFixed(2) + ' m'; all(); }); r.addEventListener('change', commit); };
  rng2('#b-ch', 'ceilH', '#b-chv'); rng2('#b-hh', 'ceilHigh', '#b-hhv');
  $('#b-low', el).onchange = e => { S.lowSide = e.target.value; all(); commit(); };
  $('#b-roof', el).onchange = e => { S.showRoof = e.target.checked; buildRoof(); commit(); };
  $('#b-corn', el).onchange = e => { S.cornice = e.target.checked; buildWalls(); commit(); };
  $('#b-trim', el).onchange = e => { S.trim = e.target.value; buildWalls(); commit(); };
  $('#b-draw', el).onclick = () => setTool('wall');
  $('#b-wt', el).onchange = e => { S.wallT = +e.target.value; commit(); };
  bindSw(el, 'b-sk', (v, live) => { S.skirting = v; buildWalls(); if (!live) { commit(); renderLeft(); } });
  bindSw(el, 'b-ext', v => { S.extFinish = v; buildWalls(); commit(); renderLeft(); });
  const hr = $('#b-hr', el); hr.addEventListener('input', () => { S.hour = +hr.value; S.shadows = true; const h = Math.floor(S.hour), m = Math.round((S.hour - h) * 60); $('#b-hrv', el).textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; updateSun(); }); hr.addEventListener('change', commit);
  $('#b-season', el).onchange = e => { S.season = e.target.value; if (S.shadows) { S.hour = goldenHour(S.season); renderLeft(); } updateSun(); commit(); };
  $('#b-lamps', el).onchange = e => { S.lamps = e.target.checked; LAMPS_ON.v = S.lamps; updateSun(); rebuild({ items: true, walls: true }); commit(); };
  $('#b-hq', el).onchange = e => { QUALITY.high = e.target.checked; try { localStorage.setItem('msv11c.hq', QUALITY.high ? '1' : '0'); } catch { } markDirty(); };
  $('#b-labels', el).onchange = e => { S.labels = e.target.checked; markDirty(); commit(); };
  $('#b-ctx', el).onchange = e => { S.context = e.target.checked; buildContext(); commit(); };
  $('#b-snap', el).onchange = e => { S.snap = +e.target.value; commit(); };
  confirmBtn($('#b-reset', el), 'Reset this design to the listing', () => { state = defaultState(); syncRooms(); view.sel = null; afterReplace(); commit(); toast('Design reset to the listing'); });
}
const PHOTO_BASE = '../listing/images/';
const PHOTOS = [['01', 'Balkong', 'Balcony with the view east to Øyeren'], ['02', 'Utsikt', 'View over Fjerdingby and the lake'], ['03', 'Stue', 'Living room toward the dining room'], ['04', 'Stue', 'Living room, west window'], ['05', 'Plan', 'Floor plan (Anticimex)'], ['06', 'Stue', 'Living room, TV wall'], ['07', 'Stue', 'Living room, corner sofa'], ['08', 'Stue', 'Living room'], ['09', 'Stue', 'Opening to the dining room'], ['10', 'Spisestue', 'Dining room and balcony door'], ['11', 'Spisestue', 'Dining room toward the living room'], ['12', 'Spisestue', 'Balcony door, open'], ['13', 'Balkong', 'Covered balcony'], ['14', 'Stue', 'Details'], ['15', 'Balkong', 'Balcony, yellow cladding'], ['16', 'Balkong', 'Balcony toward the south'], ['17', 'Spisestue', 'View through the balcony door'], ['18', 'Spisestue', 'Dining room toward the kitchen'], ['19', 'Kjøkken', 'Kitchen with counter under the window'], ['20', 'Kjøkken', 'Kitchen, U-shape'], ['21', 'Kjøkken', 'Kitchen toward the dining room'], ['22', 'Soverom 1', 'Main bedroom'], ['23', 'Soverom 1', 'Main bedroom, sliding wardrobe'], ['24', 'Soverom 2', 'Bedroom 2 as office'], ['25', 'Soverom 2', 'Bedroom 2 from the door'], ['26', 'Soverom 2', 'Bedroom 2, wardrobe (not included)'], ['27', 'Bad', 'Bathroom from the hallway'], ['28', 'Bad', 'Bathroom, washer and vanity'], ['29', 'Bad', 'Shower with glass doors'], ['30', 'Bad', 'Bathroom details'], ['31', 'Entré', 'Hallway wardrobe'], ['32', 'Entré', 'Entrance door'], ['33', 'Bygg', 'Building from outside'], ['34', 'Bygg', 'Parking'], ['35', 'Bygg', 'Shared barbecue area'], ['36', 'Bygg', 'Shared garden']];
let photosOk = false;
const RENDER_BASE = 'renders/';
const RENDERS = [['stue', 'Stue', 'Renovated living room'], ['kjokken', 'Kjøkken', 'Renovated kitchen'], ['spisestue-1', 'Spisestue', 'Renovated dining room'], ['spisestue-2', 'Spisestue', 'Renovated dining room, alternative']];
function listingTab() {
  const F = [['Status', 'Sold (FINN 476645768)'], ['Asking price', '3 250 000 kr'], ['Total incl. debt', '3 632 710 kr'], ['Shared debt', '300 370 kr'], ['Monthly costs', '6 768 kr'], ['Internal area', 'BRA-i 69 m²'], ['Storage', '2 basement rooms, 8 m²'], ['Balcony', '8 m², east, covered'], ['Floor', '3rd (top)'], ['Built', '1963'], ['Energy label', 'D'], ['Heating', 'District heating (since 2023), radiators'], ['Bathroom', 'Renovated 2019'], ['Parking', 'Fixed space']];
  const TG = [['tg3', 'TG3', 'Bathroom: the floor drain sits only inside the shower zone, so water outside the shower cannot reach it.'], ['tg2', 'TG2', 'Bathroom: mould on silicone, hollow tiles, floor cracks, weak fall to drain, threshold upstand not verified.'], ['tg2', 'TG2', 'Kitchen: copper water pipes and cast-iron waste pipes near end of life.'], ['tg2', 'TG2', 'Radiators and pipework: old.'], ['tg2', 'TG2', 'Windows (unknown year, 1986) and doors: worn and old.'], ['tg2', 'TG2', 'Roof not inspected; age of roofing unknown. Balcony deck tiles worn.'], ['hms', 'HMS', 'Balcony railing is under 1.0 m.']];
  return `<div class="sec"><h4>Mor Smes veg 11C, 2008 Fjerdingby</h4><dl class="facts">${F.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>
    <div class="sec"><h4>Room sizes from the floor plan</h4><dl class="facts"><dt>Stue</dt><dd>5.18 × 4.14 m</dd><dt>Spisestue</dt><dd>2.34 × 4.18 m</dd><dt>Kjøkken</dt><dd>3.55 × 2.22 m</dd><dt>Soverom 1</dt><dd>2.72 × 4.18 m</dd><dt>Soverom 2</dt><dd>2.28 × 2.97 m</dd><dt>Bad</dt><dd>2.06 m wide</dd><dt>Entré</dt><dd>2.60 × 1.09 m</dd><dt>Balkong</dt><dd>3.97 × 2.00 m</dd></dl></div>
    <div class="sec"><h4>Condition report (Anticimex, Sept 2026)</h4><div class="tg">${TG.map(([c, l, t]) => `<div><span class="pill ${c}">${l}</span><span>${t}</span></div>`).join('')}</div></div>
    ${photosOk ? `<div class="sec"><h4>Photos</h4><div class="photos">${PHOTOS.map((p, i) => `<button data-photo="${i}" aria-label="${esc(p[2])}"><img src="${PHOTO_BASE}${p[0]}.jpg" alt="${esc(p[2])}" loading="lazy"></button>`).join('')}</div></div>` : ''}
    <div class="sec"><h4>Links</h4><p class="note"><a href="https://www.finn.no/realestate/homes/ad.html?finnkode=476645768" target="_blank" rel="noopener">FINN listing</a> · <a href="https://www.krogsveen.no/kjope/boliger-til-salgs/786467d4-52b3-40a7-bb65-fe641826f310" target="_blank" rel="noopener">Krogsveen page</a></p></div>`;
}
function wireListing(el) { $$('[data-photo]', el).forEach(b => b.onclick = () => openPhoto(+b.dataset.photo, 'listing')); }
let lbIdx = 0, lbSet = 'listing';
function openPhoto(i, set = lbSet) {
  lbSet = set; const L = set === 'renders' ? RENDERS : PHOTOS;
  lbIdx = (i + L.length) % L.length; const p = L[lbIdx], lb = $('#lightbox'), src = set === 'renders' ? `${RENDER_BASE}${p[0]}.webp` : `${PHOTO_BASE}${p[0]}.jpg`;
  lb.innerHTML = `<img src="${src}" alt="${esc(p[2])}"><div class="row"><button class="btn" id="lbPrev">‹ Prev</button><span>${set === 'renders' ? '' : p[0] + ' · '}${esc(p[1])} · ${esc(p[2])}</span><button class="btn" id="lbNext">Next ›</button><button class="btn" id="lbClose">Close</button></div>`;
  lb.hidden = false; $('#lbPrev').onclick = () => openPhoto(lbIdx - 1); $('#lbNext').onclick = () => openPhoto(lbIdx + 1); $('#lbClose').onclick = () => lb.hidden = true;
  lb.onclick = e => { if (e.target === lb) lb.hidden = true; };
}
addEventListener('keydown', e => { const lb = $('#lightbox'); if (lb.hidden) return; if (e.key === 'Escape') lb.hidden = true; if (e.key === 'ArrowLeft') openPhoto(lbIdx - 1); if (e.key === 'ArrowRight') openPhoto(lbIdx + 1); }, true);

// ---------- designs & saving ----------
const LS = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }, del(k) { try { localStorage.removeItem(k); } catch { } } };
const PFX = 'msv11c.';
const store = { db: null, uid: null, designs: [], active: null, status: 'This browser', saveT: 0, chain: Promise.resolve() };
function readIndex() { try { return JSON.parse(LS.get(PFX + 'index') || '[]'); } catch { return []; } }
function writeIndex() { LS.set(PFX + 'index', JSON.stringify(store.designs)); LS.set(PFX + 'active', store.active); }
function activeDesign() { return store.designs.find(d => d.id === store.active); }
function normalize(s) {
  if (!s || !Array.isArray(s.walls) || !Array.isArray(s.items) || !Array.isArray(s.rooms)) return null;
  s.settings = { ...SETTINGS, ...(s.settings || {}) }; s.items = s.items.filter(i => CAT[i.type]);
  upgradeRenovated(s); upgradeRehab(s);
  for (const r of s.rooms) if (WALLPAPER_ROOMS.includes(r.id) && r.wall === 'paint_listing') r.wall = 'wallpaper_struct';
  // earlier models had a low cistern box (36 cm, or run to the door wall) with a washer beside it, and hung the tall cabinet over the vanity;
  // the sketch shows a full-height installation wall from the pipe shaft to the hall wall, the toilet centred on it and no washer
  for (const it of s.items) {
    const at = (x, z) => Math.abs(it.x - x) < 0.02 && Math.abs(it.z - z) < 0.02;
    if (it.type === 'box' && ((at(1.28, 2.405) && Math.abs(it.w - 0.36) < 0.01) || (at(1.58, 2.405) && Math.abs(it.w - 0.96) < 0.01))) Object.assign(it, { x: 1.58, w: 0.96, h: 2.4 });
    else if (it.type === 'toilet' && at(1.28, 2.75)) it.x = 1.58;
    else if (it.type === 'vanity' && at(1.55, 3.89)) it.x = 1.28;
    else if (it.type === 'mirror_led' && at(1.4, 4.11)) it.x = 1.28;
    else if (it.type === 'tall_bath' && at(1.9, 4.01) && Math.abs(it.h - 1.2) < 0.01) Object.assign(it, { x: 1.87, w: 0.34, y: 0.42, h: 1.66 });
  }
  s.items = s.items.filter(it => !(it.type === 'washer' && Math.abs(it.x - 1.76) < 0.02 && (Math.abs(it.z - 2.62) < 0.02 || Math.abs(it.z - 2.79) < 0.02)));
  // openings re-measured on the sketch (balcony door, kitchen-dining opening, bathroom door); the bedroom 1 door no longer swings into the bed
  const op = (wid, oid) => s.walls.find(w => w.id === wid)?.openings?.find(o => o.id === oid);
  const bd = op('e1b', 'o_bdoor'); if (bd && Math.abs(bd.pos - 0.59) < 0.005 && Math.abs(bd.w - 0.85) < 0.005) Object.assign(bd, { pos: 0.575, w: 0.89, open: bd.open || 30 });
  const kd = op('i1', 'o_kdoor'); if (kd && Math.abs(kd.pos - 1.3) < 0.005 && Math.abs(kd.w - 0.8) < 0.005) Object.assign(kd, { pos: 1.32, w: 0.72 });
  const ba = op('i3', 'o_bath'); if (ba && Math.abs(ba.pos - 1.08) < 0.005) ba.pos = 0.99;
  const b1 = op('i9', 'o_b1door'); if (b1 && b1.open === 80) b1.open = 50;
  // earlier models put a wall and door between the entrance and the living room; it is an open passage
  const i6 = s.walls.find(w => w.id === 'i6' && (w.openings || []).some(o => o.id === 'o_edoor')); if (i6) { i6.open = true; i6.openings = i6.openings.filter(o => o.id !== 'o_edoor'); }
  const en = s.rooms.find(r => r.id === 'r_entry'); if (en?.refNote) en.refNote = en.refNote.replace('to the living-room doorway', 'to the open passage into the living room');
  return s;
}
const SEEDS = [[RENOVATED_ID, 'Renovated', renovatedState], [REHAB_ID, 'Oppussing', rehabState]];
function loadInitial() {
  store.designs = readIndex(); store.active = LS.get(PFX + 'active');
  let s = null;
  if (store.active) { try { s = normalize(JSON.parse(LS.get(PFX + 'd.' + store.active))); } catch { } }
  if (s && (s.v || 1) < STATE_VERSION) { const old = activeDesign(); if (old && !old.name.includes('older model')) old.name += ' (older model)'; s = null; }
  if (!s) { s = defaultState(); const d = { id: uid('d'), name: 'As listed', updatedAt: Date.now() }; store.designs.unshift(d); store.active = d.id; }
  store.seededIds = [];
  for (const [id, name, fn] of SEEDS) {
    if (LS.get(PFX + 'seed.' + id) || store.designs.some(d => d.id === id)) continue;
    if (store.active) LS.set(PFX + 'd.' + store.active, JSON.stringify(s));
    s = fn(); store.designs.push({ id, name, updatedAt: Date.now() }); store.active = id; store.seeded = name; store.seededIds.push(id);
  }
  for (const [id] of SEEDS) LS.set(PFX + 'seed.' + id, '1');
  return s;
}
function scheduleSave() {
  if (FILM.on) return; clearTimeout(store.saveT); store.saveT = setTimeout(saveNow, 900); setStatus('Saving…'); }
function saveNow() {
  if (FILM.on) return;
  const d = activeDesign(); if (!d) return;
  d.updatedAt = Date.now(); const json = JSON.stringify(state);
  LS.set(PFX + 'd.' + d.id, json); writeIndex();
  if (store.db) cloudWrite(d, json); else setStatus('Saved in this browser');
}
function cloudWrite(d, json) {
  store.chain = store.chain.then(() => store.db.collection('data/users/' + store.uid).doc('d_' + d.id).set({ name: d.name, updatedAt: d.updatedAt, json }))
    .then(() => setStatus('Saved to your Claude account')).catch(e => setStatus(e?.code === 'quota_exceeded' ? 'Cloud storage full; saved in this browser' : 'Saved in this browser'));
}
function setStatus(s) { store.status = s; const el = $('#dStatus'); if (el) el.textContent = s; }
async function cloudInit() {
  if (!window.claude?.use) return;
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    store.db = db; store.uid = id;
    const snap = await db.collection('data/users/' + id).get();
    const cloud = snap.docs.filter(x => x.exists && x.id.startsWith('d_')).map(x => ({ id: x.id.slice(2), ...x.data() }));
    const savedSeeds = history.length ? [] : store.seededIds.filter(id => cloud.some(c => c.id === id)); // copies saved from another browser win over the fresh ones seeded here
    for (const id of savedSeeds) { const loc = store.designs.find(d => d.id === id); if (loc) loc.updatedAt = 0; }
    for (const c of cloud) {
      const loc = store.designs.find(d => d.id === c.id);
      if (!loc) store.designs.push({ id: c.id, name: c.name, updatedAt: c.updatedAt });
      if (!loc || (c.updatedAt || 0) > (loc.updatedAt || 0)) { LS.set(PFX + 'd.' + c.id, c.json); if (loc) { loc.name = c.name; loc.updatedAt = c.updatedAt; } }
    }
    const newest = [...store.designs].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    const vOf = id => { try { return JSON.parse(LS.get(PFX + 'd.' + id) || '{}').v || 1; } catch { return 1; } };
    for (const d of store.designs) if (vOf(d.id) < STATE_VERSION && !d.name.includes('older model')) d.name += ' (older model)';
    if (savedSeeds.includes(store.active)) switchDesign(store.active, true);
    else if (!history.length && newest && newest.id !== store.active && cloud.some(c => c.id === newest.id) && vOf(newest.id) >= STATE_VERSION) switchDesign(newest.id, true);
    for (const d of store.designs) if (!cloud.some(c => c.id === d.id)) { const j = d.id === store.active ? JSON.stringify(state) : LS.get(PFX + 'd.' + d.id); if (j) cloudWrite(d, j); }
    writeIndex(); setStatus('Saved to your Claude account'); renderDesigns();
  } catch { }
}
function switchDesign(id, quiet) {
  let s = null; try { s = normalize(JSON.parse(LS.get(PFX + 'd.' + id))); } catch { }
  if (!s) { toast('That design could not be opened'); return; }
  store.active = id; writeIndex(); state = s; history = []; future = []; lastSnap = JSON.stringify(state); view.sel = null;
  LAMPS_ON.v = !!state.settings.lamps; afterReplace(); if (!quiet) toast('Opened “' + activeDesign().name + '”');
}
function newDesign(name, s) {
  saveNow(); const d = { id: uid('d'), name, updatedAt: Date.now() }; store.designs.push(d);
  LS.set(PFX + 'd.' + d.id, JSON.stringify(s)); store.active = d.id; switchDesign(d.id, true); saveNow(); renderDesigns(); toast('Created “' + name + '”');
}
function deleteDesign(id) {
  if (store.designs.length < 2) { toast('Keep at least one design'); return; }
  store.designs = store.designs.filter(d => d.id !== id); LS.del(PFX + 'd.' + id);
  if (store.db) store.chain = store.chain.then(() => store.db.collection('data/users/' + store.uid).doc('d_' + id).delete()).catch(() => { });
  if (store.active === id) switchDesign(store.designs[0].id, true); writeIndex(); renderDesigns();
}
const menu = $('#designsMenu');
function renderDesigns() {
  if (menu.hidden) return;
  const ds = [...store.designs].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  menu.innerHTML = `<div class="row" style="justify-content:space-between"><h4>Designs</h4><button class="btn icon-only" id="dClose" aria-label="Close">✕</button></div>
    <div class="list">${ds.map(d => `<div class="design-row${d.id === store.active ? ' on' : ''}"><button class="nm" data-open="${d.id}"><b>${esc(d.name)}</b><br><small>${new Date(d.updatedAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small></button>${d.id === store.active ? '' : `<button class="btn icon-only danger" data-del="${d.id}" aria-label="Delete ${esc(d.name)}">✕</button>`}</div>`).join('')}</div>
    <label class="field"><span>Name of the open design</span><input type="text" id="dName" value="${esc(activeDesign()?.name || '')}"></label>
    <div class="row"><button class="btn" id="dDup">Duplicate</button><button class="btn" id="dNew">New from listing</button><button class="btn" id="dReno">New from Renovated</button><button class="btn" id="dRehab">New from Oppussing</button></div>
    <div class="row"><button class="btn" id="dExport">Export file</button><button class="btn" id="dImport">Import file</button><button class="btn" id="dShot">Snapshot</button></div>
    <p class="status" id="dStatus">${esc(store.status)}</p>`;
  $('#dClose').onclick = () => { menu.hidden = true; };
  $$('[data-open]', menu).forEach(b => b.onclick = () => { if (b.dataset.open !== store.active) { saveNow(); switchDesign(b.dataset.open); } renderDesigns(); });
  $$('[data-del]', menu).forEach(b => confirmBtn(b, '✕', () => deleteDesign(b.dataset.del)));
  $('#dName').onchange = e => { const d = activeDesign(); if (d) { d.name = e.target.value.trim() || d.name; saveNow(); renderDesigns(); } };
  $('#dDup').onclick = () => newDesign((activeDesign()?.name || 'Design') + ' copy', JSON.parse(JSON.stringify(state)));
  $('#dNew').onclick = () => { const s = defaultState(); newDesign('Idea ' + (store.designs.length + 1), s); };
  $('#dReno').onclick = () => newDesign('Renovated ' + (store.designs.length + 1), renovatedState());
  $('#dRehab').onclick = () => newDesign('Oppussing ' + (store.designs.length + 1), rehabState());
  $('#dExport').onclick = () => offerFile(`mor-smes-veg-11c-${(activeDesign()?.name || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, JSON.stringify({ app: 'msv11c-planner', v: 1, name: activeDesign()?.name, state }, null, 1));
  $('#dImport').onclick = () => $('#importFile').click();
  $('#dShot').onclick = snapshot;
}
$('#designsBtn').onclick = () => { menu.hidden = !menu.hidden; renderDesigns(); };
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const j = JSON.parse(await f.text()), s = normalize(j.state || j); if (!s) throw 0; newDesign(j.name ? j.name + ' (imported)' : 'Imported design', s); }
  catch { toast('That file is not a planner design'); }
});
let dlNs;
async function offerFile(name, data) {
  if (window.claude?.use) {
    if (dlNs === undefined) dlNs = await window.claude.use('downloads').catch(() => null);
    if (!dlNs) { toast('Saving files is not available in this view'); return; }
    try { await dlNs.save({ filename: name, data }); toast('Saved ' + name); } catch (err) { if (err?.code !== 'declined') toast('The file could not be saved'); }
    return;
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
function snapshot() {
  renderFrame(); const url = renderer.domElement.toDataURL('image/png');
  const bin = atob(url.split(',')[1]), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  offerFile(`mor-smes-veg-11c-${view.mode}.png`, new Blob([arr], { type: 'image/png' }));
}
$('#shotBtn').onclick = snapshot;
$('#filmBtn').onclick = () => FILM.on ? filmStop() : filmPlay();

// ---------- top bar wiring & start ----------
$$('#viewSeg button').forEach(b => b.onclick = () => setView(b.dataset.view));
$$('#toolSeg button').forEach(b => b.onclick = () => setTool(b.dataset.tool));
$('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo; $('#lowBtn').onclick = toggleLow; $('#furnBtn').onclick = () => setFurniture(!view.furniture); $('#lockBtn').onclick = () => setLock(!view.lock); setLock(LS.get(PFX + 'lock') === '1'); $('#sunBtn').onclick = () => setShadows(!state.settings.shadows);
$('#menuBtn').onclick = () => $('#left').classList.toggle('open');
const themeChanged = () => { updateSky(); refreshSelection(); drawToolPreview(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged);
new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

state = loadInitial(); syncRooms(); LAMPS_ON.v = !!state.settings.lamps; lastSnap = JSON.stringify(state);
if (store.seeded) setTimeout(() => toast('Opened “' + store.seeded + '”'), 2500);
const SHOTS = new URLSearchParams(location.search).get('shots');
if (/[?&]record\b/.test(location.search) || SHOTS) { // headless video export (film/record.js) or check frames (?shots=t,t[&overlay]); progress and errors go to the local server
  const say = m => fetch('/__film/status-' + Date.now() + '.txt', { method: 'POST', body: String(m) }).catch(() => { });
  addEventListener('error', e => say('error ' + e.message + ' ' + e.filename + ':' + e.lineno)); addEventListener('unhandledrejection', e => say('rejection ' + (e.reason?.stack || e.reason)));
  say('loaded ' + navigator.userAgent);
  setTimeout(async () => { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 5000))]); say('start');
    if (!SHOTS) return filmRecord({ done: true }).catch(e => say('fail ' + e.stack));
    try { await filmPlay(); for (const t of SHOTS.split(',')) await filmShot(+t, 'shot-' + t + '.jpg', /[?&]overlay\b/.test(location.search) ? 0.5 : 0); await fetch('/__film/shots-done.txt', { method: 'POST', body: 'ok' }); } catch (e) { say('fail ' + e.stack); }
  }, 4000);
}
makeControls(); renderLeft(); renderHint(); updateUndo();
// build the scene after the loading note has painted (wood, fabric and tile textures are generated on first use)
setTimeout(() => { updateSun(); rebuild({ all: true }); onResize(); renderLeft(); saveNow(); requestAnimationFrame(frame); }, 60);
{ const p = new Image(); p.onload = () => { photosOk = true; if (curTab === 'listing') renderLeft(); }; p.src = PHOTO_BASE + '01.jpg'; }
{ const u = $('#underImg'); u.onload = () => { UNDER.ok = true; renderHint(); }; u.src = PHOTO_BASE + '05.jpg'; }
cloudInit();
window.__planner = { get state() { return state; }, get camera() { return camera; }, CAT, THREE, newItem, itemObjs, setView, setTool, select, goToRoom, walk, persp, get controls() { return controls; }, markDirty };
