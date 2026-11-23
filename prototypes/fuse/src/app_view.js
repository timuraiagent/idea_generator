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
function rasterAtlas() { if (!atlas.img) return; const k = clamp(Math.ceil(CONFIG.cellMax * SC * DPR * 1.3 / 128 * 4) / 4, 1, 3); if (k === atlas.k) return;      // один размер на экран: смена уровня не перерисовывает лист
  const c = atlas.cv || (atlas.cv = document.createElement('canvas')); c.width = 1024 * k; c.height = 384 * k; c.getContext('2d').drawImage(atlas.img, 0, 0, c.width, c.height);
  const d = atlas.dk || (atlas.dk = document.createElement('canvas')), x = d.getContext('2d'); d.width = c.width; d.height = c.height; x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(16,22,62,0.52)'; x.fillRect(0, 0, d.width, d.height);   // тёмный вид: приглушён и остужен
  atlas.k = k; V.baseDirty = true; }
// спрайт целиком в прямоугольник; part — доля высоты спрайта сверху (для передней грани стены)
function spr(c, name, x, y, w, h, flip, part, src) { const s = SPR[name], A = src || atlas.cv; if (!A || !s) return false; const k = atlas.k * 128, sh = k * (part || 1);
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
  F.x = Math.round((VW - L.W * F.cell) / 2); F.y = Math.round(top + (bot - top - L.H * F.cell) / 2 + F.cell * 0.12); rasterAtlas(); V.baseDirty = true; }
const cellX = c => F.x + (c % M.L.W + 0.5) * F.cell, cellY = c => F.y + (Math.floor(c / M.L.W) + 0.5) * F.cell;
function cellAt(px, py) { const L = M.L, x = Math.floor((px - F.x) / F.cell), y = Math.floor((py - F.y) / F.cell); return (x < 0 || y < 0 || x >= L.W || y >= L.H) ? -1 : y * L.W + x; }
const isWall = (x, y) => { const L = M.L; return x < 0 || y < 0 || x >= L.W || y >= L.H || L.type[y * L.W + x] === C.WALL; };

