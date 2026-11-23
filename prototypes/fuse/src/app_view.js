// ===== вид: экран, атлас, поле, свет, анимации, частицы =====
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let VW = CONFIG.VW, VH = 700, SC = 1, DPR = 1, now = 0, dtMs = 16;
const PAL = { bg0: '#0e0f2d', bg1: '#1d1d44', gold: '#f0c060', gold2: '#c8853a', gold3: '#6e3f1c', plate: '#2a2654', brick: '#4a3b5e', rope: '#f1d39a', rope2: '#b8955c', ink: '#11142a', cream: '#f1d9a0', warm: '#ffb347', warm2: '#ffd98a', hot: '#ff6a2a', core: '#fff3c4', red: '#ff4d5e', text: '#eef1ff', dim: '#8d96bf', panel: '#161b38', panel2: '#232a52', line: '#39426f', teal: '#35c9b3', dark: [7, 9, 26] };
const FONT = 'ui-rounded, "SF Pro Rounded", "Nunito", "Segoe UI", system-ui, -apple-system, sans-serif';
const font = (px, w) => `${w || 700} ${px}px ${FONT}`;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, p) => a + (b - a) * p, easeOut = p => 1 - Math.pow(1 - p, 3), easeInOut = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

// ---------- атлас спрайтов (assets.svg встроен сборкой) ----------
const SPR = { floor_a: [0, 0], floor_b: [1, 0], floor_c: [2, 0], wall_top: [3, 0], wall_front: [4, 0], pit: [5, 0], stone: [6, 0], crack: [7, 0], water: [0, 1], oil: [1, 1], ash: [2, 1], wood: [3, 1], spool: [4, 1], lamp_off: [5, 1], lamp_on: [6, 1], hand: [7, 1],
  door_closed: [0, 2], door_open: [1, 2], hero_a: [2, 2], hero_b: [3, 2], guard_sleep: [4, 2], guard_awake: [5, 2], niche_barrel: [6, 2], niche_jug: [7, 2],
  niche_books: [0, 3], niche_flowers: [1, 3], niche_crate: [2, 3], ivy: [3, 3], portrait: [4, 3], bead: [5, 3], hero_fall: [6, 3], hero_hot: [7, 3] };
