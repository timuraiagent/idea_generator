// ===== вид: экран, атлас, поле, свет, анимации, частицы =====
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let VW = CONFIG.VW, VH = 700, SC = 1, DPR = 1, now = 0, dtMs = 16;
const PAL = { bg0: '#060812', bg1: '#0f1330', ink: '#11142a', cream: '#f1d9a0', warm: '#ffb347', warm2: '#ffd98a', hot: '#ff6a2a', core: '#fff3c4', red: '#ff4d5e', text: '#eef1ff', dim: '#8d96bf', panel: '#161b38', panel2: '#232a52', line: '#39426f', teal: '#35c9b3', dark: [7, 9, 26] };
const FONT = 'ui-rounded, "SF Pro Rounded", "Nunito", "Segoe UI", system-ui, -apple-system, sans-serif';
const font = (px, w) => `${w || 700} ${px}px ${FONT}`;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, p) => a + (b - a) * p, easeOut = p => 1 - Math.pow(1 - p, 3), easeInOut = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

// ---------- атлас спрайтов (assets.svg встроен сборкой) ----------
const SPR = { floor_a: [0, 0], floor_b: [1, 0], floor_c: [2, 0], wall_top: [3, 0], wall_front: [4, 0], pit: [5, 0], stone: [6, 0], crack: [7, 0], water: [0, 1], oil: [1, 1], ash: [2, 1], wood: [3, 1], spool: [4, 1], lamp_off: [5, 1], lamp_on: [6, 1], hand: [7, 1],
  door_closed: [0, 2], door_open: [1, 2], hero_a: [2, 2], hero_b: [3, 2], guard_sleep: [4, 2], guard_awake: [5, 2] };
