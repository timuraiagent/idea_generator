// Боты приёмки «Фитиля» v2 (Node, без браузера): node bots.js [номера через запятую]
//   сценки правил; на каждом уровне — решатель (par, план), бот-план, случайный бот (точная доля побед по графу и
//   прогон партий с инвариантами), ленивые боты, «ворота» элемента мира, подсказка из случайных состояний;
//   по всей игре — пила сложности, повторы карт, перерывы в появлении элементов.
const C = require('./logic.js'), A = require('./analyze.js'), { WORLDS, LEVELS } = require('./levels.js');
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const pcell = S => S.tail[S.tail.length - 1];
function playPlan(lv, plan) { const L = C.compile(lv); let S = C.init(L);
  for (const ch of plan) { const c = C.cellInDir(L, pcell(S), ch), m = C.legal(L, S).find(q => q.cell === c); if (!m) return { won: false, reason: 'illegal', t: S.t }; S = C.apply(L, S, c); if (S.over) break; }
  return { won: S.won, reason: S.reason, t: S.t }; }
// случайные партии: инварианты мира, совпадение preview с тем, что случилось, и проверка подсказки из встреченных состояний
function randomBot(lv, games, seed) { const L = C.compile(lv), r = rng(seed); let wins = 0, inv = 0, pvBad = 0, hintBad = 0, hints = 0;
  for (let g = 0; g < games; g++) { let S = C.init(L); const path = [L.start]; let lamps = S.lampLit, alive = S.guardAlive, hintAt = Math.floor(r() * 12);
    while (!S.over) { const ms = C.legal(L, S); if (!ms.length) break;
      if (S.t === hintAt && g < 60) { hints++; const h = C.solveFrom(L, S, 80000); if (h.solvable) { let T = S; for (const ch of h.plan) T = C.apply(L, T, C.cellInDir(L, pcell(T), ch)); if (!T.won) hintBad++; } }
      const m = ms[Math.floor(r() * ms.length)], pv = C.preview(L, S, m.cell); S = C.apply(L, S, m.cell); path.push(m.cell);
      if (!S.won) { const N = C.fuseLen(L, S.spools), pl = pcell(S);
        if (S.tail.length > N + 1) inv++;                                                     // хвост не длиннее фитиля
        for (let k = 0; k < S.tail.length; k++) if (S.tail[k] !== path[path.length - S.tail.length + k]) { inv++; break; }   // огонёк и шнур идут по следу игрока
        if (S.d[pl] & C.BLOCK) { if (!(S.over && S.reason === 'burned')) inv++; }
        if (S.tail.indexOf(pl) !== S.tail.length - 1) inv++;
        if ((lamps & ~S.lampLit) !== 0) inv++; lamps = S.lampLit; if ((S.guardAlive & ~alive) !== 0) inv++; alive = S.guardAlive;      // лампы не гаснут, стражи не воскресают
        for (let i = 0; i < L.n; i++) if ((L.type[i] === C.STONE || L.type[i] === C.WATER || L.type[i] === C.WALL) && S.d[i]) inv++;      // камень, вода и стены не меняются
        if (pv.flame !== S.tail[0] || pv.lampLit !== S.lampLit || pv.guardAlive !== S.guardAlive || pv.lit.join('') !== S.lit.join('')) pvBad++; } }
    if (S.won) wins++; }
  return { wins, games, inv, pvBad, hintBad, hints }; }

