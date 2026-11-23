# Форматы файлов pipeline2

Пути заданы в `pipeline.yaml`, раздел `paths`. Здесь — что внутри каждого файла. Примеры условные.
Все JSON — в UTF-8, с отступом в два пробела, чтобы различия читались в `git diff`.

## 1. Волна пар — `state/waves/w<номер>.json`
Пишет `tools/wave` (этап 0); этап 1 дописывает решения.

```json
{
  "wave": 51,
  "date": "2026-11-24",
  "pipeline": 2,
  "command": "python3 scripts/select_pairs.py .data/nlpl_model/model.txt --mode regions --n 80 --seed 51 …",
  "seed": 51,
  "refills": 0,
  "short": false,
  "params": {"max_sim": -0.10, "arch_quota": 6, "fresh_sim_verb": 0.40, "fresh_sim_noun": 0.40, "oversample": 80},
  "pairs": [
    {
      "k": 1,
      "verb": "черпать_VERB", "noun": "завтра_NOUN", "sim": -0.142,
      "archetype": "перенос", "verb_neighbours": ["…"], "noun_neighbours": ["…"],
      "noun_fresh": true,
      "decision": "pass",
      "reason": "закон времени против переноса: взятое из завтра там пропадает",
      "verb_law": "…", "noun_law": "…", "conflict": "…", "formula": "можно …, но тогда …",
      "archetype_by_formula": "перенос", "bridge": 2,
      "slug": "ladle"
    }
  ],
  "double_checked": false,
  "judges": [{"role": "pair-gates", "model": "…"}]
}
```
- `k` — номер пары в волне; по нему называется временный каталог эскиза.
- `decision` и поля после него до этапа 1 равны `null`. `slug` появляется на этапе 2.
- `short: true` — пар набралось меньше `sample.wave_size`; рядом пишется `"short_reason"`.

## 2. Эскиз-карточка — `mechanics/<slug>/sketch.md`
Шаблон — `templates/sketch.md`. Рядом могут лежать:
- `sketch.raw.md` — карточка до первой правки; копию делает ведущий перед возвратом, один раз;
- `first/` — всё, по чему считан сырой балл: `sketch.md`, `probes.md`, `probes.key.json`, `plans.md`,
  `skeleton.js`, `skeleton.json` на момент первого прохода этапа 4; каталог заводится перед возвратом этапа 4;
- `sketch.rework.md` — карточка до переделки после плейтеста.

Пока у механики нет имени, автор пишет карточку в `pipeline2/state/drafts/w<волна>-<k>/sketch.md`; ведущий
переносит её в `mechanics/<slug>/`.

## 3. Скелет — `mechanics/<slug>/skeleton.js`
Договор и пример — `templates/skeleton.js`; описание — `stages/3-skeleton-bots.md`.

## 4. Отчёт ботов — `mechanics/<slug>/skeleton.json`
Пишет только `tools/skeleton_check`. Руками не правится.

```json
{
  "slug": "ladle", "date": "2026-11-24", "tool": "skeleton_check 1", "config_version": 1,
  "skeleton_lines": 132,
  "contract_errors": [],
  "levels": [
    {
      "id": "ввод", "intro": true,
      "solvable": true, "par": 6, "plan": ["вправо", "вправо", "вниз"],
      "states": 41, "overflow": false, "solutions": 2,
      "p_random": 0.25, "p_attentive": {"4": 1.0, "6": 1.0},
      "lazy": {"idle": null, "first": false, "repeat": false, "greedy": true},
      "param": {"name": "длина фитиля", "value": 3, "lower": {"solvable": true, "par": 6}, "higher": {"solvable": true, "par": 8}, "sensitive": true},
      "elements": [{"name": "камень", "gate": false, "par_without": 6}]
    }
  ],
  "cross_plans": [],
  "summary": {"attentive4_median": 0.5, "gate_elements": 1, "sensitive_levels": 2},
  "gates": {
    "contract": "pass", "solvable": "pass", "random_bot": "pass", "lazy_bots": "pass", "attentive_bot": "pass",
    "param_sensitive": "pass", "state_space": "pass", "distinct_plans": "pass"
  },
  "verdict": "pass",
  "reasons": []
}
```
- Что значит каждое число — в `stages/3-skeleton-bots.md`, раздел «Что считает инструмент». `states` — число
  положений, где партия продолжается.
