// Подборщик карт: расставляет жетоны на заготовке и оставляет расстановки, где решение требует нужной идеи.
//   node design.js <имя набора> [попыток]      — печатает лучшие карты; дальше выбираю глазами и переношу в levels.js
const C = require('./logic.js');
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const R = rng(+process.env.SEED || 7);
function trace(lv, plan) { const L = C.compile(lv); let S = C.init(L); const steps = [S];
  for (const ch of plan) { S = C.apply(L, S, C.cellInDir(L, S.tail[S.tail.length - 1], ch)); steps.push(S); } return { L, steps, end: S }; }
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
function randomRate(lv, games) { const L = C.compile(lv); let w = 0; for (let i = 0; i < games; i++) { let S = C.init(L); while (!S.over) { const ms = C.legal(L, S); if (!ms.length) break; S = C.apply(L, S, ms[Math.floor(R() * ms.length)].cell); } if (S.won) w++; } return w / games; }
// расставить жетоны (строка символов) на случайные клетки '.' заготовки; '?' в заготовке — клетки только для ламп и стражей
function place(base, tokens, opts) { const g = base.map(r => r.split('')), free = [], wallish = [];
  g.forEach((r, y) => r.forEach((ch, x) => { if (ch === '.') free.push([x, y]); if (ch === '?') wallish.push([x, y]); }));
  for (const tk of tokens) { const pool = ('LK'.includes(tk) && wallish.length && R() < 0.7) ? wallish : free; if (!pool.length) return null; const i = Math.floor(R() * pool.length), [x, y] = pool.splice(i, 1)[0]; g[y][x] = tk; }
  if (opts && opts.oil) { let n = opts.oil[0] + Math.floor(R() * (opts.oil[1] - opts.oil[0] + 1)), seedIdx = g.flatMap((r, y) => r.map((ch, x) => ch === 'g' ? [x, y] : null)).filter(Boolean)[0] || free[Math.floor(R() * free.length)], fr = [seedIdx];
    while (n > 0 && fr.length) { const [x, y] = fr[Math.floor(R() * fr.length)], nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => g[b] && g[b][a] === '.'); if (!nb.length) { fr = fr.filter(q => q[0] !== x || q[1] !== y); continue; } const [a, b] = nb[Math.floor(R() * nb.length)]; g[b][a] = 'o'; fr.push([a, b]); n--; } }
  if (opts && opts.walls) for (let k = 0; k < opts.walls; k++) { const fl = g.flatMap((r, y) => r.map((ch, x) => ch === '.' ? [x, y] : null)).filter(Boolean); if (!fl.length) break; const [x, y] = fl[Math.floor(R() * fl.length)]; g[y][x] = '#'; }
  return g.map(r => r.join('').replace(/\?/g, '#')); }