// ---------- сценки правил ----------
function scenes() { const out = [], run = (lv, plan) => { const L = C.compile(lv); let S = C.init(L); const steps = [S]; for (const ch of plan) { S = C.apply(L, S, C.cellInDir(L, pcell(S), ch)); steps.push(S); if (S.over) break; } return { L, steps, S }; };
  const A1 = { n: 3, map: ['##L##', 'P..D#', '##...', '##...'] }, a = C.solve(A1); out.push(`А свет опаздывает: par ${a.par} ${a.par === 7 ? '✓' : '✗'}, короткий путь к двери: ${playPlan(A1, 'RRDRU').reason === 'illegal' ? 'дверь закрыта ✓' : '✗'}`);
  const B = { n: 3, map: ['P..oo......', '###oo######'] }, b = run(B, 'RRRRRRRR'), log = b.steps.slice(1).map(S => [...S.d].map((v, k) => (v & C.BURN) ? k : -1).filter(k => k >= 0).join('+') || '-');
  out.push(`Б масло: горит по ходам [${log.join(' ')}] ${log[4] === '3' && log[5] === '4+14' && log[6] === '15' && log[7] === '-' ? '✓' : '✗'}; игрок цел ${!b.S.over ? '✓' : '✗'}; петля по маслу: ${playPlan(B, 'RRRDRU').reason === 'burned' ? 'сгорел ✓' : '✗'}`);
  const V = { n: 3, map: ['#####', '#..##', '#..##', '#.s.P', '##DK#', '#####'] }, LV = C.compile(V), back = pl => { let S = C.init(LV); for (const ch of pl) S = C.apply(LV, S, C.cellInDir(LV, pcell(S), ch)); return C.legal(LV, S).some(m => m.cell === 3 * 5 + 2); };
  out.push(`В камень: назад после петли в 3 клетки ${back('LLLUR') ? 'пускает ✗' : 'нельзя ✓'}; после петли в 5 клеток ${back('LLLUURD') ? 'можно ✓' : 'нельзя ✗'}`);
  const G = run({ n: 2, map: ['P.....', '#w####', '#.####'] }, 'RRRR'), w = G.steps.map(S => S.d[7]);
  out.push(`Г доски: состояние клетки по ходам [${w.join(' ')}] — ждём 8 8 8 16 0 ${w.join(' ') === '8 8 8 16 0' ? '✓' : '✗'}; горящие доски светят ${G.steps[3].lit[7] ? '✓' : '✗'}; в горящие шагнуть нельзя ${!C.legal(G.L, G.steps[3]).some(m => m.cell === 7) ? '✓' : '✗'}`);
  const D = run({ n: 2, map: ['P.1....'] }, 'RRRRR'), fl = D.steps.map(S => S.tail[0]), ns = D.steps.map(S => C.fuseLen(D.L, S.spools));
  out.push(`Д катушка: огонёк по ходам [${fl.join(' ')}] — ждём 0 0 0 0 1 2 ${fl.join(' ') === '0 0 0 0 1 2' ? '✓' : '✗'}; длина фитиля [${ns.join(' ')}] ${ns.join('') === '223333' ? '✓' : '✗'}`);
  const E = run({ n: 2, map: ['P.~....', '##L####'] }, 'RRRRR'), e4 = E.steps[4], e5 = E.steps[5];
  out.push(`Е вода: огонёк на воде не светит ${e4.tail[0] === 2 && !e4.lit.some(v => v) ? '✓' : '✗'}; лампу рядом не зажёг ${e5.lampLit === 0 ? '✓' : '✗'}; вода не провалилась ${e5.d[2] === 0 ? '✓' : '✗'}; сошёл с воды — снова светит ${e5.lit[3] ? '✓' : '✗'}`);
  return out; }

