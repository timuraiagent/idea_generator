// Отбор 100 уровней «Фитиля» из запаса карт (gen.js) по плану миров: у каждого места — вид задачи и целевая сложность.
//   POOLS=папка1:папка2 node pick.js [--write]     без --write только отчёт; с --write пишет levels.js
// Вводные места и экзамены финала заданы руками (FIX), остальное выбирается из запаса и подрезается (prune).
const fs = require('fs'), path = require('path'), C = require('./logic.js'), A = require('./analyze.js');
const POOLS = (process.env.POOLS || '').split(':').filter(Boolean), WRITE = process.argv.includes('--write');
const rows = []; for (const dir of POOLS) for (const f of fs.readdirSync(dir)) if (f.endsWith('.jsonl')) for (const ln of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) if (ln) rows.push(JSON.parse(ln));
const byW = {}; for (const r of rows) (byW[r.w] = byW[r.w] || []).push(r);
const has = (r, ch) => r.map.some(x => x.includes(ch)), ELS = 'LKsogGw12~_', els = r => [...ELS].filter(ch => has(r, ch)).join(''), only = (r, ok) => [...els(r)].every(ch => ok.includes(ch));
const st = r => r._st || (r._st = A.story({ n: r.n, map: r.map }, r.plan));
const mainGates = r => Object.entries(r.g).filter(([k, v]) => v === true && !['lampLate', 'oilPit', 'woodOpen', 'waterFloor'].includes(k)).length;
const lampsDark = r => { const s = st(r); let lit = 0; for (let k = 0; k < s.lampsAll; k++) if (s.lampsLit >> k & 1) lit++; const pre = r.map.join('').split('K').length - 1; return s.lampsAll - lit - pre > 0; };

// ---------- виды задач ----------
const K = {
  kOnly: r => !has(r, 'L') && only(r, 'K_'),
  lamp: r => has(r, 'L') && only(r, 'LK_') && r.g.lamp && !r.g.lampLate,
  late: r => has(r, 'L') && only(r, 'LK_') && r.g.lampLate,
  lateN: r => has(r, 'L') && only(r, 'LK_') && r.g.lampLate && r.g.nSens >= 1 && r.n !== 3,
  flameDoor: r => !has(r, 'L') && !has(r, 'K') && only(r, '_'),
  flameLamp: r => has(r, 'L') && only(r, 'L_') && !st(r).doorByLamp && r.g.lamp,
  twoLamps: r => only(r, 'LK_') && st(r).lampsAll === 2 && r.g.lampLate,
  w2any: r => only(r, 'LK_') && (r.g.lampLate || !st(r).doorByLamp) && r.g.nSens >= 1,
  stone: r => has(r, 's') && only(r, 'LKs_') && r.g.stone && st(r).twice >= 1,
  oilCross: r => only(r, 'LKo_') && r.g.oil && st(r).onOil >= 1,
  primer: r => only(r, 'LKos_') && has(r, 'o') && st(r).lampByFire,
  oilStone: r => only(r, 'LKos_') && has(r, 's') && has(r, 'o') && (r.g.oil || r.g.oilPit) && r.g.stone,
  oilAny: r => only(r, 'LKos_') && has(r, 'o') && (r.g.oil || st(r).lampByFire),
  guardDark: r => has(r, 'G') && only(r, 'LKGs_') && r.g.guard && st(r).guardsBurnt === 0,
  guardBurn: r => only(r, 'LKGgos_') && st(r).guardsBurnt >= 1 && (r.g.oil || r.g.oilPit),
  guardOwn: r => has(r, 'G') && only(r, 'LKGs_') && r.g.guard && st(r).guardLit,
  guardAny: r => only(r, 'LKGgos_') && (r.g.guard || st(r).guardsBurnt >= 1),
  wood: r => only(r, 'LKws_') && r.g.wood && st(r).woodBurnt >= 1,
  woodOil: r => only(r, 'LKwso_') && has(r, 'o') && r.g.wood && st(r).woodBurnt >= 1 && (r.g.oil || r.g.oilPit),
  woodAny: r => only(r, 'LKwsoGg_') && r.g.wood && st(r).woodBurnt >= 1,
  spoolTake: r => only(r, 'LK12s_') && r.g.spool && st(r).spoolsTaken >= 1,
  spoolSkip: r => only(r, 'LK12s_') && r.g.spool && st(r).spoolsTaken === 0,
  spoolAny: r => only(r, 'LK12soGgw_') && r.g.spool,
  waterGuard: r => has(r, 'G') && only(r, 'LK~Gs_') && r.g.water,
  waterCross: r => only(r, 'LK~s_') && r.g.waterFloor && st(r).onWater >= 1,
  waterAny: r => only(r, 'LK~GgosWw12_') && (r.g.water || (r.g.waterFloor && st(r).onWater >= 1)),
  multi: r => mainGates(r) >= 4,
};

