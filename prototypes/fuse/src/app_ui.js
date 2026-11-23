// ===== интерфейс: экраны, кнопки, ввод, главный цикл =====
const UI = { screen: 'play', shownScreen: 'play', fadeT: -1e9, btns: [], mapW: 0, card: null, winAt: 0, win: null, statScroll: 0, resetArm: 0, copiedAt: 0, toast: null, press: null, mapSlide: 0 };
const perf = { n: 0, sum: 0, max: 0, frames: 0, gap: 0, slow: 0 };      // sum/max — время кода отрисовки; gap/slow — промежутки между кадрами и сколько из них дольше 25 мс
const wOf = i => LEVELS[i].w, numInWorld = i => worldLevels(wOf(i)).indexOf(i) + 1, totalStars = () => LEVELS.reduce((a, l, i) => a + starsOf(i), 0);
function btn(x, y, w, h, fn, id) { UI.btns.push({ x, y, w, h, fn, id }); return UI.press && UI.press.id === id; }

// ---------- значки (кодом) ----------
const ICON = {
  undo(x, y, r) { ctx.beginPath(); ctx.moveTo(x + r * 0.5, y); ctx.lineTo(x - r * 0.44, y); ctx.moveTo(x - r * 0.06, y - r * 0.4); ctx.lineTo(x - r * 0.48, y); ctx.lineTo(x - r * 0.06, y + r * 0.4); ctx.stroke(); },      // отмена — прямая стрелка назад, «заново» — круговая: не спутать
  restart(x, y, r) { const q = r * 0.48, a1 = Math.PI * 1.42, ex = x + Math.cos(a1) * q, ey = y + Math.sin(a1) * q, tx = -Math.sin(a1), ty = Math.cos(a1), h = r * 0.34;      // почти полный круг по часовой и стрелка на конце
    ctx.beginPath(); ctx.arc(x, y, q, -Math.PI * 0.18, a1); ctx.stroke(); const rot = (a) => [tx * Math.cos(a) - ty * Math.sin(a), tx * Math.sin(a) + ty * Math.cos(a)], tipx = ex + tx * h * 0.45, tipy = ey + ty * h * 0.45, [ax, ay] = rot(2.5), [bx, by] = rot(-2.5);
    ctx.beginPath(); ctx.moveTo(tipx + ax * h, tipy + ay * h); ctx.lineTo(tipx, tipy); ctx.lineTo(tipx + bx * h, tipy + by * h); ctx.stroke(); },
  hint(x, y, r) { ctx.beginPath(); ctx.arc(x, y - r * 0.16, r * 0.42, Math.PI * 0.78, Math.PI * 0.22); ctx.lineTo(x + r * 0.2, y + r * 0.36); ctx.lineTo(x - r * 0.2, y + r * 0.36); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - r * 0.16, y + r * 0.58); ctx.lineTo(x + r * 0.16, y + r * 0.58); ctx.stroke(); },
  grid(x, y, r) { const q = r * 0.2; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { rr(ctx, x + a * r * 0.3 - q, y + b * r * 0.3 - q, q * 2, q * 2, q * 0.5); ctx.stroke(); } },
  next(x, y, r) { ctx.beginPath(); ctx.moveTo(x - r * 0.5, y); ctx.lineTo(x + r * 0.42, y); ctx.moveTo(x + r * 0.05, y - r * 0.4); ctx.lineTo(x + r * 0.46, y); ctx.lineTo(x + r * 0.05, y + r * 0.4); ctx.stroke(); },
  prev(x, y, r) { ctx.beginPath(); ctx.moveTo(x + r * 0.3, y - r * 0.5); ctx.lineTo(x - r * 0.25, y); ctx.lineTo(x + r * 0.3, y + r * 0.5); ctx.stroke(); },
  fwd(x, y, r) { ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r * 0.5); ctx.lineTo(x + r * 0.25, y); ctx.lineTo(x - r * 0.3, y + r * 0.5); ctx.stroke(); },
  close(x, y, r) { ctx.beginPath(); ctx.moveTo(x - r * 0.38, y - r * 0.38); ctx.lineTo(x + r * 0.38, y + r * 0.38); ctx.moveTo(x + r * 0.38, y - r * 0.38); ctx.lineTo(x - r * 0.38, y + r * 0.38); ctx.stroke(); },
  sound(x, y, r, on) { ctx.beginPath(); ctx.moveTo(x - r * 0.56, y - r * 0.18); ctx.lineTo(x - r * 0.24, y - r * 0.18); ctx.lineTo(x + r * 0.08, y - r * 0.46); ctx.lineTo(x + r * 0.08, y + r * 0.46); ctx.lineTo(x - r * 0.24, y + r * 0.18); ctx.lineTo(x - r * 0.56, y + r * 0.18); ctx.closePath(); ctx.stroke();
    if (on) { ctx.beginPath(); ctx.arc(x + r * 0.1, y, r * 0.36, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x + r * 0.1, y, r * 0.6, -0.8, 0.8); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(x + r * 0.3, y - r * 0.22); ctx.lineTo(x + r * 0.66, y + r * 0.22); ctx.moveTo(x + r * 0.66, y - r * 0.22); ctx.lineTo(x + r * 0.3, y + r * 0.22); ctx.stroke(); } },
  list(x, y, r) { for (const k of [-0.36, 0, 0.36]) { ctx.beginPath(); ctx.moveTo(x - r * 0.46, y + r * k); ctx.lineTo(x + r * 0.46, y + r * k); ctx.stroke(); } },
  lock(x, y, r) { rr(ctx, x - r * 0.36, y - r * 0.06, r * 0.72, r * 0.56, r * 0.12); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y - r * 0.08, r * 0.24, Math.PI, 0); ctx.stroke(); },
};
function star(x, y, r, on, c) { c = c || ctx; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.46 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fillStyle = on ? '#ffc94d' : '#323b72'; c.fill(); c.lineWidth = Math.max(1.5, r * 0.16); c.lineJoin = 'round'; c.strokeStyle = on ? '#8a5a12' : '#6470b0'; c.stroke(); }
// круглая кнопка со значком
// золотое кольцо: тёмная тень, золотой обод с бликом, тёмно-индиговая середина
function goldRing(c, r, wdt) { const g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ffe39a'); g.addColorStop(0.35, '#e8b45a'); g.addColorStop(0.7, '#b8732e'); g.addColorStop(1, '#7a4418'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  const m = c.createRadialGradient(0, -r * 0.35, r * 0.1, 0, 0, r); m.addColorStop(0, '#3a3270'); m.addColorStop(1, '#1c1940'); c.fillStyle = m; c.beginPath(); c.arc(0, 0, r - wdt, 0, 7); c.fill();
  c.strokeStyle = 'rgba(60,30,10,0.55)'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, r - wdt, 0, 7); c.stroke(); }