const atlas = { img: null, cv: null, k: 0 };
function loadAtlas() { const svg = FUSE_ATLAS.replace('width="1024"', 'width="2048"').replace('height="384"', 'height="768"'), img = new Image();
  img.onload = () => { atlas.img = img; atlas.k = 0; rasterAtlas(); V.baseDirty = true; }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
function rasterAtlas() { if (!atlas.img) return; const k = clamp(Math.ceil(F.cell * SC * DPR * 1.3 / 128 * 4) / 4, 1, 3); if (k === atlas.k) return;
  const c = atlas.cv || (atlas.cv = document.createElement('canvas')); c.width = 1024 * k; c.height = 384 * k; c.getContext('2d').drawImage(atlas.img, 0, 0, c.width, c.height); atlas.k = k; V.baseDirty = true; }
// спрайт целиком в прямоугольник; part — доля высоты спрайта сверху (для передней грани стены)
function spr(c, name, x, y, w, h, flip, part) { const s = SPR[name]; if (!atlas.cv || !s) return false; const k = atlas.k * 128, sh = k * (part || 1);
  if (flip) { c.save(); c.translate(x + w, y); c.scale(-1, 1); c.drawImage(atlas.cv, s[0] * k + 0.5, s[1] * k + 0.5, k - 1, sh - 1, 0, 0, w, h); c.restore(); }
  else c.drawImage(atlas.cv, s[0] * k + 0.5, s[1] * k + 0.5, k - 1, sh - 1, x, y, w, h); return true; }
// предмет, стоящий на клетке: низ спрайта (y = 120 из 128) на нижнем краю клетки
function prop(c, name, cxp, bottom, size, flip, sx, sy) { const w = size * (sx || 1), h = size * (sy || 1); return spr(c, name, cxp - w / 2, bottom - h * (120 / 128), w, h, flip); }

// ---------- экран и поле ----------
const F = { cell: 48, x: 0, y: 0 };
const V = { base: null, baseDirty: true, lc: document.createElement('canvas'), wc: document.createElement('canvas'), lightI: null, shown: null,
  hero: { x: 0, y: 0, fx: 0, fy: 0, t0: -1e9, face: 1, hop: 0 }, flame: { x: 0, y: 0, fx: 0, fy: 0, t0: -1e9, wet: false },
  falls: new Map(), ash: new Set(), rings: [], parts: [], timers: [], failUntil: 0, failInfo: null, bubble: null, idea: null, move: null, winAt: 0, shakeUntil: 0, lampOn: new Map(), guardPop: new Map(), nPop: 0, lastStepAt: 0 };
function resize() { const w = window.innerWidth, h = window.innerHeight; SC = Math.min(w / CONFIG.VW, h / CONFIG.VHmin); VW = CONFIG.VW; VH = Math.min(h / SC, CONFIG.VHmax); DPR = Math.min(window.devicePixelRatio || 1, 3);
  cv.style.width = Math.round(VW * SC) + 'px'; cv.style.height = Math.round(VH * SC) + 'px'; cv.width = Math.round(VW * SC * DPR); cv.height = Math.round(VH * SC * DPR); layout(); }
function layout() { const L = M.L; if (!L) return; const lv = LEVELS[M.idx], top = CONFIG.top + 44, bot = VH - CONFIG.bottom - (lv.hint ? 46 : 16);
  F.cell = clamp(Math.floor(Math.min((VW - 16) / (L.W + 0.7), (bot - top) / (L.H + 0.9))), CONFIG.cellMin, CONFIG.cellMax);
  F.x = Math.round((VW - L.W * F.cell) / 2); F.y = Math.round(top + (bot - top - L.H * F.cell) / 2 + F.cell * 0.12); rasterAtlas(); V.baseDirty = true; }
const cellX = c => F.x + (c % M.L.W + 0.5) * F.cell, cellY = c => F.y + (Math.floor(c / M.L.W) + 0.5) * F.cell;
function cellAt(px, py) { const L = M.L, x = Math.floor((px - F.x) / F.cell), y = Math.floor((py - F.y) / F.cell); return (x < 0 || y < 0 || x >= L.W || y >= L.H) ? -1 : y * L.W + x; }
const isWall = (x, y) => { const L = M.L; return x < 0 || y < 0 || x >= L.W || y >= L.H || L.type[y * L.W + x] === C.WALL; };

// неподвижный слой: пол, верх стен, передние грани, тени, оттенок мира, затухание края
function buildBase() { const L = M.L, px = Math.round(F.cell * SC * DPR), b = V.base || (V.base = document.createElement('canvas')); b.width = (L.W + 2) * px; b.height = (L.H + 2) * px; const c = b.getContext('2d'), W = b.width, H = b.height;
  for (let y = -1; y <= L.H; y++) for (let x = -1; x <= L.W; x++) { const dx = (x + 1) * px, dy = (y + 1) * px;
    if (isWall(x, y)) { if (!spr(c, 'wall_top', dx, dy, px, px)) { c.fillStyle = '#232a47'; c.fillRect(dx, dy, px, px); } }
    else if (!spr(c, ['floor_a', 'floor_b', 'floor_c'][(x * 7 + y * 13 + x * y * 3) % 3], dx, dy, px, px)) { c.fillStyle = '#3b4563'; c.fillRect(dx, dy, px, px); c.strokeStyle = '#2c3550'; c.strokeRect(dx + 0.5, dy + 0.5, px - 1, px - 1); } }
  for (let y = -1; y < L.H; y++) for (let x = 0; x < L.W; x++) if (isWall(x, y) && !isWall(x, y + 1)) { const dx = (x + 1) * px, dy = (y + 1) * px, fh = Math.round(px * 0.46);      // передняя грань и тень под ней
    if (!spr(c, 'wall_front', dx, dy + px - fh, px, fh, false, 56 / 128)) { c.fillStyle = '#2a3252'; c.fillRect(dx, dy + px - fh, px, fh); }
    const g = c.createLinearGradient(0, dy + px, 0, dy + px + px * 0.42); g.addColorStop(0, 'rgba(4,5,16,0.55)'); g.addColorStop(1, 'rgba(4,5,16,0)'); c.fillStyle = g; c.fillRect(dx, dy + px, px, px * 0.42); }
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (!isWall(x, y) && isWall(x - 1, y)) { const dx = (x + 1) * px, dy = (y + 1) * px, g = c.createLinearGradient(dx, 0, dx + px * 0.26, 0);              // тень от стены слева
    g.addColorStop(0, 'rgba(4,5,16,0.34)'); g.addColorStop(1, 'rgba(4,5,16,0)'); c.fillStyle = g; c.fillRect(dx, dy, px * 0.26, px); }
  c.globalCompositeOperation = 'multiply'; c.fillStyle = WORLDS[LEVELS[M.idx].w - 1].tint; c.fillRect(0, 0, W, H);                                                               // оттенок мира: перекрашен подвал, предметы прежние
  c.globalCompositeOperation = 'destination-out';                                                                                                                                // подвал уходит во тьму за краем поля
  const fade = (x0, y0, x1, y1, rx, ry, rw, rh) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(rx, ry, rw, rh); };
  const e = px * 0.72; fade(0, 0, e, 0, 0, 0, e, H); fade(W, 0, W - e, 0, W - e, 0, e, H); fade(0, 0, 0, e, 0, 0, W, e); fade(0, H, 0, H - e, 0, H - e, W, e);
  c.globalCompositeOperation = 'source-over'; V.baseDirty = false; }

// ---------- события модели → анимации ----------
const after = (ms, fn) => V.timers.push({ at: now + ms, fn });
function flushTimers() { const ts = V.timers; V.timers = []; for (const t of ts) t.fn(); }
function part(o) { V.parts.push(Object.assign({ age: 0, life: 600, vx: 0, vy: 0, g: 0, size: 3, col: PAL.warm, kind: 'dot', rot: 0, vr: 0 }, o)); if (V.parts.length > 420) V.parts.shift(); }
function burst(x, y, n, o) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (o.speed || 60) * (0.4 + Math.random() * 0.8); part(Object.assign({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 0) }, o, { life: (o.life || 500) * (0.6 + Math.random() * 0.7), size: (o.size || 3) * (0.6 + Math.random() * 0.8) })); } }
function snap() { const L = M.L, S = M.S; V.shown = S; V.timers = []; V.falls.clear(); V.rings = []; V.failUntil = 0; V.failInfo = null; V.move = null; V.winAt = 0;
  V.hero.x = V.hero.fx = cellX(pcell(S)); V.hero.y = V.hero.fy = cellY(pcell(S)); V.hero.t0 = -1e9; V.flame.x = V.flame.fx = cellX(S.tail[0]); V.flame.y = V.flame.fy = cellY(S.tail[0]); V.flame.t0 = -1e9;
  V.ash.clear(); for (let i = 0; i < L.n; i++) if (L.init[i] === C.WOOD && S.d[i] === 0) V.ash.add(i);
  V.lampOn.clear(); V.guardPop.clear(); if (!V.lightI || V.lightI.length !== L.n) V.lightI = new Float32Array(L.n); }