- `plan` — имена ходов (`moveName`) по порядку.
- `lazy.<стратегия>`: `true` — победила, `false` — нет, `null` — неприменима (нет `PASS` или `score`).
- `elements[].par_without` — par без элемента; `null`, если без него решения нет.
- `cross_plans` — пары `{"plan_of": "А", "passes": "Б"}`.
- `summary.attentive4_median` — медиана по всем трём уровням, включая вводный; `gate_elements` — число
  элементов, которые «ворота» хотя бы на одном уровне.
- `verdict`: `pass` или `fail`; `reasons` — названия проваленных гейтов. При провале `contract` остальные
  гейты не считаются, а в `contract_errors` — что именно нарушено. Гейт `fits` в отчёте не появляется: его
  ставит ведущий по ответу сборщика.
- У нерешаемого уровня `par`, `plan`, `p_random`, `p_attentive`, `lazy`, `param`, `elements` равны `null`.

## 5. Файлы для судей — `probes.md`, `probes.key.json`, `plans.md`
Пишет `tools/skeleton_probe`. `probes.md` — единственное, что видит судья понятности:

```markdown
# Игра

**Правило.** <правило одной фразой из карточки>
**Действие.** <действие>
**Цель.** <цель>

## Первый уровень
<картинка из render и легенда>

## Вопрос 1. Что получится после ходов: вправо
А. <картинка>   Б. <картинка>   В. <картинка>   Г. <картинка>

## Вопрос 2. Что получится после ходов: вправо, вправо
…
## Вопрос 3. Что получится после ходов: вправо, вправо, вниз
…
## Вопрос 4. Какой ход вы сделаете в этом положении?
<картинка положения>
Допустимые ходы: вверх, вправо
```

`probes.key.json` (судьям не показывать):

```json
{"slug": "ladle", "level": "ввод", "answers": {"1": "В", "2": "А", "3": "Г"},
 "question4": {"after_moves": 1, "legal": ["вверх", "вправо"], "good_moves": ["вправо"]}, "options_per_question": [4, 4, 3]}
```
Вариантов может быть меньше четырёх, если разных картинок не набирается, но не меньше трёх.

`plans.md` — для судьи балла: по каждому из трёх уровней название, картинка начального положения с
легендой, план именами ходов и par. Других чисел ботов в нём нет.

Судьям дают не эти файлы, а их копии из `pipeline2/state/blind/<slug>/<роль>/` (например,
`…/blind/ladle/clarity-1/probes.md`): в каталоге механики лежат ключ и вердикт.

## 6. Каркас — `mechanics/<slug>/frame.json`
```json
{"slug": "ladle", "pipeline": 2, "action": "перенос", "mover": "часы", "invariant": "сумма", "lock": "порог-величины", "win": "удержать-до-срока",
 "proposed": {}, "by": {"role": "frame-extractor", "model": "…"}, "date": "2026-11-24"}
```
У механик первой версии, разобранных по `backlog.md`, — `"pipeline": 1`.

## 7. Карта библиотеки — `state/library_map.json`
Пишет `tools/library_map`.

```json
{
  "date": "2026-11-24",
  "cells": {
    "перенос|носитель|длина": {
      "live": [{"slug": "fuse", "score_raw": 13, "status": "playable", "protected": true}],
      "other": [{"slug": "footsteps", "pipeline": 1, "status": "v1"},
                {"slug": "wick-two", "pipeline": 2, "status": "library", "score_raw": 9}]
    }
  },
  "mechanics": {"fuse": {"action": "перенос", "mover": "носитель", "invariant": "длина", "lock": "состояние-клетки", "win": "дойти"}}
}
```
- `live` — кто занимает места в ячейке: механики второй версии с баллом и статусом из
  `library.live_statuses`. Только они сравниваются с `library.cell_max`.
- `other` — остальные с тем же каркасом: механики первой версии (балла нет, мест не занимают) и механики
  второй версии, выбывшие из игры. Они нужны автору эскиза и калибровке, чтобы видеть, что уже было.

