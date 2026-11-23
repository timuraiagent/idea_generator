// Анализ уровня «Фитиля» (Node, в игру не входит): полный граф состояний → числа сложности, «ворота», ленивые боты.
//   node analyze.js            — таблица по всем уровням из levels.js
const C = require('./logic.js');

// ---------- полный граф состояний ----------
// Узел: { S, kids: [{ ch, to }] }, to: номер узла, 'win' или 'dead'. Граф ацикличен: каждый ход t растёт.
function graph(lv, maxStates) { maxStates = maxStates || 200000; const L = C.compile(lv), S0 = C.init(L);
  const nodes = [{ S: S0, kids: [] }], ids = new Map([[C.key(S0), 0]]); let overflow = false;
  for (let i = 0; i < nodes.length; i++) { const nd = nodes[i], S = nd.S, p = S.tail[S.tail.length - 1];
    for (const m of C.legal(L, S)) { const ch = C.dirChar(L, p, m.cell);
      if (m.win) { nd.kids.push({ ch, to: 'win' }); continue; }
      const R = C.apply(L, S, m.cell); if (R.over) { nd.kids.push({ ch, to: 'dead', reason: R.reason }); continue; }
      const k = C.key(R); let id = ids.get(k);
      if (id === undefined) { if (nodes.length >= maxStates) { overflow = true; nd.kids.push({ ch, to: 'dead', reason: 'cap' }); continue; } id = nodes.length; ids.set(k, id); nodes.push({ S: R, kids: [] }); }
      nd.kids.push({ ch, to: id }); } }
  return { L, nodes, overflow }; }

// ---------- числа ----------
function metrics(lv, maxStates) { const G = graph(lv, maxStates), { L, nodes } = G, n = nodes.length;
  const dist = new Float64Array(n).fill(Infinity), pwin = new Float64Array(n), nsol = new Float64Array(n), life = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { const ks = nodes[i].kids; let d = Infinity, p = 0, s = 0, lf = 0;
    for (const k of ks) { if (k.to === 'win') { d = Math.min(d, 1); p += 1; s += 1; lf = Math.max(lf, 1); }
      else if (k.to === 'dead') { lf = Math.max(lf, 1); }
      else { d = Math.min(d, 1 + dist[k.to]); p += pwin[k.to]; s += nsol[k.to]; lf = Math.max(lf, 1 + life[k.to]); } }
    dist[i] = d; pwin[i] = ks.length ? p / ks.length : 0; nsol[i] = s; life[i] = lf; }
  if (!isFinite(dist[0])) return { solvable: false, states: n, overflow: G.overflow, L };
  // «внимательный игрок»: из ходов выбирает только те, после которых можно продержаться ещё k ходов (видит ловушки на k вперёд), среди них — наугад
  const surv = new Float64Array(n);      // сколько ходов ещё можно прожить из узла (победа — бесконечно)
  for (let i = n - 1; i >= 0; i--) { let v = 0; for (const k of nodes[i].kids) { const c = k.to === 'win' ? Infinity : k.to === 'dead' ? 0 : 1 + surv[k.to]; if (c > v) v = c; } surv[i] = v; }
  const look = K => { const pk = new Float64Array(n); for (let i = n - 1; i >= 0; i--) { const ks = nodes[i].kids, ok = ks.filter(k => k.to === 'win' || (k.to !== 'dead' && 1 + surv[k.to] >= K)), pool = ok.length ? ok : ks; let p = 0;
      if (ok.some(k => k.to === 'win')) { pk[i] = 1; continue; } for (const k of pool) p += k.to === 'win' ? 1 : k.to === 'dead' ? 0 : pk[k.to]; pk[i] = pool.length ? p / pool.length : 0; } return pk[0]; };
  const p2 = look(2), p4 = look(4), p6 = look(6);
  // канонический кратчайший путь и развилки на нём
  let plan = '', id = 0, forks = 0, critical = 0, mistakes = 0, delayed = 0, maxLife = 0, sumLife = 0; const path = [0];
  while (true) { const ks = nodes[id].kids; if (ks.length >= 2) forks++;
    let best = null, bad = 0;
    for (const k of ks) { const d = k.to === 'win' ? 1 : k.to === 'dead' ? Infinity : 1 + dist[k.to];
      if (!isFinite(d)) { bad++; mistakes++; const lf = k.to === 'dead' ? 1 : 1 + life[k.to]; if (lf >= 3) delayed++; maxLife = Math.max(maxLife, lf); sumLife += lf; }
      if (d === dist[id] && !best) best = k; }
    if (bad) critical++;
    plan += best.ch; if (best.to === 'win') break; id = best.to; path.push(id); }
  let alive = 0; for (let i = 0; i < n; i++) if (isFinite(dist[i])) alive++;
  const par = dist[0], bits = -Math.log2(Math.max(pwin[0], 1e-9));
  return { solvable: true, par, plan, states: n, overflow: G.overflow, pwin: pwin[0], bits, p2, p4, p6, bits4: -Math.log2(Math.max(p4, 1e-9)), bits6: -Math.log2(Math.max(p6, 1e-9)), nsol: nsol[0], forks, critical, mistakes, delayed, maxLife, sumLife, alive: alive / n, L, G, dist, path }; }