function moveTo(S, cell) { const h = V.hero, f = V.flame; h.fx = h.x; h.fy = h.y; h.x = cellX(cell); h.y = cellY(cell); h.t0 = now; if (h.x !== h.fx) h.face = h.x > h.fx ? 1 : -1;
  const fc = S.tail[0], nx = cellX(fc), ny = cellY(fc); if (nx !== f.x || ny !== f.y) { f.fx = f.x; f.fy = f.y; f.x = nx; f.y = ny; f.t0 = now + 30; } }
// что изменилось между двумя состояниями — в анимации и звуки, цепочкой
function effects(from, to) { const L = M.L, K = CONFIG.chainMs; let fell = false, oil = false, wood = false, lamp = false, wake = false, down = false;
  for (let i = 0; i < L.n; i++) { const a = from.d[i], b = to.d[i]; if (a === b) continue; const x = cellX(i), y = cellY(i);
    if ((b & C.PIT) && !(a & C.PIT)) { if (a & C.BURN) after(K, () => burst(x, y, 7, { kind: 'smoke', col: '#59607e', speed: 22, up: 26, life: 800, size: 7 })); else { fell = true; after(K, () => { V.falls.set(i, now); burst(x, y + F.cell * 0.2, 9, { kind: 'smoke', col: '#6d769a', speed: 46, life: 520, size: 5 }); }); } }
    if (b & C.BURN) { oil = true; after(K * 1.6, () => { V.rings.push({ x, y, t0: now, col: PAL.warm, r: F.cell * 0.8 }); burst(x, y, 10, { kind: 'ember', speed: 70, up: 50, life: 620, size: 3 }); }); }
    if (b & C.BURNW) { wood = true; after(K * 1.6, () => { V.rings.push({ x, y, t0: now, col: PAL.warm, r: F.cell * 0.8 }); burst(x, y - F.cell * 0.2, 12, { kind: 'ember', speed: 80, up: 60, life: 700, size: 3 }); }); }
    if ((a & C.BURNW) && b === 0) { V.ash.add(i); after(K, () => burst(x, y, 8, { kind: 'smoke', col: '#59607e', speed: 24, up: 30, life: 800, size: 7 })); } }
  for (let k = 0; k < L.lamps.length; k++) if ((to.lampLit >> k & 1) && !(from.lampLit >> k & 1)) { lamp = true; const c = L.lamps[k], x = cellX(c), y = cellY(c) - F.cell * 0.25;
    after(K * 2, () => { V.lampOn.set(c, now); V.rings.push({ x, y, t0: now, col: PAL.warm2, r: F.cell * 2.3, dur: 520 }); burst(x, y, 12, { kind: 'ember', col: PAL.warm2, speed: 90, life: 520, size: 2.6 }); }); }
  for (let k = 0; k < L.guards.length; k++) { const c = L.guards[k], x = cellX(c), y = cellY(c);
    if ((from.guardAlive >> k & 1) && !(to.guardAlive >> k & 1)) { down = true; after(K * 1.6, () => burst(x, y - F.cell * 0.2, 16, { kind: 'smoke', col: '#3a3f58', speed: 50, up: 40, life: 900, size: 8 })); }
    else if ((to.guardAlive >> k & 1) && to.lit[c] && !from.lit[c]) { wake = true; after(K * 2.6, () => { V.guardPop.set(c, now); part({ kind: 'bang', x, y: y - F.cell * 0.85, vy: -14, life: 900, size: F.cell * 0.44, col: PAL.red }); }); } }
  if (from.lit[L.door] !== to.lit[L.door] && !to.won) { const x = cellX(L.door), y = cellY(L.door); if (to.lit[L.door]) after(K * 3, () => { V.rings.push({ x, y, t0: now, col: PAL.core, r: F.cell * 1.5, dur: 600 }); burst(x, y - F.cell * 0.2, 10, { kind: 'star', col: PAL.core, speed: 60, life: 700, size: 3 }); SND.play('door'); }); else SND.play('doorShut', K * 3); }
  if (to.spools !== from.spools) { const c = pcell(to); V.nPop = now; burst(cellX(c), cellY(c), 10, { kind: 'star', col: PAL.cream, speed: 70, life: 600, size: 3 }); SND.play('spool', 60); }
  const wet = L.type[to.tail[0]] === C.WATER; if (wet && !V.flame.wet) { SND.play('steam', K); after(K, () => burst(V.flame.x, V.flame.y, 8, { kind: 'smoke', col: '#aab4d8', speed: 26, up: 40, life: 700, size: 6 })); } V.flame.wet = wet;
  if (fell) SND.play('fall', K); if (oil) SND.play('oil', K * 1.6); if (wood) SND.play('wood', K * 1.6); if (lamp) SND.play('lamp', K * 2); if (down) SND.play('guardDown', K * 1.6); if (wake) SND.play('wake', K * 2.6); }