const NICHES = ['niche_barrel', 'niche_books', 'niche_jug', 'niche_flowers', 'niche_crate'];
// узел верёвки: в листе он ~44 px из 128, поэтому рамку спрайта берём крупнее нужного диаметра
function bead(c, x, y, d) { const b = d * 128 / 44; if (spr(c, 'bead', x - b / 2, y - b / 2, b, b)) return; c.fillStyle = PAL.rope2; c.beginPath(); c.arc(x, y, d / 2, 0, 7); c.fill(); c.fillStyle = PAL.rope; c.beginPath(); c.arc(x - d * 0.06, y - d * 0.06, d * 0.36, 0, 7); c.fill(); }
const atlas = { img: null, cv: null, k: 0, rows: 3 };
function loadAtlas() { const hm = FUSE_ATLAS.match(/height="(\d+)"/), H0 = hm ? +hm[1] : 384; atlas.rows = Math.round(H0 / 128);
  const svg = FUSE_ATLAS.replace('width="1024"', 'width="2048"').replace(`height="${H0}"`, `height="${H0 * 2}"`), img = new Image();
  img.onload = () => { atlas.img = img; atlas.k = 0; rasterAtlas(); V.baseDirty = true; }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
function rasterAtlas() { if (!atlas.img) return; const k = clamp(Math.ceil(CONFIG.cellMax * SC * DPR * 1.3 / 128 * 4) / 4, 1, 3); if (k === atlas.k) return;      // один размер на экран: смена уровня не перерисовывает лист
  const c = atlas.cv || (atlas.cv = document.createElement('canvas')); c.width = 1024 * k; c.height = atlas.rows * 128 * k; c.getContext('2d').drawImage(atlas.img, 0, 0, c.width, c.height);
  const d = atlas.dk || (atlas.dk = document.createElement('canvas')), x = d.getContext('2d'); d.width = c.width; d.height = c.height; x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(16,22,62,0.3)'; x.fillRect(0, 0, d.width, d.height);   // тёмный вид: приглушён и остужен
  atlas.k = k; V.baseDirty = true; }
// спрайт целиком в прямоугольник; part — доля высоты спрайта сверху (для передней грани стены)
const has = name => !!(atlas.cv && SPR[name] && SPR[name][1] < atlas.rows);
function spr(c, name, x, y, w, h, flip, part, src) { const s = SPR[name], A = src || atlas.cv; if (!A || !s || s[1] >= atlas.rows) return false; const k = atlas.k * 128, sh = k * (part || 1);
  if (flip) { c.save(); c.translate(x + w, y); c.scale(-1, 1); c.drawImage(A, s[0] * k + 0.5, s[1] * k + 0.5, k - 1, sh - 1, 0, 0, w, h); c.restore(); }
  else c.drawImage(A, s[0] * k + 0.5, s[1] * k + 0.5, k - 1, sh - 1, x, y, w, h); return true; }
// предмет, стоящий на клетке: низ спрайта (y = 120 из 128) на нижнем краю клетки; light — насколько освещена его клетка (нет — тёмный вид)
function prop(c, name, cxp, bottom, size, flip, sx, sy, light) { const w = size * (sx || 1), h = size * (sy || 1), x = cxp - w / 2, y = bottom - h * (120 / 128); if (light === undefined || light >= 0.99) return spr(c, name, x, y, w, h, flip);
  spr(c, name, x, y, w, h, flip, 1, atlas.dk); if (light > 0.02) { const a = c.globalAlpha; c.globalAlpha = a * light; spr(c, name, x, y, w, h, flip); c.globalAlpha = a; } return true; }

// ---------- экран и поле ----------
const F = { cell: 48, x: 0, y: 0 };
const V = { base: null, baseDirty: true, lc: document.createElement('canvas'), wc: document.createElement('canvas'), lightI: null, shown: null,
  hero: { x: 0, y: 0, fx: 0, fy: 0, t0: -1e9, face: 1, hop: 0 }, flame: { x: 0, y: 0, fx: 0, fy: 0, t0: -1e9, wet: false },
  falls: new Map(), ash: new Set(), flash: new Map(), guideCell: -1, hatch: null, parts: [], timers: [], failUntil: 0, failInfo: null, bubble: null, idea: null, move: null, winAt: 0, shakeUntil: 0, lampOn: new Map(), guardPop: new Map(), nPop: 0, lastStepAt: 0 };
function resize() { const w = window.innerWidth, h = window.innerHeight; SC = Math.min(w / CONFIG.VW, h / CONFIG.VHmin); VW = CONFIG.VW; VH = Math.min(h / SC, CONFIG.VHmax); DPR = Math.min(window.devicePixelRatio || 1, 3);
  cv.style.width = Math.round(VW * SC) + 'px'; cv.style.height = Math.round(VH * SC) + 'px'; cv.width = Math.round(VW * SC * DPR); cv.height = Math.round(VH * SC * DPR); V.hatch = null; layout(); if (V.shown && now >= V.failUntil) snap(); }      // после смены размера герой и огонёк встают на свои клетки заново
function layout() { const L = M.L; if (!L) return; const lv = LEVELS[M.idx], top = CONFIG.top + 56, bot = VH - CONFIG.bottom - (lv.hint ? 46 : 16);
  F.cell = clamp(Math.floor(Math.min((VW - 16) / (L.W + 0.7), (bot - top) / (L.H + 0.9))), CONFIG.cellMin, CONFIG.cellMax);
  F.x = Math.round((VW - L.W * F.cell) / 2); F.y = Math.round(top + (bot - top - L.H * F.cell) * 0.32 + F.cell * 0.3); rasterAtlas(); V.baseDirty = true; }      // поле ближе к шапке, как в референсах
const cellX = c => F.x + (c % M.L.W + 0.5) * F.cell, cellY = c => F.y + (Math.floor(c / M.L.W) + 0.5) * F.cell;
function cellAt(px, py) { const L = M.L, x = Math.floor((px - F.x) / F.cell), y = Math.floor((py - F.y) / F.cell); return (x < 0 || y < 0 || x >= L.W || y >= L.H) ? -1 : y * L.W + x; }
const isWall = (x, y) => { const L = M.L; return x < 0 || y < 0 || x >= L.W || y >= L.H || L.type[y * L.W + x] === C.WALL; };

// неподвижный слой: пол со швами, тёмный верх стен, передние грани, контур комнаты, оттенок мира, затухание края
const FLOORS = ['floor_a', 'floor_b', 'floor_c'];
const WORLD_HUE = [null, '#2c8596', '#6d6890', '#3f8058', '#8f4f72', '#8c6c46', '#4b6fa3', '#2f8f85', '#6c3fa0'];      // как в референсах: индиго, бирюза, сиреневый камень, зелёное масло, розовые сторожа, дерево, сталь, вода, фиолетовая глубина
const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647 + LEVELS[M.idx].id.length * 97) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// неподвижный слой: рамка погреба, пол, кирпичные стены, ниши с утварью у задней стены, плющ, оттенок мира
function buildBase() { const L = M.L, px = Math.round(F.cell * SC * DPR), b = V.base || (V.base = document.createElement('canvas')); b.width = (L.W + 2) * px; b.height = (L.H + 2) * px; const c = b.getContext('2d'), W = b.width, H = b.height;
  c.clearRect(0, 0, W, H); const fr = Math.round(px * 0.36), x0 = px - fr, y0 = px - fr, rw = L.W * px + fr * 2, rh = L.H * px + fr * 2, rad = fr * 1.7;
  const seg = (a, b2, c2, d) => { c.beginPath(); c.moveTo(a, b2); c.lineTo(c2, d); c.stroke(); };
  // рамка: тень, кирпич, светлая кромка снаружи и тёмная внутри
  c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = px * 0.45; c.shadowOffsetY = px * 0.12; rr(c, x0, y0, rw, rh, rad); c.fillStyle = PAL.brick; c.fill(); c.restore();
  c.save(); rr(c, x0, y0, rw, rh, rad); c.clip(); for (let yy = 0; yy < H; yy += px / 2) for (let xx = 0; xx < W; xx += px / 2) spr(c, 'wall_top', xx, yy, px / 2, px / 2); c.fillStyle = 'rgba(74,59,94,0.35)'; c.fillRect(0, 0, W, H); c.restore();
  c.lineWidth = Math.max(1.5, px * 0.035); c.strokeStyle = 'rgba(176,150,196,0.55)'; rr(c, x0 + c.lineWidth / 2, y0 + c.lineWidth / 2, rw - c.lineWidth, rh - c.lineWidth, rad); c.stroke();
  c.strokeStyle = 'rgba(12,10,28,0.85)'; c.lineWidth = Math.max(2, px * 0.05); c.strokeRect(px - c.lineWidth / 2, px - c.lineWidth / 2, L.W * px + c.lineWidth, L.H * px + c.lineWidth);
  // клетки
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { const dx = (x + 1) * px, dy = (y + 1) * px;
    if (!isWall(x, y)) { if (!spr(c, FLOORS[(x * 7 + y * 13 + x * y * 3) % 3], dx, dy, px, px)) { c.fillStyle = '#2e3052'; c.fillRect(dx, dy, px, px); } continue; }
    const back = !isWall(x, y + 1) && (y === 0 || isWall(x, y - 1)), niche = back && has('niche_barrel') && hash(x, y, 1) < 0.5;
    if (niche) { spr(c, NICHES[Math.floor(hash(x, y, 2) * NICHES.length)], dx, dy, px, px); continue; }
    if (!spr(c, 'wall_top', dx, dy, px, px)) { c.fillStyle = '#655065'; c.fillRect(dx, dy, px, px); } }
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (isWall(x, y) && !isWall(x, y + 1)) { const dx = (x + 1) * px, dy = (y + 1) * px, fh = Math.round(px * 0.42), back = (y === 0 || isWall(x, y - 1)) && has('niche_barrel') && hash(x, y, 1) < 0.5;
    if (!back) { if (!spr(c, 'wall_front', dx, dy + px - fh, px, fh, false, 56 / 128)) { c.fillStyle = '#27223d'; c.fillRect(dx, dy + px - fh, px, fh); } }
    const g = c.createLinearGradient(0, dy + px, 0, dy + px + px * 0.28); g.addColorStop(0, 'rgba(6,5,18,0.42)'); g.addColorStop(1, 'rgba(6,5,18,0)'); c.fillStyle = g; c.fillRect(dx, dy + px, px, px * 0.28);
    if (!back && hash(x, y, 3) < 0.22) spr(c, 'ivy', dx, dy + px * 0.12, px, px); }
  // кромка пола у стен: тонкая тёмная линия — комната читается, клетки считаются
  c.strokeStyle = 'rgba(8,7,22,0.75)'; c.lineWidth = Math.max(1.5, px * 0.04);
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (!isWall(x, y)) { const dx = (x + 1) * px, dy = (y + 1) * px; if (isWall(x - 1, y)) seg(dx, dy, dx, dy + px); if (isWall(x + 1, y)) seg(dx + px, dy, dx + px, dy + px); if (isWall(x, y + 1)) seg(dx, dy + px, dx + px, dy + px); }
  const hue = WORLD_HUE[LEVELS[M.idx].w - 1]; if (hue) { c.globalCompositeOperation = 'color'; c.fillStyle = hue; c.globalAlpha = 0.6;      // цвет мира: пол перекрашен, яркость плит сохранена; стены, рамка и предметы прежние
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (!isWall(x, y)) c.fillRect((x + 1) * px, (y + 1) * px, px, px); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  V.baseDirty = false; }

// ---------- события модели → анимации ----------
const after = (ms, fn) => V.timers.push({ at: now + ms, fn });
function flushTimers() { const ts = V.timers; V.timers = []; for (const t of ts) t.fn(); }
function part(o) { V.parts.push(Object.assign({ age: 0, life: 600, vx: 0, vy: 0, g: 0, size: 3, col: PAL.warm, kind: 'dot', rot: 0, vr: 0 }, o)); if (V.parts.length > 420) V.parts.shift(); }
function burst(x, y, n, o) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (o.speed || 60) * (0.4 + Math.random() * 0.8); part(Object.assign({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 0) }, o, { life: (o.life || 500) * (0.6 + Math.random() * 0.7), size: (o.size || 3) * (0.6 + Math.random() * 0.8) })); } }
function snap() { const L = M.L, S = M.S; V.shown = S; V.cacheS = null; V.timers = []; V.falls.clear(); V.flash.clear(); V.failUntil = 0; V.failInfo = null; V.move = null; V.winAt = 0;
  V.hero.x = V.hero.fx = cellX(pcell(S)); V.hero.y = V.hero.fy = cellY(pcell(S)); V.hero.t0 = -1e9; V.flame.x = V.flame.fx = cellX(S.tail[0]); V.flame.y = V.flame.fy = cellY(S.tail[0]); V.flame.t0 = -1e9;
  V.ash.clear(); for (let i = 0; i < L.n; i++) if (L.init[i] === C.WOOD && S.d[i] === 0) V.ash.add(i);
  V.lampOn.clear(); V.guardPop.clear(); if (!V.lightI || V.lightI.length !== L.n) V.lightI = new Float32Array(L.n); }