// ---------- прогон плана ----------
function trace(lv, plan) { const L = C.compile(lv); let S = C.init(L); const steps = [S], cells = [L.start];
  for (const ch of plan) { const c = C.cellInDir(L, S.tail[S.tail.length - 1], ch); if (!C.legal(L, S).some(m => m.cell === c)) return { L, steps, cells, end: S, ok: false }; cells.push(c); S = C.apply(L, S, c); steps.push(S); if (S.over) break; }
  return { L, steps, cells, end: S, ok: S.won }; }
const playPlan = (lv, plan) => trace(lv, plan).ok;

// ---------- ленивые боты ----------
function bfsNext(L, S, isGoal) { const p = S.tail[S.tail.length - 1], prev = new Map([[p, -1]]), q = [p];
  const ok = a => L.type[a] !== C.WALL && L.type[a] !== C.LAMP && L.type[a] !== C.DOOR && !(S.d[a] & C.BLOCK) && !S.tail.includes(a) && !(L.guardAt[a] >= 0 && (S.guardAlive >> L.guardAt[a] & 1));
  while (q.length) { const a = q.shift(); if (a !== p && isGoal(a)) { let c = a; while (prev.get(c) !== p) c = prev.get(c); return c; }
    for (const b of L.adj[a]) if (!prev.has(b) && ok(b)) { prev.set(b, a); q.push(b); } } return -1; }
// «куда глаза глядят»: кратчайшим путём к ближайшей незажжённой лампе, потом к двери; задержку, стражей и огонь не учитывает
function greedyBot(lv) { const L = C.compile(lv); let S = C.init(L), guard = 0;
  while (!S.over && guard++ < 300) { const ms = C.legal(L, S); if (!ms.length) break; const win = ms.find(m => m.win); if (win) { S = C.apply(L, S, win.cell); break; }
    const unlit = L.lamps.filter((c, k) => !(S.lampLit >> k & 1)); let nx = -1;
    if (unlit.length) nx = bfsNext(L, S, a => unlit.some(l => L.adj[l].includes(a)));
    if (nx < 0) nx = bfsNext(L, S, a => L.adj[L.door].includes(a));
    const m = ms.find(q => q.cell === nx) || ms[0]; S = C.apply(L, S, m.cell); }
  return S.won; }
