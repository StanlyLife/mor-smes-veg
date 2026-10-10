// ---------- renderer, scene, lights ----------
let state = null;
const view = { mode: '3d', tool: 'select', low: false, sel: null, underlay: false, furniture: true, lock: false };
const canvas = $('#c'), stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#e6ebe9', 140, 1300);
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture; pm.dispose(); }
const groups = {};
for (const k of ['walls', 'openings', 'trim', 'floors', 'ceil', 'struct', 'roof', 'context', 'items', 'helpers', 'lamps']) { groups[k] = new THREE.Group(); scene.add(groups[k]); }
const persp = new THREE.PerspectiveCamera(50, 1, 0.05, 4000);
const ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, -100, 300);
ortho.up.set(0, 0, -1);
let camera = persp;
const CENTER = new THREE.Vector3(4.4, 0.5, 3.2);
persp.position.set(10.8, 10.5, 13.2);

const hemi = new THREE.HemisphereLight('#eef3f6', '#d6cdbd', 1.1);
const amb = new THREE.AmbientLight('#ffffff', 0.35);
const sun = new THREE.DirectionalLight('#fff3e0', 2.6);
const QUALITY = { high: (() => { try { const v = localStorage.getItem('msv11c.hq'); return v ? v === '1' : !matchMedia('(pointer: coarse)').matches; } catch { return true; } })() };
sun.castShadow = true; sun.shadow.mapSize.set(QUALITY.high ? 4096 : 2048, QUALITY.high ? 4096 : 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 90 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
sun.target.position.set(4.4, 0, 3.2);
scene.add(hemi, amb, sun, sun.target);

// ambient occlusion (soft contact shadows in corners, under furniture) + 4x MSAA, through an effect composer
let composer = null, renderPass = null, gtao = null, bloom = null;
function setupComposer() {
  const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600, pr = renderer.getPixelRatio();
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: 4 }));
  renderPass = new RenderPass(scene, persp); composer.addPass(renderPass);
  gtao = new GTAOPass(scene, persp, w, h);
  gtao.updateGtaoMaterial({ radius: 0.32, distanceExponent: 1.6, thickness: 1.2, scale: 1.15, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  const ov = gtao.overrideVisibility.bind(gtao);
  gtao.overrideVisibility = function () { ov(); this.scene.traverse(o => { if (o.userData.noAO || o.isLineSegments2 || (o.material && !Array.isArray(o.material) && o.material.transparent) || o.userData.env) o.visible = false; }); };
  composer.addPass(gtao);
  bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.22, 0.5, 1.1); composer.addPass(bloom);
  composer.addPass(new OutputPass());
}
function renderFrame(fast) {
  if (!fast && QUALITY.high && view.mode !== 'plan' && !view.underlay) {
    if (!composer) setupComposer();
    renderPass.camera = camera; gtao.camera = camera; bloom.enabled = !!state.settings.shadows && warmth > 0.25; composer.render();
  } else renderer.render(scene, camera);
}
let dirty = true;
const markDirty = () => { dirty = true; };
function clear(g) { for (const c of [...g.children]) { g.remove(c); c.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } }
function mixHex(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function cssVar(n) { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return /^#[0-9a-f]{6}$/i.test(v) ? v : '#cccccc'; }

// ---------- sun & sky ----------
const skyCanvas = mkCanvas(4, 256), skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace;
function sunPos(hour = state.settings.hour, season = state.settings.season) {
  const lat = 59.95 * DEG;
  const decl = ({ winter: -23.44, spring: 0, summer: 23.44, autumn: 0 }[season] ?? 0) * DEG;
  const noon = { winter: 12.25, spring: 12.2, summer: 13.25, autumn: 13.1 }[season] ?? 12.5;
  const H = (hour - noon) * 15 * DEG;
  const alt = Math.asin(clamp(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H), -1, 1));
  let az = Math.acos(clamp((Math.sin(decl) - Math.sin(alt) * Math.sin(lat)) / ((Math.cos(alt) * Math.cos(lat)) || 1e-6), -1, 1));
  if (H > 0) az = 2 * Math.PI - az;
  return { alt, az };
}
// evening time when the sun stands about 6° above the horizon (golden hour) for the chosen season
function goldenHour(season) { for (let h = 13; h < 23; h += 0.05) if (sunPos(h, season).alt < 6 * DEG) return Math.round((h - 0.05) * 4) / 4; return 19; }
let dayLevel = 1, warmth = 0;
function updateSun() {
  const S = state.settings, shadows = !!S.shadows;
  let { alt, az } = sunPos();
  if (!shadows) { alt = 50 * DEG; az = 200 * DEG; } // even, shadow-free daylight from high in the south
  const dir = new THREE.Vector3(-Math.cos(az) * Math.cos(alt), Math.sin(alt), -Math.sin(az) * Math.cos(alt)); // plan: north = -x, east = -z
  sun.position.copy(sun.target.position).addScaledVector(dir, 45);
  dayLevel = shadows ? clamp(Math.sin(alt) * 4 + 0.15, 0, 1) : 1;
  warmth = shadows && alt > -2 * DEG ? clamp(1 - (alt / DEG - 3) / 20, 0, 1) : 0;
  if (shadows) {
    sun.intensity = alt > 0 ? (2.8 + 0.5 * warmth) * clamp((alt / DEG + 1) / 3, 0, 1) : 0;
    sun.color.set(mixHex('#fff4e3', '#ff8636', warmth));
  } else { sun.intensity = 0.75; sun.color.set('#fff8ef'); }
  hemi.intensity = (0.15 + 0.6 * dayLevel) * (1 - 0.55 * warmth);
  hemi.color.set(mixHex('#eef3f6', '#ffd2a8', warmth));
  const ei = (0.12 + 0.43 * dayLevel) * (1 - 0.55 * warmth) + (S.lamps ? 0.1 : 0); if (Math.abs(ei - ENV_I.v) > 0.005) { ENV_I.v = ei; for (const m of MATC.values()) m.envMapIntensity = ei; }
  amb.intensity = (0.06 + 0.08 * dayLevel) * (1 - 0.5 * warmth) + (S.lamps ? 0.12 : 0);
  renderer.toneMappingExposure = 1.15 + 0.1 * warmth;
  const wantShadow = shadows && view.mode !== 'plan' && sun.intensity > 0.05;
  if (sun.castShadow !== wantShadow) sun.castShadow = wantShadow;
  const sb = $('#sunBtn'); if (sb) { sb.classList.toggle('on', shadows); sb.setAttribute('aria-pressed', shadows); }
  updateSky(); buildLamps(); buildRays(); markDirty();
}
function updateSky() {
  const g = skyCanvas.getContext('2d'), night = 1 - dayLevel;
  const top = mixHex(mixHex('#A6C1D6', '#5a6a94', warmth), '#0a1115', night * 0.85), bot = mixHex(mixHex('#E3EAED', '#f3a967', warmth), '#141b1f', night * 0.85);
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(0.75, mixHex(top, bot, 0.6)); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  skyTex.needsUpdate = true; scene.background = view.underlay ? null : skyTex; scene.fog.color.set(bot); markDirty();
}
function buildLamps() {
  clear(groups.lamps);
  if (!state.settings.lamps) return;
  let n = 0;
  for (const it of state.items) {
    const d = CAT[it.type]; if (!d?.lamp || n >= 14 || !itemShown(it)) continue;
    const y = d.hang ? ceilAt(it.x, it.z) - (roomAtPt(it.x, it.z)?.drop || 0) - it.h - 0.1 : (it.y || 0) + it.h * 0.85;
    const l = new THREE.PointLight('#ffd7a0', d.lampI ?? (d.hang ? 3.2 : 2.2), d.lampR ?? 7, 1.6); l.position.set(it.x, y, it.z); groups.lamps.add(l); n++;
  }
}
// ---------- light rays through the windows (soft additive volumes from each sunlit pane to the floor or the far wall) ----------
const RAY_MAT = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color('#ffc27a') }, uStrength: { value: 0.3 } },
  vertexShader: 'attribute vec2 rayUv; varying vec2 vR; void main() { vR = rayUv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 uColor; uniform float uStrength; varying vec2 vR;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
    void main() {
      float edge = pow(sin(3.14159 * clamp(vR.x, 0.0, 1.0)), 0.9);
      float fall = pow(1.0 - clamp(vR.y, 0.0, 1.0), 1.3) * smoothstep(0.0, 0.06, vR.y);
      float dust = 0.7 + 0.3 * n(vec2(vR.x * 16.0, vR.y * 3.0)) + 0.15 * step(0.985, h(floor(vec2(vR.x * 90.0, vR.y * 140.0))));
      gl_FragColor = vec4(uColor * uStrength * edge * fall * dust, 1.0);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const RAYS = new THREE.Group(); RAYS.userData.noAO = true; scene.add(RAYS);
function buildRays() {
  clear(RAYS);
  const S = state.settings;
  if (!S.shadows || view.mode === 'plan' || view.low || !sun.castShadow || !state.walls) return;
  const D = sun.target.position.clone().sub(sun.position).normalize(); // direction the light travels
  if (D.y > -0.01) return;
  RAY_MAT.uniforms.uColor.value.set(mixHex('#fff1d6', '#ffa458', warmth));
  RAY_MAT.uniforms.uStrength.value = 0.16 + 0.3 * warmth;
  const hd = norm([D.x, D.z]), hl = Math.hypot(D.x, D.z);
  for (const w of state.walls) {
    const { d, n } = wallFrame(w), ht = w.t / 2;
    for (const o of w.openings || []) {
      if (o.type !== 'window' && o.type !== 'balcony') continue;
      const c = add(w.a, mul(d, o.pos)), pA = add(c, mul(n, ht + 0.1)), pB = add(c, mul(n, -(ht + 0.1)));
      const rA = roomAtPt(pA[0], pA[1]), rB = roomAtPt(pB[0], pB[1]); if (!!rA === !!rB) continue;
      const s = rA ? 1 : -1, nIn = [n[0] * s, n[1] * s], facing = D.x * nIn[0] + D.z * nIn[1]; if (facing <= 0.03) continue;
      const gw = o.type === 'balcony' ? o.w - 0.24 : o.w - 0.16, y0 = o.type === 'balcony' ? 0.25 : (o.sill || 0) + 0.1, y1 = (o.sill || 0) + o.h - 0.12;
      const base = add(c, mul(nIn, ht));
      let wd = 9; for (const w2 of state.walls) { if (w2 === w || w2.open) continue; const ii = segInter(base, add(base, mul(hd, 20)), w2.a, w2.b); if (ii && ii[0] > 0 && ii[1] >= 0 && ii[1] <= 1) wd = Math.min(wd, ii[0] * 20 - w2.t / 2); }
      const tWall = wd / Math.max(hl, 1e-3);
      const near = [[-gw / 2, y0], [gw / 2, y0], [gw / 2, y1], [-gw / 2, y1]].map(([u, y]) => new THREE.Vector3(base[0] + d[0] * u, y, base[1] + d[1] * u));
      const far = near.map(p => p.clone().addScaledVector(D, Math.min(p.y / -D.y, tWall, 9)));
      const pos = [], uv = [], idx = [];
      for (let k = 0; k < 4; k++) {
        const a = near[k], b = near[(k + 1) % 4], bf = far[(k + 1) % 4], af = far[k], i0 = pos.length / 3;
        for (const [p, u, v] of [[a, 0, 0], [b, 1, 0], [bf, 1, 1], [af, 0, 1]]) { pos.push(p.x, p.y, p.z); uv.push(u, v); }
        idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('rayUv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      const m = new THREE.Mesh(geo, RAY_MAT); m.userData.noAO = true; m.renderOrder = 5; m.frustumCulled = false; RAYS.add(m);
    }
  }
}
// ---------- furniture visibility (kitchen, bathroom, built-ins and radiators always stay) ----------
const FIXED_TYPES = new Set(['closet', 'radiator', 'box', 'column', 'backsplash']);
const isFixture = it => FIXED_TYPES.has(it.type) || ['Kitchen', 'Bath', 'Structure'].includes(CAT[it.type]?.cat);
const itemShown = it => view.furniture || isFixture(it);
function applyFurniture() { for (const it of state.items) { const o = itemObjs.get(it.id); if (o) o.visible = itemShown(it); } buildLamps(); markDirty(); }

// ---------- environment ----------
function buildGround() {
  const cv = mkCanvas(1024, 1024), g = cv.getContext('2d'), R = rng(21);
  g.fillStyle = '#7f9866'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 220; i++) { g.fillStyle = ['#8fa66d', '#71895a', '#a3a874', '#6b7f55', '#9a9a8a'][Math.floor(R() * 5)]; g.save(); g.translate(R() * 1024, R() * 1024); g.rotate(R() * 3); g.fillRect(-20, -12, 20 + R() * 60, 12 + R() * 30); g.restore(); }
  g.fillStyle = '#6f8fa3'; g.beginPath(); g.moveTo(0, 60); for (let x = 0; x <= 1024; x += 32) g.lineTo(x, 300 + Math.sin(x / 90) * 40 + Math.sin(x / 33) * 12); g.lineTo(1024, 0); g.lineTo(0, 0); g.fill();
  g.fillStyle = '#62775a'; g.fillRect(0, 0, 1024, 70);
  g.strokeStyle = '#9b9890'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 560); g.bezierCurveTo(300, 520, 700, 600, 1024, 540); g.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1300, 64), new THREE.MeshLambertMaterial({ map: t }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(4.4, -6.8, 3.2); ground.receiveShadow = true;
  const hills = new THREE.CylinderGeometry(1250, 1250, 1, 96, 1, true), pos = hills.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0) { const a = Math.atan2(pos.getZ(i), pos.getX(i)); pos.setY(i, 40 + 50 * (0.5 + 0.5 * Math.sin(a * 5 + 1)) + 30 * Math.sin(a * 13)); } else pos.setY(i, -10);
  hills.computeVertexNormals();
  const hm = new THREE.Mesh(hills, new THREE.MeshLambertMaterial({ color: '#4d6150', side: THREE.BackSide })); hm.position.set(4.4, -6.8, 3.2);
  const env = new THREE.Group(); env.add(ground, hm); env.userData.env = true; return env;
}
const ENV = buildGround(); scene.add(ENV);
let facadeM = null;
function facadeMat() {
  if (facadeM) return facadeM;
  const cv = mkCanvas(512, 256), g = cv.getContext('2d'); g.fillStyle = '#D9D4C8'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(i * 12.8, 0, 2, 256); }
  g.fillStyle = '#39434a'; g.fillRect(130, 70, 150, 110); g.fillStyle = '#f2f0ea'; g.fillRect(124, 180, 162, 8);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 4, 1 / 2.7);
  facadeM = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); return facadeM;
}
function buildContext() {
  clear(groups.context);
  ENV.visible = view.mode !== 'plan' && !view.underlay;
  if (!state.settings.context || view.mode === 'plan') return;
  const g = groups.context, f = facadeMat(), dark = mat('#3a3d40', 0.9), con = mat('#a6a39c', 0.9);
  bx(g, 33.03, 6.55, 8.82, -24 + 33.03 / 2, -6.8, 4.21, f, { uv: true });
  bx(g, 23.8, 2.95, 8.82, -24 + 23.8 / 2, -0.25, 4.21, f, { uv: true });
  bx(g, 23.8, 0.2, 9.4, -24 + 23.8 / 2, 2.7, 4.21, dark);
  bx(g, 1.27, 2.95, 4.28, -0.2 + 1.27 / 2, -0.25, 4.34 + 4.28 / 2, con);
  for (const y of [-2.95, -5.65]) { bx(g, BALC.x1 - BALC.x0, 0.18, 2.0, (BALC.x0 + BALC.x1) / 2, y - 0.2, -1.2, con); bx(g, BALC.x1 - BALC.x0, 0.85, 0.04, (BALC.x0 + BALC.x1) / 2, y, -2.18, mat('#E7E4DC', 0.8)); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
}

// ---------- geometry of the apartment ----------
function ceilAt(x, z) {
  const S = state.settings; if (S.ceilMode !== 'vaulted') return S.ceilH;
  let t = (z - BUILDING.z0) / (BUILDING.z1 - BUILDING.z0); if (S.lowSide === 'west') t = 1 - t;
  return S.ceilH + (S.ceilHigh - S.ceilH) * clamp(t, 0, 1);
}
const TEMP_ROOM = { id: null, name: 'New room', floor: 'oak_honey', wall: 'paint_white', ceil: 'paint_white', drop: 0, skirt: true };
let FACES = [], OUTER = [];
function refreshFaces() {
  const a = analyzeWalls(state.walls); OUTER = a.outer;
  FACES = matchRooms(a.rooms, state.rooms).map(x => ({ face: x.face, room: x.room || TEMP_ROOM }));
}
function faceAt(x, z) { return FACES.find(f => pip([x, z], f.face.poly)) || null; }
function roomAtPt(x, z) { return faceAt(x, z)?.room || null; }
function inBalcony(x, z) { return x > BALC.x0 && x < BALC.x1 && z > BALC.z0 && z < -0.05; }

function computeExt(walls) {
  const m = new Map();
  for (const w of walls) {
    const { d } = wallFrame(w), r = { s: 0, e: 0, freeS: true, freeE: true };
    for (const end of ['a', 'b']) {
      const P = w[end]; let ext = 0, touched = false, col = false;
      for (const o of walls) {
        if (o === w || distSeg(P, o.a, o.b) >= 0.02) continue;
        touched = true;
        if (Math.abs(cross(d, wallFrame(o).d)) < 0.05) col = true; else ext = Math.max(ext, o.t / 2 - 0.002);
      }
      if (col) ext = 0;
      if (end === 'a') { r.s = ext; r.freeS = !touched; } else { r.e = ext; r.freeE = !touched; }
    }
    m.set(w.id, r);
  }
  return m;
}
function junctions(w, walls) {
  const { L } = wallFrame(w), us = [];
  for (const o of walls) {
    if (o === w) continue;
    for (const p of [o.a, o.b]) if (distSeg(p, w.a, w.b) < 0.02) us.push(projT(p, w.a, w.b) * L);
    const ii = segInter(w.a, w.b, o.a, o.b); if (ii && ii[0] > 0 && ii[0] < 1 && ii[1] > 0 && ii[1] < 1) us.push(ii[0] * L);
  }
  return us;
}
function alongBox(g, P, d, ua, ub, y0, h, off, depth, m) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(ub - ua, h, depth), m), c = P((ua + ub) / 2, y0 + h / 2, off);
  me.position.set(c[0], c[1], c[2]); me.rotation.y = Math.atan2(-d[1], d[0]); g.add(me); return me;
}
let EXT = new Map();
function buildWalls() {
  clear(groups.walls); clear(groups.openings); clear(groups.trim);
  const S = state.settings, walls = state.walls.filter(w => !w.open); EXT = computeExt(walls);
  if (view.mode === 'plan') for (const w of state.walls) if (w.open) buildOpenMark(w);
  const cut = view.low ? 1.05 : Infinity;
  for (const w of walls) {
    const { L, d, n } = wallFrame(w); if (L < 0.05) continue;
    const ht = w.t / 2, e = EXT.get(w.id), u0 = -e.s, u1 = L + e.e;
    const P = (u, y, o) => [w.a[0] + d[0] * u + n[0] * o, y, w.a[1] + d[1] * u + n[1] * o];
    const topAt = u => Math.min(ceilAt(w.a[0] + d[0] * u, w.a[1] + d[1] * u), cut);
    const ops = (w.openings || []).map(o => ({ o, l: clamp(o.pos - o.w / 2, 0.01, L - 0.01), r: clamp(o.pos + o.w / 2, 0.01, L - 0.01) }))
      .filter(x => x.r - x.l > 0.1 && x.o.sill < topAt(x.o.pos) - 0.05);
    const bps = [u0, u1]; ops.forEach(x => bps.push(x.l, x.r));
    junctions(w, walls).forEach(u => { if (u > u0 + 0.01 && u < u1 - 0.01) bps.push(u); });
    const B = [...new Set(bps.map(v => Math.round(v * 1e4) / 1e4))].sort((a, b) => a - b);
    const roomSide = (u, s) => { const p = P(u, 0, s * (ht + 0.06)); return roomAtPt(p[0], p[2]); };
    const sideMat = (u, s) => w.finish?.[s > 0 ? 'A' : 'B'] || roomSide(u, s)?.wall || S.extFinish;
    const mb = new MB(), nA = [n[0], 0, n[1]], nB = [-n[0], 0, -n[1]], zones = { 1: [], '-1': [] };
    for (let i = 0; i < B.length - 1; i++) {
      const ua = B[i], ub = B[i + 1]; if (ub - ua < 1e-4) continue;
      const um = (ua + ub) / 2, op = ops.find(x => um > x.l && um < x.r), ta = topAt(ua), tb = topAt(ub);
      const mA = sideMat(um, 1), mBk = sideMat(um, -1);
      for (const s of [1, -1]) zones[s].push({ ua, ub, room: roomSide(um, s), door: !!op && op.o.sill < 0.05, op: !!op, mk: s > 0 ? mA : mBk });
      const pcs = [];
      if (!op) pcs.push([0, ta, 0, tb]);
      else {
        const sill = op.o.sill, head = sill + op.o.h;
        if (sill > 0.001) pcs.push([0, Math.min(sill, ta), 0, Math.min(sill, tb)]);
        if (head < Math.min(ta, tb) - 0.001) pcs.push([head, ta, head, tb]);
      }
      for (const [a0, a1, b0, b1] of pcs) {
        mb.quad(mA, P(ua, a0, ht), P(ub, b0, ht), P(ub, b1, ht), P(ua, a1, ht), nA, [[ua, a0], [ub, b0], [ub, b1], [ua, a1]]);
        mb.quad(mBk, P(ua, a0, -ht), P(ub, b0, -ht), P(ub, b1, -ht), P(ua, a1, -ht), nB, [[-ua, a0], [-ub, b0], [-ub, b1], [-ua, a1]]);
        mb.quad('_e', P(ua, a1, ht), P(ub, b1, ht), P(ub, b1, -ht), P(ua, a1, -ht), [0, 1, 0]);
        if (a0 > 0) mb.quad('_e', P(ua, a0, ht), P(ub, b0, ht), P(ub, b0, -ht), P(ua, a0, -ht), [0, -1, 0]);
      }
    }
    for (const x of ops) {
      const sill = x.o.sill, hl = Math.min(sill + x.o.h, topAt(x.l)), hr = Math.min(sill + x.o.h, topAt(x.r));
      if (hl > sill) mb.quad('_e', P(x.l, sill, ht), P(x.l, sill, -ht), P(x.l, hl, -ht), P(x.l, hl, ht), [d[0], 0, d[1]]);
      if (hr > sill) mb.quad('_e', P(x.r, sill, ht), P(x.r, sill, -ht), P(x.r, hr, -ht), P(x.r, hr, ht), [-d[0], 0, -d[1]]);
    }
    if (e.freeS) mb.quad('_e', P(u0, 0, ht), P(u0, 0, -ht), P(u0, topAt(u0), -ht), P(u0, topAt(u0), ht), [-d[0], 0, -d[1]]);
    if (e.freeE) mb.quad('_e', P(u1, 0, ht), P(u1, 0, -ht), P(u1, topAt(u1), -ht), P(u1, topAt(u1), ht), [d[0], 0, d[1]]);
    const mesh = mb.mesh(k => k === '_e' ? EDGE : getMat(k));
    mesh.castShadow = mesh.receiveShadow = true; mesh.userData = { kind: 'wall', wallId: w.id };
    groups.walls.add(mesh);
    if (!view.low) for (const x of ops) buildOpening(w, { d, n, ht }, x.o, roomSide(x.o.pos, 1), roomSide(x.o.pos, -1));
    buildTrim(w, { d, ht, u0, u1, es: e.s, ee: e.e }, zones, P);
  }
}
// an open passage that only bounds two rooms: dashes on the floor in the plan view
const OPEN_MAT = new THREE.MeshBasicMaterial({ color: '#8a8f93' });
function buildOpenMark(w) {
  const { L, d } = wallFrame(w), g = new THREE.Group(), n = Math.max(2, Math.round(L / 0.16));
  for (let i = 0; i < n; i++) { const u0 = (i + 0.2) * L / n, u1 = (i + 0.8) * L / n; alongBox(g, (u, y, o) => [w.a[0] + d[0] * u, y, w.a[1] + d[1] * u], d, u0, u1, 0.01, 0.01, 0, 0.035, OPEN_MAT); }
  const hit = alongBox(g, (u, y, o) => [w.a[0] + d[0] * u, y, w.a[1] + d[1] * u], d, 0, L, 0.005, 0.02, 0, 0.14, OPEN_MAT); hit.visible = true; hit.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  g.traverse(m => { if (m.isMesh) m.userData = { kind: 'wall', wallId: w.id, noAO: true }; });
  groups.walls.add(g);
}
// profiled moulding (skirting, cornice) extruded along a wall face; shape x = out from the wall, y = up
function profileRun(g, P, d, n, ua, ub, y0, s, shape, m) {
  const L = ub - ua; if (L < 0.01) return;
  const geo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false, curveSegments: 8 });
  const out = new THREE.Vector3(n[0] * s, 0, n[1] * s), up = new THREE.Vector3(0, 1, 0), along = new THREE.Vector3(d[0], 0, d[1]);
  const o = s > 0 ? P(ub, y0, s * 0) : P(ua, y0, s * 0), z = s > 0 ? along.clone().negate() : along;
  const me = new THREE.Mesh(geo, m); me.matrixAutoUpdate = false; me.matrix.makeBasis(out, up, z).setPosition(o[0], o[1], o[2]); g.add(me); return me;
}
const SKIRT = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.013, 0); s.lineTo(0.013, 0.05); s.bezierCurveTo(0.013, 0.062, 0.008, 0.066, 0.004, 0.07); s.lineTo(0, 0.07); s.closePath(); return s; })();
const SKIRT_TALL = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.016, 0); s.lineTo(0.016, 0.092); s.bezierCurveTo(0.016, 0.104, 0.007, 0.104, 0.007, 0.112); s.lineTo(0.007, 0.12); s.lineTo(0, 0.12); s.closePath(); return s; })();
const CROWN = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.01, 0); s.lineTo(0.012, 0.008); s.lineTo(0.02, 0.01); s.quadraticCurveTo(0.026, 0.07, 0.084, 0.08); s.lineTo(0.088, 0.088); s.lineTo(0.1, 0.09); s.lineTo(0.1, 0.11); s.lineTo(0, 0.11); s.closePath(); return s; })();
const COVE = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.006, 0); s.quadraticCurveTo(0.008, 0.042, 0.048, 0.044); s.lineTo(0.05, 0.05); s.lineTo(0, 0.05); s.closePath(); return s; })();
function buildTrim(w, fr, zones, P) {
  const S = state.settings, { d, ht } = fr, n = [-d[1], d[0]], sk = mat(S.skirting, 0.5), co = mat('#F3F2EE', 0.7), g = groups.trim, classic = S.trim === 'classic';
  for (const s of [1, -1]) {
    const runs = [];
    for (const z of zones[s]) {
      if (!z.room) continue;
      const last = runs[runs.length - 1];
      if (last && last.room === z.room && Math.abs(last.ub - z.ua) < 1e-4 && last.door === z.door) last.ub = z.ub; else runs.push({ ...z });
    }
    const Pf = (u, y, off) => P(u, y, s * ht + off);
    for (const r of runs) {
      if (r.room.skirt !== false && !r.door) profileRun(g, Pf, d, n, r.ua, r.ub, 0, s, classic ? SKIRT_TALL : SKIRT, sk);
      if (S.cornice && S.ceilMode === 'flat' && !view.low && view.mode !== 'plan' && !hasPocket(r.room, w.id)) profileRun(g, Pf, d, n, r.ua, r.ub, S.ceilH - (r.room.drop || 0) - (classic ? 0.11 : 0.05), s, classic ? CROWN : COVE, co);
    }
    // picture-frame wall panelling (room.panels: 'tall' | 'dado'), painted like the wall, between doors and windows
    if (view.low || view.mode === 'plan') continue;
    const spans = [];
    for (const z of zones[s]) { if (!z.room?.panels) continue; const last = spans[spans.length - 1]; if (!z.op && last && !last.op && last.room === z.room && last.mk === z.mk && Math.abs(last.ub - z.ua) < 1e-4) last.ub = z.ub; else spans.push({ ...z }); }
    for (const sp of spans) if (!sp.op && !MATS[sp.mk]?.gen) panelRun(g, P, d, s, ht, Math.abs(sp.ua - fr.u0) < 1e-3 ? sp.ua + 2 * fr.es : sp.ua, Math.abs(sp.ub - fr.u1) < 1e-3 ? sp.ub - 2 * fr.ee : sp.ub, S.ceilH - (sp.room.drop || 0) - (S.cornice ? (classic ? 0.11 : 0.05) : 0), sp.room.panels, mat('#' + getMat(sp.mk).color.getHexString(), 0.7), classic);
  }
  g.traverse(m => { if (m.isMesh) m.receiveShadow = true; });
}
// moulding bar along a wall face: bevelled sides (front face 40% of the base) so it shades like real trim instead of reading as dark lines
function mouldBar(g, P, d, s, ht, ua, ub, y0, h, depth, m, vertical) {
  const geo = new THREE.BoxGeometry(ub - ua, h, depth), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getZ(i) * s > 0) { if (vertical) pos.setX(i, pos.getX(i) * 0.4); else pos.setY(i, pos.getY(i) * 0.4); }
  geo.computeVertexNormals();
  const me = new THREE.Mesh(geo, m), c = P((ua + ub) / 2, y0 + h / 2, s * (ht + depth / 2));
  me.position.set(c[0], c[1], c[2]); me.rotation.y = Math.atan2(-d[1], d[0]); me.receiveShadow = true; g.add(me); return me;
}
function panelRun(g, P, d, s, ht, ua, ub, top, style, m, classic) {
  const bw = 0.034, dp = 0.012, m0 = 0.16, gap = 0.12, L = ub - ua - 2 * m0, sk = classic ? 0.12 : 0.07;
  if (L < 0.3) return;
  const rows = style === 'dado' ? [[sk + 0.1, 0.74], [1.02, top - 0.22]] : [[sk + 0.16, top - 0.26]];
  if (style === 'dado') mouldBar(g, P, d, s, ht, ua + 0.06, ub - 0.06, 0.86, 0.055, 0.02, m, false);
  for (const [y0, y1] of rows) {
    if (y1 - y0 < 0.25) continue;
    const n = Math.max(1, Math.round((L + gap) / ((y1 - y0 > 1 ? 0.95 : 0.75) + gap))), pw = (L - (n - 1) * gap) / n;
    for (let i = 0; i < n; i++) {
      const a = ua + m0 + i * (pw + gap), b = a + pw;
      mouldBar(g, P, d, s, ht, a, b, y0, bw, dp, m, false); mouldBar(g, P, d, s, ht, a, b, y1 - bw, bw, dp, m, false);
      mouldBar(g, P, d, s, ht, a, a + bw, y0 + bw * 0.7, y1 - y0 - bw * 1.4, dp, m, true); mouldBar(g, P, d, s, ht, b - bw, b, y0 + bw * 0.7, y1 - y0 - bw * 1.4, dp, m, true);
    }
  }
}
function buildOpening(w, fr, o, roomA, roomB) {
  const { d, ht } = fr, g = new THREE.Group();
  g.position.set(w.a[0] + d[0] * o.pos, 0, w.a[1] + d[1] * o.pos); g.rotation.y = Math.atan2(-d[1], d[0]);
  const white = mat('#F5F4F0', 0.5), W = o.w, H = o.h, S = o.sill || 0;
  const sides = []; if (roomA) sides.push(1); if (roomB) sides.push(-1);
  const casing = (s, y0, top) => { const z = s * (ht + 0.009); bx(g, 0.07, top - y0 + 0.07, 0.018, -W / 2 - 0.035, y0, z, white, { r: 0.005 }); bx(g, 0.07, top - y0 + 0.07, 0.018, W / 2 + 0.035, y0, z, white, { r: 0.005 }); bx(g, W + 0.14, 0.07, 0.018, 0, top, z, white, { r: 0.005 }); };
  const lever = (parent, x, y, z, dirx, zs) => { const rose = cy(parent, 0.026, 0.026, 0.01, x, 0, 0, STEEL, 24); rose.rotation.x = Math.PI / 2; rose.position.set(x, y, z); const neck = cy(parent, 0.009, 0.009, 0.04, x, 0, 0, STEEL, 12); neck.rotation.x = Math.PI / 2; neck.position.set(x, y, z + zs * 0.02); const lv = bx(parent, 0.13, 0.017, 0.017, x - dirx * 0.06, y - 0.0085, z + zs * 0.042, STEEL, { r: 0.007 }); return lv; };
  if (o.type === 'window') {
    const fw = 0.055, fd = 0.1, fm = mat(o.color || '#F5F4F0', 0.42), panes = o.panes || 1, inner = sides.length ? sides[0] : 1;
    bx(g, W, fw, fd, 0, S, 0, fm, { r: 0.004 }); bx(g, W, fw, fd, 0, S + H - fw, 0, fm, { r: 0.004 });
    bx(g, fw, H, fd, -W / 2 + fw / 2, S, 0, fm, { r: 0.004 }); bx(g, fw, H, fd, W / 2 - fw / 2, S, 0, fm, { r: 0.004 });
    const pw = (W - 2 * fw) / panes, sw = 0.048, sz = inner * 0.012, gh = H - 2 * fw;
    for (let i = 0; i < panes; i++) {
      const px = -W / 2 + fw + pw * (i + 0.5);
      bx(g, pw - 0.008, sw, 0.058, px, S + fw + 0.003, sz, fm, { r: 0.006 }); bx(g, pw - 0.008, sw, 0.058, px, S + H - fw - sw - 0.003, sz, fm, { r: 0.006 });
      for (const s of [-1, 1]) bx(g, sw, gh - 0.006, 0.058, px + s * (pw / 2 - sw / 2 - 0.004), S + fw + 0.003, sz, fm, { r: 0.006 });
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(pw - 2 * sw - 0.006, gh - 2 * sw - 0.006), GLASS); gl.position.set(px, S + H / 2, sz); gl.userData.noAO = true; g.add(gl);
      bx(g, pw - 2 * sw, 0.012, 0.01, px, S + fw + sw, sz + inner * 0.02, fm, { r: 0.004 });
      if (i === 0 || i === panes - 1) { const hx = px + (i === 0 && panes > 1 ? 1 : -1) * (pw / 2 - sw / 2 - 0.004); const hb = bx(g, 0.022, 0.05, 0.02, hx, S + H / 2 - 0.025, sz + inner * 0.035, fm, { r: 0.006 }); const hl = bx(g, 0.016, 0.11, 0.016, hx, S + H / 2 - 0.12, sz + inner * 0.05, fm, { r: 0.007 }); }
      if (i > 0) bx(g, 0.03, gh, fd * 0.9, -W / 2 + fw + pw * i, S + fw, 0, fm, { r: 0.004 });
    }
    for (const s of sides) { bx(g, W + 0.12, 0.025, ht + 0.045, 0, S - 0.025, s * (ht + 0.045) / 2, white, { r: 0.008 }); casing(s, S, S + H); }
    if (sides.length === 1) { const xs = -sides[0]; bx(g, W + 0.06, 0.012, ht + 0.06, 0, S - 0.035, xs * (ht + 0.06) / 2, mat('#7d8184', 0.4, 0.6), { r: 0.004 }); }
  } else {
    const cs = o.type === 'opening' ? (o.casing === false ? [] : (sides.length ? sides : [1, -1])) : sides;
    for (const s of cs) casing(s, 0, H);
    if (o.type === 'opening') { // lining on the reveal of a cased opening
      for (const s of [-1, 1]) bx(g, 0.016, H, 2 * ht + 0.004, s * (W / 2 - 0.008), 0, 0, white, { r: 0.003 }); bx(g, W, 0.016, 2 * ht + 0.004, 0, H - 0.016, 0, white, { r: 0.003 });
    } else {
      const dir = o.hinge === 'end' ? -1 : 1, sw = o.swing || 1, lw = W - 0.03, lh = H - 0.015, col = o.color || (o.type === 'front' ? '#E7E6E1' : '#F4F3EF');
      for (const s of [-1, 1]) bx(g, 0.03, H, 2 * ht + 0.004, s * (W / 2 - 0.015), 0, 0, white, { r: 0.004 }); bx(g, W, 0.03, 2 * ht + 0.004, 0, H - 0.03, 0, white, { r: 0.004 });
      const piv = new THREE.Group(); piv.position.set(-dir * (W / 2 - 0.03), 0, sw * (ht - 0.03)); piv.rotation.y = -(o.open || 0) * DEG * sw * dir; g.add(piv);
      const leaf = new THREE.Group(); leaf.position.x = dir * (lw - 0.03) / 2; piv.add(leaf);
      const LW = lw - 0.03;
      if (o.type === 'balcony') {
        const fm = mat(col, 0.45); bx(leaf, 0.09, lh, 0.055, -LW / 2 + 0.045, 0.005, 0, fm, { r: 0.006 }); bx(leaf, 0.09, lh, 0.055, LW / 2 - 0.045, 0.005, 0, fm, { r: 0.006 });
        bx(leaf, LW, 0.1, 0.055, 0, lh - 0.095, 0, fm, { r: 0.006 }); bx(leaf, LW, 0.22, 0.055, 0, 0.005, 0, fm, { r: 0.006 });
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.18, lh - 0.32), GLASS); gl.position.set(0, 0.225 + (lh - 0.32) / 2, 0); gl.userData.noAO = true; leaf.add(gl);
      } else if (o.type === 'door' && isHex(col)) front(leaf, LW, lh, 0.04, 0, 0.005, 0, col, 'panel3', true);
      else { front(leaf, LW, lh, 0.045, 0, 0.005, 0, col, 'flat'); if (o.type === 'front') { const ph = cy(leaf, 0.008, 0.008, 0.05, 0, 0, 0, CHROME, 12); ph.rotation.x = Math.PI / 2; ph.position.set(0, 1.55, 0); } }
      for (const zf of [1, -1]) lever(leaf, dir * (LW / 2 - 0.07), 1.0, zf * 0.02, dir, zf);
      if (o.type === 'front') { const cyl = cy(leaf, 0.017, 0.017, 0.012, 0, 0, 0, CHROME, 20); cyl.rotation.x = Math.PI / 2; cyl.position.set(dir * (LW / 2 - 0.07), 1.12, 0.026); }
      for (const hy of [0.25, lh - 0.25]) { const hg = cy(g, 0.008, 0.008, 0.1, -dir * (W / 2 - 0.03), hy, sw * (ht - 0.03), STEEL, 10); }
    }
  }
  g.traverse(m => { if (m.isMesh) { const ns = m.userData.noAO; m.userData = { kind: 'opening', wallId: w.id, opId: o.id, noAO: ns }; if (m.material !== GLASS) { m.castShadow = true; m.receiveShadow = true; } } });
  groups.openings.add(g);
}
function shapeGeo(poly, yFn, up) {
  const geo = new THREE.ShapeGeometry(new THREE.Shape(poly.map(p => new THREE.Vector2(p[0], p[1]))));
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getY(i); pos.setXYZ(i, x, yFn(x, z), z); }
  if (up) { const idx = geo.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } }
  geo.computeVertexNormals(); return geo;
}
// curtain pocket (room.pocket = wall id): a slot along that wall in a lowered ceiling, open up to the main ceiling, with the curtain track inside
const POCKET_W = 0.15;
const DIMC = new Map(), dimMat = (m, k) => { const key = m.uuid + k; if (!DIMC.has(key)) { const c = m.clone(); c.color = m.color.clone().multiplyScalar(k); DIMC.set(key, c); } return DIMC.get(key); }; // the shade inside the pocket
const hasPocket = (r, wid) => !!r && r.pocket === wid && (r.drop || 0) >= 0.03;
function clipHalf(poly, n, c) { // the part of the polygon where n·p >= c
  if (!poly) return null;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], dp = n[0] * p[0] + n[1] * p[1] - c, dq = n[0] * q[0] + n[1] * q[1] - c;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out.length >= 3 && Math.abs(areaSigned(out)) > 1e-4 ? out : null;
}
function pocketSplit(f) {
  const r = f.room, w = state.walls.find(x => !x.open && hasPocket(r, x.id)); if (!w) return null;
  const { L, d, n } = wallFrame(w), ip = interiorPoint(f.face.poly), s = Math.sign(n[0] * (ip[0] - w.a[0]) + n[1] * (ip[1] - w.a[1])) || 1;
  const N = [n[0] * s, n[1] * s], na = N[0] * w.a[0] + N[1] * w.a[1], da = d[0] * w.a[0] + d[1] * w.a[1], ht = w.t / 2, v = na + ht + POCKET_W, e = 0.3, poly = f.face.poly;
  const near = clipHalf(poly, [-N[0], -N[1]], -v), slot = clipHalf(clipHalf(near, d, da - e), [-d[0], -d[1]], -(da + L + e)); if (!slot) return null;
  const main = [clipHalf(poly, N, v), clipHalf(near, [-d[0], -d[1]], -(da - e)), clipHalf(near, d, da + L + e)].filter(Boolean);
  const on = slot.filter(p => Math.abs(N[0] * p[0] + N[1] * p[1] - v) < 1e-4), us = (on.length > 1 ? on : slot).map(p => d[0] * p[0] + d[1] * p[1] - da);
  const u0 = Math.min(...us), u1 = Math.max(...us), um = (u0 + u1) / 2, at = o => [w.a[0] + d[0] * um + N[0] * o, w.a[1] + d[1] * um + N[1] * o];
  const extras = m => {
    const top = ceilAt(...at(ht)), dr = r.drop, ry = Math.atan2(-d[1], d[0]), out = [];
    const fa = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, dr, 0.0125), dimMat(m, 0.9)), pf = at(ht + POCKET_W + 0.00625); fa.position.set(pf[0], top - dr / 2, pf[1]); fa.rotation.y = ry; out.push(fa);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0 - 0.02, 0.014, 0.024), mat('#C9CBCC', 0.35, 0.6)), pt = at(ht + POCKET_W - 0.025); tr.position.set(pt[0], top - 0.009, pt[1]); tr.rotation.y = ry; out.push(tr);
    out.forEach(o => { o.castShadow = o.receiveShadow = true; }); return out;
  };
  return { main, slot, extras };
}
const FLOORT = new Map();
function floorMat(key) {
  const base = getMat(key); if (!view.underlay) return base;
  if (!FLOORT.has(key)) { const m = base.clone(); m.transparent = true; m.opacity = 0.35; m.depthWrite = false; FLOORT.set(key, m); }
  return FLOORT.get(key);
}
function buildFloors() {
  clear(groups.floors); clear(groups.ceil);
  for (const f of FACES) {
    const r = f.room;
    const fm = new THREE.Mesh(shapeGeo(f.face.poly, () => 0, true), floorMat(r.floor)); fm.receiveShadow = true; fm.userData = { kind: 'floor', roomId: r.id }; groups.floors.add(fm);
    const cm = getMat(r.ceil), cy = (x, z) => ceilAt(x, z) - (r.drop || 0), ps = pocketSplit(f);
    const pieces = ps ? [...ps.main.map(p => [p, cy]), [ps.slot, (x, z) => ceilAt(x, z) - 0.002]] : [[f.face.poly, cy]];
    for (const [poly, yf] of pieces) { const c = new THREE.Mesh(shapeGeo(poly, yf, false), ps && poly === ps.slot ? dimMat(cm, 0.78) : cm); c.castShadow = c.receiveShadow = true; c.userData = { kind: 'ceiling', roomId: r.id }; groups.ceil.add(c); }
    if (ps) for (const o of ps.extras(cm)) { o.userData = { kind: 'ceiling', roomId: r.id }; groups.ceil.add(o); }
  }
  if (view.underlay) return;
  for (const o of OUTER) {
    const poly = offsetPoly(o.poly, o.ws, -1), geo = new THREE.ExtrudeGeometry(new THREE.Shape(poly.map(p => new THREE.Vector2(p[0], p[1]))), { depth: 0.25, bevelEnabled: false });
    geo.rotateX(Math.PI / 2); geo.translate(0, -0.006, 0);
    const m = new THREE.Mesh(geo, mat('#9c9a94', 0.9)); m.receiveShadow = true; groups.floors.add(m);
  }
}
function buildBalcony() {
  clear(groups.struct);
  const B = BALC, S = state.settings, g = groups.struct, w = B.x1 - B.x0, dp = B.z1 - B.z0, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2;
  const deck = new THREE.Mesh(shapeGeo([[B.x0, B.z0], [B.x1, B.z0], [B.x1, B.z1], [B.x0, B.z1]], () => -0.04, true), getMat(S.balconyFloor)); deck.receiveShadow = true; g.add(deck);
  bx(g, w, 0.18, dp, cx, -0.23, cz, mat('#a5a29b', 0.9));
  const steel = mat('#9da3a6', 0.45, 0.6), panel = mat('#ECEAE3', 0.8), rh = 0.95;
  const edges = [[[B.x0, B.z0], [B.x1, B.z0]], [[B.x0, B.z0], [B.x0, B.z1]], [[B.x1, B.z0], [B.x1, B.z1]]];
  for (const [a, b] of edges) {
    const L = dist(a, b), d = norm(sub(b, a)), ry = Math.atan2(-d[1], d[0]), mid = lerp2(a, b, 0.5);
    for (const [hh, y, th, m] of [[0.05, rh - 0.05, 0.05, steel], [0.73, 0.12, 0.015, panel]]) { const me = bx(g, L, hh, th, mid[0], y, mid[1], m); me.rotation.y = ry; }
    const n = Math.max(1, Math.round(L / 1.3)); for (let i = 0; i <= n; i++) { const p = lerp2(a, b, i / n); cy(g, 0.022, 0.022, rh, p[0], -0.04, p[1], steel, 10); }
  }
  for (const x of [B.x0 + 0.06, B.x1 - 0.06]) cy(g, 0.04, 0.04, 2.55, x, -0.04, B.z0 + 0.06, steel, 12);
  const soffit = new THREE.Mesh(shapeGeo([[B.x0 - 0.15, B.z0 - 0.15], [B.x1 + 0.15, B.z0 - 0.15], [B.x1 + 0.15, B.z1], [B.x0 - 0.15, B.z1]], () => 2.52, false), getMat('ceil_boards')); g.add(soffit);
  const gut = cy(g, 0.05, 0.05, w + 0.3, cx, 0, B.z0 - 0.2, mat('#6f7477', 0.4, 0.6), 12); gut.rotation.z = Math.PI / 2; gut.position.y = 2.47;
  g.traverse(m => { if (m.isMesh) { m.userData = { kind: 'balcony' }; m.castShadow = true; m.receiveShadow = true; } });
  deck.castShadow = false;
}
function roofY(x, z) {
  const S = state.settings, span = BUILDING.z1 - BUILDING.z0, t = S.lowSide === 'west' ? BUILDING.z1 - z : z - BUILDING.z0;
  return S.ceilMode === 'vaulted' ? S.ceilH + 0.35 + t * (S.ceilHigh - S.ceilH) / span : S.ceilH + 0.45 + t * 0.45 / span;
}
function buildRoof() {
  clear(groups.roof);
  const S = state.settings; if (!S.showRoof || view.mode === 'plan') return;
  const x0 = -0.45, x1 = 9.36, z0 = -2.55, z1 = 8.97, th = 0.28, mb = new MB();
  const T = (x, z) => [x, roofY(x, z), z], Bt = (x, z) => [x, roofY(x, z) - th, z];
  mb.quad(S.roofMat, T(x0, z0), T(x1, z0), T(x1, z1), T(x0, z1), [0, 1, 0], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
  mb.quad('_s', Bt(x0, z0), Bt(x1, z0), Bt(x1, z1), Bt(x0, z1), [0, -1, 0]);
  mb.quad('_f', Bt(x0, z0), Bt(x1, z0), T(x1, z0), T(x0, z0), [0, 0, -1]); mb.quad('_f', Bt(x0, z1), Bt(x1, z1), T(x1, z1), T(x0, z1), [0, 0, 1]);
  mb.quad('_f', Bt(x0, z0), Bt(x0, z1), T(x0, z1), T(x0, z0), [-1, 0, 0]); mb.quad('_f', Bt(x1, z0), Bt(x1, z1), T(x1, z1), T(x1, z0), [1, 0, 0]);
  const m = mb.mesh(k => k === '_s' ? mat('#EDEBE5', 0.9) : k === '_f' ? mat('#3b3e41', 0.8) : getMat(k));
  m.castShadow = true; m.receiveShadow = true; m.userData = { kind: 'roof' }; groups.roof.add(m);
}
// ---------- items ----------
const itemObjs = new Map();
function itemY(it) { const d = CAT[it.type]; return d?.hang ? ceilAt(it.x, it.z) - (roomAtPt(it.x, it.z)?.drop || 0) - it.h : (it.y || 0); }
function makeItemObj(it) {
  const d = CAT[it.type]; if (!d) return null;
  const o = new THREE.Group(); o.add(d.build(it));
  o.position.set(it.x, itemY(it), it.z); o.rotation.y = (it.rot || 0) * DEG;
  o.traverse(m => { if (m.isMesh) { m.userData.itemId = it.id; m.castShadow = !m.userData.ns && m.material !== GLASS; m.receiveShadow = true; } });
  o.userData.itemId = it.id; o.visible = itemShown(it); return o;
}
function buildItems() { clear(groups.items); itemObjs.clear(); for (const it of state.items) { const o = makeItemObj(it); if (o) { groups.items.add(o); itemObjs.set(it.id, o); } } }
function rebuildItem(it) {
  const old = itemObjs.get(it.id); if (old) { groups.items.remove(old); old.traverse(m => m.geometry?.dispose()); }
  const o = makeItemObj(it); if (o) { groups.items.add(o); itemObjs.set(it.id, o); } markDirty();
}
function moveItemObj(it) { const o = itemObjs.get(it.id); if (o) { o.position.set(it.x, itemY(it), it.z); o.rotation.y = (it.rot || 0) * DEG; } markDirty(); }

function rebuild(o = { all: true }) {
  const t0 = performance.now(); refreshFaces();
  let t = performance.now(); const lap = n => { PERF.push([n, Math.round(performance.now() - t)]); t = performance.now(); };
  if (o.all || o.walls) { buildWalls(); lap('walls'); buildFloors(); lap('floors'); buildRays(); }
  else if (o.floors) buildFloors();
  if (o.all || o.balcony) buildBalcony();
  if (o.all || o.roof) buildRoof();
  if (o.all || o.context) buildContext();
  if (o.all || o.items) { buildItems(); lap('items'); }
  if (o.all || o.lamps) buildLamps();
  if (typeof refreshSelection === 'function') refreshSelection();
  PERF.push(['rebuild', Math.round(performance.now() - t0)]); markDirty();
}
