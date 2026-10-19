// ---------- dialogs opened from the top bar: sunlight and photos ----------
const modal = $('#modal');
let modalReturn = null;
function openModal(title, sub, body, wire) {
  if (modal.hidden) modalReturn = document.activeElement;
  modal.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="ihead"><h3 id="modalTitle">${title}${sub ? `<small>${sub}</small>` : ''}</h3><button class="btn icon-only" id="modalClose" aria-label="Close">✕</button></div><div class="pbody" id="modalBody">${body}</div></div>`;
  modal.hidden = false;
  $('#modalClose').onclick = closeModal;
  wire?.($('#modalBody'));
  $('#modalClose').focus();
}
function closeModal() { if (modal.hidden) return; sunRO?.disconnect(); modal.hidden = true; modal.innerHTML = ''; modalReturn?.focus?.(); }
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
// while a dialog is open it keeps the keyboard: Escape closes it, Tab stays inside, the planner shortcuts are off
addEventListener('keydown', e => {
  if (modal.hidden) return;
  e.stopImmediatePropagation();
  if (!$('#lightbox').hidden) return; // the lightbox on top has already handled its keys
  if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
  if (e.key !== 'Tab') return;
  const f = $$('button, [href], [tabindex]:not([tabindex="-1"])', modal).filter(el => el.offsetParent || el.getBBox);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1], inside = modal.contains(document.activeElement);
  if (!inside || (e.shiftKey && document.activeElement === first)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}, true);

// ---------- sunlight ----------
// Direct sun on the flat in hours per month, average 2005-2020: [month, this flat, an open spot at the same place, days].
// Horizon from the 3rd floor with Kartverket's 1 m surface model (DOM1, buildings and trees included); hourly direct normal
// irradiance from PVGIS-SARAH2 for this point, an hour counted as sunny at >= 120 W/m² (WMO) while the sun stands above
// the real horizon in front of the east (balcony) or west (living-room) facade.
const SUN_MONTHS = [['Jan', 26.8, 47.3, 31], ['Feb', 61.7, 80.7, 28.25], ['Mar', 139.8, 171.7, 31], ['Apr', 182.8, 224.9, 30], ['May', 235.8, 263.9, 31], ['Jun', 251.6, 278.6, 30],
  ['Jul', 237.3, 267.4, 31], ['Aug', 191.5, 227.2, 31], ['Sep', 143.4, 179.1, 30], ['Oct', 88.9, 112.1, 31], ['Nov', 34.9, 57.5, 30], ['Dec', 19.6, 40.9, 31]];
const SUN_CHART = { H: 230, ml: 34, mr: 6, mt: 12, mb: 24, ymax: 10 };
const hrs = v => v.toFixed(1) + ' h';
const sunRows = () => SUN_MONTHS.map(([m, flat, open, days]) => ({ m, flat, open, fd: flat / days, od: open / days, share: Math.round(flat / open * 100) }));
// drawn at the box's own pixel width so the text keeps its size on a phone
function sunChart(W) {
  const C = { ...SUN_CHART, W }, pw = C.W - C.ml - C.mr, ph = C.H - C.mt - C.mb, slot = pw / 12, bw = Math.min(20, slot * 0.6), y = v => C.mt + ph * (1 - v / C.ymax);
  const bar = (x, top, r = 4) => { const y0 = y(0), h = y0 - top, rr = Math.min(r, h); return h <= 0 ? '' : `M${x},${y0}V${top + rr}Q${x},${top} ${x + rr},${top}H${x + bw - rr}Q${x + bw},${top} ${x + bw},${top + rr}V${y0}Z`; };
  let s = `<svg viewBox="0 0 ${C.W} ${C.H}" role="img" aria-label="Hours of direct sun per day by month, this flat compared with an open spot at the same place">`;
  for (let v = 0; v <= C.ymax; v += 2) s += `<line class="grid" x1="${C.ml}" x2="${C.W - C.mr}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${C.ml - 6}" y="${y(v) + 4}" text-anchor="end">${v}${v === C.ymax ? ' h' : ''}</text>`;
  sunRows().forEach((r, i) => {
    const cx = C.ml + slot * (i + 0.5), x = cx - bw / 2;
    s += `<path class="open" d="${bar(x, y(r.od))}"/><path class="flat" d="${bar(x, y(r.fd))}"/>`;
    s += `<text class="tick" x="${cx}" y="${C.H - 6}" text-anchor="middle">${r.m}</text>`;
    s += `<rect class="hit" x="${C.ml + slot * i}" y="${C.mt}" width="${slot}" height="${ph}" tabindex="0" data-i="${i}" aria-label="${r.m}: this flat ${hrs(r.fd)} a day, an open spot ${hrs(r.od)}, ${r.share} %"/>`;
  });
  return s + '</svg><div class="ctip" hidden></div>';
}
function sunlightBody() {
  const rows = sunRows(), yf = SUN_MONTHS.reduce((a, r) => a + r[1], 0), yo = SUN_MONTHS.reduce((a, r) => a + r[2], 0), jun = rows[5], dec = rows[11];
  const T = (head, body, cls = '') => `<div class="tablewrap"><table class="data ${cls}"><thead><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
  const nb = s => s.replace(/(\d) h\)/g, '$1\u00a0h)').replace(/ at /g, '\u00a0at\u00a0'); // keep a number with its unit on narrow screens
  const solstice = [['Sun up', '03:49–22:48 (19.0 h)', '09:14–15:15 (6.0 h)'], ['Highest sun', '53.5° at 13:18', '6.8° at 12:14'],
    ['East side: balcony, kitchen, dining room, bedroom 1', '04:02–12:48 (8.8 h)', '10:27–11:25 (1.0 h)'],
    ['West side: living room, bedroom 2', '13:14–20:21 (7.1 h)', '12:08–13:26, grazing (about 0.9 h)']].map(r => [r[0], nb(r[1]), nb(r[2])]);
  return `<p>A bright, through flat. It gets about <b>${Math.round(yf).toLocaleString('en-GB')} hours of direct sun a year</b>, ${Math.round(yf / yo * 100)} % of what an open spot at the same place would get: mornings on the balcony side (east), afternoons in the living room (west). From November to January the sun is too low to clear the trees and the Østmarka slope for long, as in most of Eastern Norway.</p>
    <div class="tiles"><div class="tile"><span>Direct sun a year</span><b>${Math.round(yf).toLocaleString('en-GB')} h</b><small>${Math.round(yf / yo * 100)} % of an open spot here</small></div>
      <div class="tile"><span>June, per day</span><b>${hrs(jun.fd)}</b><small>an open spot: ${hrs(jun.od)}</small></div>
      <div class="tile"><span>December, per day</span><b>${hrs(dec.fd)}</b><small>an open spot: ${hrs(dec.od)}</small></div></div>
    <div class="sec"><h4>Direct sun per day, with clouds (average 2005–2020)</h4>
      <div class="legend"><span><i style="background:var(--sun-flat)"></i>This flat</span><span><i style="background:var(--sun-open)"></i>An open spot at the same place</span></div>
      <div class="chart"></div></div>
    <div class="sec"><h4>On the longest and shortest day, clear sky</h4>
      ${T(['', '21 June', '21 December'], solstice.map(r => `<tr><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n">${r[2]}</td></tr>`).join(''))}
      <p class="note">Norwegian time (summer time in June). In June the sun leaves the living room about 20:20, though it sets at 22:48.</p></div>
    <div class="sec"><h4>Month by month</h4>
      ${T(['Month', 'Hours in the month', 'Hours a day', 'Share of an open spot'], rows.map(r => `<tr><td>${r.m}</td><td class="n">${Math.round(r.flat)}</td><td class="n">${r.fd.toFixed(1)}</td><td class="n">${r.share} %</td></tr>`).join('') + `<tr class="sum"><td>Year</td><td class="n">${Math.round(yf).toLocaleString('en-GB')}</td><td class="n">${(yf / 365.25).toFixed(1)}</td><td class="n">${Math.round(yf / yo * 100)} %</td></tr>`)}
      <p class="note">From year to year: June 192–334 hours (2012 and 2018), December 8–31 hours (2018 and 2014).</p></div>
    <div class="sec"><h4>What limits the sun</h4><ul>
      <li><b>West:</b> the Østmarka slope stands 8–15° above the horizon from south-west to west, and trees 10–20 m from the living-room window up to about 20°.</li>
      <li><b>East:</b> almost open over Øyeren (0–1°). A group of trees about 27 m south-south-east takes the December sun on the balcony until about 10:30.</li>
      <li><b>Clouds:</b> in June about half of the possible hours are sunny, in December 20–30 %.</li>
      <li><b>Covered balcony:</b> high summer sun (above about 35–40°, from about 9:30) reaches only its outer part.</li></ul></div>
    <div class="sec"><h4>How it was worked out</h4><p class="note">The horizon is measured from the 3rd floor, about 1.2 m above the floor of the southern flat at 11C, in Kartverket's 1 m surface model (DOM1), which includes the neighbouring buildings and trees; terrain beyond 6 km comes from PVGIS. The sun hours use hourly direct sunlight for this point from PVGIS-SARAH2 (satellite, 2005–2020): an hour counts as sunny at 120 W/m² or more (the WMO definition of sunshine), and only while the sun stands above the real horizon in front of the window. The trees are as scanned, in leaf, so leafless trees let a little more winter sun through, and hourly data make the hours an estimate. Sources: <a href="https://ws.geonorge.no/hoydedata/v1/" target="_blank" rel="noopener">Kartverket elevation data</a>, <a href="https://re.jrc.ec.europa.eu/pvg_tools/en/" target="_blank" rel="noopener">PVGIS</a>.</p></div>`;
}
let sunRO = null;
function wireSun(body) {
  const box = $('.chart', body), rows = sunRows();
  let W = 0;
  const draw = () => {
    const w = Math.round(box.clientWidth); if (!w || w === W) return; W = w;
    box.innerHTML = sunChart(W);
    const svg = $('svg', box), tip = $('.ctip', box), C = { ...SUN_CHART, W };
    const show = el => {
      const r = rows[+el.dataset.i], sr = svg.getBoundingClientRect(), br = box.getBoundingClientRect(), k = sr.width / C.W;
      tip.innerHTML = `<b>${r.m}</b><br>This flat ${hrs(r.fd)} a day<br>An open spot ${hrs(r.od)} · ${r.share} %`; tip.hidden = false;
      const cx = C.ml + (C.W - C.ml - C.mr) / 12 * (+el.dataset.i + 0.5), half = tip.offsetWidth / 2;
      tip.style.left = clamp(sr.left - br.left + cx * k, half + 2, br.width - half - 2) + 'px';
      tip.style.top = (sr.top - br.top + (C.mt + (C.H - C.mt - C.mb) * (1 - r.od / C.ymax)) * k) + 'px';
    };
    $$('.hit', box).forEach(el => {
      el.addEventListener('pointerenter', () => show(el)); el.addEventListener('focus', () => show(el));
      el.addEventListener('pointerleave', () => { tip.hidden = true; }); el.addEventListener('blur', () => { tip.hidden = true; });
    });
  };
  draw(); sunRO?.disconnect(); sunRO = new ResizeObserver(draw); sunRO.observe(box);
}