// змейка «обойди всё»: правило левой (или правой) руки
function snakeBot(lv, hand) { const L = C.compile(lv); let S = C.init(L), h = 'R', guard = 0; const left = { U: 'L', L: 'D', D: 'R', R: 'U' }, right = { U: 'R', R: 'D', D: 'L', L: 'U' }, back = { U: 'D', D: 'U', L: 'R', R: 'L' };
  const a = hand === 'right' ? right : left, b = hand === 'right' ? left : right;
  while (!S.over && guard++ < 300) { const ms = C.legal(L, S); if (!ms.length) break; const win = ms.find(m => m.win); if (win) { S = C.apply(L, S, win.cell); break; }
    const p = S.tail[S.tail.length - 1]; let done = false;
    for (const dch of [a[h], h, b[h], back[h]]) { const c = C.cellInDir(L, p, dch), m = ms.find(q => q.cell === c); if (m) { S = C.apply(L, S, c); h = dch; done = true; break; } }
    if (!done) break; }
  return S.won; }
const lazyWins = lv => greedyBot(lv) || snakeBot(lv, 'left') || snakeBot(lv, 'right');

// ---------- «ворота»: меняет ли элемент решение ----------
// Убираем элемент и смотрим: решения нет или par другой — значит, элемент здесь работает.
const swap = (lv, re, to) => ({ n: lv.n, map: lv.map.map(r => r.replace(re, to)) });
function gates(lv, par, maxStates) { const has = ch => lv.map.some(r => r.includes(ch)), q = v => { const r = C.solve(v, { maxStates: maxStates || 200000 }); return r.solvable ? r.par : null; }, g = {};
  const diff = v => { const p = q(v); return p === null || p !== par; };
  if (has('L')) { const p = q(swap(lv, /L/g, 'K')); g.lampLate = p !== null && p < par;                 // свет опаздывает: с уже горящими лампами путь короче
    g.lamp = q(swap(lv, /L/g, '#')) !== par; }                                                              // без ламп не пройти (или иначе)
  if (has('s')) g.stone = diff(swap(lv, /s/g, '.'));
  if (has('o') || has('g')) { g.oil = diff(swap(swap(lv, /o/g, '.'), /g/g, 'G')); g.oilPit = diff(swap(swap(lv, /o/g, '_'), /g/g, 'G')); }
  if (has('G') || has('g')) { const p = q(swap(swap(lv, /G/g, '.'), /g/g, 'o')); g.guard = p === null || p !== par; }
  if (has('w')) { g.wood = diff(swap(lv, /w/g, '#')); g.woodOpen = diff(swap(lv, /w/g, '.')); }
  if (has('1') || has('2')) g.spool = diff(swap(lv, /[12]/g, '.'));
  if (has('~')) { g.water = diff(swap(lv, /~/g, 's')); g.waterFloor = diff(swap(lv, /~/g, '.')); }
  const lo = lv.n > 2 ? q({ n: lv.n - 1, map: lv.map }) : null, hi = q({ n: lv.n + 1, map: lv.map }); g.nLo = lo; g.nHi = hi; g.nSens = (lo !== par ? 1 : 0) + (hi !== par ? 1 : 0);
  return g; }

