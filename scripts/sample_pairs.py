#!/usr/bin/env python3
"""Сэмплирование далёких пар «глагол × существительное» из word2vec-модели.

Модель: RusVectores ruwikiruscorpora_upos_cbow_300_20_2019 (текстовый формат model.txt,
ключи вида "лемма_POS", словарь отсортирован по частоте — индекс строки = ранг частоты).

Режимы:
  far    — для случайных глаголов ищем самое дальнее существительное (min cosine sim)
  random — случайные пары с косинусной близостью ниже порога

Для каждого слова печатаем 3 ближайших соседа (среди NOUN+VERB), чтобы снять
многозначность русской леммы.
"""
import argparse
import json
import random
import re
import sys
import time

import numpy as np

WORD_RE = re.compile(r"^[а-яё]{3,}_(NOUN|VERB)$")

# причастия/деепричастия в этом корпусе размечены как VERB — отсекаем по финалам
PARTICIPLE_ENDINGS = ("вший", "ший", "щий", "нный", "енный", "анный", "емый",
                      "имый", "аемый", "яемый", "ющийся", "ующий",
                      "вшись", "шись", "вши", "ши", "вшись",
                      "вшийся", "шийся", "щийся", "ющийся", "ющийся")


def is_clean(word):
    lemma, pos = word.rsplit("_", 1)
    if pos == "VERB" and lemma.endswith(PARTICIPLE_ENDINGS):
        return False
    return True


def load_vocab_and_matrix(path, rank_cap=None):
    """Читает model.txt; возвращает (words, ranks, матрица float32, норм. копию)."""
    t0 = time.time()
    words, ranks, rows = [], [], []
    with open(path, "rb") as f:
        first = f.readline().decode()  # заголовок "189193 300"
        dim = int(first.split()[1])
        for idx, line in enumerate(f):
            sp = line.find(b" ")
            if sp <= 0:
                continue
            w = line[:sp].decode("utf-8", "ignore")
            if not WORD_RE.match(w) or not is_clean(w):
                continue
            vals = line[sp + 1:].split()
            if len(vals) != dim:
                continue
            vec = np.array(vals, dtype=np.float32)
            n = np.linalg.norm(vec)
            if n < 1e-6 or not np.isfinite(vec).all():
                continue
            words.append(w)
            ranks.append(idx)
            rows.append(vec / n)
            if rank_cap and idx >= rank_cap:
                break
    mat = np.vstack(rows)
    print(f"загружено {len(words)} слов за {time.time()-t0:.1f}s", file=sys.stderr)
    return words, np.array(ranks), mat


def top_neighbors(mat, i, words, k=3):
    sims = mat @ mat[i]
    sims[i] = -2
    idx = np.argpartition(-sims, k)[:k]
    idx = idx[np.argsort(-sims[idx])]
    return [(words[j], round(float(sims[j]), 3)) for j in idx]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model", help="путь к model.txt")
    ap.add_argument("--seeds", default=None,
                    help="файл со словами-семенами (по одному в строке, с тегом _VERB/_NOUN); "
                         "для каждого ищем дальние пары вместо случайного сэмплирования")
    ap.add_argument("--mode", choices=["far", "random"], default="far")
    ap.add_argument("--n", type=int, default=50, help="сколько пар")
    ap.add_argument("--min-rank", type=int, default=200,
                    help="не сэмплировать слова из топ-частотных (служебные)")
    ap.add_argument("--max-rank", type=int, default=10**9)
    ap.add_argument("--threshold", type=float, default=0.05,
                    help="порог близости для режима random")
    ap.add_argument("--far-pool", type=int, default=150,
                    help="выбирать дальнее существительное случайно из K самых дальних")
    ap.add_argument("--rank-cap", type=int, default=40000,
                    help="не использовать слова за пределами топ-N по частоте")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--out", default=None, help="файл для сохранения пар (json)")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    words, ranks, mat = load_vocab_and_matrix(args.model, rank_cap=args.rank_cap)

    pos = np.array([w.rsplit("_", 1)[1] for w in words])
    verbs = [i for i in range(len(words))
             if pos[i] == "VERB" and args.min_rank <= ranks[i] <= args.max_rank]
    nouns = [i for i in range(len(words))
             if pos[i] == "NOUN" and args.min_rank <= ranks[i] <= args.max_rank]
    print(f"глаголов: {len(verbs)}, существительных: {len(nouns)}", file=sys.stderr)

    pairs = []  # (verb_idx, noun_idx, sim)
    index = {w: i for i, w in enumerate(words)}
    if args.seeds:
        per_seed = args.n
        with open(args.seeds, encoding="utf-8") as f:
            seed_words = [ln.strip() for ln in f if ln.strip()]
        for sw in seed_words:
            if sw not in index:
                print(f"!! семя нет в словаре: {sw}", file=sys.stderr)
                continue
            si = index[sw]
            sw_pos = "VERB" if sw.endswith("_VERB") else "NOUN"
            other = nouns if sw_pos == "VERB" else verbs
            sims = mat[other] @ mat[si]
            ok = [other[j] for j in range(len(other)) if sims[j] < args.threshold]
            for oi in rng.sample(ok, min(per_seed, len(ok))):
                pairs.append((si, oi, float(mat[si] @ mat[oi])))
        # группируем по семенам
        pairs.sort(key=lambda p: (p[0], p[2]))
    elif args.mode == "far":
        for vi in rng.sample(verbs, min(args.n, len(verbs))):
            sims = mat[nouns] @ mat[vi]
            order = np.argsort(sims)[: args.far_pool]
            j = int(rng.choice(order))
            pairs.append((vi, nouns[j], float(sims[j])))
        pairs.sort(key=lambda p: p[2])
    else:
        tries = 0
        while len(pairs) < args.n and tries < args.n * 400:
            tries += 1
            vi = rng.choice(verbs)
            ni = rng.choice(nouns)
            s = float(mat[vi] @ mat[ni])
            if s < args.threshold:
                pairs.append((vi, ni, s))
        pairs.sort(key=lambda p: p[2])

    out = []
    for k, (vi, ni, s) in enumerate(pairs, 1):
        wv, wn = words[vi], words[ni]
        nv = ", ".join(f"{w}({c})" for w, c in top_neighbors(mat, vi, words))
        nn = ", ".join(f"{w}({c})" for w, c in top_neighbors(mat, ni, words))
        print(f"#{k:<3} {wv}  ×  {wn}   sim={s:+.3f}\n"
              f"     {wv}: {nv}\n"
              f"     {wn}: {nn}")
        out.append({"verb": wv, "noun": wn, "sim": s, "rank_v": int(ranks[vi]),
                    "rank_n": int(ranks[ni]), "neighbors_v": nv, "neighbors_n": nn})

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
        print(f"\nсохранено: {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