## 8. Вердикт — `mechanics/<slug>/verdict.json`
Главный файл механики: статус, история и все оценки. Его читают `tools/build_queue`, `tools/validate` и
любой агент, который хочет понять, что с механикой.

```json
{
  "pipeline": 2,
  "slug": "ladle",
  "name": "Черпак",
  "origin": "wave",
  "pair": {"verb": "черпать_VERB", "noun": "завтра_NOUN", "sim": -0.142, "wave": 51},
  "status": "queued",
  "config_version": 1,
  "returns": {"skeleton": 0, "checks": 1, "rework": null},
  "flags": {"single_agent": false, "judge_same_model": false, "control": false, "seed_only": false, "cell_blocked": false},
  "blocked": null,
  "skeleton": {"report": "mechanics/ladle/skeleton.json", "verdict": "pass", "attentive4_median": 0.5, "gate_elements": 1},
  "checks": {
    "clarity": {"judges": [
        {"model": "…", "correct_predictions": 3, "first_move_ok": true, "unclear": "…"},
        {"model": "…", "correct_predictions": 2, "first_move_ok": true, "unclear": "…"}],
      "gate": "pass", "points": 3},
    "audience": {"model": "…", "yes_count": 5, "answers": [true, true, false, true, true, true], "gate": "pass", "points": 2, "main_objection": "…"},
    "score_judge": {"model": "…", "three_situations": 2, "double_edge": 1, "two_sided": true,
      "state_without_text": true, "kinds": 4, "answer_price": "S"},
    "depth": {"gate_elements": 1, "gate": "pass", "points": 1},
    "novelty_web": {"model": "…", "verdict": "relatives", "found": [{"title": "…", "url": "…"}], "gate": "pass"},
    "novelty_library": {"cell": "перенос|часы|сумма", "answer": "free", "live_before": 1, "displaced": null}
  },
  "score_raw": {"clarity": 3, "audience": 2, "bots_mid": 3, "three_situations": 2, "double_edge": 1, "depth": 1, "cost": 0, "total": 12},
  "score_raw_inputs": {"attentive4_median": 0.5, "gate_elements": 1},
  "score_after_return": null,
  "score_after_rework": null,
  "answer_price": "S",
  "user_override": null,
  "history": [
    {"date": "2026-11-24", "stage": "sketch", "by": "sketch-author / …", "decision": "sketched", "why": "волна 51, пара прошла гейты"},
    {"date": "2026-11-24", "stage": "skeleton", "by": "skeleton_check 1", "decision": "skeleton_ok", "why": "все гейты пройдены"},
    {"date": "2026-11-24", "stage": "blind_checks", "by": "lead", "decision": "check_return", "why": "clarity: судья 2 — 1 из 3"},
    {"date": "2026-11-25", "stage": "blind_checks", "by": "lead", "decision": "checked", "why": "после правки фразы правила все гейты пройдены"},
    {"date": "2026-11-25", "stage": "queue", "by": "build_queue 1", "decision": "queued", "why": "балл 12, место 4"}
  ]
}
```
Правила файла:
- `status` — одно из значений `pipeline.yaml`, раздел `statuses`;
- `origin` — `wave` (из волны пар) или `v1` (из спеки первой версии, `backlog.md`; тогда `pair.wave` — `null`);
- `score_raw` записывается один раз, при первом полном проходе этапа 4, и потом не меняется;
  `score_raw_inputs` — числа ботов на тот момент. Блок `skeleton` всегда отражает текущий `skeleton.json`
  и после возврата может от них отличаться;
- `checks` — ответы последнего прохода этапа 4; ответы первого прохода при возврате переносятся в
  `checks_first`, чтобы сырой балл можно было проверить;
- `returns.rework` — `null`, пока переделки нет; при переделке — `{"skeleton": 0, "checks": 0}`;
- `user_override` — `null` или
  `{"date": "2026-12-02", "action": "include | exclude | unblock_cell", "words": "слова пользователя"}`;
- `blocked` — `null` или строка: что не получилось и на каком шаге;
- каждая смена статуса — новая строка в `history`; строки не удаляются и не переписываются;
- `config_version` — версия `config.yaml`, по которой механику оценивали.