// мягкая проверка: без элемента меняется par, число решений или доля случайных побед (элемент отсекает лёгкие пути)
function matters(lv, re, to) { const a = metrics(lv), b = metrics(swap(lv, re, to)); return !b.solvable || a.par !== b.par || a.nsol !== b.nsol || Math.abs(a.pwin - b.pwin) > 1e-9; }
// что случилось в решении: лампы, стражи, доски, катушки, камень дважды, шаги по маслу и воде
function story(lv, plan) { const T = trace(lv, plan), L = T.L, E = T.end, cnt = new Map(); for (const c of T.cells) cnt.set(c, (cnt.get(c) || 0) + 1);
  const pre = T.steps[T.steps.length - 2] || T.steps[0];
  let lampByFire = false, guardLit = false, waterDark = false;      // лампу зажёг пожар, а не огонёк; страж не спал, но не увидел; огонёк тлел в воде рядом со стражем или лампой
  for (let k = 1; k < T.steps.length; k++) { const a = T.steps[k - 1], b = T.steps[k], fl = b.tail[0]; if (b.won) break;
    for (let j = 0; j < L.lamps.length; j++) if ((b.lampLit >> j & 1) && !(a.lampLit >> j & 1) && !(L.type[fl] !== C.WATER && L.adj[fl].includes(L.lamps[j]))) lampByFire = true;
    for (let j = 0; j < L.guards.length; j++) if ((b.guardAlive >> j & 1) && b.lit[L.guards[j]]) guardLit = true;
    if (L.type[fl] === C.WATER && L.light1[fl].some(c => L.guardAt[c] >= 0 || L.type[c] === C.LAMP || c === L.door)) waterDark = true; }
  return { lampsLit: E.lampLit & ~L.lampLit0, lampsAll: L.lamps.length, guardsBurnt: L.guards.filter((c, k) => !(E.guardAlive >> k & 1)).length, guards: L.guards.length,
    woodBurnt: [...L.init].filter((v, i) => v === C.WOOD && pre.d[i] !== C.WOOD).length, spoolsTaken: [...Array(L.spools.length)].filter((_, k) => E.spools >> k & 1).length, spools: L.spools.length,
    twice: [...cnt.values()].filter(v => v > 1).length, onWood: T.cells.filter(c => L.init[c] === C.WOOD).length, onOil: T.cells.filter(c => L.init[c] & C.OIL).length, onWater: T.cells.filter(c => L.type[c] === C.WATER).length,
    lampByFire, guardLit, waterDark, doorByLamp: L.lamps.some((c, k) => (pre.lampLit >> k & 1) && L.light2[c].includes(L.door)) }; }

// ---------- оценка сложности ----------
// Сколько «удачи» нужно тыкающему наугад (биты) + длина плана + развилки, где ошибка видна не сразу.
// сложность для взрослого: сколько «удачи» нужно игроку, который видит ловушки на 4 и на 6 ходов вперёд, плюс немного длины
function adultDifficulty(m) { return +(1.0 * m.bits4 + 0.6 * m.bits6 + 0.25 * m.bits + 0.04 * m.par).toFixed(2); }
function difficulty(m) { return +(m.bits + 0.12 * m.par + 0.35 * m.delayed + 0.08 * Math.min(m.maxLife, 12)).toFixed(2); }

const walkable = lv => { const L = C.compile(lv); let k = 0; for (let c = 0; c < L.n; c++) if ((L.type[c] === C.FLOOR || L.type[c] === C.STONE || L.type[c] === C.WATER) && !(L.init[c] & (C.PIT | C.WOOD))) k++; return k; };

module.exports = { adultDifficulty, matters, graph, metrics, trace, playPlan, greedyBot, snakeBot, lazyWins, gates, story, difficulty, swap, walkable };

if (require.main === module) { const { LEVELS } = require('./levels.js');
  LEVELS.forEach((lv, i) => { const m = metrics(lv); if (!m.solvable) { console.log(`L${i + 1} НЕ РЕШАЕТСЯ`); return; } const g = gates(lv, m.par), st = story(lv, m.plan);
    console.log(`${lv.id} N${lv.n} par ${String(m.par).padStart(2)} сост ${String(m.states).padStart(5)} рандом ${(m.pwin * 100).toFixed(1).padStart(5)}% биты ${m.bits.toFixed(1)} реш ${m.nsol} развилок ${m.forks} крит ${m.critical} ошибок ${m.mistakes} отлож ${m.delayed} жизнь ${m.maxLife} | D ${difficulty(m).toFixed(1)} | p4 ${(m.p4 * 100).toFixed(0)}% p6 ${(m.p6 * 100).toFixed(0)}% A ${adultDifficulty(m).toFixed(1)} | лентяй ${lazyWins(lv) ? 'ДА' : '—'} | ворота ${Object.entries(g).filter(([k, v]) => v === true).map(([k]) => k).join(',')} N±:${g.nSens}`); }); }
