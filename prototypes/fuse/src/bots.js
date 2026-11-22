// Боты приёмки «Фитиля» (Node, без браузера): node bots.js [номера через запятую]
//   решатель (полный перебор) → par и план; бот-план; рандом (2000 партий); жадный; змейка; N-тест; инварианты; сценки А/Б/В.
const C = require('./logic.js'), LEVELS = require('./levels.js');
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function playPlan(lv, plan) { const L = C.compile(lv); let S = C.init(L);
  for (const ch of plan) { const p = S.tail[S.tail.length - 1], c = C.cellInDir(L, p, ch), m = C.legal(L, S).find(q => q.cell === c); if (!m) return { won: false, reason: 'illegal', t: S.t }; S = C.apply(L, S, c); if (S.over) break; }
  return { won: S.won, reason: S.reason, t: S.t }; }
function checkInv(L, S, path) { const errs = [], pl = S.tail[S.tail.length - 1];
  if (S.tail[0] !== path[Math.max(0, S.t - L.N)]) errs.push('огонёк не на path[t-N]');
  if (!S.won) { if (S.d[pl] & C.PIT) errs.push('игрок на провале'); if (S.tail.indexOf(pl) !== S.tail.length - 1) errs.push('игрок на шнуре'); }
  for (let g = 0; g < L.guards.length; g++) if (S.guardAlive >> g & 1) { /* не спит ⇔ клетка освещена — по определению patchOf */ }
  return errs; }
function randomBot(lv, games, seed) { const L = C.compile(lv), r = rng(seed); let wins = 0, inv = 0, pvBad = 0;
  for (let g = 0; g < games; g++) { let S = C.init(L); const path = [L.start]; let floors = S.d.reduce((a, v, i) => a + ((L.type[i] === C.FLOOR && !(v & C.PIT)) ? 1 : 0), 0), lamps = S.lampLit;
    while (!S.over) { const ms = C.legal(L, S); if (!ms.length) break; const m = ms[Math.floor(r() * ms.length)], pv = C.preview(L, S); S = C.apply(L, S, m.cell); path.push(m.cell);
      if (!S.won) { const fl = S.d.reduce((a, v, i) => a + ((L.type[i] === C.FLOOR && !(v & C.PIT)) ? 1 : 0), 0); if (fl > floors) inv++; floors = fl; if ((lamps & ~S.lampLit) !== 0) inv++; lamps = S.lampLit;
        if (checkInv(L, S, path).length) inv++;
        if (pv.flame !== S.tail[0] || pv.lampLit !== S.lampLit || pv.guardAlive !== S.guardAlive || pv.lit.join('') !== S.lit.join('')) pvBad++; } }
    if (S.won) wins++; }
  return { wins, games, inv, pvBad }; }
// «куда глаза глядят»: кратчайшим путём к ближайшей незажжённой лампе, потом к двери; задержку, стражей и масло не учитывает
function bfsNext(L, S, isGoal) { const p = S.tail[S.tail.length - 1], prev = new Map([[p, -1]]), q = [p];
  const ok = a => L.type[a] !== C.WALL && L.type[a] !== C.LAMP && L.type[a] !== C.DOOR && !(S.d[a] & C.PIT) && !S.tail.includes(a) && !(L.guardAt[a] >= 0 && (S.guardAlive >> L.guardAt[a] & 1));
  while (q.length) { const a = q.shift(); if (a !== p && isGoal(a)) { let c = a; while (prev.get(c) !== p) c = prev.get(c); return c; }
    for (const b of L.adj[a]) if (!prev.has(b) && ok(b)) { prev.set(b, a); q.push(b); } } return -1; }
function greedyBot(lv) { const L = C.compile(lv); let S = C.init(L), guard = 0;
  while (!S.over && guard++ < 200) { const ms = C.legal(L, S); if (!ms.length) break; const win = ms.find(m => m.win); if (win) { S = C.apply(L, S, win.cell); break; }
    const unlit = L.lamps.filter((c, k) => !(S.lampLit >> k & 1)); let nx = -1;
    if (unlit.length) nx = bfsNext(L, S, a => unlit.some(l => L.adj[l].includes(a)));
    if (nx < 0) nx = bfsNext(L, S, a => L.adj[L.door].includes(a));
    const m = ms.find(q => q.cell === nx) || ms[0]; S = C.apply(L, S, m.cell); }
  return S.won; }
// змейка «обойди всё»: правило левой руки
function snakeBot(lv) { const L = C.compile(lv); let S = C.init(L), h = 'R', guard = 0; const left = { U: 'L', L: 'D', D: 'R', R: 'U' }, right = { U: 'R', R: 'D', D: 'L', L: 'U' }, back = { U: 'D', D: 'U', L: 'R', R: 'L' };
  while (!S.over && guard++ < 200) { const ms = C.legal(L, S); if (!ms.length) break; const win = ms.find(m => m.win); if (win) { S = C.apply(L, S, win.cell); break; }
    const p = S.tail[S.tail.length - 1]; let done = false;
    for (const dch of [left[h], h, right[h], back[h]]) { const c = C.cellInDir(L, p, dch), m = ms.find(q => q.cell === c); if (m) { S = C.apply(L, S, c); h = dch; done = true; break; } }
    if (!done) break; }
  return S.won; }
