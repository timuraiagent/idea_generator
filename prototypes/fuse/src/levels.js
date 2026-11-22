// Уровни «Фитиля». Карта — строки символов: # стена, . пол, _ провал, s камень, o масло, L лампа, K горящая лампа,
// G страж, g страж на масле, D дверь, P старт. n — задержка огонька. par и plan добавляет сборка (build.js) из решателя.
const FUSE_LEVELS = [
  // волна 1 — огонь за спиной
  { name: { ru: "Фитиль", en: "The fuse" }, n: 3, map: ["#.###", "P...#", "###.#", "#.#.#", "#...#", "#.#.#", "#DK##"],
    hint: { ru: "Иди к двери. Огонёк идёт следом — пол за ним проваливается.", en: "Walk to the door. The flame follows you, and the floor behind it falls away." } },
  { name: { ru: "Тёмная дверь", en: "The dark door" }, n: 3, map: ["#.###", "#...#", "#.#.#", "P.#.#", "#L#.#", "D....", "#####"],
    hint: { ru: "Дверь открыта только на свету. Проведи огонёк мимо лампы.", en: "The door opens only in light. Lead the flame past the lamp." } },
  // волна 2 — свет опаздывает
  { name: { ru: "Рано пришёл", en: "Too early" }, n: 3, map: ["#####", "#.L##", "P..D#", "##...", "##...", "#####"],
    hint: { ru: "Свет приходит не сразу: огонёк отстаёт на 3 шага.", en: "Light comes late: the flame is 3 steps behind you." } },
  { name: { ru: "Длинный фитиль", en: "The long fuse" }, n: 5, map: ["#####", "#.L##", "P..D#", "##...", "##...", "#####"],
    hint: { ru: "Тот же подвал, но фитиль длиннее — 5 шагов.", en: "Same cellar, but the fuse is longer: 5 steps." } },
  { name: { ru: "Не сожги порог", en: "Mind the doorstep" }, n: 4, map: ["######", "#D#...", "#.L.#.", "#.....", "#####.", "P.....", "######"],
    hint: { ru: "К двери один подход. Не сожги его раньше времени.", en: "There is one way to the door. Do not burn it too soon." } },
  // волна 3 — камень
  { name: { ru: "Каменный мост", en: "The stone bridge" }, n: 3, map: ["#####", "#...#", "##..#", "P.s.#", "#LD##", "#####"],
    hint: { ru: "Камень не проваливается. По нему можно пройти снова, когда с него сползёт шнур.", en: "Stone never falls. Cross it again once the cord has slid off." } },
  { name: { ru: "Перекрёсток", en: "The crossroads" }, n: 4, map: ["######", "##...#", "##...#", "P.s..#", "##.L##", "##D###"],
    hint: { ru: "Сначала лампа, потом круг, потом дверь.", en: "Lamp first, then a loop, then the door." } },
  // волна 4 — масло
  { name: { ru: "Лужа", en: "The puddle" }, n: 3, map: ["######", "#..P##", "#.L.D#", "#oooo#", "#oooo#", "######"],
    hint: { ru: "Масло вспыхивает рядом с огоньком, и пожар идёт по луже. В огне стоять нельзя.", en: "Oil catches fire next to the flame and the fire spreads. Do not stand in it." } },
  { name: { ru: "Запал", en: "The primer" }, n: 3, map: ["######", "#.D_L#", "#..oo#", "#..o##", "#..o.#", "#...##", "#P..##", "######"],
    hint: { ru: "Лампу зажигает любой огонь.", en: "Any fire lights a lamp." } },
  // волна 5 — стражи
  { name: { ru: "Спящий", en: "The sleeper" }, n: 3, map: ["######", "#.....", "#.#...", "P.L.D#", "##G###"],
    hint: { ru: "Страж спит в темноте. На свету он видит всё своё светлое пятно.", en: "The guard sleeps in the dark. In light he sees his whole lit patch." } },
  { name: { ru: "Два света", en: "Two lights" }, n: 4, map: ["######", "#P...#", "#.##.#", "#.LG.#", "#.##.#", "#....#", "#.L#.#", "#..D##", "######"],
    hint: { ru: "Не всё нужно зажигать.", en: "Not everything needs lighting." } },
  { name: { ru: "Костёр", en: "The bonfire" }, n: 3, map: ["######", "#.#oo#", "#.Lgo#", "#D.oo#", "##...#", "#.P..#", "##...#", "######"],
    hint: { ru: "Масло — ещё и оружие.", en: "Oil is also a weapon." } },
  // волна 6 — экзамены
  { name: { ru: "Свой свет", en: "Your own light" }, n: 5, map: ["#######", "#####.#", "###G#P#", "#.....#", "#.#.L.#", "##...D#", "#....##", "#######"],
    hint: { ru: "Твой огонёк тоже светит.", en: "Your own flame gives light too." } },
  { name: { ru: "Подвал", en: "The cellar" }, n: 4, map: ["#######", "#o...D#", "#o#.L##", "#gooo##", "#o#.###", "#..s..#", "#...P.#", "#######"],
    hint: { ru: "Всё сразу: масло, страж, камень и петля.", en: "Everything at once: oil, a guard, stone and a loop." } },
  { name: { ru: "Короткий фитиль", en: "The short fuse" }, n: 2, map: ["#######", "#o...D#", "#o#.L##", "#gooo##", "#o#.###", "#..s..#", "#...P.#", "#######"],
    hint: { ru: "Та же карта, но фитиль всего 2 шага.", en: "Same map, but the fuse is only 2 steps." } },
];
if (typeof module !== 'undefined') module.exports = FUSE_LEVELS;