// ---------- прогон ----------
let failed = 0; const bad = [], say = s => console.log(s);
say('СЦЕНКИ'); for (const s of scenes()) { say('  ' + s); if (s.includes('✗')) failed++; }
// «ворота» мира: без элемента решения нет или par другой; для стражей хватает и того, что без них путей к победе больше
const WGATE = { 3: g => g.stone, 4: (g, st) => g.oil || g.oilPit || st.lampByFire, 5: (g, st, lv) => g.guard || st.guardsBurnt > 0 || A.matters(lv, /G/g, '.'), 6: g => g.wood, 7: g => g.spool, 8: g => g.water || g.waterFloor };
const LAZY_OK = lv => !!lv.tut;      // только ручные вводные уровни: там идея одна и её показывают
const rowsOut = [], seenMaps = new Map(), last = {}, gap = {};
LEVELS.forEach((lv, i) => { const no = i + 1; if (only && !only.includes(no)) return; const errs = [], m = A.metrics(lv, 200000);
  if (!m.solvable) { say(`${lv.id} НЕ РЕШАЕТСЯ`); failed++; bad.push(lv.id); return; }
  const pb = playPlan(lv, m.plan), rb = randomBot(lv, 300, 12345 + i), lazy = A.lazyWins(lv), g = A.gates(lv, m.par), st = A.story(lv, m.plan), D = A.adultDifficulty(m);
  if (!pb.won || pb.t !== m.par) errs.push('бот-план не проходит за par'); if (m.pwin >= 0.5) errs.push('случайный бот ≥ 50 %'); if (rb.inv || rb.pvBad) errs.push(`инварианты ${rb.inv}, preview ${rb.pvBad}`); if (rb.hintBad) errs.push(`подсказка ведёт не к победе: ${rb.hintBad}`);
  if (lazy && !LAZY_OK(lv)) errs.push('ленивый бот побеждает'); if (!lv.tut && m.p4 >= 0.999) errs.push('внимательный бот проходит без раздумий'); if (WGATE[lv.w] && !WGATE[lv.w](g, st, lv)) errs.push('элемент мира не «ворота»'); if (m.overflow) errs.push('перебор не уложился');
  const key = lv.n + ':' + lv.map.join('/'); if (seenMaps.has(key)) errs.push('повтор карты ' + seenMaps.get(key)); seenMaps.set(key, lv.id);
  if (lv.map[0].length > 7 || lv.map.length > 9) errs.push('поле больше 7×9');
  const present = { stone: 's', oil: 'og', guard: 'Gg', wood: 'w', spool: '12', water: '~' }; for (const [name, chs] of Object.entries(present)) if (lv.map.some(r => [...chs].some(ch => r.includes(ch)))) { if (last[name] !== undefined) gap[name] = Math.max(gap[name] || 0, no - last[name]); last[name] = no; }
  if (errs.length) { failed++; bad.push(lv.id); }
  rowsOut.push({ lv, D, m, lazy });
  say(`${lv.id} N${lv.n} ${lv.map[0].length}×${lv.map.length} par ${String(m.par).padStart(2)} сост ${String(m.states).padStart(5)} рандом ${(m.pwin * 100).toFixed(1).padStart(5)}% (партий ${rb.wins}/${rb.games}) A ${D.toFixed(1).padStart(4)} внимат.4 ${(m.p4 * 100).toFixed(0).padStart(3)}% ${lazy ? 'лентяй' : '      '} подсказок ${rb.hints}${lv.exam ? ' ЭКЗАМЕН' : ''}${errs.length ? '  <<< ' + errs.join('; ') : ''}`); });
if (!only) { say('КРИВАЯ'); let prevMax = 0, prevExam = 0;
  for (const w of WORLDS) { const rs = rowsOut.filter(r => r.lv.w === w.id), ds = rs.map(r => r.D), mx = Math.max(...ds), ex = rs.find(r => r.lv.exam), first = ds[0], notes = [];
    if (ex && ex.D < mx - 0.01) notes.push('экзамен не максимум'); if (mx < prevMax - 0.01) notes.push('максимум ниже прошлого мира'); if (prevExam && first > prevExam) notes.push('ввод труднее прошлого экзамена');
    if (notes.length) failed++; say(`  мир ${w.id} «${w.name.ru}»: ${ds.map(d => d.toFixed(1)).join(' ')} | ввод ${first.toFixed(1)}, максимум ${mx.toFixed(1)}${notes.length ? '  <<< ' + notes.join('; ') : ''}`); prevMax = mx; prevExam = ex ? ex.D : mx; }
  say(`ПЕРЕРЫВЫ (самый длинный промежуток между уровнями с элементом после его ввода): ${Object.entries(gap).map(([k, v]) => k + ' ' + v).join(', ')}`);
  for (const k of Object.keys(last)) gap[k] = Math.max(gap[k] || 0, LEVELS.length - last[k]);      // и от последнего появления до конца игры
  const longGap = Object.entries(gap).filter(([k, v]) => v > 14); if (longGap.length) { failed++; say('  <<< перерыв больше 14 уровней: ' + longGap.map(x => x[0]).join(', ')); }
  if (LEVELS.length !== 100) { failed++; say(`  <<< уровней ${LEVELS.length}, нужно 100`); }
  say(`ЛЕНИВЫЕ БОТЫ побеждают на: ${rowsOut.filter(r => r.lazy).map(r => r.lv.id).join(' ') || '—'}`);
  say(failed ? `ПРИЁМКА: НЕ ПРОЙДЕНА (${failed}): ${bad.join(' ')}` : 'ПРИЁМКА: пройдена'); process.exit(failed ? 1 : 0); }