// ---------- ручные уровни (v1 и вводы) ----------
const FIX = {
  L1: { n: 3, map: ['#.###', 'P...#', '###.#', '#.#.#', '#...#', '#.#.#', '#DK##'] }, L2: { n: 3, map: ['#.###', '#...#', '#.#.#', 'P.#.#', '#L#.#', 'D....', '#####'] },
  L3: { n: 3, map: ['#####', '#.L##', 'P..D#', '##...', '##...', '#####'] }, L4: { n: 5, map: ['#####', '#.L##', 'P..D#', '##...', '##...', '#####'] },
  L5: { n: 4, map: ['######', '#D#...', '#.L.#.', '#.....', '#####.', 'P.....', '######'] }, L6: { n: 3, map: ['#####', '#...#', '##..#', 'P.s.#', '#LD##', '#####'] },
  L7: { n: 4, map: ['######', '##...#', '##...#', 'P.s..#', '##.L##', '##D###'] }, L8: { n: 3, map: ['######', '#..P##', '#.L.D#', '#oooo#', '#oooo#', '######'] },
  L9: { n: 3, map: ['######', '#.D_L#', '#..oo#', '#..o##', '#..o.#', '#...##', '#P..##', '######'] }, L10: { n: 3, map: ['######', '#.....', '#.#...', 'P.L.D#', '##G###'] },
  L11: { n: 4, map: ['######', '#P...#', '#.##.#', '#.LG.#', '#.##.#', '#....#', '#.L#.#', '#..D##', '######'] }, L12: { n: 3, map: ['######', '#.#oo#', '#.Lgo#', '#D.oo#', '##...#', '#.P..#', '##...#', '######'] },
  L13: { n: 5, map: ['#######', '#####.#', '###G#P#', '#.....#', '#.#.L.#', '##...D#', '#....##', '#######'] },
  L14: { n: 4, map: ['#######', '#o...D#', '#o#.L##', '#gooo##', '#o#.###', '#..s..#', '#...P.#', '#######'] }, L15: { n: 2, map: ['#######', '#o...D#', '#o#.L##', '#gooo##', '#o#.###', '#..s..#', '#...P.#', '#######'] },
  WOOD: { n: 2, map: ['P...', '#w..', '#.#.', '#DK#'] },
};
const H = {
  L1: ['Иди к светлой двери. Огонёк идёт за тобой, пол за ним падает.', 'Walk to the lit door. The flame follows you and the floor falls behind it.'],
  L2: ['В темноте дверь закрыта. Пройди мимо лампы — огонёк её зажжёт.', 'The door is shut in the dark. Walk past the lamp — your flame will light it.'],
  L3: ['Свет приходит позже тебя. Погуляй, но не сожги дорогу к двери.', 'The light arrives after you. Take a walk, but keep your way to the door.'],
  L4: ['Тот же подвал, но фитиль длиннее: ждать дольше.', 'Same cellar, longer fuse: a longer wait.'],
  flame: ['Лампы нет. Дверь осветит сам огонёк — приведи его к ней.', 'No lamp here. The flame itself will light the door — bring it close.'],
  L6: ['Камень не падает. По нему можно пройти ещё раз, когда шнур сползёт.', 'Stone never falls. Cross it again once the cord has left it.'],
  stone2: ['Свет опаздывает? Сделай круг и вернись через камень.', 'Light running late? Walk a loop and come back across the stone.'],
  oil: ['Масло вспыхивает рядом с огнём. Не задерживайся на нём.', 'Oil catches fire next to the flame. Do not linger on it.'],
  primer: ['Огонь бежит по маслу сам — и зажжёт лампу, до которой ты не дойдёшь.', 'Fire runs along the oil by itself — and lights a lamp you cannot reach.'],
  L10: ['Страж спит в темноте. На свету он видит всё светлое пятно.', 'The guard sleeps in the dark. In the light he sees the whole lit patch.'],
  burn: ['Страж стоит в масле. Огонь добежит до него сам.', 'The guard stands in oil. The fire will get to him by itself.'],
  WOOD: ['Доски не пройти. Но рядом с огнём они сгорят — и будет проход.', 'Planks block the way. Next to fire they burn — and the way opens.'],
  woodOil: ['Масло — как запал: огонь добежит до досок сам.', 'Oil works as a fuse: the fire reaches the planks by itself.'],
  spool: ['Катушка удлиняет фитиль: огонёк один ход стоит на месте.', 'A spool makes the fuse longer: the flame waits one turn.'],
  skip: ['Не всякую катушку стоит брать: с длинным фитилём свет придёт позже.', 'Not every spool is worth taking: a longer fuse means later light.'],
  water: ['На мокром полу огонёк тлеет: не светит и ничего не поджигает.', 'On wet floor the flame only smoulders: no light, no fire.'],
  water2: ['Вода не проваливается. По ней можно пройти ещё раз.', 'Water never falls. You can cross it again.'],
  L15: ['Та же карта, но фитиль всего 2 шага.', 'Same map, but the fuse is only 2 steps.'],
};
const F = (key, o) => Object.assign({ fix: key }, o || {}), P = (kind, D, o) => Object.assign({ kind, D }, o || {}), I = (kind, max, hint, o) => Object.assign({ kind, max, hint, intro: true }, o || {});