function onModel(type, d) { const L = M.L;
  if (type === 'load') { layout(); snap(); V.flame.wet = L.type[M.S.tail[0]] === C.WATER; V.idea = null; V.bubble = null; V.lightI.fill(0); for (let i = 0; i < L.n; i++) V.lightI[i] = M.S.lit[i]; }
  else if (type === 'undo' || type === 'restart') { snap(); V.flame.wet = L.type[M.S.tail[0]] === C.WATER; if (type === 'restart') V.idea = null; SND.play('undo'); }
  else if (type === 'step') { flushTimers(); V.shown = d.to; V.move = null; V.bubble = null; moveTo(d.to, d.cell); V.lastStepAt = now; SND.play('step'); if (d.to.tail[0] !== d.from.tail[0]) SND.play('hiss'); if (d.to.won) V.winAt = now; else effects(d.from, d.to); }
  else if (type === 'fail') { flushTimers(); V.shown = d.to; V.move = null; moveTo(d.to, d.cell); SND.play('step'); effects(d.from, d.to); V.failInfo = d; V.failUntil = now + CONFIG.failMs; V.shakeUntil = now + 260; SND.play('fail', 140);
    const x = cellX(d.cell), y = cellY(d.cell); after(150, () => { if (d.reason === 'burned') burst(x, y, 18, { kind: 'ember', speed: 110, up: 60, life: 600, size: 3.4 }); else burst(x, y, 10, { kind: 'smoke', col: d.reason === 'seen' ? '#ff6d7c' : '#6d769a', speed: 50, life: 520, size: 5 }); });
    after(CONFIG.failMs, () => { snap(); V.flame.wet = L.type[M.S.tail[0]] === C.WATER; }); }
  else if (type === 'illegal') { SND.play('nope'); if (d.closed) V.bubble = { cell: d.cell, text: T('closed'), until: now + 1700 }; else V.hero.hop = now; }
  else if (type === 'hint') { if (d.tier === 1) { V.idea = { story: d.story, t0: now }; SND.play('hint'); } else if (d.tier === 2) { V.move = { cell: d.cell, t0: now, rewound: d.rewound }; if (d.rewound) V.bubble = { cell: pcell(M.S), text: T('dead'), until: now + 1900 }; SND.play('hint'); } else { V.bubble = { cell: pcell(M.S), text: T('nohint'), until: now + 1700 }; } } }
M.listeners.push(onModel);