## 9. Записка о возврате — `mechanics/<slug>/return.md`
Пишет ведущий. Автор и сборщик получают не сам файл, а его копию в рабочем каталоге возврата
`pipeline2/state/drafts/<slug>-return/` вместе с копиями карточки и, для сборщика, скелета и отчёта ботов:
в каталоге механики лежит вердикт с ответами судей. При новом возврате файл переписывается.

```markdown
# Возврат: ladle — этап 4, 2026-11-24

## Не пройдено
- `clarity` — у каждого из двух судей должно быть не меньше 2 верных предсказаний из 3.

## Что можно менять
- автору: фразу правила, действие и цель в карточке; само правило не менять;
- сборщику: только `render` и легенду.
```
Что в записке бывает: названия гейтов, их определения из файла этапа, что разрешено менять; при провале
`contract` — текст ошибки инструмента; при переделке после плейтеста — факты плейтеста.
Чего не бывает: ответов и пояснений судей, ключа, баллов, советов.

## 10. Дополнительные уровни — `mechanics/<slug>/levels.js` и `levels.json`
`levels.js` пишет автор спеки: `module.exports = [ … ]`, уровни того же вида, что `levels` скелета.
`levels.json` пишет `tools/skeleton_check --levels`: для каждого уровня `id`, `solvable`, `par`, `plan`,
`states`, `p_random`, `lazy` и гейты `solvable`, `random_bot`, `lazy_bots`.

## 11. Очередь — `state/queue.json` и `state/queue.md`
Пишет `tools/build_queue`.

```json
{
  "date": "2026-11-25", "size": 10, "in_work": 1, "wip": 2, "unplaytested": 7, "sampling_allowed": true,
  "queue": [
    {"place": 1, "slug": "ladle", "score": 12, "answer_price": "S", "status": "queued", "pinned": false, "control": false, "next": "spec"}
  ],
  "build_order": ["ladle", "…"],
  "control": {"prototypes_since_last": 6, "due": false, "slug": null, "note": ""},
  "recently_displaced": [{"slug": "…", "score": 8, "by": "ladle", "date": "2026-11-25"}]
}
```
`queue.md` — та же очередь таблицей и три строки о последних вытесненных.
`unplaytested` — механики очереди без исхода плейтеста; `sampling_allowed` — меньше ли их, чем
`queue.stop_sampling_at`.

## 12. Исходы — `state/outcomes.md`
Одна таблица, строка на событие; строки только дописываются.

| Дата | Механика | Событие | Балл (слагаемые) | Боты: внимат. 4, медиана | Контр. | Кто играл | До первой победы | Бросили на уровне | Итог | Причина |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-12-01 | ladle | плейтест 1 | 12 (3·2·3·2·1·1·0) | 0,50 | нет | 3 из аудитории | 2:10 | — | playable | 3 из 3 прошли уровень 3 без помощи |

События: `приёмка ботами`, `плейтест 1`, `плейтест (неполный)`, `переделка`, `плейтест 2`, `снята`.
Слагаемые балла — в порядке: понятность · аудитория · середина ботов · три ситуации · обоюдоострость ·
запас · цена. Исход механики для калибровки — её последняя строка с итогом `playable` или `withdrawn`.

## 13. Отчёт калибровки — `state/calibration-<дата>.md`
Свободный текст с обязательными разделами: «Исходы», «Слагаемые балла», «Контрольные против лучших», «Гейты»,
«Разброс выдачи», «Поток», «Что измерено и что предположение», «Предложение правок config.yaml».

## 14. Запись о сборке инструментов — `state/bootstrap.md`
Два раздела.
- «Инструменты» — таблица: инструмент · версия · дата · какие приёмочные проверки из `tools.md` пройдены и
  какой командой. Пока в ней нет всех шести инструментов, выполняется только этап `bootstrap`.
- «backlog» — ход разовой процедуры из `backlog.md`: строка `Статус: в работе` или
  `Статус: выполнен <дата>`, на каком шаге остановились, список кандидатов и запасных, сколько каркасов
  снято, сколько кандидатов прошло каждый этап. Пока нет строки «выполнен», следующая работа после
  `bootstrap` — `backlog`.
