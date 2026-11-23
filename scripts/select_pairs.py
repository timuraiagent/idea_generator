#!/usr/bin/env python3
"""Селектор пар «глагол × существительное» с гейтами фильтра (mechanics/_filter.md).

Инкорпорирует в выбор пар то, что считаемо на векторах БЕЗ эскиза:
  №1 Близость   — жёсткий гейт: sim <= --max-sim (по умолчанию -0.10).
  №2 Стоп-лист  — жёсткий гейт по приставкам игровых глаголов (тратить, кормить, приручать,
                  обменивать, собирать, строить + расширяемый список).
  №8 Архетип    — разметка глагола пробными наборами (перенос/связь/поле/ручка/изготовление/
                  накопление/расход/импульс); плохие архетипы помечаются, гейт опционален.
  №4 Мост       — предупреждение «риск разрыва»: пересечение топ-соседей глагола и
                  существительного (мост в языке обычно оставляет общих ассоциатов).
  Эмбарго       — занятые/забракованные глаголы и существительные исключаются; «свежесть»
                  глагола: если кандидат ближе --fresh-sim к занятому глаголу, помечается
                  «старая ось» (анти-«снова носильщик»).

Режимы:
  random   — случайные пары с гейтами (по образцу sample_pairs.py)
  regions  — идея пользователя: две случайные точки-направления в пространстве,
             около одной ищем СУЩЕСТВИТЕЛЬНОЕ, около другой ГЛАГОЛ; направления
             пересэмплируются, пока области не разойдутся (cos < --region-sep),
             существительное берётся ближайшее к своему направлению среди
             проходящих гейтов. Итог: пары из ядер далёких семантических областей.
  validate — прогон классификатора архетипов по известным парам (сверка с вердиктами фильтра)

Вывод: таблица + JSON (--out).
"""
import argparse, json, random, re, sys

import numpy as np

from sample_pairs import load_vocab_and_matrix  # тот же загрузчик и фильтр словаря

MAX_SIM_DEFAULT = -0.10

# №2: стоп-лист игровых глаголов (приставочное сопоставление по лемме)
STOP_PREFIXES = ["трат", "корм", "прируч", "обменив", "собир", "стро",
                 "использ", "покупа", "прода", "улучша", "плати"]

# №8: пробные наборы архетипов глагола
ARCHETYPES = {
    "перенос":  ["переносить_VERB", "передавать_VERB", "перемещать_VERB", "нести_VERB"],
    "связь":    ["связывать_VERB", "соединять_VERB", "привязывать_VERB", "объединять_VERB"],
    "поле":     ["притягивать_VERB", "отталкивать_VERB", "нагревать_VERB", "освещать_VERB"],
    "ручка":        ["крутить_VERB", "тереть_VERB", "нажимать_VERB", "гладить_VERB"],
    "изготовление": ["плести_VERB", "вязать_VERB", "лепить_VERB", "штопать_VERB", "мастерить_VERB"],
    "накопление":   ["копить_VERB", "собирать_VERB", "накапливать_VERB"],
    "расход":       ["расходовать_VERB", "тратить_VERB", "выбрасывать_VERB"],
    "импульс":      ["толкать_VERB", "трясти_VERB", "бросать_VERB", "ударять_VERB"],
}
GOOD_ARCH = {"перенос", "связь", "поле"}

# занятые/забракованные глаголы и существительные (эмбарго по слотам пайплайна)
USED_VERBS = ["отжимать", "фотографироваться", "перебить", "соврать", "сновать",
              "ушибиться", "озадачивать", "ссорить", "подписывать", "куковать",
              "отапливать", "перетряхивать", "обещать", "черпать", "отклеивать",
              "гладить", "плести", "расходовать", "тратить", "приручить",
              "обмениваться", "кормить", "заваливать"]
USED_NOUNS = ["ужас", "собственник", "лейтмотив", "бильярд", "закрытие", "кума",
              "заминка", "военный", "погода", "долг", "толпа", "наст", "ветер",
              "гиря", "завтра", "ночь", "тишина", "тень", "мебель", "горизонт",
              "заслуга", "экосистема", "гнездо"]

VALIDATE = [  # (глагол, существительное, вердикт фильтра по №8)
    ("подписывать", "погода", "good"), ("обещать", "гиря", "good"),
    ("черпать", "завтра", "good"), ("отклеивать", "ночь", "good"),
    ("отапливать", "толпа", "good"), ("куковать", "долг", "good"),
    ("гладить", "наст", "bad"), ("плести", "ветер", "bad"),
    ("перетряхивать", "толпа", "bad"), ("расходовать", "тишина", "warn"),
]


def stop_hit(verb):
    return any(p in verb for p in STOP_PREFIXES)


def classify_verb(vec, probe_index, mat):
    scores = {}
    for arch, probes in ARCHETYPES.items():
        sims = [float(mat[probe_index[p]] @ vec) for p in probes if p in probe_index]
        scores[arch] = float(np.mean(sims)) if sims else -1.0
    arch = max(scores, key=scores.get)
    return arch, scores