function roundBtn(id, x, y, r, icon, fn, o) { o = o || {}; const down = btn(x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8, fn, id), s = down ? 0.94 : 1, a = o.dim ? 0.45 : 1; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(4,3,14,0.55)'; ctx.beginPath(); ctx.arc(0, 4, r, 0, 7); ctx.fill();
  if (o.primary) { const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ffd986'); g.addColorStop(1, '#e0912f'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); } else goldRing(ctx, r, Math.max(3.5, r * 0.13));
  if (o.pulse) { const k = (Math.sin(now / 240) + 1) / 2; ctx.strokeStyle = `rgba(255,214,120,${0.35 + k * 0.6})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 4 + k * 3, 0, 7); ctx.stroke(); }
  ctx.strokeStyle = o.primary ? '#3a2210' : (o.col || '#f3c86a'); ctx.lineWidth = Math.max(2.6, r * 0.12); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; icon(0, 0, r, o.arg); ctx.restore(); }
function pillBtn(id, x, y, w, h, label, fn, o) { o = o || {}; const down = btn(x, y, w, h, fn, id); ctx.save(); if (down) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.96, 0.96); ctx.translate(-x - w / 2, -y - h / 2); }
  ctx.fillStyle = 'rgba(4,3,14,0.55)'; rr(ctx, x, y + 4, w, h, h / 2); ctx.fill();
  const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#ffe39a'); gr.addColorStop(0.5, '#d99c45'); gr.addColorStop(1, '#8a5220'); ctx.fillStyle = gr; rr(ctx, x, y, w, h, h / 2); ctx.fill();      // золотой обод
  const b = 3, g = ctx.createLinearGradient(0, y, 0, y + h); if (o.primary) { g.addColorStop(0, '#ffd27a'); g.addColorStop(1, '#e3922f'); } else if (o.danger) { g.addColorStop(0, '#5a2238'); g.addColorStop(1, '#341424'); } else { g.addColorStop(0, '#332c66'); g.addColorStop(1, '#1d1a42'); }
  ctx.fillStyle = g; rr(ctx, x + b, y + b, w - b * 2, h - b * 2, (h - b * 2) / 2); ctx.fill();
  ctx.fillStyle = o.primary ? '#3a2210' : o.danger ? '#ffd6dc' : '#f6dfae'; ctx.font = font(o.size || 16, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y + h / 2 + 1); ctx.restore(); }
// резная плашка с золотым кантом и выемками по краям — под номер уровня, название мира, заголовки
function plate(x, y, w, h) { const r = h / 2, n = h * 0.22, path = (o) => { ctx.beginPath(); ctx.moveTo(x + r + o, y + o); ctx.lineTo(x + w - r - o, y + o); ctx.quadraticCurveTo(x + w - r * 0.35, y + o, x + w - r * 0.25 - o, y + n); ctx.quadraticCurveTo(x + w - o, y + h / 2, x + w - r * 0.25 - o, y + h - n);
    ctx.quadraticCurveTo(x + w - r * 0.35, y + h - o, x + w - r - o, y + h - o); ctx.lineTo(x + r + o, y + h - o); ctx.quadraticCurveTo(x + r * 0.35, y + h - o, x + r * 0.25 + o, y + h - n); ctx.quadraticCurveTo(x + o, y + h / 2, x + r * 0.25 + o, y + n); ctx.quadraticCurveTo(x + r * 0.35, y + o, x + r + o, y + o); ctx.closePath(); };
  ctx.fillStyle = 'rgba(4,3,14,0.5)'; ctx.save(); ctx.translate(0, 3); path(0); ctx.fill(); ctx.restore();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ffe39a'); g.addColorStop(0.5, '#d99c45'); g.addColorStop(1, '#8a5220'); ctx.fillStyle = g; path(0); ctx.fill(); ctx.fillStyle = PAL.plate; path(2.5); ctx.fill(); }
function text(s, x, y, px, col, w, align) { ctx.font = font(px, w || 700); ctx.fillStyle = col || PAL.text; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); }
function wrap(s, x, y, maxW, px, col, lh) { ctx.font = font(px, 600); const words = s.replace(/ — /g, '\u00a0— ').split(' '), lines = []; let cur = ''; for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; } if (cur) lines.push(cur);
  lines.forEach((ln, k) => text(ln, x, y + k * (lh || px * 1.3), px, col, 600)); return lines.length; }
function bg() { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, PAL.bg1); g.addColorStop(0.6, PAL.bg0); g.addColorStop(1, '#08081c'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const v = ctx.createRadialGradient(VW / 2, VH * 0.45, VW * 0.2, VW / 2, VH * 0.45, VH * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)'); ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH); }

// ---------- экран игры ----------
function goMap() { UI.screen = 'map'; UI.mapW = wOf(M.idx) - 1; UI.win = null; SND.play('click'); }
function startLevel(i) { UI.win = null; UI.screen = 'play'; load(i + 1); const w = wOf(i), wd = WORLDS[w - 1]; save.seenWorld = save.seenWorld || {}; if (wd.card && !save.seenWorld[w] && numInWorld(i) === 1) UI.card = { w, t0: now }; }
function doHint() { if (M.S.over || now < V.failUntil) return; const tier = (!V.idea && solutionStory().any) ? 1 : 2; hint(tier); }
function drawFuse(y) { const L = M.L, S = V.shown, N = C.fuseLen(L, S.spools), gap = Math.min(30, 220 / (N + 1)), w = gap * (N + 1), x0 = VW / 2 - w / 2 - 6, pop = clamp((now - V.nPop) / 400, 0, 1);
  ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(30,18,10,0.6)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); ctx.strokeStyle = PAL.rope2; ctx.lineWidth = 5.5; ctx.stroke(); ctx.setLineDash([3, 3.5]); ctx.strokeStyle = PAL.rope; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);
  for (let k = 1; k <= N; k++) { const d = 15 * (k === N && pop < 1 ? 1 + Math.sin(pop * Math.PI) * 0.7 : 1); bead(ctx, x0 + gap * k - gap / 2, y, d); }
  ctx.globalCompositeOperation = 'lighter'; glow(x0 - 8, y - 6, 26, '255,150,60', 0.35); ctx.globalCompositeOperation = 'source-over'; flameShape(x0 - 8, y + 9, 1, 5, 38);
  const px = x0 + w + 22; ctx.save(); ctx.translate(px, y); goldRing(ctx, 19, 3); ctx.restore(); if (!spr(ctx, 'portrait', px - 21, y - 21, 42, 42)) { ctx.save(); ctx.beginPath(); ctx.arc(px, y, 15.5, 0, 7); ctx.clip(); prop(ctx, 'hero_a', px, y + 22, 40); ctx.restore(); } }
function drawPlay() { const lv = LEVELS[M.idx], S = M.S, L = M.L, wd = WORLDS[lv.w - 1]; bg();
  // руководство на вводных уровнях: стрелка на следующий шаг плана, пока игрок идёт по плану
  V.guideCell = -1; if (lv.guide && !S.over && !UI.card) { const pc = planCells(); if (S.t < lv.plan.length && pcell(S) === pc[S.t] && M.hist.every((h, k) => pcell(h) === pc[k])) V.guideCell = pc[S.t + 1]; }
  // окно победы не закрывает поле: поле уезжает вверх
  let shift = 0; if (UI.win) shift = Math.min(Math.max(0, F.y + L.H * F.cell + 10 - (VH - 204)), Math.max(0, F.y - CONFIG.top - 12)) * easeOut(clamp((now - UI.win.t0) / 320, 0, 1));
  ctx.save(); ctx.translate(0, -shift); drawField(); ctx.restore();
  if (shift > 1) { const g = ctx.createLinearGradient(0, CONFIG.top - 8, 0, CONFIG.top + 14); g.addColorStop(0, 'rgba(12,15,40,0.97)'); g.addColorStop(1, 'rgba(12,15,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, CONFIG.top + 14); }
  // шапка
  roundBtn('map', 36, 30, 24, ICON.grid, goMap);
  plate(VW / 2 - 92, 8, 184, 46); text(`${lv.w} · ${numInWorld(M.idx)}`, VW / 2, 23, 19, '#f6dfae', 800); text(lv.exam ? T('hard') : tr(wd.name), VW / 2, 41, lv.exam ? 12 : 11.5, lv.exam ? '#ffc94d' : '#b9a9d6', lv.exam ? 800 : 700);      // трудный уровень подписан заранее, без сюрприза
  if (!UI.win) { const st = starsOf(M.idx); for (let k = 0; k < 3; k++) star(VW - 64 + k * 18, 21, 7.5, k < st); text(`${T('moves')} ${V.shown.t}`, VW - 46, 43, 12.5, '#a3acd4', 700); }
  if (!UI.win) { drawFuse(CONFIG.top + 18); text(T('behind')(C.fuseLen(L, V.shown.spools)), VW / 2, CONFIG.top + 42, 13, '#a3acd4', 700); }      // после победы полоска фитиля не нужна — место отдано полю
  if (lv.hint && !UI.win && !UI.card) wrap(tr(lv.hint), VW / 2, VH - CONFIG.bottom - 34, VW - 56, 13.5, '#aab3da', 18);
  // нижняя панель: отмена, заново, подсказка — всегда на одних местах
  const by = VH - 60;
  if (!UI.win) { [['bUndo', -98], ['bRestart', 0], ['bHint', 98]].forEach(([k, dx]) => text(T(k), VW / 2 + dx, VH - 15, 12, '#9aa3cc', 700));
    roundBtn('undo', VW / 2 - 98, by, 31, ICON.undo, () => { if (now < V.failUntil) return; undo(); }, { dim: !M.hist.length });
    roundBtn('restart', VW / 2, by, 31, ICON.restart, () => { if (now < V.failUntil) return; restart(); }, { dim: !M.hist.length });
    roundBtn('hint', VW / 2 + 98, by, 31, ICON.hint, doHint, { pulse: M.trouble >= CONFIG.hintAfterFails && !V.move && !V.idea, col: '#ffd98a' }); }
  if (UI.win) drawWin(); if (UI.card) drawCard(); }
// тёмная панель с золотым кантом (окно победы, карточка мира)
function goldPanel(x, y, w, h, r) { ctx.fillStyle = 'rgba(4,3,14,0.6)'; rr(ctx, x - 2, y + 2, w + 4, h + 4, r + 2); ctx.fill(); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ffe39a'); g.addColorStop(0.4, '#d99c45'); g.addColorStop(1, '#8a5220'); ctx.fillStyle = g; rr(ctx, x, y, w, h, r); ctx.fill();
  const m = ctx.createLinearGradient(0, y, 0, y + h); m.addColorStop(0, '#2e2862'); m.addColorStop(1, '#17153a'); ctx.fillStyle = m; rr(ctx, x + 3.5, y + 3.5, w - 7, h - 7, r - 3); ctx.fill(); ctx.strokeStyle = 'rgba(240,192,96,0.35)'; ctx.lineWidth = 1; rr(ctx, x + 9, y + 9, w - 18, h - 18, r - 7); ctx.stroke(); }
function drawWin() { const wv = UI.win, p = easeOut(clamp((now - wv.t0) / 320, 0, 1)), h = 196, y = VH - h * p, last = M.idx === LEVELS.length - 1;
  goldPanel(8, y, VW - 16, h + 30, 26);
  for (let k = 0; k < 3; k++) { const t0 = wv.t0 + 260 + k * 170, q = clamp((now - t0) / 260, 0, 1), on = k < wv.stars, s = on ? (q <= 0 ? 0 : 1 + Math.sin(q * Math.PI) * 0.35) : 1; if (on && q > 0 && !wv.rang[k]) { wv.rang[k] = 1; SND.play('star'); }
    star(VW / 2 + (k - 1) * 58, y + 46 + (k === 1 ? -6 : 0), (k === 1 ? 25 : 21) * (on ? s : 1), on && q > 0); }
  text(wv.moves <= wv.par ? `${T('moves')} ${wv.moves} · ${T('best')}` : `${T('moves')} ${wv.moves} · ★ ${wv.par}`, VW / 2, y + 92, 13.5, '#d9c7a0', 700);
  roundBtn('wagain', 56, y + 144, 27, ICON.restart, () => { UI.win = null; restart(); }); roundBtn('wmap', 124, y + 144, 27, ICON.grid, goMap);
  pillBtn('wnext', 168, y + 116, VW - 168 - 28, 56, last ? T('map') : T('next') + '  →', () => { if (last) goMap(); else { let n = M.idx + 1; startLevel(n); } SND.play('click'); }, { primary: true, size: 19 }); }
function drawCard() { const cd = UI.card, wd = WORLDS[cd.w - 1], p = easeOut(clamp((now - cd.t0) / 260, 0, 1)); ctx.fillStyle = `rgba(4,5,16,${0.9 * p})`; ctx.fillRect(0, 0, VW, VH); const w = 310, h = 300, x = (VW - w) / 2, y = (VH - h) / 2 + (1 - p) * 30; ctx.globalAlpha = p;
  goldPanel(x, y, w, h, 26);
  text(`${T('world')} ${cd.w}`, VW / 2, y + 30, 13, PAL.dim, 800); text(tr(wd.name), VW / 2, y + 56, 24, '#f6dfae', 800);
  ctx.save(); ctx.translate(VW / 2, y + 128); goldRing(ctx, 48, 5); ctx.restore(); if (wd.icon === 'flame') { ctx.globalCompositeOperation = 'lighter'; glow(VW / 2, y + 122, 60, '255,150,60', 0.4 * p); ctx.globalCompositeOperation = 'source-over'; flameShape(VW / 2, y + 150, 1, 1, 86); } else { if (wd.icon === 'lamp_on') { ctx.globalCompositeOperation = 'lighter'; glow(VW / 2, y + 118, 64, '255,200,110', 0.4 * p); ctx.globalCompositeOperation = 'source-over'; } spr(ctx, wd.icon, VW / 2 - 40, y + 86, 80, 80); }
  wrap(tr(wd.card), VW / 2, y + 204, w - 44, 15, '#d5dbf7', 21); text(T('tapNew'), VW / 2, y + h - 22, 12, PAL.dim, 700); ctx.globalAlpha = 1;
  btn(0, 0, VW, VH, () => { save.seenWorld[cd.w] = 1; persist(); UI.card = null; SND.play('click'); }, 'card'); }

// ---------- карта миров ----------
function nodePos(k, n) { const cols = 3, row = Math.floor(k / cols), col = row % 2 ? cols - 1 - (k % cols) : k % cols; return [VW / 2 + (col - 1) * 104, 212 + row * clamp((VH - 380) / 3.3, 98, 132)]; }
function drawMap() { bg(); const w = UI.mapW + 1, wd = WORLDS[UI.mapW], ids = worldLevels(w), cur = firstUnsolved(), got = ids.reduce((a, i) => a + starsOf(i), 0);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.restore();
  text(tr({ ru: 'Фитиль', en: 'The Fuse' }), VW / 2, 34, 27, '#f6dfae', 800); star(VW / 2 - 34, 62, 8, true); text(`${totalStars()} / ${LEVELS.length * 3}`, VW / 2 + 8, 63, 13, '#ffd98a', 800);
  // заголовок мира
  const hy = 104; plate(62, hy - 29, VW - 124, 62);
  text(`${T('world')} ${w}`, VW / 2 + 16, hy - 12, 12, PAL.dim, 800); text(tr(wd.name), VW / 2 + 16, hy + 10, 20, '#f6dfae', 800);
  ctx.save(); ctx.translate(98, hy + 2); goldRing(ctx, 23, 3.5); ctx.restore();
  if (wd.icon === 'flame') flameShape(98, hy + 14, 1, 2, 40); else spr(ctx, wd.icon, 98 - 19, hy + 2 - 19, 38, 38);
  const allLocked = ids.every(i => !isOpen(i)); text(allLocked ? T('lockedWorld') : `★ ${got} / ${ids.length * 3}`, VW / 2, hy + 46, 12, allLocked ? PAL.dim : '#ffd98a', 800);
  roundBtn('wprev', 31, hy + 2, 23, ICON.prev, () => { UI.mapW = Math.max(0, UI.mapW - 1); SND.play('click'); }, { dim: UI.mapW === 0 }); roundBtn('wnext2', VW - 31, hy + 2, 23, ICON.fwd, () => { UI.mapW = Math.min(WORLDS.length - 1, UI.mapW + 1); SND.play('click'); }, { dim: UI.mapW === WORLDS.length - 1 });
  // шнур между уровнями: пройденная часть «горит»
  const pos = ids.map((i, k) => nodePos(k, ids.length)); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = (col, wdt, upto) => { ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.beginPath(); pos.forEach(([x, y], k) => { if (k > upto) return; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); };
  path(PAL.ink, 9, 99); path('#59618f', 4, 99); let litUpto = -1; ids.forEach((i, k) => { if (starsOf(i)) litUpto = k; }); if (litUpto > 0) path('#ffb347', 4, litUpto);
  ids.forEach((i, k) => { const [x, y] = pos[k], st = starsOf(i), open = isOpen(i), isCur = i === cur, r = 29, down = btn(x - r - 6, y - r - 6, r * 2 + 12, r * 2 + 30, () => { if (!isOpen(i)) { UI.toast = { text: T('locked'), until: now + 1500 }; SND.play('nope'); return; } SND.play('click'); startLevel(i); }, 'lv' + i);
    ctx.save(); ctx.translate(x, y); if (down) ctx.scale(0.94, 0.94);
    if (st) { ctx.globalCompositeOperation = 'lighter'; glow(0, 0, r * 1.9, '255,170,70', 0.2); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = 'rgba(4,5,16,0.55)'; ctx.beginPath(); ctx.arc(0, 3, r, 0, 7); ctx.fill(); const g = ctx.createLinearGradient(0, -r, 0, r); if (st) { g.addColorStop(0, '#ffd27a'); g.addColorStop(1, '#f09a2c'); } else if (open) { g.addColorStop(0, '#343d77'); g.addColorStop(1, '#222956'); } else { g.addColorStop(0, '#1a1f40'); g.addColorStop(1, '#12162f'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = st ? '#fff0c2' : open ? '#5a66a8' : '#2a305c'; ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, 7); ctx.stroke();
    if (isCur && open) { const q = (Math.sin(now / 260) + 1) / 2; ctx.strokeStyle = `rgba(53,201,179,${0.45 + q * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 4 + q * 3, 0, 7); ctx.stroke(); }
    if (open) { text(String(k + 1), 0, -6, 21, st ? PAL.ink : PAL.text, 800); for (let q = 0; q < 3; q++) star((q - 1) * 13, 14, 5.2, q < st); } else { ctx.strokeStyle = '#4a548f'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ICON.lock(0, 0, 26); }
    ctx.restore(); if (LEVELS[i].exam) { ctx.save(); ctx.translate(x + r * 0.74, y - r * 0.74); ctx.rotate(Math.PI / 4); ctx.fillStyle = PAL.ink; ctx.fillRect(-8, -8, 16, 16); ctx.fillStyle = open ? '#ffc94d' : '#5a6196'; ctx.fillRect(-5.5, -5.5, 11, 11); ctx.restore(); }      // ромб — трудный уровень
    if (isCur && open) prop(ctx, 'hero_a', x, y - r + 9 - Math.abs(Math.sin(now / 320)) * 4, 40); });
  // точки миров и нижний ряд
  const dy = VH - 116; WORLDS.forEach((q, k) => { ctx.fillStyle = k === UI.mapW ? '#ffd98a' : '#4a5490'; ctx.beginPath(); ctx.arc(VW / 2 + (k - (WORLDS.length - 1) / 2) * 18, dy, k === UI.mapW ? 5.5 : 4, 0, 7); ctx.fill(); });
  const by = VH - 62; [['bSound', -96], ['bLang', 0], ['bLog', 96]].forEach(([k, dx]) => text(T(k), VW / 2 + dx, VH - 22, 12, '#9aa3cc', 700)); roundBtn('snd', VW / 2 - 96, by, 25, ICON.sound, () => { SND.setOn(!save.sound); SND.play('click'); }, { arg: save.sound });
  pillBtn('lng', VW / 2 - 34, by - 25, 68, 50, T('lang'), () => { save.lang = save.lang === 'ru' ? 'en' : 'ru'; persist(); SND.play('click'); }, { size: 17 });
  roundBtn('sts', VW / 2 + 96, by, 25, ICON.list, () => { UI.screen = 'stats'; UI.statScroll = 0; SND.play('click'); });
  if (UI.toast && now < UI.toast.until) { ctx.font = font(13, 700); const tw = ctx.measureText(UI.toast.text).width + 28; ctx.fillStyle = '#2b3364'; rr(ctx, VW / 2 - tw / 2, VH - 160, tw, 32, 16); ctx.fill(); text(UI.toast.text, VW / 2, VH - 143.5, 13, PAL.text, 700); } }