// ---------- photos: the listing photos (actual) and the renovation renders (generated) ----------
let galleryFilter = 'all';
function galleryLists() {
  const actual = photosOk ? PHOTOS.map(p => ({ kind: 'actual', src: `${PHOTO_BASE}${p[0]}.jpg`, room: p[1], cap: p[2] })) : [];
  const generated = RENDERS.map(p => ({ kind: 'generated', src: `${RENDER_BASE}${p[0]}.webp`, room: p[1], cap: p[2] }));
  return { actual, generated, all: [...actual, ...generated] };
}
const KIND = { actual: 'Actual', generated: 'Generated' };
function photosBody() {
  const L = galleryLists(), list = L[galleryFilter];
  let h = `<div class="chips" role="group" aria-label="Show">${[['all', 'All'], ['actual', 'Actual'], ['generated', 'Generated']].map(([k, l]) => `<button data-gf="${k}" class="${k === galleryFilter ? 'on' : ''}" aria-pressed="${k === galleryFilter}">${l} (${L[k].length})</button>`).join('')}</div>`;
  if (galleryFilter !== 'generated' && !photosOk) h += `<p class="note box">The listing photos are not published with the planner, since they belong to the broker's photographer. They show here when the planner runs from a copy with the photos in its listing folder, and they can be seen in the <a href="https://www.finn.no/realestate/homes/ad.html?finnkode=476645768" target="_blank" rel="noopener">FINN listing</a>.</p>`;
  if (galleryFilter !== 'actual') h += `<p class="note">Generated images are renovation mood renders, not the flat as it is today.</p>`;
  if (list.length) h += `<div class="gallery">${list.map((p, i) => `<button data-gi="${i}" aria-label="${KIND[p.kind]}: ${esc(p.room)}, ${esc(p.cap)}"><span class="thumb"><img src="${p.src}" alt="" loading="lazy"><span class="kind">${KIND[p.kind]}</span></span><small><b>${esc(p.room)}</b> · ${esc(p.cap)}</small></button>`).join('')}</div>`;
  return h;
}
function wirePhotos(body) {
  const list = galleryLists()[galleryFilter].map(p => ({ src: p.src, alt: p.cap, label: `${KIND[p.kind]} · ${p.room} · ${p.cap}` }));
  $$('[data-gf]', body).forEach(b => b.onclick = () => { galleryFilter = b.dataset.gf; body.innerHTML = photosBody(); wirePhotos(body); $(`[data-gf="${galleryFilter}"]`, body).focus(); });
  $$('[data-gi]', body).forEach(b => b.onclick = () => openPhoto(+b.dataset.gi, list));
}

$('#sunInfoBtn').onclick = () => openModal('Sunlight', 'Direct sun on the flat, 3rd floor', sunlightBody(), wireSun);
$('#photosBtn').onclick = () => openModal('Photos', 'The flat as listed, and generated images', photosBody(), wirePhotos);