// неподвижный слой: пол со швами, тёмный верх стен, передние грани, контур комнаты, оттенок мира, затухание края
const FLOORS = ['floor_a', 'floor_b', 'floor_c'];
function buildBase() { const L = M.L, px = Math.round(F.cell * SC * DPR), b = V.base || (V.base = document.createElement('canvas')); b.width = (L.W + 2) * px; b.height = (L.H + 2) * px; const c = b.getContext('2d'), W = b.width, H = b.height, DK = `rgba(${PAL.dark},`;
  const cells = fn => { for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (!isWall(x, y)) fn(x, y, (x + 1) * px, (y + 1) * px); }, seg = (x0, y0, x1, y1) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  for (let y = -1; y <= L.H; y++) for (let x = -1; x <= L.W; x++) { const dx = (x + 1) * px, dy = (y + 1) * px;
    if (isWall(x, y)) { if (!spr(c, 'wall_top', dx, dy, px, px)) { c.fillStyle = '#232a47'; c.fillRect(dx, dy, px, px); } c.fillStyle = DK + '0.6)'; c.fillRect(dx, dy, px, px); }      // стены не освещаются: тёмные сразу и темнее неосвещённого пола
    else if (!spr(c, FLOORS[(x * 7 + y * 13 + x * y * 3) % 3], dx, dy, px, px)) { c.fillStyle = '#3b4563'; c.fillRect(dx, dy, px, px); } }
  c.strokeStyle = 'rgba(9,11,28,0.62)'; c.lineWidth = Math.max(1, Math.round(px * 0.035));                                                                                      // швы между клетками пола: игрок считает клетки
  cells((x, y, dx, dy) => { if (!isWall(x + 1, y)) seg(dx + px, dy, dx + px, dy + px); if (!isWall(x, y + 1)) seg(dx, dy + px, dx + px, dy + px); });
  for (let y = -1; y < L.H; y++) for (let x = 0; x < L.W; x++) if (isWall(x, y) && !isWall(x, y + 1)) { const dx = (x + 1) * px, dy = (y + 1) * px, fh = Math.round(px * 0.46);      // передняя грань стены над полом и тень под ней
    if (!spr(c, 'wall_front', dx, dy + px - fh, px, fh, false, 56 / 128)) { c.fillStyle = '#2a3252'; c.fillRect(dx, dy + px - fh, px, fh); } c.fillStyle = DK + '0.16)'; c.fillRect(dx, dy + px - fh, px, fh);
    const g = c.createLinearGradient(0, dy + px, 0, dy + px + px * 0.3); g.addColorStop(0, 'rgba(4,5,16,0.32)'); g.addColorStop(1, 'rgba(4,5,16,0)'); c.fillStyle = g; c.fillRect(dx, dy + px, px, px * 0.3); }
  const ink = Math.max(2, Math.round(px * 0.07)), lip = Math.max(1, Math.round(px * 0.03)), off = ink / 2 + lip;                                                                // контур комнаты: тёмная линия по границе пола и светлая кромка внутри
  cells((x, y, dx, dy) => { const Lw = isWall(x - 1, y), Rw = isWall(x + 1, y), Bw = isWall(x, y + 1); c.strokeStyle = '#090b1a'; c.lineWidth = ink; if (Lw) seg(dx, dy, dx, dy + px); if (Rw) seg(dx + px, dy, dx + px, dy + px); if (Bw) seg(dx, dy + px, dx + px, dy + px);
    c.strokeStyle = 'rgba(150,165,230,0.3)'; c.lineWidth = lip; if (Lw) seg(dx + off, dy, dx + off, dy + px - (Bw ? off : 0)); if (Rw) seg(dx + px - off, dy, dx + px - off, dy + px - (Bw ? off : 0)); if (Bw) seg(dx + (Lw ? off : 0), dy + px - off, dx + px - (Rw ? off : 0), dy + px - off); });
  c.globalCompositeOperation = 'multiply'; c.fillStyle = WORLDS[LEVELS[M.idx].w - 1].tint; c.fillRect(0, 0, W, H);                                                               // оттенок мира: перекрашен подвал, предметы прежние
  c.globalCompositeOperation = 'destination-out';                                                                                                                                // подвал уходит во тьму за краем поля
  const fade = (x0, y0, x1, y1, rx, ry, rw, rh) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(rx, ry, rw, rh); };
  const e = px * 0.8; fade(0, 0, e, 0, 0, 0, e, H); fade(W, 0, W - e, 0, W - e, 0, e, H); fade(0, 0, 0, e, 0, 0, W, e); fade(0, H, 0, H - e, 0, H - e, W, e);
  c.globalCompositeOperation = 'source-over'; V.baseDirty = false; }

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
const FIRE1 = [PAL.hot, '#ffab36', PAL.core], FIRE2 = ['#c9361a', '#f0762a', '#ffc46a'];      // огонёк на шнуре и пожар на клетке: пожар ниже и темнее
function flameShape(x, y, s, phase, u, pal, wide) { const t = now / 1000, w = (u || F.cell) * 0.2 * s * (wide || 1), h = (u || F.cell) * 0.56 * s / (wide || 1), P = pal || FIRE1;
  const lay = (col, k, ph) => { const sway = Math.sin(t * 8.5 + phase + ph) * w * 0.34 * k, hh = h * k * (1 + Math.sin(t * 15 + phase * 1.7 + ph) * 0.09), ww = w * k; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - ww, y);
    ctx.bezierCurveTo(x - ww * 1.25, y - hh * 0.45, x - ww * 0.2 + sway, y - hh * 0.7, x + sway, y - hh); ctx.bezierCurveTo(x + ww * 0.3 + sway * 0.4, y - hh * 0.66, x + ww * 1.25, y - hh * 0.45, x + ww, y); ctx.bezierCurveTo(x + ww * 0.8, y + ww * 0.75, x - ww * 0.8, y + ww * 0.75, x - ww, y); ctx.fill(); };
  lay(P[0], 1, 0); lay(P[1], 0.74, 1.3); lay(P[2], 0.42, 2.1); }
