// Генератор карт «Фитиля» (Node, в игру не входит): вырезает подвал, расставляет жетоны по рецепту мира,
// считает числа (analyze.js) и пишет годные карты строками JSON в файл-запас. Отбор в уровни — pick.js.
//   node gen.js <мир> <попыток> <файл.jsonl>    SEED=… — зерно (пишется в каждую строку)
const fs = require('fs'), C = require('./logic.js'), A = require('./analyze.js');
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const SEED = +process.env.SEED || 1, R = rng(SEED), ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)], chance = p => R() < p;
const MAXS = 40000;

// ---------- подвал: рост коридоров от случайной клетки ----------
function carve(W, H, target, pLoop, pRoom) { const g = Array.from({ length: H }, () => Array(W).fill('#')), cells = [];
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H, open = (x, y) => inb(x, y) && g[y][x] !== '#';
  const put = (x, y) => { g[y][x] = '.'; cells.push([x, y]); }; put(ri(0, W - 1), ri(0, H - 1));
  for (let tries = 0; cells.length < target && tries < 4000; tries++) {
    const [cx, cy] = chance(0.65) ? cells[Math.max(0, cells.length - 1 - ri(0, 2))] : pick(cells), [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), x = cx + dx, y = cy + dy;
    if (!inb(x, y) || open(x, y)) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => open(x + a, y + b)).length;
    if (nb >= 2 && !chance(pLoop)) continue;
    const sq = [[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([a, b]) => [[0, 0], [1, 0], [0, 1], [1, 1]].every(([c, d]) => (x + a + c === x && y + b + d === y) || open(x + a + c, y + b + d)));
    if (sq && !chance(pRoom)) continue;
    put(x, y); }
  return g; }