function moveTo(S, cell) { const h = V.hero, f = V.flame; h.fx = h.x; h.fy = h.y; h.x = cellX(cell); h.y = cellY(cell); h.t0 = now; if (h.x !== h.fx) h.face = h.x > h.fx ? 1 : -1;
  const fc = S.tail[0], nx = cellX(fc), ny = cellY(fc); if (nx !== f.x || ny !== f.y) { f.fx = f.x; f.fy = f.y; f.x = nx; f.y = ny; f.t0 = now + 30; } }
// что изменилось между двумя состояниями — в анимации и звуки, цепочкой
function effects(from, to) { const L = M.L, K = CONFIG.chainMs; let fell = false, oil = false, wood = false, lamp = false, wake = false, down = false;
  for (let i = 0; i < L.n; i++) { const a = from.d[i], b = to.d[i]; if (a === b) continue; const x = cellX(i), y = cellY(i);
    if ((b & C.PIT) && !(a & C.PIT)) { if (a & C.BURN) after(K, () => burst(x, y, 7, { kind: 'smoke', col: '#59607e', speed: 22, up: 26, life: 800, size: 7 })); else { fell = true; after(K, () => { V.falls.set(i, now); burst(x, y + F.cell * 0.2, 9, { kind: 'smoke', col: '#6d769a', speed: 46, life: 520, size: 5 }); }); } }
    if (b & C.BURN) { oil = true; after(K * 1.6, () => { burst(x, y, 10, { kind: 'ember', speed: 70, up: 50, life: 620, size: 3 }); }); }
    if (b & C.BURNW) { wood = true; after(K * 1.6, () => { burst(x, y - F.cell * 0.2, 12, { kind: 'ember', speed: 80, up: 60, life: 700, size: 3 }); }); }
    if ((a & C.BURNW) && b === 0) { V.ash.add(i); after(K, () => burst(x, y, 8, { kind: 'smoke', col: '#59607e', speed: 24, up: 30, life: 800, size: 7 })); } }
  for (let i = 0; i < L.n; i++) if (to.lit[i] && !from.lit[i]) after(K * 2, () => V.flash.set(i, now));      // новая освещённая клетка вспыхивает — видно, что именно осветилось
  for (let k = 0; k < L.lamps.length; k++) if ((to.lampLit >> k & 1) && !(from.lampLit >> k & 1)) { lamp = true; const c = L.lamps[k], x = cellX(c), y = cellY(c) - F.cell * 0.25;
    after(K * 2, () => { V.lampOn.set(c, now); burst(x, y, 12, { kind: 'ember', col: PAL.warm2, speed: 90, life: 520, size: 2.6 }); }); }
  for (let k = 0; k < L.guards.length; k++) { const c = L.guards[k], x = cellX(c), y = cellY(c);
    if ((from.guardAlive >> k & 1) && !(to.guardAlive >> k & 1)) { down = true; after(K * 1.6, () => burst(x, y - F.cell * 0.2, 16, { kind: 'smoke', col: '#3a3f58', speed: 50, up: 40, life: 900, size: 8 })); }
    else if ((to.guardAlive >> k & 1) && to.lit[c] && !from.lit[c]) { wake = true; after(K * 2.6, () => { V.guardPop.set(c, now); part({ kind: 'bang', x, y: y - F.cell * 0.85, vy: -14, life: 900, size: F.cell * 0.44, col: PAL.red }); }); } }
  if (from.lit[L.door] !== to.lit[L.door] && !to.won) { const x = cellX(L.door), y = cellY(L.door); if (to.lit[L.door]) after(K * 3, () => { burst(x, y - F.cell * 0.2, 10, { kind: 'star', col: PAL.core, speed: 60, life: 700, size: 3 }); SND.play('door'); }); else SND.play('doorShut', K * 3); }
  if (to.spools !== from.spools) { const c = pcell(to); V.nPop = now; burst(cellX(c), cellY(c), 10, { kind: 'star', col: PAL.cream, speed: 70, life: 600, size: 3 }); SND.play('spool', 60); }
  const wet = L.type[to.tail[0]] === C.WATER; if (wet && !V.flame.wet) { SND.play('steam', K); after(K, () => burst(V.flame.x, V.flame.y, 8, { kind: 'smoke', col: '#aab4d8', speed: 26, up: 40, life: 700, size: 6 })); } V.flame.wet = wet;
  if (fell) SND.play('fall', K); if (oil) SND.play('oil', K * 1.6); if (wood) SND.play('wood', K * 1.6); if (lamp) SND.play('lamp', K * 2); if (down) SND.play('guardDown', K * 1.6); if (wake) SND.play('wake', K * 2.6); }