// стрелка «иди сюда»: одна на всю игру — и для руководства на вводных уровнях, и для подсказки-шага
function goArrow(from, to) { const cs = F.cell, t = now / 1000, x0 = cellX(from), y0 = cellY(from), x1 = cellX(to), y1 = cellY(to), k = (Math.sin(t * 5) + 1) / 2, ax = lerp(x0, x1, 0.62 + k * 0.16), ay = lerp(y0, y1, 0.62 + k * 0.16);
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(y1 - y0, x1 - x0)); const tri = (s, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cs * 0.3 * s, 0); ctx.lineTo(-cs * 0.16 * s, -cs * 0.27 * s); ctx.lineTo(-cs * 0.05 * s, 0); ctx.lineTo(-cs * 0.16 * s, cs * 0.27 * s); ctx.closePath(); ctx.fill(); }; tri(1.28, PAL.ink); tri(1, PAL.teal); ctx.restore(); }
function hatchPattern() { if (V.hatch) return V.hatch; const c = document.createElement('canvas'), n = Math.max(8, Math.round(9 * SC * DPR)); c.width = c.height = n; const x = c.getContext('2d'); x.strokeStyle = 'rgba(255,77,94,0.62)'; x.lineWidth = n * 0.2; x.lineCap = 'square';
  for (const o of [-n, 0, n]) { x.beginPath(); x.moveTo(o, n); x.lineTo(o + n, 0); x.stroke(); } V.hatch = ctx.createPattern(c, 'repeat'); V.hatchScale = 1 / (SC * DPR); return V.hatch; }
