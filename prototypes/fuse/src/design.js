// Подборщик карт «Фитиля»: расставляет жетоны на заготовке и оставляет только те расстановки, где решение
// требует идеи уровня (проверка — решателем и ленивыми ботами). Карты потом выбираются глазами и переносятся в levels.js.
//   node design.js <набор> [попыток]     SEED=… TOP=… — зерно и сколько карт напечатать
const C = require('./logic.js');
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const R = rng(+process.env.SEED || 7), pick = a => a[Math.floor(R() * a.length)], MAXS = 300000;
const sol = (map, n) => C.solve({ n, map }, { maxStates: MAXS });
function trace(lv, plan) { const L = C.compile(lv); let S = C.init(L); const steps = [S], cells = [L.start];
  for (const ch of plan) { const c = C.cellInDir(L, S.tail[S.tail.length - 1], ch); cells.push(c); S = C.apply(L, S, c); steps.push(S); } return { L, steps, cells, end: S }; }
function playPlan(lv, plan) { const L = C.compile(lv); let S = C.init(L);
  for (const ch of plan) { const c = C.cellInDir(L, S.tail[S.tail.length - 1], ch); if (!C.legal(L, S).some(m => m.cell === c)) return false; S = C.apply(L, S, c); if (S.over) break; } return S.won; }
function greedy(lv) { const L = C.compile(lv); let S = C.init(L), g = 0;
  const next = isGoal => { const p = S.tail[S.tail.length - 1], prev = new Map([[p, -1]]), q = [p];
    const ok = a => L.type[a] !== C.WALL && L.type[a] !== C.LAMP && L.type[a] !== C.DOOR && !(S.d[a] & C.PIT) && !S.tail.includes(a) && !(L.guardAt[a] >= 0 && (S.guardAlive >> L.guardAt[a] & 1));
    while (q.length) { const a = q.shift(); if (a !== p && isGoal(a)) { let c = a; while (prev.get(c) !== p) c = prev.get(c); return c; } for (const b of L.adj[a]) if (!prev.has(b) && ok(b)) { prev.set(b, a); q.push(b); } } return -1; };
  while (!S.over && g++ < 200) { const ms = C.legal(L, S); if (!ms.length) break; const w = ms.find(m => m.win); if (w) { S = C.apply(L, S, w.cell); break; }
    const unlit = L.lamps.filter((c, k) => !(S.lampLit >> k & 1)); let nx = -1; if (unlit.length) nx = next(a => unlit.some(l => L.adj[l].includes(a))); if (nx < 0) nx = next(a => L.adj[L.door].includes(a));
    S = C.apply(L, S, (ms.find(q => q.cell === nx) || ms[0]).cell); } return S.won; }
function snake(lv) { const L = C.compile(lv); let S = C.init(L), h = 'R', g = 0; const left = { U: 'L', L: 'D', D: 'R', R: 'U' }, right = { U: 'R', R: 'D', D: 'L', L: 'U' }, back = { U: 'D', D: 'U', L: 'R', R: 'L' };
  while (!S.over && g++ < 200) { const ms = C.legal(L, S); if (!ms.length) break; const w = ms.find(m => m.win); if (w) { S = C.apply(L, S, w.cell); break; } const p = S.tail[S.tail.length - 1]; let done = false;
    for (const d of [left[h], h, right[h], back[h]]) { const c = C.cellInDir(L, p, d); if (ms.find(q => q.cell === c)) { S = C.apply(L, S, c); h = d; done = true; break; } } if (!done) break; } return S.won; }