// ---------- отрисовка поля ----------
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function glow(x, y, r, col, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.45, `rgba(${col},${a * 0.38})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
function flameShape(x, y, s, phase, u) { const t = now / 1000, w = (u || F.cell) * 0.2 * s, h = (u || F.cell) * 0.56 * s;
  const lay = (col, k, ph) => { const sway = Math.sin(t * 8.5 + phase + ph) * w * 0.34 * k, hh = h * k * (1 + Math.sin(t * 15 + phase * 1.7 + ph) * 0.09), ww = w * k; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - ww, y);
    ctx.bezierCurveTo(x - ww * 1.25, y - hh * 0.45, x - ww * 0.2 + sway, y - hh * 0.7, x + sway, y - hh); ctx.bezierCurveTo(x + ww * 0.3 + sway * 0.4, y - hh * 0.66, x + ww * 1.25, y - hh * 0.45, x + ww, y); ctx.bezierCurveTo(x + ww * 0.8, y + ww * 0.75, x - ww * 0.8, y + ww * 0.75, x - ww, y); ctx.fill(); };
  lay(PAL.hot, 1, 0); lay('#ffab36', 0.74, 1.3); lay(PAL.core, 0.42, 2.1); }
function drawField() { const L = M.L, S = V.shown, cs = F.cell, lit = S.lit, t = now / 1000; if (V.baseDirty || !V.base) buildBase();
  let ox = 0, oy = 0; if (now < V.shakeUntil) { const p = (V.shakeUntil - now) / 260; ox = Math.sin(now * 0.09) * 4 * p; oy = Math.cos(now * 0.11) * 3 * p; }
  ctx.save(); ctx.translate(ox, oy);
  ctx.drawImage(V.base, F.x - cs, F.y - cs, (L.W + 2) * cs, (L.H + 2) * cs);
  // свет плавно догоняет логику
  const LI = V.lightI, kf = 1 - Math.exp(-dtMs / 90); for (let i = 0; i < L.n; i++) LI[i] += (lit[i] - LI[i]) * kf;
  const flameCell = S.tail[0], N = C.fuseLen(L, S.spools), willFall = !S.over && S.tail.length === N + 1 && L.type[flameCell] === C.FLOOR;
  // пол: провалы, камень, вода, масло, зола, трещина
  for (let i = 0; i < L.n; i++) { const ty = L.type[i]; if (ty === C.WALL) continue; const x = F.x + (i % L.W) * cs, y = F.y + Math.floor(i / L.W) * cs, d = S.d[i];
    if (d & C.PIT) { spr(ctx, 'pit', x, y, cs, cs); const f0 = V.falls.get(i); if (f0 !== undefined) { const p = (now - f0) / 340; if (p >= 1) V.falls.delete(i); else { ctx.save(); ctx.globalAlpha = 1 - p; ctx.translate(x + cs / 2, y + cs / 2 + p * cs * 0.18); ctx.rotate(p * 0.5); const s2 = cs * (1 - p * 0.85); spr(ctx, 'floor_a', -s2 / 2, -s2 / 2, s2, s2); ctx.restore(); } } continue; }
    if (ty === C.STONE) spr(ctx, 'stone', x + cs * 0.04, y + cs * 0.04, cs * 0.92, cs * 0.92);
    else if (ty === C.WATER) { ctx.globalAlpha = 0.9 + Math.sin(t * 2 + i) * 0.1; spr(ctx, 'water', x + cs * 0.02, y + cs * 0.04, cs * 0.96, cs * 0.96); ctx.globalAlpha = 1; }
    if (d & (C.OIL | C.BURN)) spr(ctx, 'oil', x, y, cs, cs);
    if (V.ash.has(i)) spr(ctx, 'ash', x, y, cs, cs);
    if (i === flameCell && willFall) { ctx.globalAlpha = 0.75 + Math.sin(t * 7) * 0.25; spr(ctx, 'crack', x, y, cs, cs); ctx.globalAlpha = 1; } }
  // предметы по рядам сверху вниз
  for (let i = 0; i < L.n; i++) { const ty = L.type[i], x = cellX(i), yb = F.y + (Math.floor(i / L.W) + 1) * cs, d = S.d[i];
    if (ty === C.LAMP) { const on = S.lampLit >> L.lampAt[i] & 1, t0 = V.lampOn.get(i), pop = t0 !== undefined ? clamp((now - t0) / 260, 0, 1) : 1, s = 1 + (on ? Math.sin(pop * Math.PI) * 0.16 : 0); prop(ctx, on && (t0 === undefined || now >= t0) ? 'lamp_on' : 'lamp_off', x, yb, cs * 1.08 * s); }
    else if (ty === C.DOOR) prop(ctx, lit[i] || S.won ? 'door_open' : 'door_closed', x, yb + cs * 0.02, cs * 1.12);
    if (d & (C.WOOD | C.BURNW)) prop(ctx, 'wood', x, yb + cs * 0.02, cs * 1.04);
    const sp = L.spoolAt[i]; if (sp >= 0 && !(S.spools >> sp & 1)) { const bob = Math.sin(t * 2.4 + i) * cs * 0.03; prop(ctx, 'spool', x, yb - cs * 0.1 + bob, cs * 0.8); }
    const g = L.guardAt[i]; if (g >= 0 && (S.guardAlive >> g & 1)) { const awake = lit[i], t0 = V.guardPop.get(i), pop = t0 !== undefined ? clamp((now - t0) / 300, 0, 1) : 1, s = 1 + Math.sin(pop * Math.PI) * 0.2, br = awake ? 1 : 1 + Math.sin(t * 1.6 + i) * 0.015;
      prop(ctx, awake && (t0 === undefined || now >= t0) ? 'guard_awake' : 'guard_sleep', x, yb, cs * 1.1 * s, false, 1, br); } }
  // тьма с мягкими пятнами света (карта света мелкая, растягивается со сглаживанием) и тёплый тон на свету
  const q = 4, lc = V.lc, wc = V.wc, lw = (L.W + 2) * q, lh = (L.H + 2) * q; if (lc.width !== lw || lc.height !== lh) { lc.width = wc.width = lw; lc.height = wc.height = lh; }
  const l = lc.getContext('2d'), w = wc.getContext('2d'); l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, lw, lh); l.fillStyle = `rgba(${PAL.dark},${CONFIG.dark})`; l.fillRect(0, 0, lw, lh); l.globalCompositeOperation = 'destination-out'; w.clearRect(0, 0, lw, lh);
  const flick = 0.985 + Math.sin(t * 11) * 0.015;
  for (let i = 0; i < L.n; i++) { const x = i % L.W, y = Math.floor(i / L.W); let I = LI[i];
    if (L.type[i] === C.WALL) { let m = 0; for (const b of L.adj[i]) if (LI[b] > m) m = LI[b]; I = m * 0.34; const below = y + 1 < L.H ? LI[i + L.W] : 0; if (below > 0.02) { l.fillStyle = `rgba(0,0,0,${below * 0.72})`; l.fillRect((x + 1) * q, (y + 1) * q + q / 2, q, q / 2); } }
    if (I > 0.01) { l.fillStyle = `rgba(0,0,0,${I * flick})`; l.fillRect((x + 1) * q, (y + 1) * q, q, q); w.fillStyle = `rgba(255,170,80,${I * 0.5})`; w.fillRect((x + 1) * q, (y + 1) * q, q, q); } }
  ctx.imageSmoothingEnabled = true; ctx.drawImage(lc, F.x - cs, F.y - cs, (L.W + 2) * cs, (L.H + 2) * cs);
  ctx.globalCompositeOperation = 'soft-light'; ctx.drawImage(wc, F.x - cs, F.y - cs, (L.W + 2) * cs, (L.H + 2) * cs); ctx.globalCompositeOperation = 'source-over';
  // пятна неспящих стражей: «здесь тебя видят»
  for (let g = 0; g < L.guards.length; g++) if (S.guardAlive >> g & 1) { const p = C.patchOf(L, lit, g); if (!p) continue; const inP = new Set(p), a = 0.5 + Math.sin(t * 5) * 0.2; ctx.fillStyle = `rgba(255,60,84,${0.1 + a * 0.06})`; ctx.strokeStyle = `rgba(255,77,94,${0.55 + a * 0.4})`; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (const c of p) { const x = F.x + (c % L.W) * cs, y = F.y + Math.floor(c / L.W) * cs, cx0 = c % L.W, cy0 = Math.floor(c / L.W); ctx.fillRect(x, y, cs, cs); ctx.beginPath();
      if (cy0 === 0 || !inP.has(c - L.W)) { ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + cs - 2, y + 2); } if (cy0 === L.H - 1 || !inP.has(c + L.W)) { ctx.moveTo(x + 2, y + cs - 2); ctx.lineTo(x + cs - 2, y + cs - 2); }
      if (cx0 === 0 || !inP.has(c - 1)) { ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 2, y + cs - 2); } if (cx0 === L.W - 1 || !inP.has(c + 1)) { ctx.moveTo(x + cs - 2, y + 2); ctx.lineTo(x + cs - 2, y + cs - 2); } ctx.stroke(); } }
  // свечение: огонёк, горящие клетки, лампы, открытая дверь
  const hp = clamp((now - V.hero.t0) / CONFIG.stepMs, 0, 1), fp = clamp((now - V.flame.t0) / (CONFIG.stepMs * 1.15), 0, 1), fx = lerp(V.flame.fx, V.flame.x, easeInOut(fp)), fy = lerp(V.flame.fy, V.flame.y, easeInOut(fp));
  const hx = lerp(V.hero.fx, V.hero.x, easeOut(hp)), hy = lerp(V.hero.fy, V.hero.y, easeOut(hp)) - Math.sin(hp * Math.PI) * cs * 0.12, wet = L.type[flameCell] === C.WATER && fp >= 0.6;
  ctx.globalCompositeOperation = 'lighter';
  if (!wet) glow(fx, fy - cs * 0.1, cs * 1.55 * flick, '255,150,60', 0.34);
  for (let i = 0; i < L.n; i++) { if (S.d[i] & C.FIRE) glow(cellX(i), cellY(i), cs * 1.5 * flick, '255,140,50', 0.36);
    if (L.type[i] === C.LAMP && (S.lampLit >> L.lampAt[i] & 1) && (V.lampOn.get(i) === undefined || now >= V.lampOn.get(i))) { glow(cellX(i), cellY(i) - cs * 0.28, cs * 1.0, '255,200,110', 0.42); glow(cellX(i), cellY(i) - cs * 0.2, cs * 2.5, '255,180,90', 0.1); } }
  if (lit[L.door] || S.won) glow(cellX(L.door), cellY(L.door) - cs * 0.1, cs * (1.25 + Math.sin(t * 3) * 0.08), '255,225,150', 0.4);
  for (const r of V.rings) { const p = (now - r.t0) / (r.dur || 420); if (p >= 0 && p < 1) { ctx.strokeStyle = r.col; ctx.globalAlpha = (1 - p) * 0.8; ctx.lineWidth = 4 * (1 - p) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * easeOut(p), 0, Math.PI * 2); ctx.stroke(); } } ctx.globalAlpha = 1; V.rings = V.rings.filter(r => now - r.t0 < (r.dur || 420));
  ctx.globalCompositeOperation = 'source-over';
  // шнур: от огонька через клетки следа к герою; узел на каждой клетке — по узлам видно N
  const pts = [[fx, fy + cs * 0.14]]; for (let k = 1; k < S.tail.length - 1; k++) pts.push([cellX(S.tail[k]), cellY(S.tail[k]) + cs * 0.14]); if (S.tail.length > 1) pts.push([hx, hy + cs * 0.2 + Math.sin(hp * Math.PI) * cs * 0.12]);
  if (pts.length > 1 && !S.won) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; const line = (col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.stroke(); };
    line(PAL.ink, cs * 0.15); line(PAL.cream, cs * 0.075);
    const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[1][0], pts[1][1]); g.addColorStop(0, PAL.hot); g.addColorStop(1, 'rgba(255,170,70,0)'); ctx.strokeStyle = g; ctx.lineWidth = cs * 0.075; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke();
    for (let k = 1; k < pts.length - 1; k++) { ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(pts[k][0], pts[k][1], cs * 0.1, 0, 7); ctx.fill(); ctx.fillStyle = PAL.cream; ctx.beginPath(); ctx.arc(pts[k][0], pts[k][1], cs * 0.062, 0, 7); ctx.fill(); } }
  // огонь на клетках и сам огонёк
  for (let i = 0; i < L.n; i++) if (S.d[i] & C.FIRE) { const x = cellX(i), y = cellY(i) + cs * 0.22; flameShape(x - cs * 0.22, y, 0.8, i); flameShape(x + cs * 0.2, y - cs * 0.04, 0.9, i + 2); flameShape(x, y + cs * 0.06, 1.15, i + 4); if (Math.random() < 0.3) part({ kind: 'ember', x: x + (Math.random() - 0.5) * cs * 0.6, y: y - cs * 0.3, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 40, life: 700, size: 2.4 }); }
  if (!S.won) { if (wet) { ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(fx, fy + cs * 0.12, cs * 0.12, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(214,96,52,${0.75 + Math.sin(t * 6) * 0.2})`; ctx.beginPath(); ctx.arc(fx, fy + cs * 0.12, cs * 0.075, 0, 7); ctx.fill(); if (Math.random() < 0.12) part({ kind: 'smoke', col: '#aab4d8', x: fx, y: fy, vx: (Math.random() - 0.5) * 10, vy: -26, life: 900, size: 4 }); }
    else { flameShape(fx, fy + cs * 0.2, 1.25, 0); if (Math.random() < 0.22) part({ kind: 'ember', x: fx + (Math.random() - 0.5) * cs * 0.3, y: fy - cs * 0.2, vx: (Math.random() - 0.5) * 16, vy: -40 - Math.random() * 30, life: 800, size: 2.2 }); } }
  // знаки: куда можно шагнуть; что загорится и где увидят следующим ходом
  if (!S.over && now >= V.failUntil && S === M.S) { const pv = C.preview(L, S, -1), a = 0.55 + Math.sin(t * 6) * 0.3;
    for (let i = 0; i < L.n; i++) { const x = F.x + (i % L.W) * cs, y = F.y + Math.floor(i / L.W) * cs;
      if (pv.burn[i]) { ctx.strokeStyle = `rgba(255,150,50,${a})`; ctx.lineWidth = 2.2; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 14; rr(ctx, x + 4, y + 4, cs - 8, cs - 8, 7); ctx.stroke(); ctx.setLineDash([]); }
      else if (pv.seen[i] && !(lit[i] && C.seenCells(L, lit, S.guardAlive)[i])) { ctx.strokeStyle = `rgba(255,77,94,${a * 0.8})`; ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.lineDashOffset = -t * 10; rr(ctx, x + 4, y + 4, cs - 8, cs - 8, 7); ctx.stroke(); ctx.setLineDash([]); } }
    for (const m of C.legal(L, S)) { const x = cellX(m.cell), y = cellY(m.cell), sp = L.spoolAt[m.cell] >= 0 ? C.preview(L, S, m.cell) : pv, bad = sp.burn[m.cell] || sp.seen[m.cell];
      if (m.win) { ctx.strokeStyle = `rgba(255,243,196,${a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - cs * 0.05, cs * 0.5, 0, 7); ctx.stroke(); continue; }
      if (bad) { ctx.strokeStyle = `rgba(255,77,94,${0.6 + a * 0.3})`; ctx.lineWidth = 3; ctx.lineCap = 'round'; const r = cs * 0.1; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(11,14,34,0.55)'; ctx.beginPath(); ctx.arc(x, y, cs * 0.105, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(238,241,255,${0.5 + a * 0.2})`; ctx.beginPath(); ctx.arc(x, y, cs * 0.07, 0, 7); ctx.fill(); } } }
  // герой
  const fi = V.failInfo && now < V.failUntil ? V.failInfo : null, fpz = fi ? clamp((now - (V.failUntil - CONFIG.failMs) - 150) / (CONFIG.failMs - 150), 0, 1) : 0;
  const idle = 1 + Math.sin(t * 2.2) * 0.012, nope = clamp((now - V.hero.hop) / 220, 0, 1), wob = nope < 1 ? Math.sin(nope * Math.PI * 3) * cs * 0.05 : 0;
  if (S.won) { const wp = clamp((now - V.winAt) / 420, 0, 1); ctx.globalAlpha = 1 - wp * 0.9; prop(ctx, hp < 1 ? 'hero_b' : 'hero_a', hx, hy + cs * 0.5, cs * 1.12 * (1 - wp * 0.35), V.hero.face < 0); ctx.globalAlpha = 1; }
  else if (fi && fi.reason === 'stuck') { ctx.globalAlpha = 1 - fpz * 0.85; ctx.save(); ctx.translate(hx, hy + cs * 0.5); ctx.rotate(fpz * 0.9); prop(ctx, 'hero_a', 0, 0, cs * 1.12 * (1 - fpz * 0.6), V.hero.face < 0); ctx.restore(); ctx.globalAlpha = 1; }
  else { prop(ctx, hp < 1 ? 'hero_b' : 'hero_a', hx + wob, hy + cs * 0.5, cs * 1.12, V.hero.face < 0, 1, idle);
    if (fi && fi.reason === 'burned') { ctx.globalCompositeOperation = 'lighter'; glow(hx, hy, cs * 0.9, '255,120,40', 0.7 * (1 - fpz)); ctx.globalCompositeOperation = 'source-over'; flameShape(hx, hy + cs * 0.3, 1.5, 3); }
    if (fi && fi.reason === 'seen') { const seenBy = L.guards.filter((c, k) => (fi.to.guardAlive >> k & 1) && (C.patchOf(L, fi.to.lit, k) || []).includes(fi.cell)); ctx.strokeStyle = `rgba(255,77,94,${0.9 - fpz * 0.5})`; ctx.lineWidth = 3; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
      for (const c of seenBy) { ctx.beginPath(); ctx.moveTo(cellX(c), cellY(c) - cs * 0.3); ctx.lineTo(hx, hy - cs * 0.1); ctx.stroke(); } ctx.setLineDash([]); } }
  // подсказки
  if (V.idea) drawIdea(V.idea);
  if (V.move && !S.over) { const c = V.move.cell, p = pcell(S), x0 = cellX(p), y0 = cellY(p), x1 = cellX(c), y1 = cellY(c), k = (Math.sin(t * 5) + 1) / 2, ax = lerp(x0, x1, 0.55 + k * 0.2), ay = lerp(y0, y1, 0.55 + k * 0.2), ang = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang); ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.moveTo(cs * 0.3, 0); ctx.lineTo(-cs * 0.14, -cs * 0.27); ctx.lineTo(-cs * 0.14, cs * 0.27); ctx.closePath(); ctx.fill(); ctx.fillStyle = PAL.teal; ctx.beginPath(); ctx.moveTo(cs * 0.2, 0); ctx.lineTo(-cs * 0.08, -cs * 0.17); ctx.lineTo(-cs * 0.08, cs * 0.17); ctx.closePath(); ctx.fill(); ctx.restore(); }
  // частицы
  for (const p of V.parts) { p.age += dtMs; const k = p.age / p.life; if (k >= 1) continue; p.x += p.vx * dtMs / 1000; p.y += p.vy * dtMs / 1000; p.vy += p.g * dtMs / 1000; p.vx *= 0.985;
    if (p.kind === 'ember' || p.kind === 'star') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.col; ctx.globalAlpha = (1 - k) * 0.95; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    else if (p.kind === 'smoke') { ctx.fillStyle = p.col; ctx.globalAlpha = (1 - k) * 0.42; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k * 1.1), 0, 7); ctx.fill(); }
    else if (p.kind === 'bang' || p.kind === 'zz') { ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85; ctx.font = font(p.size, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const tx = p.kind === 'bang' ? '!' : 'z'; ctx.lineWidth = 4; ctx.strokeStyle = PAL.ink; ctx.strokeText(tx, p.x, p.y); ctx.fillStyle = p.col; ctx.fillText(tx, p.x, p.y); }
    ctx.globalAlpha = 1; }
  V.parts = V.parts.filter(p => p.age < p.life);
  // спящие стражи посапывают
  for (let g = 0; g < L.guards.length; g++) if ((S.guardAlive >> g & 1) && !lit[L.guards[g]] && Math.random() < dtMs / 1100) part({ kind: 'zz', x: cellX(L.guards[g]) + cs * 0.2, y: cellY(L.guards[g]) - cs * 0.5, vx: 7, vy: -16, life: 1500, size: cs * 0.24, col: '#b9c3ee' });
  // пузырёк с пояснением
  if (V.bubble && now < V.bubble.until) { const b = V.bubble; ctx.font = font(13, 700); const tw = ctx.measureText(b.text).width + 22, x = clamp(cellX(b.cell) - tw / 2, 8, VW - tw - 8), y = cellY(b.cell) - cs * 0.95 - 30; ctx.globalAlpha = clamp((b.until - now) / 300, 0, 1);
    ctx.fillStyle = PAL.ink; rr(ctx, x - 2, y - 2, tw + 4, 32, 12); ctx.fill(); ctx.fillStyle = '#2b3364'; rr(ctx, x, y, tw, 28, 10); ctx.fill(); ctx.fillStyle = PAL.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, x + tw / 2, y + 14.5); ctx.globalAlpha = 1; }
  ctx.restore(); }