// ---------- журнал плейтеста ----------
const fmtMs = ms => { const s = Math.round(ms / 1000); return s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : s + 'с'; };
function statsRows() { return LEVELS.map((l, i) => ({ i, id: l.id, st: save.stats[l.id], stars: starsOf(i) })).filter(r => r.st && (r.st.moves || r.st.wins)); }
function drawStats() { bg(); const rows = statsRows(), top = 104, rowH = 26, viewH = VH - top - 132, maxScroll = Math.max(0, rows.length * rowH - viewH); UI.statScroll = clamp(UI.statScroll, 0, maxScroll);
  text(T('stats'), VW / 2, 34, 22, PAL.text, 800); roundBtn('sclose', VW - 32, 32, 19, ICON.close, () => { UI.screen = 'map'; SND.play('click'); });
  const cols = [18, 118, 170, 216, 264, 314, 360], hd = T('statHead'); hd.forEach((h, k) => text(h, cols[k], 78, 10.5, PAL.dim, 800, k ? 'center' : 'left'));
  ctx.save(); ctx.beginPath(); ctx.rect(0, top - 12, VW, viewH + 12); ctx.clip();
  rows.forEach((r, k) => { const y = top + k * rowH - UI.statScroll + 6; if (y < top - 30 || y > top + viewH + 20) return; if (k % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(10, y - rowH / 2, VW - 20, rowH); }
    const s = r.st, vals = [r.id + (r.stars ? ' ' + '★'.repeat(r.stars) : ''), fmtMs(s.wins ? s.firstMs : s.ms), s.wins ? s.firstMoves : s.moves, s.undos, s.restarts, s.fails, (s.ideas || 0) + '+' + (s.shows || 0)];
    vals.forEach((v, c) => text(String(v), cols[c], y, 12, c === 0 ? (r.stars ? '#ffd98a' : PAL.text) : '#c9d0f2', 700, c ? 'center' : 'left')); });
  if (!rows.length) text('—', VW / 2, top + 30, 16, PAL.dim);
  ctx.restore(); const by = VH - 104;
  pillBtn('sall', 20, by, VW - 40, 40, (save.openAll ? '✓ ' : '') + T('openAll'), () => { save.openAll = !save.openAll; persist(); SND.play('click'); }, { size: 14 });
  pillBtn('scopy', 20, by + 48, (VW - 50) / 2, 40, now - UI.copiedAt < 1500 ? T('copied') : T('copy'), () => { const data = JSON.stringify(stats()); try { navigator.clipboard.writeText(data); } catch (e) { /* нет доступа к буферу */ } UI.copiedAt = now; }, { size: 13 });
  pillBtn('sreset', 30 + (VW - 50) / 2, by + 48, (VW - 50) / 2, 40, now - UI.resetArm < 2500 ? T('resetAsk') : T('reset'), () => { if (now - UI.resetArm < 2500) { save.done = {}; save.stats = {}; save.seenWorld = {}; save.openAll = false; persist(); UI.resetArm = 0; } else UI.resetArm = now; }, { size: 13, danger: true }); }
