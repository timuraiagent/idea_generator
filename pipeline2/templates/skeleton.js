// ШАБЛОН И ДОГОВОР СКЕЛЕТА (этап 3). Скопируйте в mechanics/<slug>/skeleton.js и замените правила своими.
// Скелет — правила механики без экрана: модуль Node без зависимостей и без случайности, не длиннее
// config.yaml → skeleton.max_lines строк. Инструмент tools/skeleton_check подключает его через require
// и использует только то, что перечислено в module.exports внизу.
//
// Пример ниже — настоящая маленькая механика (ядро «Фитиля»): герой идёт по клеткам, огонёк идёт по его
// следу на N шагов позади, пол за огоньком проваливается, лампа рядом с огоньком загорается, дверь открыта
// только на свету. Знаки карты: # стена, . пол, s камень (не проваливается), L лампа, K горящая лампа,
// D дверь, P старт.

const DIRS = { вверх: [0, -1], вниз: [0, 1], влево: [-1, 0], вправо: [1, 0] };

// Уровни — данными, ровно три: по одному на ситуацию из карточки. Первый — вводный (intro: true).
const levels = [
  { id: 'ввод',   intro: true, n: 3, map: ['#.###', 'P...#', '###.#', '#.#.#', '#...#', '#.#.#', '#DK##'] },
  { id: 'рано',   n: 3, map: ['#####', '#.L##', 'P..D#', '##...', '##...', '#####'] },
  { id: 'камень', n: 3, map: ['#####', '#...#', '##..#', 'P.s.#', '#LD##', '#####'] },
];

const at = (lv, x, y) => (lv.map[y] && lv.map[y][x]) || '#';
const nb = (x, y) => Object.values(DIRS).map(([dx, dy]) => [x + dx, y + dy]);
const id = (x, y) => x + ',' + y;

// Начальное состояние. Состояние — простой объект; apply его не меняет, а возвращает новое.
function init(level) {
  let start; level.map.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'P') start = [x, y]; }));
  const lit = []; level.map.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'K') lit.push(id(x, y)); }));
  return { level, t: 0, path: [start], pits: [], lit, won: false };
}
const hero = S => S.path[S.path.length - 1];
const flame = S => S.path[Math.max(0, S.t - S.level.n)];
const rope = S => S.path.slice(Math.max(0, S.t - S.level.n), -1).map(([x, y]) => id(x, y));   // огонёк и шнур

// Освещённые клетки: вокруг огонька — на шаг, вокруг горящей лампы — на два; стены свет не пропускают.
function light(S) {
  const out = new Set(), spread = (x, y, r) => { const seen = new Set([id(x, y)]); let fr = [[x, y]];      // у каждого источника свой обход
    for (let k = 0; k < r; k++) { const nx = []; for (const [a, b] of fr) for (const [c, d] of nb(a, b)) if (at(S.level, c, d) !== '#' && !seen.has(id(c, d))) { seen.add(id(c, d)); nx.push([c, d]); } fr = nx; }
    for (const k of seen) out.add(k); };
  spread(...flame(S), 1); for (const k of S.lit) spread(...k.split(',').map(Number), 2); return out;
}

// Допустимые ходы. Пустой список при живой партии — проигрыш (тупик).
function legal(S) {
  if (S.won) return []; const [x, y] = hero(S), lt = light(S), out = [];
  for (const [name, [dx, dy]] of Object.entries(DIRS)) { const a = x + dx, b = y + dy, ch = at(S.level, a, b);
    if (ch === 'D') { if (lt.has(id(a, b))) out.push(name); continue; }
    if ('#LK'.includes(ch) || S.pits.includes(id(a, b)) || rope(S).includes(id(a, b))) continue; out.push(name); }
  return out;
}

// Ход игрока и такт мира: герой шагает, огонёк переходит, пол за ним проваливается, лампы рядом загораются.
function apply(S, move) {
  const [x, y] = hero(S), [dx, dy] = DIRS[move], to = [x + dx, y + dy];
  if (at(S.level, ...to) === 'D') return { ...S, t: S.t + 1, path: [...S.path, to], won: true };
  const N = { ...S, t: S.t + 1, path: [...S.path, to], pits: [...S.pits], lit: [...S.lit] };
  if (N.t > N.level.n) { const left = N.path[N.t - N.level.n - 1]; if (at(N.level, ...left) !== 's') N.pits.push(id(...left)); }
  for (const [a, b] of nb(...flame(N))) if (at(N.level, a, b) === 'L' && !N.lit.includes(id(a, b))) N.lit.push(id(a, b));
  return N;
}

const won = S => S.won;
const over = S => S.won || legal(S).length === 0;
// Одинаковые состояния — одинаковый ключ. В ключ идёт всё, от чего зависит будущее.
const key = S => [S.t > S.level.n ? 'f' : S.t, hero(S), flame(S), rope(S).join(';'), [...S.pits].sort().join(';'), [...S.lit].sort().join(';')].join('|');

// Текстовая картинка: по ней судьи понятности отвечают на вопросы. Легенда — отдельной строкой.
const LEGEND = '@ герой  * огонёк  + шнур  _ яма  # стена  . пол  s камень  L лампа  K горящая лампа  D дверь закрыта  O дверь открыта';
function render(S) {
  const lt = light(S), h = id(...hero(S)), f = id(...flame(S)), r = rope(S);
  return S.level.map.map((row, y) => [...row].map((ch, x) => { const k = id(x, y);
    if (k === h) return '@'; if (k === f) return '*'; if (r.includes(k)) return '+'; if (S.pits.includes(k)) return '_';
    if (ch === 'D') return lt.has(k) ? 'O' : 'D'; if (ch === 'L' && S.lit.includes(k)) return 'K'; return ch === 'P' ? '.' : ch; }).join('')).join('\n') + '\n' + LEGEND;
}

// Необязательно: мера близости к цели для жадного бота (чем больше, тем ближе).
function score(S) { let d; S.level.map.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'D') d = [x, y]; })); const [x, y] = hero(S); return -(Math.abs(x - d[0]) + Math.abs(y - d[1])); }

module.exports = {
  levels, init, legal, apply, won, over, key, render, score,
  moveName: m => m,                                                  // имя хода для человека
  // Главный параметр уровня: от него должно зависеть решение.
  PARAM: { name: 'длина фитиля', get: lv => lv.n, set: (lv, v) => ({ ...lv, n: v }) },
  // Элементы роста, уже добавленные в скелет: strip возвращает тот же уровень без элемента.
  ELEMENTS: [{ name: 'камень', strip: lv => ({ ...lv, map: lv.map.map(r => r.replace(/s/g, '.')) }) }],
  // PASS: 'ждать',                                                   // если в правилах есть ход «ничего не делать»
};