// ступень 1 подсказки: значки над тем, что в решении загорится (огонёк) и что останется тёмным (крестик)
function drawIdea(idea) { const cs = F.cell, st = idea.story, t = now / 1000, bob = Math.sin(t * 4) * 2, a = clamp((now - idea.t0) / 250, 0, 1);
  const badge = (c, yes) => { const x = cellX(c) + cs * 0.3, y = cellY(c) - cs * 0.62 + bob, r = cs * 0.2; ctx.globalAlpha = a; ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, 7); ctx.fill(); ctx.fillStyle = yes ? '#ffb347' : '#414a7a'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (yes) flameShape(x, y + r * 0.62, 0.9, c, cs * 0.62); else { ctx.strokeStyle = PAL.text; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; const q = r * 0.42; ctx.beginPath(); ctx.moveTo(x - q, y - q); ctx.lineTo(x + q, y + q); ctx.moveTo(x + q, y - q); ctx.lineTo(x - q, y + q); ctx.stroke(); } ctx.globalAlpha = 1; };
  for (const c of st.lampsOn) badge(c, true); for (const c of st.woodBurn) badge(c, true); for (const c of st.guardsBurn) badge(c, true); for (const c of st.lampsOff) badge(c, false); for (const c of st.spoolsSkip) badge(c, false);
  for (const c of st.spoolsTake) { const x = cellX(c) + cs * 0.3, y = cellY(c) - cs * 0.62 + bob, r = cs * 0.2; ctx.globalAlpha = a; ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, 7); ctx.fill(); ctx.fillStyle = PAL.teal; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.36); ctx.stroke(); ctx.globalAlpha = 1; } }