function stats() { return statsRows().map(r => Object.assign({ level: r.i + 1, id: r.id, stars: r.stars }, r.st, { ms: Math.round(r.st.ms) })); }

// ---------- ввод ----------
function tryStep(dir) { if (UI.screen !== 'play' || UI.win || UI.card || now < V.failUntil) return; SND.unlock(); step(dir); }
const ptr = { down: false, x: 0, y: 0, moved: false, t: 0 };
function toLocal(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / SC, (e.clientY - r.top) / SC]; }
function hit(x, y) { for (let k = UI.btns.length - 1; k >= 0; k--) { const b = UI.btns[k]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; } return null; }
cv.addEventListener('pointerdown', e => { e.preventDefault(); SND.unlock(); const [x, y] = toLocal(e); ptr.down = true; ptr.x = x; ptr.y = y; ptr.moved = false; ptr.t = now; UI.press = hit(x, y); if (cv.setPointerCapture) try { cv.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ } });
cv.addEventListener('pointermove', e => { if (!ptr.down) return; const [x, y] = toLocal(e), dx = x - ptr.x, dy = y - ptr.y;
  if (UI.screen === 'stats' && !UI.press) { UI.statScroll -= dy; ptr.x = x; ptr.y = y; ptr.moved = true; return; }
  if (!ptr.moved && Math.hypot(dx, dy) > 24) { ptr.moved = true; if (UI.press) { UI.press = null; }
    if (UI.screen === 'play') tryStep(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
    else if (UI.screen === 'map' && Math.abs(dx) > Math.abs(dy)) { UI.mapW = clamp(UI.mapW + (dx < 0 ? 1 : -1), 0, WORLDS.length - 1); SND.play('click'); } } });
function release(e) { if (!ptr.down) return; ptr.down = false; const [x, y] = toLocal(e), b = UI.press; UI.press = null; if (ptr.moved) return;
  if (b) { const again = hit(x, y); if (again && again.id === b.id) b.fn(); return; }
  if (UI.screen === 'play' && !UI.win && !UI.card) { const hx = V.hero.x, hy = V.hero.y, dx = x - hx, dy = y - hy; if (y < CONFIG.top || y > VH - CONFIG.bottom || Math.hypot(dx, dy) < F.cell * 0.4) return; tryStep(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')); } }
cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', () => { ptr.down = false; UI.press = null; });
cv.addEventListener('wheel', e => { if (UI.screen === 'stats') { UI.statScroll += e.deltaY; e.preventDefault(); } }, { passive: false });
const KEYS = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R' };
window.addEventListener('keydown', e => { SND.unlock(); if (UI.card) { if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') { save.seenWorld[UI.card.w] = 1; persist(); UI.card = null; } return; }
  if (UI.screen === 'play') { if (KEYS[e.code]) { e.preventDefault(); tryStep(KEYS[e.code]); }
    else if (e.code === 'KeyZ' || e.code === 'Backspace' || e.code === 'KeyU') { e.preventDefault(); if (!UI.win && now >= V.failUntil) undo(); } else if (e.code === 'KeyR') { UI.win = null; if (now >= V.failUntil) restart(); } else if (e.code === 'KeyH') doHint();
    else if (e.code === 'Enter' && UI.win) { if (M.idx < LEVELS.length - 1) startLevel(M.idx + 1); else goMap(); } else if (e.code === 'Escape') goMap(); }
  else if (UI.screen === 'map') { if (e.code === 'ArrowLeft') UI.mapW = Math.max(0, UI.mapW - 1); else if (e.code === 'ArrowRight') UI.mapW = Math.min(WORLDS.length - 1, UI.mapW + 1); else if (e.code === 'Enter' || e.code === 'Escape') { UI.screen = 'play'; } }
  else if (UI.screen === 'stats' && e.code === 'Escape') UI.screen = 'map'; });
M.listeners.push((type, d) => { if (type === 'win') after(520, () => { UI.win = { t0: now, stars: d.stars, moves: d.moves, par: d.par, rang: [] }; SND.play('win'); }); if (type === 'load' || type === 'restart') UI.win = null; if (type === 'load') UI.fadeT = now; if (type === 'fail' && navigator.vibrate) { try { navigator.vibrate(18); } catch (e) { /* не везде есть */ } } });

// ---------- главный цикл ----------
let lastT = 0;
function frame(ts) { requestAnimationFrame(frame); const raw = ts - lastT; if (lastT && raw < 1000) { perf.frames++; perf.gap += raw; if (raw > 25) perf.slow++; } dtMs = Math.min(50, raw || 16); lastT = ts; now = ts; const p0 = performance.now();
  if (V.timers.length) { const due = V.timers.filter(t => t.at <= now); if (due.length) { V.timers = V.timers.filter(t => t.at > now); for (const t of due) t.fn(); } }
  if (UI.screen === 'play' && !M.S.won && !UI.card && document.visibilityState === 'visible') stat(M.idx).ms += dtMs;
  ctx.setTransform(SC * DPR, 0, 0, SC * DPR, 0, 0); UI.btns = [];
  if (UI.screen === 'play') drawPlay(); else if (UI.screen === 'map') drawMap(); else drawStats();
  if (UI.shownScreen !== UI.screen) { UI.shownScreen = UI.screen; UI.fadeT = now; } const fd = (now - UI.fadeT) / 220; if (fd < 1) { ctx.fillStyle = `rgba(4,5,12,${(1 - fd) * 0.9})`; ctx.fillRect(0, 0, VW, VH); }      // мягкая смена экрана и уровня
  const d = performance.now() - p0; perf.n++; perf.sum += d; if (d > perf.max) perf.max = d; }
setInterval(persist, 15000); window.addEventListener('pagehide', persist);
window.addEventListener('resize', resize); window.addEventListener('orientationchange', resize);

// ---------- запуск ----------
window.FUSE = { CONFIG, LEVELS, WORLDS, load: n => { UI.win = null; UI.card = null; UI.screen = 'play'; return load(n); }, state, legal: legalDirs, step, undo, restart, preview, solve, hint, stats, log, core: C, ui: UI, view: V, perf,
  cellXY: c => { const r = cv.getBoundingClientRect(); return [r.left + cellX(c) * SC, r.top + cellY(c) * SC]; }, btnXY: id => { const b = UI.btns.find(q => q.id === id), r = cv.getBoundingClientRect(); return b ? [r.left + (b.x + b.w / 2) * SC, r.top + (b.y + b.h / 2) * SC] : null; },
  reset: () => { save.done = {}; save.stats = {}; save.seenWorld = {}; save.last = 0; save.openAll = false; persist(); },
  light: () => Array.from(V.lightI), settle: () => { flushTimers(); V.failUntil = 0; if (V.shown !== M.S) snap(); for (let i = 0; i < M.L.n; i++) V.lightI[i] = M.S.lit[i]; } };
const startAt = +qs.get('level') || 0; load(startAt || Math.min(LEVELS.length, (save.last === undefined ? firstUnsolved() : save.last) + 1)); resize(); loadAtlas();
if (!startAt) { const w = wOf(M.idx); save.seenWorld = save.seenWorld || {}; if (WORLDS[w - 1].card && !save.seenWorld[w] && numInWorld(M.idx) === 1) UI.card = { w, t0: 0 }; }
requestAnimationFrame(frame);