// ---------- сценки правил ----------
function scenes() { const out = [];
  const A = { n: 3, map: ['##L##', 'P..D#', '##...', '##...'] }, a = C.solve(A); out.push(`А: par ${a.par} ${a.par === 7 ? '✓' : '✗'}, короткий путь RRDR→U: ${playPlan(A, 'RRDRU').reason === 'illegal' ? 'дверь закрыта ✓' : '✗'}`);
  const B = { n: 3, map: ['P..oo......', '###oo######'] }, L = C.compile(B); let S = C.init(L); const log = [];
  for (let i = 0; i < 8; i++) { S = C.apply(L, S, C.cellInDir(L, S.tail[S.tail.length - 1], 'R')); log.push([...S.d].map((v, k) => (v & C.BURN) ? k : -1).filter(k => k >= 0).join('+') || '-'); }
  out.push(`Б: горит по ходам [${log.join(' ')}] — ждём: после 5-го 3, после 6-го a4+b3, после 7-го b4, дальше пусто ${log[4] === '3' && log[5] === '4+14' && log[6] === '15' && log[7] === '-' ? '✓' : '✗'}; игрок цел: ${!S.over ? '✓' : '✗ ' + S.reason}`);
  const B2 = playPlan(B, 'RRRDRU'); out.push(`Б-петля a3→b3→b4→a4: ${B2.reason === 'burned' ? 'сгорел ✓' : '✗ ' + JSON.stringify(B2)}`);
  const V = { n: 3, map: ['#####', '#..##', '#..##', '#.s.P', '##DK#', '#####'] }, LV = C.compile(V);       // камень (2,3): первый проход шагом 2
  const tryPath = pl => { let S = C.init(LV); for (const ch of pl) S = C.apply(LV, S, C.cellInDir(LV, S.tail[S.tail.length - 1], ch)); return C.legal(LV, S).some(m => m.cell === 3 * 5 + 2); };
  const short = tryPath('LLLUR'), long = tryPath('LLLUURD');                                                   // петля из трёх клеток — рано; из пяти — можно
  out.push(`В: назад на камень после петли в 3 клетки (шаг 6 < 2+N+2): ${short ? 'пускает ✗' : 'нельзя ✓'}; после петли в 5 клеток (шаг 8): ${long ? 'можно ✓' : 'нельзя ✗'}`);
  return out; }
// ---------- прогон ----------
console.log('СЦЕНКИ'); for (const s of scenes()) console.log('  ' + s);
let greedyWins = [], snakeWins = [], nChanged = 0, nTotal = 0; const pars = [];
LEVELS.forEach((lv, i) => { const no = i + 1; if (only && !only.includes(no)) return;
  const L = C.compile(lv), walk = [...L.type].filter((t, c) => (t === C.FLOOR || t === C.STONE) && !(L.init[c] & C.PIT)).length;
  const r = C.solve(lv); pars[i] = r;
  const pb = r.plan ? playPlan(lv, r.plan) : { won: false }, own = lv.plan ? playPlan(lv, lv.plan) : null;
  const rb = randomBot(lv, 2000, 12345 + i), gr = r.plan ? greedyBot(lv) : false, sn = r.plan ? snakeBot(lv) : false;
  if (gr && no >= 3) greedyWins.push(no); if (sn && no >= 3) snakeWins.push(no);
  let nt = '';
  if (no >= 3 && r.plan) { const lo = lv.n > 2 ? C.solve(lv, { n: lv.n - 1 }) : { par: null, solvable: false }, hi = C.solve(lv, { n: lv.n + 1 }); const ch = lo.par !== r.par || hi.par !== r.par; nTotal++; if (ch) nChanged++;
    nt = ` | N-тест: N−1→${lo.par ?? 'нет'}, N+1→${hi.par ?? 'нет'} ${ch ? '✓' : '✗ не меняется'}`; }
  const bad = [];
  if (!r.solvable) bad.push(r.overflow ? 'ПЕРЕБОР НЕ УЛОЖИЛСЯ' : 'НЕ РЕШАЕТСЯ'); if (r.plan && !pb.won) bad.push('план решателя не проходит');
  if (lv.par !== undefined && lv.par !== r.par) bad.push(`par в данных ${lv.par} ≠ ${r.par}`); if (own && !own.won) bad.push('plan из данных не проходит');
  if (rb.wins / rb.games >= 0.5) bad.push('рандом ≥50%'); if (rb.inv || rb.pvBad) bad.push(`инварианты ${rb.inv}, preview ${rb.pvBad}`);
  if (walk > 40) bad.push(`клеток ${walk} > 40`);
  console.log(`L${no} «${lv.name.ru}» ${L.W}×${L.H} N=${lv.n} клеток ${walk} | par ${r.par} план ${r.plan} (${r.states} сост., ${r.ms} мс) | план-бот ${pb.won ? '✓' : '✗'} | рандом ${(100 * rb.wins / rb.games).toFixed(1)}% | жадный ${gr ? 'ПОБЕДА' : '—'} | змейка ${sn ? 'ПОБЕДА' : '—'}${nt}${bad.length ? '  <<< ' + bad.join('; ') : ''}`); });
if (!only) { console.log(`ИТОГ: жадный побеждает на L3+: [${greedyWins}] (допустимо ≤2) ; змейка на L3–L7: [${snakeWins.filter(n => n <= 7)}] (≤2), на L8+: [${snakeWins.filter(n => n >= 8)}] (должно быть пусто); N-тест: меняется на ${nChanged} из ${nTotal} (нужно ≥10 из 13)`);
  const pair = (a, b) => { const A = LEVELS[a - 1], B = LEVELS[b - 1]; if (!A || !B || !pars[a - 1] || !pars[a - 1].plan) return '—'; return playPlan(B, pars[a - 1].plan).won ? 'ПРОХОДИТ ✗' : 'проигрывает ✓'; };
  console.log(`ПАРЫ: план L3 на L4 — ${pair(3, 4)}; план L14 на L15 — ${pair(14, 15)}`); }