function onModel(type, d) { const L = M.L;
  if (type === 'load') { V.parts = []; layout(); snap(); V.flame.wet = L.type[M.S.tail[0]] === C.WATER; V.idea = null; V.bubble = null; V.lightI.fill(0); for (let i = 0; i < L.n; i++) V.lightI[i] = M.S.lit[i]; }
  else if (type === 'undo' || type === 'restart') { snap(); V.flame.wet = L.type[M.S.tail[0]] === C.WATER; if (type === 'restart') V.idea = null; SND.play('undo'); }
  else if (type === 'step') { flushTimers(); V.shown = d.to; V.move = null; V.bubble = null; moveTo(d.to, d.cell); V.lastStepAt = now; SND.play('step'); if (d.to.tail[0] !== d.from.tail[0]) SND.play('hiss'); if (d.to.won) V.winAt = now; else effects(d.from, d.to); }
  else if (type === 'fail') { flushTimers(); V.shown = d.to; V.move = null; moveTo(d.to, d.cell); SND.play('step'); effects(d.from, d.to); V.failInfo = d; V.failUntil = now + CONFIG.failMs; V.shakeUntil = now + 260; SND.play('fail', 140); V.bubble = { cell: d.cell, text: T(d.reason), until: now + CONFIG.failMs + 700 };
    const x = cellX(d.cell), y = cellY(d.cell); after(150, () => { if (d.reason === 'burned') burst(x, y, 18, { kind: 'ember', speed: 110, up: 60, life: 600, size: 3.4 }); else burst(x, y, 10, { kind: 'smoke', col: d.reason === 'seen' ? '#ff6d7c' : '#6d769a', speed: 50, life: 520, size: 5 }); });
    after(CONFIG.failMs, () => { snap(); V.flame.wet = L.type[M.S.tail[0]] === C.WATER; }); }
  else if (type === 'illegal') { SND.play('nope'); if (d.closed) V.bubble = { cell: d.cell, text: T('closed'), until: now + 1700 }; else V.hero.hop = now; }
  else if (type === 'hint') { if (d.tier === 1) { V.idea = { story: d.story, t0: now }; SND.play('hint'); } else if (d.tier === 2) { V.move = { cell: d.cell, t0: now, rewound: d.rewound }; if (d.rewound) V.bubble = { cell: pcell(M.S), text: T('dead'), until: now + 1900 }; SND.play('hint'); } else { V.bubble = { cell: pcell(M.S), text: T('nohint'), until: now + 1700 }; } } }
M.listeners.push(onModel);

