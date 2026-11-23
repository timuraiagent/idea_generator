// ===== ядро: числа, тексты, сохранение, модель партии =====
const C = FUSE_CORE, LEVELS = FUSE_LEVELS, WORLDS = FUSE_WORLDS;
// Все числа игры. Радиусы света (огонёк 1, горящая клетка 1, лампа 2) зашиты в логике: compile() → light1/light2.
const CONFIG = {
  VW: 390, VHmin: 640, VHmax: 844,           // логический экран: ширина и пределы высоты
  top: 56, bottom: 104,                      // шапка и нижняя панель
  cellMin: 34, cellMax: 72,                  // размер клетки
  stepMs: 130, chainMs: 110, failMs: 620,    // шаг героя, пауза между звеньями цепочки событий, показ провала
  dark: 0.2,                                 // плотность тьмы на неосвещённых клетках
  light: { flame: 1, burning: 1, lamp: 2 },
  hintAfterFails: 3,                         // после стольких провалов и рестартов кнопка подсказки начинает мигать
  openAhead: 3,                              // сколько первых непройденных уровней открыто (два можно обойти)
  solveCap: 60000,                           // предел перебора для подсказки
};
const TXT = {
  ru: { world: 'Мир', level: 'Уровень', moves: 'ходы', best: 'лучше нельзя', behind: n => `огонёк отстаёт на ${n} ${n === 1 ? 'шаг' : n < 5 ? 'шага' : 'шагов'}`, lockedWorld: 'сначала пройдите уровни до этого мира', closed: 'в темноте дверь закрыта', stuck: 'тупик', burned: 'слишком жарко', seen: 'сторож заметил', hard: 'трудный уровень', start: 'начать', bUndo: 'отмена', bRestart: 'заново', bHint: 'подсказка', bSound: 'звук', bLang: 'язык', bLog: 'журнал',
    next: 'дальше', again: 'ещё раз', map: 'уровни', dead: 'отсюда не пройти — возвращаю', nohint: 'подсказка думает слишком долго', tapNew: 'нажмите, чтобы начать',
    stats: 'Журнал', statHead: ['уровень', 'время', 'ходы', 'отм.', 'заново', 'провал', 'подск.'], openAll: 'открыть все уровни', sound: 'звук', lang: 'RU', close: 'закрыть', locked: 'сначала пройдите предыдущие',
    total: 'всего', reset: 'сбросить прогресс', resetAsk: 'нажмите ещё раз, чтобы сбросить', copy: 'скопировать журнал', copied: 'скопировано', final: 'Все уровни пройдены!', hintIdea: 'что загорится', hintMove: 'следующий шаг' },
  en: { world: 'World', level: 'Level', moves: 'moves', best: 'best possible', behind: n => `the flame is ${n} step${n === 1 ? '' : 's'} behind`, lockedWorld: 'finish the earlier levels first', closed: 'the door is shut in the dark', stuck: 'dead end', burned: 'too hot', seen: 'the watchman saw you', hard: 'hard level', start: 'start', bUndo: 'undo', bRestart: 'restart', bHint: 'hint', bSound: 'sound', bLang: 'language', bLog: 'log',
    next: 'next', again: 'again', map: 'levels', dead: 'no way from here — going back', nohint: 'the hint is taking too long', tapNew: 'tap to start',
    stats: 'Playtest log', statHead: ['level', 'time', 'moves', 'undo', 'retry', 'fails', 'hints'], openAll: 'unlock all levels', sound: 'sound', lang: 'EN', close: 'close', locked: 'finish the earlier ones first',
    total: 'total', reset: 'reset progress', resetAsk: 'tap again to reset', copy: 'copy the log', copied: 'copied', final: 'All levels done!', hintIdea: 'what will burn', hintMove: 'next step' },
};
// ---------- сохранение ----------
const KEY = 'fuse2';
const save = (() => { let d = {}; try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { d = {}; }
  d.done = d.done || {}; d.stats = d.stats || {}; if (d.sound === undefined) d.sound = true; d.lang = d.lang || ((navigator.language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en'); return d; })();
function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* приватное окно: играем без сохранения */ } }
const qs = new URLSearchParams(location.search);
if (qs.get('lang') === 'en' || qs.get('lang') === 'ru') save.lang = qs.get('lang');
const T = k => TXT[save.lang][k], tr = o => o ? (o[save.lang] || o.ru) : '';

// ---------- прогресс ----------
const starsOf = i => save.done[LEVELS[i].id] || 0;
function isOpen(i) { if (save.openAll || starsOf(i)) return true; let unsolved = 0; for (let k = 0; k < i; k++) if (!starsOf(k)) unsolved++; return unsolved < CONFIG.openAhead; }
const firstUnsolved = () => { const k = LEVELS.findIndex((l, i) => !starsOf(i)); return k < 0 ? LEVELS.length - 1 : k; };
const worldLevels = w => LEVELS.map((l, i) => i).filter(i => LEVELS[i].w === w);
function stat(i) { const id = LEVELS[i].id; return save.stats[id] || (save.stats[id] = { ms: 0, firstMs: 0, firstMoves: 0, moves: 0, undos: 0, restarts: 0, fails: 0, ideas: 0, shows: 0, wins: 0 }); }

// ---------- модель партии ----------
const M = { idx: 0, L: null, S: null, hist: [], usedShow: false, trouble: 0, story: null, listeners: [] };
const emit = (type, data) => { for (const f of M.listeners) f(type, data || {}); };
const log = [];
function note(type, extra) { log.push(Object.assign({ t: Date.now(), level: M.idx + 1, type }, extra || {})); if (log.length > 4000) log.shift(); }
const pcell = S => S.tail[S.tail.length - 1];

function load(n) { const i = Math.max(0, Math.min(LEVELS.length - 1, (n | 0) - 1)); M.idx = i; M.L = C.compile(LEVELS[i]); M.S = C.init(M.L); M.hist = []; M.usedShow = false; M.trouble = 0; M.story = null; M.planCells = null;
  save.last = i; persist(); note('load'); emit('load'); return state(); }
function legalDirs() { return C.legal(M.L, M.S).map(m => C.dirChar(M.L, pcell(M.S), m.cell)); }
// шаг: dir — 'U','D','L','R'. Провал не записывается в историю: герой получает своё, игрок остаётся на ход раньше
function step(dir) { const L = M.L, S = M.S; if (S.over) return { ok: false, reason: S.won ? 'won' : 'over' };
  const cell = C.cellInDir(L, pcell(S), dir), m = C.legal(L, S).find(q => q.cell === cell);
  if (!m) { const closed = cell === L.door && !S.lit[cell]; emit('illegal', { cell, closed }); return { ok: false, reason: closed ? 'closed' : 'illegal' }; }
  const R = C.apply(L, S, cell), st = stat(M.idx); st.moves++;
  if (R.over && !R.won) { st.fails++; M.trouble++; note('fail', { reason: R.reason, at: S.t + 1 }); emit('fail', { from: S, to: R, cell, reason: R.reason }); persist(); return { ok: true, reason: R.reason }; }
  M.hist.push(S); M.S = R; note('step', { dir });
  if (R.won) { const moves = R.t, par = LEVELS[M.idx].par, stars = 1 + (M.usedShow ? 0 : 1) + (!M.usedShow && moves <= par ? 1 : 0), id = LEVELS[M.idx].id, first = !save.done[id];
    st.wins++; if (first) { st.firstMs = Math.round(st.ms); st.firstMoves = st.moves; } save.done[id] = Math.max(save.done[id] || 0, stars); persist(); note('win', { moves, stars });
    emit('step', { from: S, to: R, cell }); emit('win', { moves, par, stars, first }); return { ok: true, reason: null, won: true, stars }; }
  emit('step', { from: S, to: R, cell }); return { ok: true, reason: null }; }
function undo() { if (!M.hist.length) return false; M.S = M.hist.pop(); stat(M.idx).undos++; note('undo'); emit('undo'); return true; }
function restart() { if (!M.hist.length && !M.S.over) return false; M.S = C.init(M.L); M.hist = []; M.usedShow = false; stat(M.idx).restarts++; M.trouble++; note('restart'); emit('restart'); return true; }
function state() { const L = M.L, S = M.S, cells = [], lit = [];
  for (let y = 0; y < L.H; y++) { let row = '', lr = []; for (let x = 0; x < L.W; x++) { const c = y * L.W + x, ty = L.type[c], d = S.d[c]; lr.push(S.lit[c]);
    row += ty === C.WALL ? '#' : ty === C.STONE ? 's' : ty === C.WATER ? '~' : ty === C.DOOR ? 'D' : ty === C.LAMP ? ((S.lampLit >> L.lampAt[c] & 1) ? 'K' : 'L') : (d & C.FIRE) ? '*' : (d & C.PIT) ? '_' : (d & C.WOOD) ? 'w' : (d & C.OIL) ? 'o' : '.'; } cells.push(row); lit.push(lr); }
  return { level: M.idx + 1, id: LEVELS[M.idx].id, n: C.fuseLen(L, S.spools), t: S.t, player: pcell(S), flame: S.tail[0], fuse: S.tail.slice(), cells, lit,
    lamps: L.lamps.map((c, k) => ({ cell: c, lit: !!(S.lampLit >> k & 1) })), guards: L.guards.map((c, k) => ({ cell: c, alive: !!(S.guardAlive >> k & 1), awake: !!(S.guardAlive >> k & 1) && !!S.lit[c] })),
    spools: L.spools.map((c, k) => ({ cell: c, add: L.spoolAdd[k], taken: !!(S.spools >> k & 1) })), doorOpen: !!S.lit[L.door], over: S.over, won: S.won, reason: S.reason, usedShow: M.usedShow, canUndo: M.hist.length > 0 }; }
function preview(cell) { const p = C.preview(M.L, M.S, cell === undefined ? -1 : cell), list = a => [...a].map((v, i) => v ? i : -1).filter(i => i >= 0);
  return { flame: p.flame, ignites: list(p.burn), lit: list(p.lit), seen: list(p.seen), lamps: p.lampLit }; }

// ---------- подсказка ----------
// Ступень 1 («что можно»): что в решении загорится и что останется тёмным. Ступень 2: следующий шаг; из тупика — назад.
function solutionStory() { if (M.story) return M.story; const lv = LEVELS[M.idx], L = M.L; let S = C.init(L); const took = new Set();
  for (const ch of lv.plan) { const c = C.cellInDir(L, pcell(S), ch); if (L.spoolAt[c] >= 0) took.add(c); S = C.apply(L, S, c); if (S.won) break; }
  const pre = S;   // состояние в момент победы: лампы и стражи как перед шагом в дверь
  M.story = { lampsOn: L.lamps.filter((c, k) => (pre.lampLit >> k & 1) && !(L.lampLit0 >> k & 1)), lampsOff: L.guards.length ? L.lamps.filter((c, k) => !(pre.lampLit >> k & 1)) : [],
    guardsBurn: L.guards.filter((c, k) => !(pre.guardAlive >> k & 1)), woodBurn: [...L.init].map((v, i) => (v === C.WOOD && pre.d[i] !== C.WOOD) ? i : -1).filter(i => i >= 0),
    spoolsTake: L.spools.filter(c => took.has(c)), spoolsSkip: L.spools.filter(c => !took.has(c)) };
  M.story.any = M.story.lampsOn.length + M.story.lampsOff.length + M.story.guardsBurn.length + M.story.woodBurn.length + M.story.spoolsTake.length + M.story.spoolsSkip.length > 0; return M.story; }
// tier: 1 — идея, 2 — шаг. Возвращает { tier, story } или { tier: 2, dir, cell, rewound } или { tier: 0 } (не нашлось)
function hint(tier) { const st = stat(M.idx);
  if (tier === 1 && solutionStory().any) { st.ideas++; note('hint', { tier: 1 }); emit('hint', { tier: 1, story: M.story }); return { tier: 1, story: M.story }; }
  let rewound = 0, r = C.solveFrom(M.L, M.S, CONFIG.solveCap);
  while (r.solvable === false && M.hist.length) { M.S = M.hist.pop(); rewound++; r = C.solveFrom(M.L, M.S, CONFIG.solveCap); }
  if (!r.solvable || !r.plan) { emit('hint', { tier: 0 }); return { tier: 0 }; }
  M.usedShow = true; st.shows++; note('hint', { tier: 2, rewound });
  const cell = C.cellInDir(M.L, pcell(M.S), r.plan[0]), res = { tier: 2, dir: r.plan[0], cell, rewound, left: r.par };
  if (rewound) emit('undo', { rewound }); emit('hint', res); return res; }
// клетки плана по порядку (для руководящей руки на вводных уровнях)
function planCells() { if (M.planCells) return M.planCells; const L = M.L, out = [L.start]; let c = L.start; for (const ch of LEVELS[M.idx].plan) { c = C.cellInDir(L, c, ch); out.push(c); } return (M.planCells = out); }
function solve(n, opts) { return C.solve(LEVELS[(n || M.idx + 1) - 1], opts); }