def cloud_cos(mat, vi, ni, k=30):
    """№3/№4-аннотация: косинус существительного к «облаку» глагола (среднее топ-k
    соседей). Положительное = бытовая связь пары в языке (риск буквальности №3)."""
    sims_v = mat @ mat[vi]
    cloud = mat[np.argsort(-sims_v)[:k]].mean(axis=0)
    cloud = cloud / (np.linalg.norm(cloud) + 1e-9)
    return float(cloud @ mat[ni])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model")
    ap.add_argument("--mode", choices=["random", "regions", "validate"], default="random")
    ap.add_argument("--region-sep", type=float, default=0.55,
                    help="regions: минимальный угол между направлениями областей (cos < значения)")
    ap.add_argument("--region-k", type=int, default=40,
                    help="regions: сколько ближайших кандидатов к направлению перебирать")
    ap.add_argument("--n", type=int, default=12)
    ap.add_argument("--max-sim", type=float, default=MAX_SIM_DEFAULT,
                    help="№1: гейт близости (sim <= значения)")
    ap.add_argument("--no-arch-gate", action="store_true",
                    help="не браковать плохой архетип, только помечать")
    ap.add_argument("--fresh-sim", type=float, default=0.40,
                    help="порог «старой оси» к занятым глаголам")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--rank-cap", type=int, default=20000,
                    help="не использовать слова за пределами топ-N по частоте")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    words, ranks, mat = load_vocab_and_matrix(args.model, rank_cap=args.rank_cap)
    index = {w: i for i, w in enumerate(words)}

    if args.mode == "validate":
        hits, total = 0, 0
        for verb, noun, verdict in VALIDATE:
            vi, ni = index.get(verb + "_VERB"), index.get(noun + "_NOUN")
            if vi is None or ni is None:
                print(f"!! нет в словаре: {verb}×{noun}")
                continue
            total += 1
            arch, _ = classify_verb(mat[vi], index, mat)
            cloud = cloud_cos(mat, vi, ni)
            pred = "good" if arch in GOOD_ARCH else "bad"
            ok = (pred == verdict) or (verdict == "warn")
            hits += ok
            mark = "OK " if ok else "?? "
            print(f"{mark}{verb}×{noun}: архетип={arch}, облако={cloud:+.3f} (ожидалось: {verdict})")
        print(f"согласие: {hits}/{total}")
        return

    rng = random.Random(args.seed)
    pos = np.array([w.rsplit("_", 1)[1] for w in words])
    verbs = [i for i in range(len(words)) if pos[i] == "VERB"]
    # занятые слоты из MECHANICS.md (таблица: `глагол × существительное`) +
    # статические списки — автосинхронизация, чтобы занятые глаголы/носители
    # не просачивались в волны (сигнал: «командовать» прошёл после order-feel)
    def _used_from_index(path="MECHANICS.md"):
        uv, un = set(), set()
        try:
            for m in re.finditer(r"`([а-яё-]+) × ([а-яё-]+)`", open(path, encoding="utf-8").read()):
                uv.add(m.group(1)); un.add(m.group(2))
        except FileNotFoundError:
            pass
        return uv, un
    idx_v, idx_n = _used_from_index()

    # человеко-носители (№5≤1: «существо, не закон») отсекаются семантически:
    # max cos к якорям людей > HUMAN_COS → noun не участвует (сигнал волн 39–48)
    HUMAN_ANCHORS = ["человек_NOUN", "мужчина_NOUN", "женщина_NOUN",
                     "ребёнок_NOUN", "мальчик_NOUN", "девочка_NOUN",
                     "мама_NOUN", "папа_NOUN", "отец_NOUN", "мать_NOUN",
                     "сын_NOUN", "дочь_NOUN", "бабушка_NOUN", "дедушка_NOUN",
                     "солдат_NOUN", "моряк_NOUN", "лётчик_NOUN", "врач_NOUN",
                     "учитель_NOUN", "рабочий_NOUN", "крестьянин_NOUN",
                     "музыкант_NOUN"]
    HUMAN_COS = 0.45
    anchors = [index[a] for a in HUMAN_ANCHORS if a in index]
    human_mask = np.zeros(len(words), dtype=bool)
    if anchors:
        human_mask = (mat @ mat[anchors].T).max(axis=1) > HUMAN_COS
    nouns = [i for i in range(len(words)) if pos[i] == "NOUN" and not human_mask[i]]
    used_v = {f"{v}_VERB" for v in USED_VERBS} | set(
        w for w in words if any(p in w for p in [f"{u}_VERB" for u in USED_VERBS]))
    used_n = {f"{n}_NOUN" for n in USED_NOUNS}
    # приставочное сопоставление автопары к лемме модели: «командовать» ловит
    # «командовать_VERB»; «направить» ловит «направить_VERB» и производные теги
    used_lemmas_v = {w.rsplit("_", 1)[0] for w in used_v} | idx_v
    used_lemmas_n = {w.rsplit("_", 1)[0] for w in used_n} | idx_n

    probe_index = {p: index[p] for arch, ps in ARCHETYPES.items() for p in ps if p in index}
    out, tries = [], 0

    if args.mode == "regions":
        # идея пользователя: две случайные точки-направления; существительное
        # «около» одной, глагол «около» другой. Точка = гауссов вектор, нормированный.
        dir_rng = np.random.default_rng(args.seed)

        def direction(exclude):
            while True:
                v = dir_rng.standard_normal(mat.shape[1])
                v /= (np.linalg.norm(v) + 1e-9)
                if all(float(v @ e) < args.region_sep for e in exclude):
                    return v
        directions = []
        while len(out) < args.n and tries < args.n * 4000:
            tries += 1
            A = direction(directions)
            B = direction(directions + [A])
            # существительное около A, глагол около B — ближайшие проходящие гейты
            nouns_near = [i for i in np.argsort(-(mat @ A)) if pos[i] == "NOUN"][: args.region_k * 3]
            verbs_near = [i for i in np.argsort(-(mat @ B)) if pos[i] == "VERB"][: args.region_k * 3]
            ni = next((i for i in nouns_near if words[i] not in used_n
                       and words[i].rsplit("_", 1)[0] not in used_lemmas_n), None)
            vi = next((i for i in verbs_near
                       if words[i] not in used_v
                       and words[i].rsplit("_", 1)[0] not in used_lemmas_v
                       and not stop_hit(words[i].rsplit("_", 1)[0])), None)
            if ni is None or vi is None:
                continue
            sim = float(mat[vi] @ mat[ni])
            if sim > args.max_sim:                                   # №1 между областями
                continue
            arch, scores = classify_verb(mat[vi], index, mat)
            if arch not in GOOD_ARCH and not args.no_arch_gate:
                continue
            fresh = max((float(mat[vi] @ mat[index[u]]) for u in used_v if u in index),
                        default=-1.0)
            if fresh > args.fresh_sim:
                continue
            bridge = cloud_cos(mat, vi, ni)
            out.append({"verb": words[vi], "noun": words[ni], "sim": round(sim, 3),
                        "archetype": arch,
                        "arch_scores": {k: round(v, 3) for k, v in scores.items()},
                        "cloud_cos": round(bridge, 3),
                        "old_axis": fresh > 0.25,
                        "region_a": words[int(np.argmax(mat @ A))],
                        "region_b": words[int(np.argmax(mat @ B))],
                        "warnings": (["архетип " + arch] if arch not in GOOD_ARCH else []) +
                                    (["бытовая связь (риск буквальности №3)"] if bridge > 0.03 else [])})
            directions += [A, B]   # области заняты только успехом
    else:
        while len(out) < args.n and tries < args.n * 3000:
            tries += 1
            vi, ni = rng.choice(verbs), rng.choice(nouns)
            wv, wn = words[vi], words[ni]
            lem_v = wv.rsplit("_", 1)[0]
            sim = float(mat[vi] @ mat[ni])
            if sim > args.max_sim:                                   # №1 близость
                continue
            if stop_hit(lem_v):                                      # №2 стоп-лист
                continue
            if wv in used_v or lem_v in used_lemmas_v:               # эмбарго глаголов
                continue
            if wn in used_n or wn.rsplit("_", 1)[0] in used_lemmas_n:  # эмбарго существительных
                continue
            arch, scores = classify_verb(mat[vi], index, mat)
            if arch not in GOOD_ARCH and not args.no_arch_gate:      # №8: гейт архетипа
                continue
            fresh = max((float(mat[vi] @ mat[index[u]]) for u in used_v if u in index),
                        default=-1.0)
            if fresh > args.fresh_sim:                               # «старая ось»
                continue
            bridge = cloud_cos(mat, vi, ni)
            out.append({"verb": wv, "noun": wn, "sim": round(sim, 3),
                        "archetype": arch, "arch_scores": {k: round(v, 3) for k, v in scores.items()},
                        "cloud_cos": round(bridge, 3),
                        "old_axis": fresh > 0.25,
                        "warnings": (["архетип " + arch] if arch not in GOOD_ARCH else []) +
                                    (["бытовая связь (риск буквальности №3)"] if bridge > 0.03 else [])})

    out.sort(key=lambda p: p["sim"])
    for k, p in enumerate(out, 1):
        warn = ("  ⚠ " + "; ".join(p["warnings"])) if p["warnings"] else ""
        print(f"#{k:<2} {p['verb']}  ×  {p['noun']}   sim={p['sim']:+.3f}  "
              f"архетип={p['archetype']}  облако={p['cloud_cos']:+.3f}{warn}")
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
        print(f"\nсохранено: {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