// ---------- план: 8 миров по 12 мест и финал из 4 ----------
const WORLDS = [
  { id: 1, pool: 'w1', name: { ru: 'Первый свет', en: 'First Light' }, tint: '#e9ecff', icon: 'flame', card: { ru: 'Огонёк идёт по твоему следу. Пол за ним падает. Дверь открыта только на свету.', en: 'The flame follows your trail. The floor falls behind it. The door opens only in the light.' },
    slots: [F('L1', { hint: 'L1', guide: true }), P('kOnly', 3.2, { lazyOk: 1 }), P('kOnly', 3.7, { lazyOk: 1 }), P('kOnly', 4.3, { lazyOk: 1 }), F('L2', { hint: 'L2', guide: true }), P('lamp', 4.0, { lazyOk: 1 }), P('lamp', 4.6, { lazyOk: 1 }), F('L3', { hint: 'L3' }), P('late', 4.9), P('late', 5.4), P('late', 6.0, { exam: 1 }), P('lamp', 3.6, { lazyOk: 1 })] },
  { id: 2, pool: 'w2', also: ['w1'], name: { ru: 'Живой свет', en: 'Living Light' }, tint: '#dcefff', icon: 'door_open', card: { ru: 'Свет бывает и без лампы: дверь осветит сам огонёк. А длина фитиля в каждом подвале своя.', en: 'Light without a lamp: the flame itself can light the door. And every cellar has its own fuse length.' },
    slots: [F('L4', { hint: 'L4' }), P('lateN', 4.5), F('L5'), P('lateN', 5.4), I('flameDoor', 4.3, 'flame'), P('flameDoor', 4.7), P('flameDoor', 5.3), P('flameDoor', 5.7, { need: r => has(r, '_') }), P('flameDoor', 6.1), P('twoLamps', 6.4), P('w2any', 6.9, { exam: 1 }), P('flameDoor', 4.4)] },
  { id: 3, pool: 'w3', name: { ru: 'Камень', en: 'Stone' }, tint: '#ebe4ff', icon: 'stone', card: { ru: 'Камень не проваливается. По нему можно пройти ещё раз, когда шнур с него сползёт.', en: 'Stone never falls. You can cross it again once the cord has left it.' },
    slots: [F('L6', { hint: 'L6' }), P('stone', 4.4), P('stone', 4.8), P('stone', 5.2), I('stone', 4.9, 'stone2', { need: r => r.g.lampLate }), F('L7'), P('stone', 6.1), P('stone', 6.5), P('stone', 6.9), P('stone', 7.2), P('stone', 7.6, { exam: 1 }), P('stone', 4.8)] },
  { id: 4, pool: 'w4', name: { ru: 'Масло', en: 'Oil' }, tint: '#e2f0e2', icon: 'oil', card: { ru: 'Масло вспыхивает рядом с огнём и горит один ход. Огонь бежит по луже сам — не стой на ней.', en: 'Oil catches fire next to the flame and burns for one turn. Fire runs along the puddle by itself — do not stand on it.' },
    slots: [I('oilCross', 4.6, 'oil', { need: r => only(r, 'LKo') && r.map.join('').replace(/[^LK]/g, '').length === 1 }), P('oilCross', 4.9), P('oilCross', 5.3), P('oilCross', 5.7), I('primer', 5.4, 'primer', { need: r => only(r, 'LKo') }), F('L9'), P('primer', 6.4), F('L8'), P('oilStone', 7.3), P('oilAny', 7.7), P('oilAny', 8.2, { exam: 1 }), P('oilCross', 5.0)] },
  { id: 5, pool: 'w5', name: { ru: 'Стражи', en: 'Guards' }, tint: '#f3dfe8', icon: 'guard_sleep', card: { ru: 'Страж спит в темноте. На свету он видит всё светлое пятно, в котором стоит.', en: 'A guard sleeps in the dark. In the light he sees the whole lit patch he stands in.' },
    slots: [F('L10', { hint: 'L10' }), P('guardDark', 5.0), P('guardDark', 5.5), P('guardDark', 5.9), I('guardBurn', 5.8, 'burn', { need: r => only(r, 'LKgo') && r.map.join('').replace(/[^LK]/g, '').length === 1 }), F('L11'), P('guardBurn', 6.6), P('guardOwn', 7.1), P('guardBurn', 7.6), F('L13'), P('guardAny', 8.8, { exam: 1 }), P('guardDark', 5.4)] },
  { id: 6, pool: 'w6', name: { ru: 'Доски', en: 'Planks' }, tint: '#efe6d8', icon: 'wood', card: { ru: 'Доски не пройти. Но рядом с огнём они сгорят — и откроют проход.', en: 'Planks block the way. Next to fire they burn down — and open the passage.' },
    slots: [F('WOOD', { hint: 'WOOD', guide: true }), P('wood', 5.0, { need: r => st(r).onWood >= 1 }), P('wood', 5.4, { need: r => st(r).onWood >= 1 }), P('wood', 5.8, { need: r => st(r).onWood >= 1 }), I('woodOil', 6.2, 'woodOil', { need: r => only(r, 'LKow') && st(r).onWood >= 1 }), P('wood', 6.3), P('woodOil', 6.8), P('woodAny', 7.3), P('woodAny', 7.9, { need: r => has(r, 'G') || has(r, 'g') }), P('woodAny', 8.5, { need: r => has(r, 'o') }), P('woodAny', 9.2, { exam: 1 }), P('wood', 5.4)] },
  { id: 7, pool: 'w7', name: { ru: 'Катушка', en: 'Spool' }, tint: '#e0eaf8', icon: 'spool', card: { ru: 'Катушка удлиняет фитиль: огонёк отстаёт сильнее и один ход стоит на месте.', en: 'A spool makes the fuse longer: the flame falls further behind and waits for a turn.' },
    slots: [I('spoolTake', 5.0, 'spool', { need: r => only(r, 'LK12') && r.map.join('').replace(/[^12]/g, '').length === 1 }), P('spoolTake', 5.3), P('spoolTake', 5.7), P('spoolTake', 6.1), I('spoolSkip', 6.4, 'skip', { need: r => only(r, 'LK12_') && r.map.join('').replace(/[^12]/g, '').length === 1 }), P('spoolSkip', 6.6), P('spoolAny', 7.0), P('spoolAny', 7.6, { need: r => has(r, 'o') }), P('spoolAny', 8.2, { need: r => has(r, 'w') }), P('spoolAny', 8.9, { need: r => has(r, 'G') || has(r, 'g') }), P('spoolAny', 9.7, { exam: 1 }), P('spoolTake', 5.6)] },
  { id: 8, pool: 'w8', name: { ru: 'Вода', en: 'Water' }, tint: '#d6edf3', icon: 'water', card: { ru: 'На мокром полу огонёк только тлеет: не светит и ничего не поджигает. Вода не проваливается.', en: 'On wet floor the flame only smoulders: no light and no fire. Water never falls.' },
    slots: [I('waterGuard', 5.4, 'water', { need: r => only(r, 'LKG~') }), P('waterGuard', 5.7), P('waterGuard', 6.1), P('waterAny', 6.5), I('waterCross', 6.2, 'water2', { need: r => only(r, 'LK~_') }), P('waterAny', 6.9), P('waterAny', 7.4, { need: r => has(r, 'o') }), P('waterAny', 8.0, { need: r => has(r, '1') || has(r, '2') }), P('waterAny', 8.7, { need: r => has(r, 'w') }), P('waterAny', 9.3, { need: r => has(r, 'G') }), P('waterAny', 10.4, { exam: 1 }), P('waterGuard', 6.0)] },
  { id: 9, pool: 'w9', name: { ru: 'Глубина', en: 'The Deep' }, tint: '#e6dcf6', icon: 'door_open', card: { ru: 'Последние подвалы. Здесь пригодится всё.', en: 'The last cellars. You will need everything here.' },
    slots: [F('L12'), F('L14'), F('L15', { hint: 'L15' }), P('multi', 11.4, { exam: 1, need: r => (has(r, '1') || has(r, '2')) && has(r, '~') })] },
];