const nb4 = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
function cellsOf(g, test) { const out = []; for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (test(g[y][x], x, y)) out.push([x, y]); return out; }
const at = (g, x, y) => (g[y] && g[y][x]) || '#', deg = (g, x, y) => nb4(x, y).filter(([a, b]) => at(g, a, b) !== '#').length;
const free = (g, x, y) => at(g, x, y) === '.';
function place(g, ch, pool) { if (!pool.length) return null; const [x, y] = pick(pool); g[y][x] = ch; return [x, y]; }
const floors = g => cellsOf(g, ch => ch === '.'), wallsNear = g => cellsOf(g, (ch, x, y) => ch === '#' && deg(g, x, y) >= 1);
function trim(g) { let rows = g.map(r => r.join(''));
  while (rows.length > 1 && /^#+$/.test(rows[0])) rows.shift(); while (rows.length > 1 && /^#+$/.test(rows[rows.length - 1])) rows.pop();
  while (rows[0].length > 1 && rows.every(r => r[0] === '#')) rows = rows.map(r => r.slice(1)); while (rows[0].length > 1 && rows.every(r => r[r.length - 1] === '#')) rows = rows.map(r => r.slice(0, -1));
  return rows; }

// ---------- жетоны ----------
// spec: { n, W, H, cells, loop, room, lamps, lit, stone, oil, guards, wood, spool, water, pits, doorInWall }
function build(sp) { const g = carve(sp.W, sp.H, sp.cells, sp.loop, sp.room);
  const ends = floors(g).filter(([x, y]) => deg(g, x, y) === 1), p = place(g, 'P', chance(0.6) && ends.length ? ends : floors(g)); if (!p) return null;
  const far = ([x, y]) => Math.abs(x - p[0]) + Math.abs(y - p[1]) >= 3;
  // дверь: в стене рядом с одной клеткой пола или в тупике
  const dw = wallsNear(g).filter(([x, y]) => deg(g, x, y) === 1 && far([x, y])), de = floors(g).filter(([x, y]) => deg(g, x, y) === 1 && far([x, y]));
  const d = place(g, 'D', (chance(sp.doorInWall === undefined ? 0.7 : sp.doorInWall) && dw.length) ? dw : (de.length ? de : dw)); if (!d) return null;
  for (let i = 0; i < (sp.lamps || 0); i++) { const w = wallsNear(g), f = floors(g).filter(([x, y]) => deg(g, x, y) >= 2), nearD = w.filter(([x, y]) => Math.abs(x - d[0]) + Math.abs(y - d[1]) <= 2);
    const pool = (i === 0 && nearD.length && chance(sp.lampNearDoor === undefined ? 0.7 : sp.lampNearDoor)) ? nearD : (chance(0.8) && w.length ? w : f); if (!place(g, i < (sp.lit || 0) ? 'K' : 'L', pool)) return null; }
  for (let i = 0; i < (sp.pits || 0); i++) place(g, '_', floors(g).filter(([x, y]) => deg(g, x, y) >= 2));
  for (let i = 0; i < (sp.stone || 0); i++) { const j = floors(g).filter(([x, y]) => deg(g, x, y) >= 3), any = floors(g); place(g, 's', chance(0.7) && j.length ? j : any); }
  for (let i = 0; i < (sp.water || 0); i++) { const near = floors(g).filter(([x, y]) => nb4(x, y).some(([a, b]) => at(g, a, b) === '~')); place(g, '~', i > 0 && near.length && chance(0.7) ? near : floors(g)); }
  if (sp.oil) { let seed = place(g, 'o', floors(g).filter(([x, y]) => !nb4(x, y).some(([a, b]) => at(g, a, b) === 'P'))); if (!seed) return null; let fr = [seed], left = sp.oil - 1;
    while (left > 0 && fr.length) { const c = pick(fr), nb = nb4(c[0], c[1]).filter(([a, b]) => free(g, a, b)); if (!nb.length) { fr = fr.filter(q => q !== c); continue; } const q = pick(nb); g[q[1]][q[0]] = 'o'; fr.push(q); left--; } }
  for (let i = 0; i < (sp.guards || 0); i++) { const onOil = cellsOf(g, ch => ch === 'o'), fl = floors(g).filter(([x, y]) => !nb4(x, y).some(([a, b]) => at(g, a, b) === 'P'));
    if (sp.guardOnOil && onOil.length && chance(sp.guardOnOil)) place(g, 'g', onOil); else if (!place(g, 'G', fl)) return null; }
  for (let i = 0; i < (sp.wood || 0); i++) { const cor = floors(g).filter(([x, y]) => deg(g, x, y) === 2); if (!place(g, 'w', cor.length ? cor : floors(g))) return null; }
  for (let i = 0; i < (sp.spool || 0); i++) if (!place(g, chance(sp.spool2 || 0.3) ? '2' : '1', floors(g))) return null;
  return trim(g); }

// ---------- рецепты миров: какие жетоны и сколько ----------
const size = (a, b) => { const W = ri(a[0], a[1]), H = ri(b[0], b[1]); return { W, H }; };
const RECIPES = {
  // 1 «Первый свет»: зажжённые и незажжённые лампы, свет опаздывает
  w1: () => ({ n: pick([3, 3, 3, 4]), ...size([4, 6], [4, 7]), cells: ri(9, 20), loop: 0.35, room: 0.25, lamps: pick([1, 1, 1, 2]), lit: chance(0.25) ? 1 : 0, pits: chance(0.2) ? 1 : 0 }),
  // 2 «Живой свет»: дверь освещает сам огонёк; разные N; две лампы
  w2: () => ({ n: pick([2, 3, 4, 5]), ...size([4, 6], [4, 8]), cells: ri(10, 24), loop: 0.5, room: 0.35, lamps: pick([0, 0, 0, 1, 2]), lampNearDoor: 0.3, pits: chance(0.3) ? ri(1, 2) : 0 }),
  // 3 «Камень»
  w3: () => ({ n: pick([3, 3, 4, 4, 5]), ...size([4, 6], [4, 8]), cells: ri(10, 24), loop: 0.5, room: 0.4, lamps: pick([0, 1, 1, 1, 2]), stone: pick([1, 1, 2, 2, 3]), pits: chance(0.2) ? 1 : 0 }),
  // 4 «Масло»
  w4: () => ({ n: pick([3, 3, 4, 4, 5]), ...size([4, 7], [5, 8]), cells: ri(14, 28), loop: 0.55, room: 0.5, lamps: pick([1, 1, 1, 2]), oil: ri(2, 8), stone: chance(0.3) ? 1 : 0, pits: chance(0.25) ? ri(1, 2) : 0, lampNearDoor: 0.5 }),
  // 5 «Стражи»
  w5: () => ({ n: pick([2, 3, 3, 4, 4, 5]), ...size([5, 7], [5, 8]), cells: ri(14, 28), loop: 0.5, room: 0.45, lamps: pick([1, 1, 2, 2]), guards: pick([1, 1, 1, 2]), oil: chance(0.4) ? ri(3, 7) : 0, guardOnOil: 0.7, stone: chance(0.25) ? 1 : 0, lampNearDoor: 0.6 }),
  // 6 «Доски»
  w6: () => ({ n: pick([2, 3, 3, 4, 4]), ...size([5, 7], [5, 8]), cells: ri(14, 28), loop: 0.55, room: 0.4, lamps: pick([0, 1, 1, 2]), wood: pick([1, 1, 2]), stone: chance(0.5) ? ri(1, 2) : 0, oil: chance(0.35) ? ri(2, 6) : 0, guards: chance(0.2) ? 1 : 0, guardOnOil: 0.5 }),
  // 7 «Катушка»
  w7: () => ({ n: pick([2, 2, 3, 3, 4]), ...size([5, 7], [5, 8]), cells: ri(14, 28), loop: 0.55, room: 0.4, lamps: pick([0, 1, 1, 2]), spool: pick([1, 1, 2]), stone: chance(0.35) ? 1 : 0, oil: chance(0.35) ? ri(2, 6) : 0, guards: chance(0.3) ? 1 : 0, guardOnOil: 0.5, wood: chance(0.2) ? 1 : 0 }),
  // 8 «Вода»
  w8: () => ({ n: pick([2, 3, 3, 4, 4, 5]), ...size([5, 7], [5, 8]), cells: ri(14, 28), loop: 0.55, room: 0.4, lamps: pick([0, 1, 1, 2]), water: ri(1, 3), guards: pick([0, 1, 1, 1, 2]), oil: chance(0.3) ? ri(2, 6) : 0, guardOnOil: 0.4, stone: chance(0.2) ? 1 : 0, wood: chance(0.2) ? 1 : 0, spool: chance(0.15) ? 1 : 0 }),
  // финал: всё сразу, поля крупнее
  w9: () => ({ n: pick([2, 3, 4, 4]), ...size([6, 7], [7, 9]), cells: ri(22, 34), loop: 0.55, room: 0.4, lamps: pick([1, 2, 2]), guards: pick([1, 1, 2]), oil: ri(3, 8), guardOnOil: 0.6, stone: pick([0, 1, 1, 2]), wood: pick([0, 1, 1]), water: pick([0, 0, 1, 2]), spool: pick([0, 0, 1]) }),
};

// ---------- прогон ----------
const [world, triesArg, outFile] = process.argv.slice(2), recipe = RECIPES[world], tries = +triesArg || 2000, seen = new Set(); let kept = 0, solv = 0;
const out = fs.createWriteStream(outFile, { flags: 'a' });
for (let i = 0; i < tries; i++) { const sp = recipe(), map = build(sp); if (!map) continue; const k = sp.n + ':' + map.join('/'); if (seen.has(k)) continue; seen.add(k);
  if (map[0].length > 7 || map.length > 9) continue;
  const lv = { n: sp.n, map }, m = A.metrics(lv, MAXS); if (!m.solvable || m.overflow) continue; solv++;
  if (m.par < 4 || m.par > 34 || m.pwin >= 0.5) continue;
  const g = A.gates(lv, m.par, MAXS), st = A.story(lv, m.plan), lazy = A.lazyWins(lv);
  const row = { w: world, seed: SEED, i, n: sp.n, map, par: m.par, plan: m.plan, states: m.states, pwin: +m.pwin.toFixed(4), bits: +m.bits.toFixed(2), nsol: m.nsol, forks: m.forks, critical: m.critical, mistakes: m.mistakes, delayed: m.delayed, maxLife: m.maxLife,
    D: A.difficulty(m), lazy, g, st, cells: A.walkable(lv), used: new Set(A.trace(lv, m.plan).cells).size };
  out.write(JSON.stringify(row) + '\n'); kept++; }
out.end(() => console.log(`${world} seed ${SEED}: попыток ${tries}, разных карт ${seen.size}, решаемых ${solv}, в запас ${kept}`));