function randomRate(lv, games) { const L = C.compile(lv); let w = 0; for (let i = 0; i < games; i++) { let S = C.init(L); while (!S.over) { const ms = C.legal(L, S); if (!ms.length) break; S = C.apply(L, S, pick(ms).cell); } if (S.won) w++; } return w / games; }
// ---- сборка карты ----
const grid = base => base.map(r => r.split('')), cellsOf = (g, chs) => g.flatMap((r, y) => r.map((ch, x) => chs.includes(ch) ? [x, y] : null)).filter(Boolean);
const nb4 = ([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
function put(g, tk, where) { const pool = cellsOf(g, where || '.'); if (!pool.length) return null; const [x, y] = pick(pool); g[y][x] = tk; return [x, y]; }
function walls(g, k) { for (let i = 0; i < k; i++) put(g, '#'); }
function oilFrom(g, start, n) { let fr = [start]; while (n > 0 && fr.length) { const c = pick(fr), nb = nb4(c).filter(([a, b]) => g[b] && g[b][a] === '.'); if (!nb.length) { fr = fr.filter(q => q !== c); continue; } const [a, b] = pick(nb); g[b][a] = 'o'; fr.push([a, b]); n--; } }
const done = g => g.map(r => r.join('').replace(/\?/g, '#'));
const adjOil = (g, [x, y]) => nb4([x, y]).some(([a, b]) => g[b] && 'og'.includes(g[b][a]));
const ROOM6 = ['######', '#....#', '#....#', '#....#', '#....#', '#....#', '#....#', '######'], ROOM7 = ['#######', '#.....#', '#.?.?.#', '#.....#', '#.?.?.#', '#.....#', '#.....#', '#######'];
const SETS = {
  // L8 «Лужа»: разлив поперёк зала; масло надо пересечь (с провалами вместо масла — нерешаемо), и оно меняет решение
  puddle: { n: 3, gen() { const g = grid(['######', '#....#', '#....#', '#oooo#', '#oooo#', '#....#', '#....#', '######']); walls(g, 2 + Math.floor(R() * 3));
      const p = put(g, 'P'); if (!p || adjOil(g, p) || p[1] > 2) return null; if (!put(g, 'D') || !put(g, R() < 0.5 ? 'L' : 'L', R() < 0.5 ? 'o' : '.')) return null; return done(g); },
    ok(lv, r, T) { if (r.par < 7 || r.par > 20) return false; const m = lv.map; if (sol(m.map(s => s.replace(/o/g, '_')), lv.n).solvable) return false;
      const dry = sol(m.map(s => s.replace(/o/g, '.')), lv.n); if (!dry.solvable || dry.par >= r.par) return false; lv.note = ` | без масла par ${dry.par}`; return T.end.lampLit !== 0; } },
  // L9 «Запал»: лампа на островке (рядом с ней только масло и провалы) — её зажигает пожар, а не огонёк
  primer: { n: 3, gen() { const g = grid(ROOM6); const l = put(g, 'L'); if (!l) return null; const nb = nb4(l).filter(([a, b]) => g[b][a] === '.'); if (!nb.length) return null;
      const o = pick(nb); for (const [a, b] of nb) g[b][a] = '_'; g[o[1]][o[0]] = 'o'; let cur = o, len = 2 + Math.floor(R() * 3);
      while (len-- > 0) { const n2 = nb4(cur).filter(([a, b]) => g[b][a] === '.' && !nb4([a, b]).some(([c, d]) => g[d][c] === 'L')); if (!n2.length) break; cur = pick(n2); g[cur[1]][cur[0]] = 'o'; }
      walls(g, 3 + Math.floor(R() * 4)); const p = put(g, 'P'); if (!p || adjOil(g, p)) return null; if (!put(g, 'D')) return null; return done(g); },
    ok(lv, r, T) { if (r.par < 8 || r.par > 22) return false; if (!T.end.lampLit) return false; const L = T.L, pre = T.steps[T.steps.length - 2];
      if (C.computeLight(L, pre.tail[0], pre.d, 0)[L.door]) return false;                                   // дверь должна открывать лампа
      const oil = T.cells.filter(c => L.init[c] & C.OIL).length; if (oil < 1) return false; lv.note = ` | по маслу ${oil}`; return true; } },
  // L11 «Два света»: в решении горит ровно одна лампа; с обеими — нерешаемо; без стража путь короче и идёт мимо ближней лампы
  two: { n: 4, gen() { const g = grid(ROOM7); walls(g, 2 + Math.floor(R() * 3)); for (const tk of 'LL') if (!put(g, tk, R() < 0.7 ? '?' : '.')) return null; for (const tk of 'PDG') if (!put(g, tk)) return null; if (R() < 0.5) put(g, 's'); return done(g); },
    ok(lv, r, T) { if (r.par < 9 || r.par > 24) return false; const lit = T.end.lampLit; if (lit !== 1 && lit !== 2) return false;
      if (sol(lv.map.map(s => s.replace(/L/g, 'K')), lv.n).solvable) return false;
      const free = sol(lv.map.map(s => s.replace(/G/g, '.')), lv.n); if (!free.solvable || free.par >= r.par) return false;
      const F = trace({ n: lv.n, map: lv.map.map(s => s.replace(/G/g, '.')) }, free.plan); const other = lit === 1 ? 1 : 0;
      if (!F.cells.some(c => F.L.adj[F.L.lamps[other]].includes(c))) return false; lv.note = ` | без стража par ${free.par} (мимо второй лампы)`; return true; } },
  // L12 «Костёр»: страж на масле сгорает (без масла под ним — нерешаемо), дверь в конце открывает лампа, а не пожар
  fire: { n: 3, gen() { const g = grid(ROOM6); const gp = put(g, 'g'); oilFrom(g, gp, 3 + Math.floor(R() * 4)); walls(g, 3 + Math.floor(R() * 3)); if (!put(g, 'L')) return null; const p = put(g, 'P'); if (!p || adjOil(g, p)) return null; if (!put(g, 'D')) return null; return done(g); },
    ok(lv, r, T) { if (r.par < 9 || r.par > 24) return false; if (T.end.guardAlive !== 0 || !T.end.lampLit) return false; const L = T.L, pre = T.steps[T.steps.length - 2];
      if (C.computeLight(L, pre.tail[0], pre.d, 0)[L.door]) return false; if (!L.light2[L.lamps[0]].includes(L.guards[0])) return false;      // страж в пятне лампы
      return !sol(lv.map.map(s => s.replace(/g/g, 'G')), lv.n).solvable; } },
  // L13 «Свой свет»: страж вне пятна лампы, его будит сам огонёк; без стража решение короче
  own: { n: 5, gen() { const g = grid(ROOM7); walls(g, 3 + Math.floor(R() * 3)); if (!put(g, 'L', R() < 0.7 ? '?' : '.')) return null; for (const tk of 'PDG') if (!put(g, tk)) return null; return done(g); },
    ok(lv, r, T) { if (r.par < 10 || r.par > 26) return false; const L = T.L, gc = L.guards[0]; if (L.light2[L.lamps[0]].includes(gc)) return false; if (!T.steps.some(S => S.lit[gc])) return false;
      const free = sol(lv.map.map(s => s.replace(/G/g, '.')), lv.n); if (!free.solvable || free.par >= r.par) return false; lv.note = ` | без стража par ${free.par}`; return true; } },
  // L14/L15 «Подвал»: страж на масле сгорает, камень пройден дважды; на той же карте при N = 2 решение другое и тоже не даётся ленивым ботам
  exam: { n: 4, gen() { const g = grid(ROOM7); const gp = put(g, 'g'); oilFrom(g, gp, 3 + Math.floor(R() * 4)); walls(g, 2 + Math.floor(R() * 3));
      const near = cellsOf(g, '.?').filter(c => adjOil(g, c)); if (!near.length) return null; const l = pick(near); g[l[1]][l[0]] = 'L';                       // лампа у разлива: её зажжёт пожар
      const dd = cellsOf(g, '.').filter(([x, y]) => Math.abs(x - l[0]) + Math.abs(y - l[1]) <= 2); if (!dd.length) return null; const d = pick(dd); g[d[1]][d[0]] = 'D';
      if (!put(g, 's')) return null; const pp = cellsOf(g, '.').filter(([x, y]) => Math.abs(x - d[0]) + Math.abs(y - d[1]) >= 5 && !adjOil(g, [x, y])); if (!pp.length) return null; const p = pick(pp); g[p[1]][p[0]] = 'P'; return done(g); },
    ok(lv, r, T) { if (r.par < 12 || r.par > 30) return false; if (T.end.guardAlive !== 0 || !T.end.lampLit || !T.L.light2[T.L.lamps[0]].includes(T.L.door)) return false; const stone = [...T.L.type].findIndex(t => t === C.STONE); if (T.cells.filter(c => c === stone).length < 2) return false;
      const m2 = { n: 2, map: lv.map }, r2 = sol(lv.map, 2); if (!r2.solvable || r2.par < 6 || playPlan(m2, r.plan) || playPlan(lv, r2.plan)) return false; if (greedy(m2) || snake(m2) || randomRate(m2, 300) >= 0.4) return false;
      lv.note = ` | при N=2: par ${r2.par} план ${r2.plan}`; lv.bonus = r2.par; return true; } },
};
const name = process.argv[2], tries = +process.argv[3] || 20000, set = SETS[name]; const found = [], seen = new Set();
for (let i = 0; i < tries && found.length < 300; i++) { const map = set.gen(); if (!map) continue; const k = map.join('/'); if (seen.has(k)) continue; seen.add(k);
  const lv = { n: set.n, map }, r = sol(map, set.n); if (!r.solvable) continue; const T = trace(lv, r.plan);
  if (!set.ok(lv, r, T)) continue; if (greedy(lv) || snake(lv)) continue; const rr = randomRate(lv, 300); if (rr >= 0.3) continue;
  const lo = sol(map, set.n - 1), hi = sol(map, set.n + 1), nsens = (lo.par !== r.par ? 1 : 0) + (hi.par !== r.par ? 1 : 0);
  found.push({ map, par: r.par, plan: r.plan, states: r.states, rr, nsens, lo: lo.par, hi: hi.par, note: lv.note || '', bonus: lv.bonus || 0 }); }
found.sort((a, b) => b.nsens - a.nsens || b.bonus - a.bonus || b.states - a.states);
console.log(`набор ${name}: перебрано ${seen.size}, подходит ${found.length}`);
for (const f of found.slice(0, +process.env.TOP || 5)) console.log(`par ${f.par} (N−1→${f.lo}, N+1→${f.hi}) сост. ${f.states} рандом ${(f.rr * 100).toFixed(0)}% план ${f.plan}${f.note}\n  ` + f.map.join('\n  '));
