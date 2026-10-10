// ---------- "Renovated": the client's mood renders applied to the flat ----------
// Living room: taupe walls with tall frame panels, warm herringbone oak, lit walnut display shelves and bar cabinet, taupe sofa under a misty
//   landscape with bronze wall lights, travertine coffee table, two armchairs, bronze drum tables, chunky wool rug, petal ceiling light.
// Dining room (the first of the two dining renders): greige walls with dado rail and panels, rounded walnut table for four, upholstered chairs,
//   fluted walnut sideboard with a ceramic lamp under a landscape, petal pendant, jute rug. The radiator moves under the window.
// Kitchen: U-shape in walnut with handleless fronts, two full-height columns, lit glass-front wall cabinets, white quartz, white vertical tiles,
//   dark herringbone floor. Bedrooms, bathroom, entrance wardrobe and balcony stay as listed. Classic tall skirting and crown moulding throughout.
const RENOVATED_ID = 'renovated', REHAB_ID = 'oppussing';
// "Oppussing": dark herringbone click vinyl in every dry room, rehab boards over the old structured wallpaper painted beige,
// new classic skirting and crown moulding, wall mouldings in the living room, dining room and hall. Furniture as listed.
// The ceilings come down 7 cm on levelled battens and plasterboard, hiding the surface cables and the uneven concrete; the living room
// gets a curtain pocket along the window wall with floor-length curtains on a hidden track.
const REHAB_DROP = 0.07;
function rehabCeiling(s) {
  for (const r of s.rooms) if (r.id !== 'r_bath') r.drop = REHAB_DROP;
  const lv = s.rooms.find(r => r.id === 'r_living'); if (lv && s.walls.some(w => w.id === 'e3')) lv.pocket = 'e3';
  for (const it of s.items) {
    if (it.type === 'closet' && it.h > s.settings.ceilH - REHAB_DROP - 0.01) it.h = +(s.settings.ceilH - REHAB_DROP - 0.01).toFixed(3);
    if (it.type === 'curtain' && Math.abs(it.x - 7.6) < 0.05 && Math.abs(it.z - 8.36) < 0.05) Object.assign(it, { x: 7.62, z: 8.29, w: 2.36, h: s.settings.ceilH - 0.01, mount: 'pocket', c1: '#D8CDBD' });
  }
  s.rehab = 2;
}
function upgradeRehab(s) {
  const lv = s.rooms.find(r => r.id === 'r_living');
  if (s.rehab >= 2 || s.reno || s.settings.trim !== 'classic' || lv?.floor !== 'vinyl_herring_dark' || lv.drop) return;
  rehabCeiling(s);
}
function rehabState() {
  const s = defaultState();
  Object.assign(s.settings, { trim: 'classic', skirting: '#F3F1EC', cornice: true });
  for (const r of s.rooms) {
    if (r.id === 'r_bath') continue;
    r.floor = 'vinyl_herring_dark'; r.wall = 'paint_beige';
    if (['r_living', 'r_dining', 'r_entry'].includes(r.id)) r.panels = 'tall';
  }
  rehabCeiling(s);
  return s;
}
// bring a saved first version of the design up to date, leaving anything the user changed
function upgradeRenovated(s) {
  if (s.reno >= 2 || s.settings.trim !== 'classic' || s.rooms.find(r => r.id === 'r_living')?.panels !== 'tall') return;
  for (const r of s.rooms) if ((r.id === 'r_dining' || r.id === 'r_entry') && r.wall === 'paint_greige') r.wall = 'paint_greige_warm';
  const swap = { '#8C7A66': '#7A6856', '#958370': '#85725F', '#6F6A4B': '#5F5C3E' };
  for (const it of s.items) if (it.type === 'sofa' || it.type === 'armchair') for (const k of ['c1', 'c3']) if (swap[it[k]]) it[k] = swap[it[k]];
  if (s.settings.shadows && s.settings.hour === 19) s.settings.shadows = false;
  s.reno = 2;
}
function renovatedState() {
  const s = defaultState(), S = s.settings, room = id => s.rooms.find(r => r.id === id);
  Object.assign(S, { trim: 'classic', skirting: '#F3F1EC', cornice: true, lamps: true });
  Object.assign(room('r_living'), { floor: 'herring_warm', wall: 'paint_taupe', panels: 'tall' });
  Object.assign(room('r_dining'), { floor: 'herring_warm', wall: 'paint_greige_warm', panels: 'dado' });
  Object.assign(room('r_entry'), { floor: 'herring_warm', wall: 'paint_greige_warm' });
  Object.assign(room('r_kitchen'), { floor: 'herring_dark', wall: 'paint_white' });
  const inside = (it, x0, x1, z0, z1) => it.x > x0 && it.x < x1 && it.z > z0 && it.z < z1;
  s.items = s.items.filter(it => !inside(it, 3.6, 8.93, 4.23, 8.52) && !inside(it, 3.6, 6.05, -0.1, 4.23) && !inside(it, -0.1, 3.6, -0.1, 2.27));
  const items = [], I = (type, x, z, rot = 0, o = {}) => { const d = CAT[type]; items.push(Object.assign({ id: uid('i'), type, x, z, rot, w: d.w, d: d.d, h: d.h, y: d.y || 0 }, itemDefaults(d), o)); };

  // ---- Stue (inside x 3.65–8.83, z 4.28–8.42; back wall toward Soverom 1 at z 4.28, window wall z 8.42)
  I('rug', 7.25, 5.85, 0, { w: 3.0, d: 2.2, pat: 'chunky', c1: '#E3DBCD', c2: '#D3C9B7' });
  I('display', 6.13, 4.49, 0, { w: 0.58, d: 0.42, fill: 'decor' });
  I('sofa', 7.45, 4.75, 0, { w: 2.0, d: 0.92, c1: '#7A6856', c2: 'wood_walnut', c3: '#5F5C3E' });
  I('art', 7.45, 4.3, 0, { style: 'landscape', w: 1.2, h: 0.8, y: 1.24, c1: '#CFC7B4', c2: '#4E5A43', c3: '#8B6B3E' });
  I('sconce', 6.62, 4.36, 0); I('sconce', 8.28, 4.36, 0);
  I('display', 8.62, 5.75, 270, { w: 0.8, d: 0.42, fill: 'bar', c2: 'travertine' });
  I('tablelamp', 8.66, 6.0, 270, { y: 0.88, style: 'mushroom', c1: '#B08A4E', c2: '#94704A', w: 0.22, d: 0.22, h: 0.34 });
  I('coffee_block', 7.45, 5.85, 0, { decor: true });
  I('armchair', 5.95, 5.95, 90, { c1: '#85725F', c2: 'wood_walnut' }); I('side_drum', 6.05, 5.15, 0);
  I('armchair', 8.15, 6.75, 218, { c1: '#85725F', c2: 'wood_walnut' }); I('side_drum', 8.55, 7.45, 0, { h: 0.5 });
  I('tvbench', 3.86, 6.95, 90, { w: 1.8, d: 0.42, h: 0.5, c1: 'wood_walnut', c2: '#2a2a2a' }); I('tv', 3.87, 6.95, 90, { y: 0.5 });
  I('petal', 7.25, 6.05, 0, { style: 'flush', w: 0.62, h: 0.26 });
  I('radiator', 7.6, 8.37, 180, { w: 1.8 }); I('curtain', 7.6, 8.36, 180, { w: 2.6, c1: '#E4DCCD' });

  // ---- Spisestue (inside x 3.65–5.99, z 0.0–4.18; Soverom 1 wall at x 5.99, kitchen opening in the wall at x 3.65)
  I('rug', 4.82, 2.0, 90, { w: 2.5, d: 1.75, pat: 'jute', c1: '#BDA785', c2: '#A08A68' });
  I('dining', 4.82, 2.0, 90, { w: 1.6, d: 0.9, style: 'soft', c1: 'wood_walnut' });
  for (const z of [1.62, 2.38]) { I('chair_uph', 4.27, z, 90); I('chair_uph', 5.37, z, 270); }
  I('sideboard_fluted', 5.765, 1.3, 270, { w: 1.8, decor: true });
  I('art', 5.97, 1.4, 270, { style: 'landscape', w: 1.15, h: 0.8, y: 1.25, c1: '#D3C6AE', c2: '#55603F', c3: '#8B6B3E' });
  I('lamp_ceramic', 5.78, 0.68, 270, { y: 0.8 });
  I('art', 3.67, 2.95, 90, { style: 'landscape', w: 0.5, h: 0.68, y: 1.3, c1: '#D8CDB8', c2: '#5D6448', c3: '#9C7B45' });
  I('petal', 4.82, 2.0, 0, { style: 'pendant', w: 0.72, h: 0.62 });
  I('radiator', 5.29, 0.05, 0, { w: 0.8, h: 0.42, y: 0.1 });

  // ---- Kjøkken (inside x 0–3.55, z 0–2.22; window x 1.95–3.45 in the east wall z 0, opening to the dining room in the wall at x 3.55)
  const K = { c1: 'wood_walnut_mid', c2: 'quartz_white', front: 'flat', knob: 'none' };
  I('base', 0.3, 1.11, 90, { ...K, w: 2.22 });
  I('base', 0.8, 0.3, 0, { ...K, w: 0.4, style: 'drawers', n: 3 }); I('oven', 1.3, 0.3, 0, K);
  I('base', 1.9, 0.3, 0, { ...K, w: 0.6, style: 'drawers', n: 3 }); I('base', 2.525, 0.3, 0, { ...K, w: 0.65, style: 'drawers', n: 3 }); I('base', 3.2, 0.3, 0, { ...K, w: 0.7, style: 'drawers', n: 3 });
  I('sink', 1.05, 1.92, 180, { ...K, w: 0.9 }); I('dishwasher', 1.8, 1.92, 180, K); I('base', 2.225, 1.92, 180, { ...K, w: 0.25 });
  I('tall_cab', 2.65, 1.92, 180, { c1: K.c1, knob: 'none' }); I('tall_cab', 3.25, 1.92, 180, { c1: K.c1, knob: 'none' });
  const U = { c1: K.c1, front: 'flat', knob: 'none', cornice: false, h: 0.86 };
  I('upper', 0.175, 0.54, 90, { ...U, w: 0.38 }); I('upper', 0.175, 1.11, 90, { ...U, w: 0.76, glass: true }); I('upper', 0.175, 1.68, 90, { ...U, w: 0.38 });
  I('upper', 0.5, 0.175, 0, { ...U, w: 1.0 }); I('hood', 1.3, 0.175, 0, { c1: K.c1, h: 0.86 }); I('upper_open', 1.75, 0.175, 0, { c1: K.c1, w: 0.3, h: 0.86, cornice: false });
  I('upper', 0.6, 2.045, 180, { ...U, w: 1.2 }); I('upper', 1.775, 2.045, 180, { ...U, w: 1.15 });
  I('backsplash', 0.006, 1.11, 90, { w: 2.22, c1: 'tile_white_vert' }); I('backsplash', 1.175, 2.214, 180, { w: 2.35, c1: 'tile_white_vert' }); I('backsplash', 0.975, 0.006, 0, { w: 1.95, c1: 'tile_white_vert' });
  I('spots', 1.8, 1.1, 0);

  s.items = [...items, ...s.items]; // new lights first so they get the lamp slots
  s.reno = 2;
  return s;
}
