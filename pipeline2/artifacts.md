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
  "command": "python3 scripts/select_pairs.py .data/nlpl_model/model.txt --mode regions --n 40 --seed 51 …",
  "seed": 51,
  "params": {"max_sim": -0.10, "arch_quota": 6, "fresh_sim_verb": 0.40, "fresh_sim_noun": 0.40},
  "manual_selection": false,
  "pairs": [
    {
      "verb": "черпать_VERB", "noun": "завтра_NOUN", "sim": -0.142,
      "archetype": "перенос", "verb_neighbours": ["…"], "noun_neighbours": ["…"],
      "experimental": false, "noun_fresh": true,
      "decision": "pass",
      "reason": "закон времени против переноса: взятое из завтра там пропадает",
      "verb_law": "…", "noun_law": "…", "conflict": "…", "formula": "можно …, но тогда …",
      "archetype_by_formula": "перенос", "bridge": 2,
      "slug": "ladle"
    }
  ],
  "double_checked": false,
  "judge": {"role": "pair-gates", "model": "…"}
}
```
`decision` до этапа 1 — `null`. `slug` появляется на этапе 2.

## 2. Эскиз-карточка — `mechanics/<slug>/sketch.md`
Шаблон — `templates/sketch.md`. После возврата файл переписывается; прежний вариант остаётся в истории git.

## 3. Скелет — `mechanics/<slug>/skeleton.js`
Договор и пример — `templates/skeleton.js`; описание — `stages/3-skeleton-bots.md`.

## 4. Отчёт ботов — `mechanics/<slug>/skeleton.json`
Пишет только `tools/skeleton_check`. Руками не правится.

```json
{
  "slug": "ladle", "date": "2026-11-24", "tool": "skeleton_check 1", "config_version": 1,
  "skeleton_lines": 132,
  "levels": [
    {
      "id": "ввод", "intro": true,
      "solvable": true, "par": 6, "plan": "вправо вправо вниз …",
      "states": 41, "overflow": false, "solutions": 2,
      "p_random": 0.25, "p_attentive": {"4": 1.0, "6": 1.0},
      "lazy": {"idle": null, "first": false, "repeat": false, "greedy": true},
      "param": {"name": "длина фитиля", "value": 3, "lower": {"solvable": true, "par": 6}, "higher": {"solvable": true, "par": 8}, "sensitive": true},
      "elements": [{"name": "камень", "present": false, "gate": false}]
    }
  ],
  "cross_plans": [],
  "summary": {"attentive4_median": 0.5, "gate_elements": 1, "sensitive_levels": 2},
  "gates": {
    "solvable": "pass", "random_bot": "pass", "lazy_bots": "pass", "attentive_bot": "pass",
    "param_sensitive": "pass", "state_space": "pass", "distinct_plans": "pass"
  },
  "verdict": "pass",
  "reasons": []
}
```
- `lazy.<стратегия>`: `true` — победила, `false` — нет, `null` — неприменима (нет `PASS` или `score`).
- `cross_plans` — пары «план уровня А прошёл уровень Б».
- `verdict`: `pass` или `fail`; `reasons` — названия проваленных гейтов. Возврат это или отказ, решает
  ведущий по счётчику возвратов.

## 5. Вопросы понятности — `mechanics/<slug>/probes.md` и `probes.key.json`
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

## 6. Каркас — `mechanics/<slug>/frame.json`
```json
{"slug": "ladle", "action": "перенос", "mover": "часы", "invariant": "сумма", "lock": "порог-величины", "win": "удержать-до-срока",
 "proposed": {}, "by": {"role": "frame-extractor", "model": "…"}, "date": "2026-11-24"}
```

## 7. Карта библиотеки — `state/library_map.json`
Пишет `tools/library_map`.

```json
{
  "date": "2026-11-24",
  "cells": {
    "перенос|носитель|длина": [
      {"slug": "fuse", "pipeline": 2, "score_raw": 13, "status": "playable"},
      {"slug": "footsteps", "pipeline": 1, "score_raw": null, "status": "v1"}
    ]
  },
  "mechanics": {"fuse": {"action": "перенос", "mover": "носитель", "invariant": "длина", "lock": "состояние-клетки", "win": "дойти"}}
}
```
Механики первой версии входят в карту со статусом `v1` и баллом `null`; при сравнении в ячейке они считаются
слабее любой механики с баллом.

## 8. Вердикт — `mechanics/<slug>/verdict.json`
Главный файл механики: статус, история и все оценки. Его читают `tools/build_queue`, `tools/validate` и
любой агент, который хочет понять, что с механикой.

```json
{
  "pipeline": 2,
  "slug": "ladle",
  "name": "Черпак",
  "pair": {"verb": "черпать_VERB", "noun": "завтра_NOUN", "sim": -0.142, "wave": 51},
  "status": "queued",
  "config_version": 1,
  "returns": {"skeleton": 0, "checks": 1},
  "flags": {"single_agent": false, "judge_same_model": false, "control": false, "seed_only": false},
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
    "novelty_library": {"cell": "перенос|часы|сумма", "members_before": 1, "gate": "pass", "displaced": null}
  },
  "score_raw": {"clarity": 3, "audience": 2, "bots_mid": 3, "three_situations": 2, "double_edge": 1, "depth": 1, "cost": 0, "total": 12},
  "score_after_return": null,
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
- `score_raw` записывается один раз, при первом полном проходе этапа 4, и потом не меняется;
- каждая смена статуса — новая строка в `history`; строки не удаляются и не переписываются;
- `config_version` — версия `config.yaml`, по которой механику оценивали.

## 9. Очередь — `state/queue.json` и `state/queue.md`
Пишет `tools/build_queue`.

```json
{
  "date": "2026-11-25", "size": 10, "unplaytested": 7, "sampling_allowed": true,
  "queue": [
    {"place": 1, "slug": "ladle", "score": 12, "answer_price": "S", "status": "queued", "pinned": false, "next": "spec"}
  ],
  "build_order": ["ladle", "…"],
  "next_control": {"after_prototypes": 3, "slug": "…"},
  "recently_displaced": [{"slug": "…", "score": 8, "by": "ladle", "date": "2026-11-25"}]
}
```
`queue.md` — та же очередь таблицей и три строки о последних вытесненных.

## 10. Исходы — `state/outcomes.md`
Одна таблица, строка на событие; строки только дописываются.

| Дата | Механика | Событие | Балл (слагаемые) | Боты: внимат. 4, медиана | Контр. | Кто играл | До первой победы | Бросили на уровне | Итог | Причина |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-12-01 | ladle | плейтест 1 | 12 (3·2·3·2·1·1·0) | 0,50 | нет | 3 из аудитории | 2:10 | — | playable | 3 из 3 прошли уровень 3 без помощи |

События: `приёмка ботами`, `плейтест 1`, `переделка`, `плейтест 2`, `снята`.
Слагаемые балла — в порядке: понятность · аудитория · середина ботов · три ситуации · обоюдоострость ·
запас · цена.

## 11. Отчёт калибровки — `state/calibration-<дата>.md`
Свободный текст с обязательными разделами: «Исходы», «Слагаемые балла», «Контрольные против лучших», «Гейты»,
«Разброс выдачи», «Поток», «Что измерено и что предположение», «Предложение правок config.yaml».

## 12. Запись о сборке инструментов — `state/bootstrap.md`
Таблица: инструмент · версия · дата · какие приёмочные проверки из `tools.md` пройдены и чем.
Пока в ней нет всех инструментов, пайплайн дальше этапа `bootstrap` не идёт.