const SETS = {
  // L11 «Два света»: решение зажигает ровно одну лампу; с обеими зажжёнными — нерешаемо
  two: { n: 4, base: ['#######', '#.....#', '#.?.?.#', '#.....#', '#.?.?.#', '#.....#', '#######'], tokens: 'PDLLG', opts: { walls: 3 },
    ok(lv, r, T) { if (r.par < 9 || r.par > 22) return false; const lit = T.end.lampLit; if (lit !== 1 && lit !== 2) return false;
      const both = { n: lv.n, map: lv.map.map(s => s.replace(/L/g, 'K')) }; if (C.solve(both).solvable) return false;
      if (!T.steps.some(S => S.guardAlive && false)) { } return true; } },
  // L12 «Костёр»: страж на масле должен сгореть; если масла под ним нет — нерешаемо
  fire: { n: 3, base: ['######', '#....#', '#....#', '#....#', '#....#', '#....#', '######'], tokens: 'PDLg', opts: { oil: [3, 6], walls: 4 },
    ok(lv, r, T) { if (r.par < 8 || r.par > 22) return false; if (T.end.guardAlive !== 0) return false;
      const noOil = { n: lv.n, map: lv.map.map(s => s.replace(/g/g, 'G')) }; return !C.solve(noOil).solvable; } },
  // L13 «Свой свет»: стража будит сам огонёк (страж вне пятна лампы), и это меняет решение при другой N
  own: { n: 5, base: ['#######', '#.....#', '#.?.?.#', '#.....#', '#.?.?.#', '#.....#', '#.....#', '#######'], tokens: 'PDLG', opts: { walls: 4 },
    ok(lv, r, T) { if (r.par < 10 || r.par > 26) return false; const L = T.L, g = L.guards[0], lamp = L.lamps[0]; if (L.light2[lamp].includes(g)) return false;
      const woke = T.steps.some(S => S.lit[g]); if (!woke) return false;
      const noGuard = { n: lv.n, map: lv.map.map(s => s.replace(/G/g, '.')) }; const r0 = C.solve(noGuard); return r0.solvable && r0.par < r.par; } },
  // L14/L15 «Подвал»: страж на масле сгорает, камень проходится дважды; та же карта при N = 2 решается иначе
  exam: { n: 4, base: ['#######', '#.....#', '#.?.?.#', '#..s..#', '#.?.?.#', '#.....#', '#.....#', '#######'], tokens: 'PDLg', opts: { oil: [3, 6], walls: 3 },
    ok(lv, r, T) { if (r.par < 12 || r.par > 30) return false; if (T.end.guardAlive !== 0) return false;
      const path = T.end.tail.length ? null : null; let cells = [T.L.start], S0 = null; { let L = T.L, S = C.init(L); for (const ch of r.plan) { const c = C.cellInDir(L, S.tail[S.tail.length - 1], ch); cells.push(c); S = C.apply(L, S, c); } }
      const stone = [...T.L.type].findIndex(t => t === C.STONE); if (cells.filter(c => c === stone).length < 2) return false;
      const r2 = C.solve({ n: 2, map: lv.map }, { maxStates: 200000 }); if (!r2.solvable || r2.plan === r.plan) return false; if (playPlan({ n: 2, map: lv.map }, r.plan)) return false;
      lv.par2 = r2.par; lv.plan2 = r2.plan; return true; } },
};
const name = process.argv[2], tries = +process.argv[3] || 20000, set = SETS[name]; const found = [], seen = new Set();
for (let i = 0; i < tries && found.length < 400; i++) { const map = place(set.base, set.tokens, set.opts); if (!map) continue; const k = map.join('/'); if (seen.has(k)) continue; seen.add(k);
  const lv = { n: set.n, map }, r = C.solve(lv, { maxStates: 200000 }); if (!r.solvable) continue; const T = trace(lv, r.plan);
  if (!set.ok(lv, r, T)) continue; if (greedy(lv) || snake(lv)) continue; const rr = randomRate(lv, 300); if (rr >= 0.3) continue;
  const lo = C.solve(lv, { n: lv.n - 1, maxStates: 200000 }), hi = C.solve(lv, { n: lv.n + 1, maxStates: 200000 }), nsens = (lo.par !== r.par ? 1 : 0) + (hi.par !== r.par ? 1 : 0);
  found.push({ map, par: r.par, plan: r.plan, states: r.states, rr, nsens, lo: lo.par, hi: hi.par, extra: lv.plan2 ? ` | при N=2: par ${lv.par2} план ${lv.plan2}` : '' }); }
found.sort((a, b) => b.nsens - a.nsens || a.states - b.states);
console.log(`набор ${name}: перебрано ${seen.size}, подходит ${found.length}`);
for (const f of found.slice(0, +process.env.TOP || 4)) console.log(`par ${f.par} (N−1→${f.lo}, N+1→${f.hi}) сост. ${f.states} рандом ${(f.rr * 100).toFixed(0)}% план ${f.plan}${f.extra || ''}\n  ` + f.map.join('\n  '));