function drawField() { const L = M.L, S = V.shown, cs = F.cell, lit = S.lit, t = now / 1000; if (V.baseDirty || !V.base) buildBase();
  if (V.cacheS !== S) { V.cacheS = S; V.pv = C.preview(L, S, -1); V.legal = C.legal(L, S); V.seenNow = C.seenCells(L, lit, S.guardAlive); V.patches = L.guards.map((c, g) => (S.guardAlive >> g & 1) ? C.patchOf(L, lit, g) : null); V.spv = new Map(); for (const m of V.legal) if (L.spoolAt[m.cell] >= 0) V.spv.set(m.cell, C.preview(L, S, m.cell)); }      // расчёты хода — один раз на состояние, не на кадр
  let ox = 0, oy = 0; if (now < V.shakeUntil) { const p = (V.shakeUntil - now) / 260; ox = Math.sin(now * 0.09) * 4 * p; oy = Math.cos(now * 0.11) * 3 * p; }
  ctx.save(); ctx.translate(ox, oy);
  ctx.drawImage(V.base, F.x - cs, F.y - cs, (L.W + 2) * cs, (L.H + 2) * cs);
  const LI = V.lightI, kf = 1 - Math.exp(-dtMs / 80); for (let i = 0; i < L.n; i++) LI[i] += (lit[i] - LI[i]) * kf;                       // свет плавно догоняет логику
  const flameCell = S.tail[0], N = C.fuseLen(L, S.spools), willFall = !S.over && S.tail.length === N + 1 && L.type[flameCell] === C.FLOOR, cellPx = i => [F.x + (i % L.W) * cs, F.y + Math.floor(i / L.W) * cs];
  // пол: провалы, камень, вода, масло, зола, трещина
  for (let i = 0; i < L.n; i++) { const ty = L.type[i]; if (ty === C.WALL) continue; const [x, y] = cellPx(i), d = S.d[i];
    if (d & C.PIT) { spr(ctx, 'pit', x, y, cs, cs, (i * 7 + 3) % 5 < 2); const f0 = V.falls.get(i); if (f0 !== undefined) { const p = (now - f0) / 340; if (p >= 1) V.falls.delete(i); else { ctx.save(); ctx.globalAlpha = 1 - p; ctx.translate(x + cs / 2, y + cs / 2 + p * cs * 0.18); ctx.rotate(p * 0.5); const s2 = cs * (1 - p * 0.85); spr(ctx, 'floor_a', -s2 / 2, -s2 / 2, s2, s2); ctx.restore(); } } continue; }
    if (ty === C.STONE) spr(ctx, 'stone', x + cs * 0.05, y + cs * 0.04, cs * 0.9, cs * 0.9);
    else if (ty === C.WATER) spr(ctx, 'water', x + cs * 0.02, y + cs * 0.04, cs * 0.96, cs * 0.96);
    if (d & (C.OIL | C.BURN)) spr(ctx, 'oil', x, y, cs, cs);
    if (V.ash.has(i)) spr(ctx, 'ash', x, y, cs, cs);
    if (i === flameCell && willFall) { ctx.globalAlpha = 0.75 + Math.sin(t * 7) * 0.25; spr(ctx, 'crack', x, y, cs, cs); ctx.globalAlpha = 1; } }
  // тьма и свет — строго по клеткам: тёмная клетка затемнена целиком, освещённая — с ровным тёплым тоном
  const flick = 0.97 + Math.sin(t * 11) * 0.03;
  for (let i = 0; i < L.n; i++) { const [x, y] = cellPx(i);
    if (L.type[i] === C.WALL) { const b = i + L.W; if (b < L.n && L.type[b] !== C.WALL) { const fh = Math.round(cs * 0.46); ctx.fillStyle = `rgba(${PAL.dark},${CONFIG.dark * (1 - LI[b] * 0.8)})`; ctx.fillRect(x, y + cs - fh, cs, fh); } continue; }
    const I = LI[i]; if (I < 0.99) { ctx.fillStyle = `rgba(${PAL.dark},${CONFIG.dark * (1 - I)})`; ctx.fillRect(x, y, cs, cs); }
    if (I > 0.01) { ctx.fillStyle = `rgba(255,186,104,${0.2 * I * flick})`; ctx.fillRect(x, y, cs, cs); const f0 = V.flash.get(i); if (f0 !== undefined) { const p = (now - f0) / 380; if (p >= 1) V.flash.delete(i); else if (p >= 0) { ctx.fillStyle = `rgba(255,236,170,${0.42 * (1 - p)})`; ctx.fillRect(x, y, cs, cs); } } } }
  // пятна неспящих стражей: штриховка по каждой клетке и замкнутый контур — «здесь тебя видят»
  for (let g = 0; g < L.guards.length; g++) { const p = V.patches[g]; if (!p) continue; const inP = new Set(p), pat = hatchPattern(); ctx.save(); ctx.scale(V.hatchScale, V.hatchScale); ctx.fillStyle = pat; ctx.globalAlpha = 0.75 + Math.sin(t * 4) * 0.2;
    for (const c of p) { const [x, y] = cellPx(c); ctx.fillRect(x / V.hatchScale, y / V.hatchScale, cs / V.hatchScale, cs / V.hatchScale); } ctx.restore();
    const edges = col => { ctx.strokeStyle = col; ctx.beginPath(); for (const c of p) { const [x, y] = cellPx(c), cx0 = c % L.W, cy0 = Math.floor(c / L.W);
        if (cy0 === 0 || !inP.has(c - L.W)) { ctx.moveTo(x, y + 1.5); ctx.lineTo(x + cs, y + 1.5); } if (cy0 === L.H - 1 || !inP.has(c + L.W)) { ctx.moveTo(x, y + cs - 1.5); ctx.lineTo(x + cs, y + cs - 1.5); }
        if (cx0 === 0 || !inP.has(c - 1)) { ctx.moveTo(x + 1.5, y); ctx.lineTo(x + 1.5, y + cs); } if (cx0 === L.W - 1 || !inP.has(c + 1)) { ctx.moveTo(x + cs - 1.5, y); ctx.lineTo(x + cs - 1.5, y + cs); } } ctx.stroke(); };
    ctx.lineCap = 'square'; ctx.lineWidth = 6; edges('rgba(17,20,42,0.85)'); ctx.lineWidth = 3.2; edges(PAL.red); }
  // предметы по рядам сверху вниз; у каждого тёмный и светлый вид, по свету своей клетки — в темноте видны, но приглушены и без тёплых тонов
  for (let i = 0; i < L.n; i++) { const ty = L.type[i], x = cellX(i), yb = F.y + (Math.floor(i / L.W) + 1) * cs, d = S.d[i], I = LI[i];
    if (ty === C.LAMP) { const on = S.lampLit >> L.lampAt[i] & 1, t0 = V.lampOn.get(i), shown = on && (t0 === undefined || now >= t0), pop = t0 !== undefined ? clamp((now - t0) / 260, 0, 1) : 1, s = 1 + (shown ? Math.sin(pop * Math.PI) * 0.16 : 0); prop(ctx, shown ? 'lamp_on' : 'lamp_off', x, yb, cs * 1.08 * s, false, 1, 1, shown ? 1 : I); }
    else if (ty === C.DOOR) { const open = lit[i] || S.won; prop(ctx, open ? 'door_open' : 'door_closed', x, yb + cs * 0.02, cs * 1.12, false, 1, 1, open ? 1 : I); }
    if (d & (C.WOOD | C.BURNW)) prop(ctx, 'wood', x, yb + cs * 0.02, cs * 1.04, false, 1, 1, (d & C.BURNW) ? 1 : I);
    const sp = L.spoolAt[i]; if (sp >= 0 && !(S.spools >> sp & 1)) { prop(ctx, 'spool', x, yb - cs * 0.1 + Math.sin(t * 2.4 + i) * cs * 0.03, cs * 0.8, false, 1, 1, Math.max(I, 0.35)); text2('+' + L.spoolAdd[sp], x + cs * 0.3, yb - cs * 0.72, cs * 0.3); }
    const g = L.guardAt[i]; if (g >= 0 && (S.guardAlive >> g & 1)) { const awake = lit[i], t0 = V.guardPop.get(i), up = awake && (t0 === undefined || now >= t0), pop = t0 !== undefined ? clamp((now - t0) / 300, 0, 1) : 1, s = 1 + Math.sin(pop * Math.PI) * 0.2;
      if (up) { ctx.fillStyle = `rgba(255,60,84,${0.3 + Math.sin(t * 6) * 0.12})`; ctx.beginPath(); ctx.ellipse(x, yb - cs * 0.1, cs * 0.42, cs * 0.14, 0, 0, 7); ctx.fill(); prop(ctx, 'guard_awake', x, yb, cs * 1.16 * s); }
      else { ctx.save(); ctx.translate(x, yb); ctx.rotate(-0.13); prop(ctx, 'guard_sleep', cs * 0.02, cs * 0.03, cs * 1.0, false, 1, 1 + Math.sin(t * 1.6 + i) * 0.015, I); ctx.restore(); } } }
  // свечение — только там, где по правилам светло: обрезано по освещённым клеткам
  const hp = clamp((now - V.hero.t0) / CONFIG.stepMs, 0, 1), fp = clamp((now - V.flame.t0) / (CONFIG.stepMs * 1.15), 0, 1), same = S.tail.length === 1 && fp >= 1;
  let fx = lerp(V.flame.fx, V.flame.x, easeInOut(fp)), fy = lerp(V.flame.fy, V.flame.y, easeInOut(fp)); if (same) { fx -= cs * 0.3 * V.hero.face; fy += cs * 0.06; }                    // на старте огонёк стоит за спиной героя, а не под ним
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
    line(PAL.ink, cs * 0.15); line(PAL.cream, cs * 0.075);
    const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[1][0], pts[1][1]); g.addColorStop(0, PAL.hot); g.addColorStop(1, 'rgba(255,170,70,0)'); ctx.strokeStyle = g; ctx.lineWidth = cs * 0.075; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke();
    for (let k = 1; k < pts.length - 1; k++) { ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(pts[k][0], pts[k][1], cs * 0.1, 0, 7); ctx.fill(); ctx.fillStyle = PAL.cream; ctx.beginPath(); ctx.arc(pts[k][0], pts[k][1], cs * 0.062, 0, 7); ctx.fill(); } }
  // пожар на клетках (ниже и темнее) и сам огонёк
  for (let i = 0; i < L.n; i++) if (S.d[i] & C.FIRE) { const x = cellX(i), y = cellY(i) + cs * 0.3; flameShape(x - cs * 0.24, y, 0.62, i, 0, FIRE2, 1.25); flameShape(x + cs * 0.22, y - cs * 0.03, 0.7, i + 2, 0, FIRE2, 1.25); flameShape(x, y + cs * 0.05, 0.86, i + 4, 0, FIRE2, 1.25); if (Math.random() < 0.25) part({ kind: 'ember', x: x + (Math.random() - 0.5) * cs * 0.6, y: y - cs * 0.2, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30, life: 600, size: 2.2, col: '#ff9a4a' }); }
  if (!S.won) { if (wet) { ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(fx, fy + cs * 0.12, cs * 0.13, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(214,96,52,${0.75 + Math.sin(t * 6) * 0.2})`; ctx.beginPath(); ctx.arc(fx, fy + cs * 0.12, cs * 0.08, 0, 7); ctx.fill(); if (Math.random() < 0.12) part({ kind: 'smoke', col: '#aab4d8', x: fx, y: fy, vx: (Math.random() - 0.5) * 10, vy: -26, life: 900, size: 4 }); }
    else { flameShape(fx, fy + cs * 0.2, same ? 0.95 : 1.25, 0); if (Math.random() < 0.2) part({ kind: 'ember', x: fx + (Math.random() - 0.5) * cs * 0.3, y: fy - cs * 0.2, vx: (Math.random() - 0.5) * 16, vy: -40 - Math.random() * 30, life: 800, size: 2.2 }); } }
  // знаки: куда можно шагнуть (кольцо); что загорится и где увидят следующим ходом (пунктир)
  const pointed = V.move && !S.over ? V.move.cell : V.guideCell;
  if (!S.over && now >= V.failUntil && S === M.S) { const pv = V.pv, a = 0.55 + Math.sin(t * 6) * 0.3;
    for (let i = 0; i < L.n; i++) { const [x, y] = cellPx(i);
      if (pv.burn[i]) { ctx.strokeStyle = `rgba(255,150,50,${a})`; ctx.lineWidth = 2.4; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 14; rr(ctx, x + 4, y + 4, cs - 8, cs - 8, 7); ctx.stroke(); ctx.setLineDash([]); }
      else if (pv.seen[i] && !V.seenNow[i]) { ctx.strokeStyle = `rgba(255,77,94,${a * 0.85})`; ctx.lineWidth = 2.2; ctx.setLineDash([3, 6]); ctx.lineDashOffset = -t * 10; rr(ctx, x + 4, y + 4, cs - 8, cs - 8, 7); ctx.stroke(); ctx.setLineDash([]); } }
    for (const m of V.legal) { if (m.cell === pointed) continue; const x = cellX(m.cell), y = cellY(m.cell), sp = V.spv.get(m.cell) || pv, bad = sp.burn[m.cell] || sp.seen[m.cell];
      if (m.win) { ctx.strokeStyle = `rgba(255,243,196,${a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - cs * 0.05, cs * 0.5, 0, 7); ctx.stroke(); continue; }
      if (bad) { ctx.lineCap = 'round'; const r = cs * 0.1, cross = (col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); }; cross(PAL.ink, 6); cross(`rgba(255,77,94,${0.7 + a * 0.3})`, 3); }
      else { ctx.strokeStyle = 'rgba(11,14,34,0.6)'; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.arc(x, y, cs * 0.115, 0, 7); ctx.stroke(); ctx.strokeStyle = `rgba(238,241,255,${0.55 + a * 0.3})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, cs * 0.115, 0, 7); ctx.stroke(); } } }
  // спящие стражи: крупное «z z z» над головой
  for (let g = 0; g < L.guards.length; g++) if ((S.guardAlive >> g & 1) && !lit[L.guards[g]]) { const c = L.guards[g]; for (let k = 0; k < 3; k++) { const ph = (t * 0.7 + k * 0.33) % 1, x = cellX(c) + cs * (0.14 + k * 0.15), y = cellY(c) - cs * (0.42 + k * 0.2) - ph * cs * 0.06; ctx.globalAlpha = 0.55 + Math.sin((t * 0.7 + k * 0.33) * Math.PI * 2) * 0.35; text2('z', x, y, cs * (0.2 + k * 0.07), '#c8d2ff'); } ctx.globalAlpha = 1; }
  // герой
  const fi = V.failInfo && now < V.failUntil ? V.failInfo : null, fpz = fi ? clamp((now - (V.failUntil - CONFIG.failMs) - 150) / (CONFIG.failMs - 150), 0, 1) : 0;
  const idle = 1 + Math.sin(t * 2.2) * 0.012, nope = clamp((now - V.hero.hop) / 220, 0, 1), wob = nope < 1 ? Math.sin(nope * Math.PI * 3) * cs * 0.05 : 0;
  if (!S.won && !(fi && fi.reason === 'stuck')) { ctx.fillStyle = 'rgba(4,5,16,0.42)'; ctx.beginPath(); ctx.ellipse(hx, hy0 + cs * 0.4, cs * 0.26 * (1 - Math.sin(hp * Math.PI) * 0.2), cs * 0.09, 0, 0, 7); ctx.fill(); }
  if (S.won) { const wp = clamp((now - V.winAt) / 300, 0, 1); if (wp < 1) { ctx.globalAlpha = 1 - wp * wp; prop(ctx, 'hero_b', hx, hy + cs * 0.5, cs * 1.12 * (1 - wp * 0.4), V.hero.face < 0); ctx.globalAlpha = 1; } }
  else if (fi && fi.reason === 'stuck') { ctx.globalAlpha = 1 - fpz * 0.85; ctx.save(); ctx.translate(hx, hy + cs * 0.5); ctx.rotate(fpz * 0.9); prop(ctx, 'hero_a', 0, 0, cs * 1.12 * (1 - fpz * 0.6), V.hero.face < 0); ctx.restore(); ctx.globalAlpha = 1; }
  else { prop(ctx, hp < 1 ? 'hero_b' : 'hero_a', hx + wob, hy + cs * 0.5, cs * 1.12, V.hero.face < 0, 1, idle);
    if (fi && fi.reason === 'burned') { ctx.globalCompositeOperation = 'lighter'; glow(hx, hy, cs * 0.9, '255,120,40', 0.7 * (1 - fpz)); ctx.globalCompositeOperation = 'source-over'; flameShape(hx, hy + cs * 0.3, 1.5, 3); }
    if (fi && fi.reason === 'seen') { const seenBy = L.guards.filter((c, k) => (fi.to.guardAlive >> k & 1) && (C.patchOf(L, fi.to.lit, k) || []).includes(fi.cell)); ctx.strokeStyle = `rgba(255,77,94,${0.9 - fpz * 0.5})`; ctx.lineWidth = 3; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
      for (const c of seenBy) { ctx.beginPath(); ctx.moveTo(cellX(c), cellY(c) - cs * 0.3); ctx.lineTo(hx, hy - cs * 0.1); ctx.stroke(); } ctx.setLineDash([]); } }
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
  const badge = (c, kind) => { const x = cellX(c), y = cellY(c) - cs * 0.98 + bob, col = kind === 'fire' ? '#ffb347' : kind === 'ok' ? PAL.teal : '#56609a'; ctx.globalAlpha = a;
    ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 12; rr(ctx, F.x + (c % M.L.W) * cs + 3, F.y + Math.floor(c / M.L.W) * cs + 3, cs - 6, cs - 6, 8); ctx.stroke(); ctx.setLineDash([]);
    const shape = (g, colr) => { ctx.fillStyle = colr; ctx.beginPath(); ctx.arc(x, y, r + g, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - r * 0.5 - g, y + r * 0.7); ctx.lineTo(x, y + r * 1.75 + g * 1.4); ctx.lineTo(x + r * 0.5 + g, y + r * 0.7); ctx.closePath(); ctx.fill(); }; shape(2.6, PAL.ink); shape(0, col);
    ctx.strokeStyle = kind === 'no' ? PAL.text : PAL.ink; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const q = r * 0.42;
    if (kind === 'fire') flameShape(x, y + r * 0.58, 0.8, c, cs * 0.6, ['#7a2a10', '#c9361a', '#fff3c4']);
    else if (kind === 'no') { ctx.beginPath(); ctx.moveTo(x - q, y - q); ctx.lineTo(x + q, y + q); ctx.moveTo(x + q, y - q); ctx.lineTo(x - q, y + q); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.36); ctx.stroke(); } ctx.globalAlpha = 1; };
  for (const c of st.lampsOn) badge(c, 'fire'); for (const c of st.woodBurn) badge(c, 'fire'); for (const c of st.guardsBurn) badge(c, 'fire'); for (const c of st.lampsOff) badge(c, 'no'); for (const c of st.spoolsSkip) badge(c, 'no'); for (const c of st.spoolsTake) badge(c, 'ok'); }