// ---------- обрезка: пустые края и клетки, без которых сложность та же ----------
function trim(map) { let rows = map.slice();
  while (rows.length > 1 && /^#+$/.test(rows[0])) rows.shift(); while (rows.length > 1 && /^#+$/.test(rows[rows.length - 1])) rows.pop();
  while (rows[0].length > 1 && rows.every(r => r[0] === '#')) rows = rows.map(r => r.slice(1)); while (rows[0].length > 1 && rows.every(r => r[r.length - 1] === '#')) rows = rows.map(r => r.slice(0, -1)); return rows; }
function measure(lv) { const m = A.metrics(lv, 60000); if (!m.solvable) return null; const g = A.gates(lv, m.par, 60000), s = A.story(lv, m.plan);
  return { n: lv.n, map: lv.map, par: m.par, plan: m.plan, states: m.states, pwin: m.pwin, bits: m.bits, delayed: m.delayed, maxLife: m.maxLife, forks: m.forks, D: A.difficulty(m), lazy: A.lazyWins(lv), g, st: s, _st: s, cells: A.walkable(lv), used: new Set(A.trace(lv, m.plan).cells).size, nsol: m.nsol }; }
function prune(r, kind, budget) { let cur = r; const visited = new Set(A.trace({ n: r.n, map: r.map }, r.plan).cells);
  // клетки, куда не ступить ни в одной партии, — в стену
  const G = A.graph({ n: r.n, map: r.map }, 60000), seen = new Set(); for (const nd of G.nodes) for (const c of nd.S.tail) seen.add(c); for (const nd of G.nodes) for (const k of nd.kids) if (k.to === 'dead') { /* клетка провального шага тоже достижима */ }
  const W = r.map[0].length; let map = r.map.map((row, y) => [...row].map((ch, x) => (ch === '.' && !seen.has(y * W + x) && !reachOnce(G, y * W + x)) ? '#' : ch).join(''));
  let m0 = measure({ n: r.n, map }); if (m0 && m0.par === r.par && Math.abs(m0.D - r.D) < 0.01) cur = m0; else map = r.map;
  const cand = []; map.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.' && !visited.has(y * W + x)) cand.push([x, y]); }));
  let spent = 0; for (const [x, y] of cand) { const m2 = map.map((row, yy) => yy === y ? row.slice(0, x) + '#' + row.slice(x + 1) : row), t = measure({ n: r.n, map: m2 }); if (!t || t.par !== cur.par) continue;
    const drop = cur.D - t.D; if (drop > 0.12 || spent + Math.max(0, drop) > budget || t.pwin >= 0.5 || (!cur.lazy && t.lazy) || !kind(t)) continue; spent += Math.max(0, drop); map = m2; cur = t; }
  const tm = trim(cur.map); if (tm.join('/') !== cur.map.join('/')) { const t = measure({ n: r.n, map: tm }); if (t && t.par === cur.par) cur = t; } return cur; }
function reachOnce(G, cell) { for (const nd of G.nodes) { const p = nd.S.tail[nd.S.tail.length - 1]; if (G.L.adj[p].includes(cell) && C.legal(G.L, nd.S).some(m => m.cell === cell)) return true; } return false; }

// ---------- выбор ----------
const used = new Set(), LEVELS = [], report = []; let warn = 0;
for (const w of WORLDS) { const pool = [].concat(byW[w.pool] || [], ...(w.also || []).map(a => byW[a] || [])); let prev = null; const picked = [];
  w.slots.forEach((s, k) => { const id = `${w.id}-${String(k + 1).padStart(2, '0')}`; let r = null, tag = '';
    if (s.fix) { const f = FIX[s.fix]; r = measure({ n: f.n, map: trim(f.map) }); tag = 'ручной ' + s.fix; if (!r) throw new Error('ручной уровень не решается: ' + s.fix); }
    else { const kind = K[s.kind], ok = pool.filter(q => !used.has(q.n + q.map.join('/')) && q.states <= 30000 && q.par <= 30 && q.cells <= 34 && (s.lazyOk || !q.lazy) && kind(q) && (!s.need || s.need(q)));
      const score = q => { let v = s.intro ? (q.D <= s.max ? q.D * 0.25 + q.delayed * 0.5 + Math.abs(q.par - 7) * 0.12 + q.cells * 0.03 : 50 + q.D) : Math.abs(q.D - s.D);
        const lo = 7 + w.id * 1.2 + (s.exam ? 3 : 0), hi = 13 + w.id * 2 + (s.exam ? 4 : 0); if (!s.intro) v += 0.07 * Math.max(0, lo - q.cells, q.cells - hi);      // поля растут от мира к миру
        v += (q.cells - q.used) / q.cells * 0.6; if (prev && prev.n === q.n) v += 0.15; if (prev && prev.map.length === q.map.length && prev.map[0].length === q.map[0].length) v += 0.12; if (q.map[0].length > 6 && !s.exam && k < 6) v += 0.2; return v; };
      ok.sort((a, b) => score(a) - score(b));
      for (const c of ok.slice(0, 6)) { const p = prune(c, kind, 0.35); if (kind(p) && (s.lazyOk || !p.lazy) && p.pwin < 0.5 && !used.has(p.n + p.map.join('/')) && (s.intro ? p.D <= s.max + 0.3 : Math.abs(p.D - s.D) <= 0.6)) { r = p; used.add(c.n + c.map.join('/')); break; } }
      if (!r && ok.length) { r = prune(ok[0], kind, 0.2); used.add(ok[0].n + ok[0].map.join('/')); tag = 'ДАЛЕКО ОТ ЦЕЛИ'; warn++; } if (!r) { tag = 'НЕТ КАНДИДАТОВ'; warn++; report.push(`${id} ${s.kind} цель ${s.D || '≤' + s.max}: ${tag} (подходящих ${ok.length})`); return; }
      tag = (tag ? tag + ' ' : '') + s.kind + ' ← ' + (s.D ? 'цель ' + s.D : '≤ ' + s.max) + `, кандидатов ${ok.length}`; }
    used.add(r.n + r.map.join('/')); prev = r; picked.push({ r, s });
    const lv = { id, w: w.id, n: r.n, map: r.map, d: r.D }; if (s.hint) lv.hint = { ru: H[s.hint][0], en: H[s.hint][1] }; if (s.guide) lv.guide = true; if (s.exam) lv.exam = true; LEVELS.push(lv);
    report.push(`${id} N${r.n} ${String(r.map[0].length) + '×' + r.map.length} клеток ${String(r.cells).padStart(2)} par ${String(r.par).padStart(2)} рандом ${(r.pwin * 100).toFixed(1).padStart(5)}% D ${r.D.toFixed(1).padStart(5)} ${r.lazy ? 'лентяй' : '      '} ${s.exam ? 'ЭКЗАМЕН ' : ''}| ${tag} | ${els(r)}`); });
  const ex = picked.find(p => p.s.exam), mx = Math.max(...picked.map(p => p.r.D)); if (ex && ex.r.D < mx - 0.01) { report.push(`  ! экзамен мира ${w.id} (${ex.r.D}) не максимум мира (${mx})`); warn++; } }
console.log(report.join('\n')); console.log(`уровней ${LEVELS.length}, предупреждений ${warn}, запас ${rows.length}`);
if (WRITE) { const worlds = WORLDS.map(w => ({ id: w.id, name: w.name, tint: w.tint, icon: w.icon, card: w.card }));
  fs.writeFileSync(path.join(__dirname, 'levels.js'), '// Уровни «Фитиля» v2: 8 миров по 12 и финал из 4. Собрано pick.js из запаса gen.js; ручные — вводы и уровни v1.\n// d — оценка сложности (analyze.js), в игре не используется. par и plan добавляет сборка.\nmodule.exports = {\n  WORLDS: ' + JSON.stringify(worlds) + ',\n  LEVELS: [\n' + LEVELS.map(l => '    ' + JSON.stringify(l)).join(',\n') + '\n  ],\n};\n'); console.log('levels.js записан'); }