// ---------- отрисовка поля ----------
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function glow(x, y, r, col, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.45, `rgba(${col},${a * 0.38})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
const PITPOLY = [[11, 38], [25, 24], [51, 28], [69, 23], [93, 29], [112, 26], [118, 39], [113, 58], [121, 78], [111, 110], [89, 117], [65, 112], [41, 120], [13, 108], [9, 85], [14, 62], [7, 43]];      // чёрное нутро ямы из assets.svg
const FIRE1 = [PAL.hot, '#ffab36', PAL.core], FIRE2 = ['#c9361a', '#f0762a', '#ffc46a'];      // огонёк на шнуре и пожар на клетке: пожар ниже и темнее
function flameShape(x, y, s, phase, u, pal, wide) { const t = now / 1000, w = (u || F.cell) * 0.2 * s * (wide || 1), h = (u || F.cell) * 0.56 * s / (wide || 1), P = pal || FIRE1;
  const lay = (col, k, ph, edge) => { const sway = Math.sin(t * 8.5 + phase + ph) * w * 0.34 * k, hh = h * k * (1 + Math.sin(t * 15 + phase * 1.7 + ph) * 0.09), ww = w * k; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - ww, y);
    ctx.bezierCurveTo(x - ww * 1.25, y - hh * 0.45, x - ww * 0.2 + sway, y - hh * 0.7, x + sway, y - hh); ctx.bezierCurveTo(x + ww * 0.3 + sway * 0.4, y - hh * 0.66, x + ww * 1.25, y - hh * 0.45, x + ww, y); ctx.bezierCurveTo(x + ww * 0.8, y + ww * 0.75, x - ww * 0.8, y + ww * 0.75, x - ww, y); if (edge) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2.5, (u || F.cell) * 0.075); ctx.strokeStyle = PAL.ink; ctx.stroke(); } ctx.fill(); };
  lay(P[0], 1, 0, true); lay(P[1], 0.74, 1.3); lay(P[2], 0.42, 2.1); }
// стрелка «иди сюда»: одна на всю игру — и для руководства на вводных уровнях, и для подсказки-шага
function goArrow(from, to) { const cs = F.cell, t = now / 1000, x0 = cellX(from), y0 = cellY(from), x1 = cellX(to), y1 = cellY(to), k = (Math.sin(t * 5) + 1) / 2, ax = lerp(x0, x1, 0.86 + k * 0.12), ay = lerp(y0, y1, 0.86 + k * 0.12);
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(y1 - y0, x1 - x0)); const tri = (s, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cs * 0.3 * s, 0); ctx.lineTo(-cs * 0.16 * s, -cs * 0.27 * s); ctx.lineTo(-cs * 0.05 * s, 0); ctx.lineTo(-cs * 0.16 * s, cs * 0.27 * s); ctx.closePath(); ctx.fill(); }; tri(1.3, PAL.ink); tri(1, '#ffffff'); ctx.restore(); }
function hatchPattern() { if (V.hatch) return V.hatch; const c = document.createElement('canvas'), n = Math.max(8, Math.round(9 * SC * DPR)); c.width = c.height = n; const x = c.getContext('2d'); x.strokeStyle = 'rgba(255,77,94,0.62)'; x.lineWidth = n * 0.2; x.lineCap = 'square';
  for (const o of [-n, 0, n]) { x.beginPath(); x.moveTo(o, n); x.lineTo(o + n, 0); x.stroke(); } V.hatch = ctx.createPattern(c, 'repeat'); V.hatchScale = 1 / (SC * DPR); return V.hatch; }
function drawField() { const L = M.L, S = V.shown, cs = F.cell, lit = S.lit, t = now / 1000; if (V.baseDirty || !V.base) buildBase();
  if (V.cacheS !== S) { V.cacheS = S; V.pv = C.preview(L, S, -1); V.legal = C.legal(L, S); V.seenNow = C.seenCells(L, lit, S.guardAlive); V.patches = L.guards.map((c, g) => (S.guardAlive >> g & 1) ? C.patchOf(L, lit, g) : null); V.spv = new Map(); for (const m of V.legal) if (L.spoolAt[m.cell] >= 0) V.spv.set(m.cell, C.preview(L, S, m.cell)); }      // расчёты хода — один раз на состояние, не на кадр
  let ox = 0, oy = 0; if (now < V.shakeUntil) { const p = (V.shakeUntil - now) / 260; ox = Math.sin(now * 0.09) * 4 * p; oy = Math.cos(now * 0.11) * 3 * p; }
  ctx.save(); ctx.translate(ox, oy);
  ctx.drawImage(V.base, F.x - cs, F.y - cs, (L.W + 2) * cs, (L.H + 2) * cs);
  const LI = V.lightI, kf = 1 - Math.exp(-dtMs / 80); for (let i = 0; i < L.n; i++) LI[i] += (lit[i] - LI[i]) * kf;                       // свет плавно догоняет логику
  const flameCell = S.tail[0], N = C.fuseLen(L, S.spools), willFall = !S.over && S.tail.length === N + 1 && L.type[flameCell] === C.FLOOR, cellPx = i => [F.x + (i % L.W) * cs, F.y + Math.floor(i / L.W) * cs];
  // пол: тьма и свет ложатся на плитку строго по клеткам (тёплый тон один на всю игру); лужи, камень и зола — поверх, со своим тёмным и светлым видом
  const flick = 0.97 + Math.sin(t * 11) * 0.03, sprL = (name, x, y, w, h, I, flip) => { spr(ctx, name, x, y, w, h, flip, 1, atlas.dk); if (I > 0.02) { ctx.globalAlpha = I; spr(ctx, name, x, y, w, h, flip); ctx.globalAlpha = 1; } };
  const shade = (i, x, y, warm) => { const I = LI[i]; if (I < 0.99) { ctx.fillStyle = `rgba(${PAL.dark},${CONFIG.dark * (1 - I)})`; ctx.fillRect(x, y, cs, cs); }
    if (I > 0.01) { ctx.fillStyle = `rgba(242,156,50,${warm * I * flick})`; ctx.fillRect(x, y, cs, cs); ctx.fillStyle = `rgba(255,214,140,${0.12 * I})`; ctx.fillRect(x + cs * 0.12, y + cs * 0.1, cs * 0.76, cs * 0.76); const f0 = V.flash.get(i); if (f0 !== undefined) { const p = (now - f0) / 380; if (p >= 1) V.flash.delete(i); else if (p >= 0) { ctx.fillStyle = `rgba(255,236,170,${0.4 * (1 - p)})`; ctx.fillRect(x, y, cs, cs); } } } };
  for (let i = 0; i < L.n; i++) { const ty = L.type[i], [x, y] = cellPx(i), d = S.d[i], I = LI[i];
    if (ty === C.WALL) { const b = i + L.W; if (b < L.n && L.type[b] !== C.WALL) { const fh = Math.round(cs * 0.46); ctx.fillStyle = `rgba(${PAL.dark},${0.5 * (1 - LI[b] * 0.8)})`; ctx.fillRect(x, y + cs - fh, cs, fh); } continue; }
    if (d & C.PIT) { const flip = (i * 7 + 3) % 5 < 2; spr(ctx, 'pit', x, y, cs, cs, flip); const hue = WORLD_HUE[LEVELS[M.idx].w - 1]; if (hue) { ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = 0.6; ctx.fillStyle = hue; ctx.fillRect(x, y, cs, cs); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } shade(i, x, y, 0.4);                                       // яма: свет виден на кромке, нутро всегда чёрное
      ctx.save(); ctx.beginPath(); PITPOLY.forEach(([px, py], k) => { const X = x + (flip ? 128 - px : px) / 128 * cs, Y = y + py / 128 * cs; if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.closePath(); ctx.clip(); spr(ctx, 'pit', x, y, cs, cs, flip); ctx.restore();
      const f0 = V.falls.get(i); if (f0 !== undefined) { const p = (now - f0) / 340; if (p >= 1) V.falls.delete(i); else { ctx.save(); ctx.globalAlpha = 1 - p; ctx.translate(x + cs / 2, y + cs / 2 + p * cs * 0.18); ctx.rotate(p * 0.5); const s2 = cs * (1 - p * 0.85); spr(ctx, 'floor_a', -s2 / 2, -s2 / 2, s2, s2); ctx.restore(); } } continue; }
    shade(i, x, y, 0.72);
    if (ty === C.STONE) sprL('stone', x + cs * 0.05, y + cs * 0.04, cs * 0.9, cs * 0.9, I);
    else if (ty === C.WATER) sprL('water', x + cs * 0.02, y + cs * 0.04, cs * 0.96, cs * 0.96, Math.max(I, 0.25));
    if (d & (C.OIL | C.BURN)) sprL('oil', x, y, cs, cs, Math.max(I, 0.25));
    if (V.ash.has(i)) sprL('ash', x, y, cs, cs, I);
    if (i === flameCell && willFall) { ctx.globalAlpha = 0.75 + Math.sin(t * 7) * 0.25; spr(ctx, 'crack', x, y, cs, cs); ctx.globalAlpha = 1; } }
  // стражи: штриховка — клетки, где героя увидят после этого хода (шаг туда = провал); тонкий контур — пятно, которое страж видит сейчас
  const danger = (S === M.S && !S.over) ? V.pv.seen : V.seenNow; let anyD = false; for (let i = 0; i < L.n; i++) if (danger[i]) { anyD = true; break; }
  if (anyD) { const pat = hatchPattern(), k = V.hatchScale; ctx.save(); ctx.scale(k, k); ctx.fillStyle = pat; ctx.globalAlpha = 0.62 + Math.sin(t * 4) * 0.16; for (let i = 0; i < L.n; i++) if (danger[i]) { const [x, y] = cellPx(i); ctx.fillRect(x / k, y / k, cs / k, cs / k); } ctx.restore(); }
  const outline = (inSet, wd, col) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.lineCap = 'round'; ctx.beginPath(); for (let c = 0; c < L.n; c++) if (inSet(c)) { const [x, y] = cellPx(c), cx0 = c % L.W, cy0 = Math.floor(c / L.W), q = wd / 2;
      if (cy0 === 0 || !inSet(c - L.W)) { ctx.moveTo(x + q, y + q); ctx.lineTo(x + cs - q, y + q); } if (cy0 === L.H - 1 || !inSet(c + L.W)) { ctx.moveTo(x + q, y + cs - q); ctx.lineTo(x + cs - q, y + cs - q); }
      if (cx0 === 0 || !inSet(c - 1)) { ctx.moveTo(x + q, y + q); ctx.lineTo(x + q, y + cs - q); } if (cx0 === L.W - 1 || !inSet(c + 1)) { ctx.moveTo(x + cs - q, y + q); ctx.lineTo(x + cs - q, y + cs - q); } } ctx.stroke(); };
  if (anyD) { outline(c => danger[c], 5, 'rgba(17,20,42,0.8)'); outline(c => danger[c], 3, PAL.red); }
  for (let g = 0; g < L.guards.length; g++) { const p = V.patches[g]; if (!p) continue; const inP = new Set(p); if (p.every(c => danger[c])) continue; outline(c => inP.has(c), 2, 'rgba(255,120,134,0.6)'); }
  // предметы по рядам сверху вниз; у каждого тёмный и светлый вид, по свету своей клетки — в темноте видны, но приглушены и без тёплых тонов
  for (let i = 0; i < L.n; i++) { const ty = L.type[i], x = cellX(i), yb = F.y + (Math.floor(i / L.W) + 1) * cs, d = S.d[i], I = LI[i];
    if (ty === C.LAMP) { const on = S.lampLit >> L.lampAt[i] & 1, t0 = V.lampOn.get(i), shown = on && (t0 === undefined || now >= t0), pop = t0 !== undefined ? clamp((now - t0) / 260, 0, 1) : 1, s = 1 + (shown ? Math.sin(pop * Math.PI) * 0.16 : 0); prop(ctx, shown ? 'lamp_on' : 'lamp_off', x, yb - cs * 0.03, cs * 0.98 * s, false, 1, 1, shown ? 1 : Math.max(I, 0.3)); }
    else if (ty === C.DOOR) { const open = lit[i] || S.won; prop(ctx, open ? 'door_open' : 'door_closed', x, yb - cs * 0.01, cs * 1.02, false, 1, 1, open ? 1 : Math.max(I, 0.3)); }
    if (d & (C.WOOD | C.BURNW)) prop(ctx, 'wood', x, yb - cs * 0.02, cs * 0.96, false, 1, 1, (d & C.BURNW) ? 1 : I);
    const sp = L.spoolAt[i]; if (sp >= 0 && !(S.spools >> sp & 1)) { prop(ctx, 'spool', x, yb - cs * 0.1 + Math.sin(t * 2.4 + i) * cs * 0.03, cs * 0.8, false, 1, 1, Math.max(I, 0.35)); text2('+' + L.spoolAdd[sp], x + cs * 0.3, yb - cs * 0.72, cs * 0.3); }
    const g = L.guardAt[i]; if (g >= 0 && (S.guardAlive >> g & 1)) { const awake = lit[i], t0 = V.guardPop.get(i), up = awake && (t0 === undefined || now >= t0), pop = t0 !== undefined ? clamp((now - t0) / 300, 0, 1) : 1, s = 1 + Math.sin(pop * Math.PI) * 0.2;
      if (up) { ctx.fillStyle = `rgba(255,60,84,${0.3 + Math.sin(t * 6) * 0.12})`; ctx.beginPath(); ctx.ellipse(x, yb - cs * 0.1, cs * 0.42, cs * 0.14, 0, 0, 7); ctx.fill(); prop(ctx, 'guard_awake', x, yb - cs * 0.02, cs * 1.04 * s); }
      else { ctx.save(); ctx.translate(x, yb); ctx.rotate(-0.13); prop(ctx, 'guard_sleep', cs * 0.02, -cs * 0.01, cs * 0.94, false, 1, 1 + Math.sin(t * 1.6 + i) * 0.015, Math.max(I, 0.3)); ctx.restore(); } } }
  // свечение — только там, где по правилам светло: обрезано по освещённым клеткам
  const hp = clamp((now - V.hero.t0) / CONFIG.stepMs, 0, 1), fp = clamp((now - V.flame.t0) / (CONFIG.stepMs * 1.15), 0, 1), same = S.tail.length === 1 && fp >= 1;
  let fx = lerp(V.flame.fx, V.flame.x, easeInOut(fp)), fy = lerp(V.flame.fy, V.flame.y, easeInOut(fp)); if (same) { fx -= cs * 0.36 * V.hero.face; fy += cs * 0.1; }                    // на старте огонёк стоит за спиной героя, а не под ним
  const hx = lerp(V.hero.fx, V.hero.x, easeOut(hp)), hy0 = lerp(V.hero.fy, V.hero.y, easeOut(hp)), hy = hy0 - Math.sin(hp * Math.PI) * cs * 0.12, wet = L.type[flameCell] === C.WATER && fp >= 0.6;
  ctx.save(); ctx.beginPath(); for (let i = 0; i < L.n; i++) if (LI[i] > 0.4) { const [x, y] = cellPx(i); ctx.rect(x, y, cs, cs); } ctx.clip(); ctx.globalCompositeOperation = 'lighter';
  if (!wet && !S.won) glow(fx, fy - cs * 0.05, cs * 1.2 * flick, '255,150,60', 0.3);
  for (let i = 0; i < L.n; i++) { if (S.d[i] & C.FIRE) glow(cellX(i), cellY(i), cs * 1.2 * flick, '255,120,40', 0.3);
    if (L.type[i] === C.LAMP && (S.lampLit >> L.lampAt[i] & 1) && (V.lampOn.get(i) === undefined || now >= V.lampOn.get(i))) glow(cellX(i), cellY(i) - cs * 0.26, cs * 0.95, '255,200,110', 0.32); }
  if (lit[L.door] || S.won) glow(cellX(L.door), cellY(L.door) - cs * 0.1, cs * (1.0 + Math.sin(t * 3) * 0.06), '255,225,150', 0.3);
  ctx.restore(); ctx.globalCompositeOperation = 'source-over';
  // шнур: от огонька через клетки следа к герою; узел на каждой клетке — по узлам видно N
  const pts = [[fx, fy + cs * 0.14]]; for (let k = 1; k < S.tail.length - 1; k++) pts.push([cellX(S.tail[k]), cellY(S.tail[k]) + cs * 0.14]); if (S.tail.length > 1 || same) pts.push([hx, hy + cs * 0.2 + Math.sin(hp * Math.PI) * cs * 0.12]);
  if (pts.length > 1 && !S.won) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; const line = (col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.stroke(); };
    line('rgba(30,18,10,0.55)', cs * 0.2); line(PAL.rope2, cs * 0.13); ctx.setLineDash([cs * 0.05, cs * 0.065]); ctx.lineDashOffset = 0; line(PAL.rope, cs * 0.095); ctx.setLineDash([]);      // скрученная верёвка
    const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[1][0], pts[1][1]); g.addColorStop(0, PAL.hot); g.addColorStop(1, 'rgba(255,170,70,0)'); ctx.strokeStyle = g; ctx.lineWidth = cs * 0.075; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke();
    for (let k = 1; k < pts.length - 1; k++) bead(ctx, pts[k][0], pts[k][1], cs * 0.3); }
  // пожар на клетках (ниже и темнее) и сам огонёк
  for (let i = 0; i < L.n; i++) if (S.d[i] & C.FIRE) { const x = cellX(i), y = cellY(i) + cs * 0.3; flameShape(x - cs * 0.24, y, 0.62, i, 0, FIRE2, 1.25); flameShape(x + cs * 0.22, y - cs * 0.03, 0.7, i + 2, 0, FIRE2, 1.25); flameShape(x, y + cs * 0.05, 0.86, i + 4, 0, FIRE2, 1.25); if (Math.random() < 0.25) part({ kind: 'ember', x: x + (Math.random() - 0.5) * cs * 0.6, y: y - cs * 0.2, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30, life: 600, size: 2.2, col: '#ff9a4a' }); }
  if (!S.won) { if (wet) { ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(fx, fy + cs * 0.12, cs * 0.13, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(214,96,52,${0.75 + Math.sin(t * 6) * 0.2})`; ctx.beginPath(); ctx.arc(fx, fy + cs * 0.12, cs * 0.08, 0, 7); ctx.fill(); if (Math.random() < 0.12) part({ kind: 'smoke', col: '#aab4d8', x: fx, y: fy, vx: (Math.random() - 0.5) * 10, vy: -26, life: 900, size: 4 }); }
    else { flameShape(fx, fy + cs * 0.2, same ? 0.95 : 1.25, 0); if (Math.random() < 0.2) part({ kind: 'ember', x: fx + (Math.random() - 0.5) * cs * 0.3, y: fy - cs * 0.2, vx: (Math.random() - 0.5) * 16, vy: -40 - Math.random() * 30, life: 800, size: 2.2 }); } }
  // знаки: куда можно шагнуть (кольцо); что загорится и где увидят следующим ходом (пунктир)
  const pointed = V.move && !S.over ? V.move.cell : V.guideCell;
  if (!S.over && now >= V.failUntil && S === M.S) { const pv = V.pv, a = 0.55 + Math.sin(t * 6) * 0.3;
    for (let i = 0; i < L.n; i++) if (pv.burn[i]) { const [x, y] = cellPx(i); ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = 'rgba(17,20,42,0.9)'; ctx.lineWidth = 5.5; rr(ctx, x + 4, y + 4, cs - 8, cs - 8, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(255,150,40,${0.8 + a * 0.25})`; ctx.lineWidth = 3; rr(ctx, x + 4, y + 4, cs - 8, cs - 8, 7); ctx.stroke(); ctx.setLineDash([]); }
    for (const m of V.legal) { if (m.cell === pointed) continue; const x = cellX(m.cell), y = cellY(m.cell), sp = V.spv.get(m.cell) || pv, bad = sp.burn[m.cell] || sp.seen[m.cell];
      if (m.win) { ctx.strokeStyle = `rgba(255,243,196,${a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - cs * 0.05, cs * 0.5, 0, 7); ctx.stroke(); continue; }
      if (bad) { ctx.lineCap = 'round'; const r = cs * 0.1, cross = (col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); }; cross(PAL.ink, 6); cross(`rgba(255,77,94,${0.7 + a * 0.3})`, 3); }
      else { ctx.strokeStyle = 'rgba(11,14,34,0.6)'; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.arc(x, y, cs * 0.115, 0, 7); ctx.stroke(); ctx.strokeStyle = `rgba(238,241,255,${0.55 + a * 0.3})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, cs * 0.115, 0, 7); ctx.stroke(); } } }
  // спящие стражи: крупное «z z z» над головой
  for (let g = 0; g < L.guards.length; g++) if ((S.guardAlive >> g & 1) && !lit[L.guards[g]]) { const c = L.guards[g]; for (let k = 0; k < 3; k++) { const ph = (t * 0.7 + k * 0.33) % 1, x = cellX(c) + cs * (0.1 + k * 0.11) * (c % L.W === L.W - 1 ? -1 : 1), y = cellY(c) - cs * (0.34 + k * 0.16) - ph * cs * 0.05; ctx.globalAlpha = 0.55 + Math.sin((t * 0.7 + k * 0.33) * Math.PI * 2) * 0.35; text2('z', x, y, cs * (0.17 + k * 0.055), '#c8d2ff'); } ctx.globalAlpha = 1; }
  // герой
  const fi = V.failInfo && now < V.failUntil ? V.failInfo : null, fpz = fi ? clamp((now - (V.failUntil - CONFIG.failMs) - 150) / (CONFIG.failMs - 150), 0, 1) : 0;
  const idle = 1 + Math.sin(t * 2.2) * 0.012, nope = clamp((now - V.hero.hop) / 220, 0, 1), wob = nope < 1 ? Math.sin(nope * Math.PI * 3) * cs * 0.05 : 0;
  if (!S.won && !(fi && fi.reason === 'stuck')) { ctx.fillStyle = 'rgba(4,5,16,0.42)'; ctx.beginPath(); ctx.ellipse(hx, hy0 + cs * 0.4, cs * 0.26 * (1 - Math.sin(hp * Math.PI) * 0.2), cs * 0.09, 0, 0, 7); ctx.fill(); }
  if (S.won) { const wp = clamp((now - V.winAt) / 300, 0, 1); if (wp < 1) { ctx.globalAlpha = 1 - wp * wp; prop(ctx, 'hero_b', hx, hy + cs * 0.5, cs * 1.12 * (1 - wp * 0.4), V.hero.face < 0); ctx.globalAlpha = 1; } }
  else if (fi && fi.reason === 'stuck') { ctx.globalAlpha = 1 - fpz * 0.85; ctx.save(); ctx.translate(hx, hy + cs * 0.5); ctx.rotate(fpz * 0.9); prop(ctx, has('hero_fall') ? 'hero_fall' : 'hero_a', 0, 0, cs * 1.12 * (1 - fpz * 0.6), V.hero.face < 0); ctx.restore(); ctx.globalAlpha = 1; }
  else { prop(ctx, fi && fi.reason === 'burned' && has('hero_hot') ? 'hero_hot' : hp < 1 ? 'hero_b' : 'hero_a', hx + wob, hy + cs * 0.5, cs * 1.12, V.hero.face < 0, 1, idle);
    if (fi && fi.reason === 'burned') { ctx.globalCompositeOperation = 'lighter'; glow(hx, hy, cs * 0.9, '255,120,40', 0.7 * (1 - fpz)); ctx.globalCompositeOperation = 'source-over'; flameShape(hx, hy + cs * 0.3, 1.5, 3); }
    if (fi && fi.reason === 'seen') { const seenBy = L.guards.filter((c, k) => (fi.to.guardAlive >> k & 1) && (C.patchOf(L, fi.to.lit, k) || []).includes(fi.cell)); ctx.strokeStyle = `rgba(255,77,94,${0.9 - fpz * 0.5})`; ctx.lineWidth = 3; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
      for (const c of seenBy) { ctx.beginPath(); ctx.moveTo(cellX(c), cellY(c) - cs * 0.3); ctx.lineTo(hx, hy - cs * 0.1); ctx.stroke(); } ctx.setLineDash([]); } }
  if (same && !S.won && !wet) flameShape(fx, fy + cs * 0.2, 0.95, 0);                                       // на старте огонёк виден целиком рядом с героем
  // подсказки и руководство
  if (V.idea) drawIdea(V.idea);
  if (pointed !== undefined && pointed >= 0 && !S.over && now >= V.failUntil) goArrow(pcell(S), pointed);
  // частицы
  for (const p of V.parts) { p.age += dtMs; const k = p.age / p.life; if (k >= 1) continue; p.x += p.vx * dtMs / 1000; p.y += p.vy * dtMs / 1000; p.vy += p.g * dtMs / 1000; p.vx *= 0.985;
    if (p.kind === 'ember' || p.kind === 'star') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.col; ctx.globalAlpha = (1 - k) * 0.95; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    else if (p.kind === 'smoke') { ctx.fillStyle = p.col; ctx.globalAlpha = (1 - k) * 0.42; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k * 1.1), 0, 7); ctx.fill(); }
    else if (p.kind === 'bang') { ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85; text2('!', p.x, p.y, p.size, p.col); }
    ctx.globalAlpha = 1; }
  V.parts = V.parts.filter(p => p.age < p.life);
  // пузырёк с пояснением
  if (V.bubble && now < V.bubble.until) { const b = V.bubble; ctx.font = font(13, 700); const tw = ctx.measureText(b.text).width + 22, x = clamp(cellX(b.cell) - tw / 2, 8, VW - tw - 8), y = Math.max(CONFIG.top + 6, cellY(b.cell) - cs * 0.95 - 30); ctx.globalAlpha = clamp((b.until - now) / 300, 0, 1);
    ctx.fillStyle = PAL.ink; rr(ctx, x - 2, y - 2, tw + 4, 32, 12); ctx.fill(); ctx.fillStyle = '#2b3364'; rr(ctx, x, y, tw, 28, 10); ctx.fill(); ctx.fillStyle = PAL.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, x + tw / 2, y + 14.5); ctx.globalAlpha = 1; }
  ctx.restore(); }
function text2(s, x, y, px, col) { ctx.font = font(px, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, px * 0.24); ctx.strokeStyle = PAL.ink; ctx.strokeText(s, x, y); ctx.fillStyle = col || PAL.cream; ctx.fillText(s, x, y); }
// ступень 1 подсказки: значок с указателем над тем, что в решении загорится (огонёк), останется тёмным (крестик) или пригодится (галочка); сам предмет обведён
function drawIdea(idea) { const cs = F.cell, st = idea.story, t = now / 1000, bob = Math.sin(t * 4) * 2, a = clamp((now - idea.t0) / 250, 0, 1), r = cs * 0.2;
  const badge = (c, kind) => { const hid = c - M.L.W === pcell(M.S), x = cellX(c) + (hid ? cs * 0.5 : 0), y = cellY(c) - cs * (hid ? 0.62 : 0.98) + bob,      // герой стоит над предметом — значок сдвигается вбок, а не ему на лицо
    col = kind === 'fire' ? '#ffb347' : kind === 'ok' ? PAL.teal : '#56609a'; ctx.globalAlpha = a;
    { const bx = F.x + (c % M.L.W) * cs + 3, by0 = F.y + Math.floor(c / M.L.W) * cs + 3, w = cs - 6, q = cs * 0.24, br = (wd, cl) => { ctx.strokeStyle = cl; ctx.lineWidth = wd; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const px0 = bx + sx * w, py0 = by0 + sy * w, dx = sx ? -q : q, dy = sy ? -q : q; ctx.moveTo(px0 + dx, py0); ctx.lineTo(px0, py0); ctx.lineTo(px0, py0 + dy); } ctx.stroke(); }; br(6, PAL.ink); br(3, col); }
    const shape = (g, colr) => { ctx.fillStyle = colr; ctx.beginPath(); ctx.arc(x, y, r + g, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - r * 0.5 - g, y + r * 0.7); ctx.lineTo(x, y + r * 1.75 + g * 1.4); ctx.lineTo(x + r * 0.5 + g, y + r * 0.7); ctx.closePath(); ctx.fill(); }; shape(2.6, PAL.ink); shape(0, col);
    ctx.strokeStyle = kind === 'no' ? PAL.text : PAL.ink; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const q = r * 0.42;
    if (kind === 'fire') flameShape(x, y + r * 0.58, 0.8, c, cs * 0.6, ['#7a2a10', '#c9361a', '#fff3c4']);
    else if (kind === 'no') { ctx.beginPath(); ctx.moveTo(x - q, y - q); ctx.lineTo(x + q, y + q); ctx.moveTo(x + q, y - q); ctx.lineTo(x - q, y + q); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.36); ctx.stroke(); } ctx.globalAlpha = 1; };
  for (const c of st.lampsOn) badge(c, 'fire'); for (const c of st.woodBurn) badge(c, 'fire'); for (const c of st.guardsBurn) badge(c, 'fire'); for (const c of st.lampsOff) badge(c, 'no'); for (const c of st.spoolsSkip) badge(c, 'no'); for (const c of st.spoolsTake) badge(c, 'ok'); }
