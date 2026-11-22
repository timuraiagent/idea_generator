#!/usr/bin/env python3
"""Генерирует MECHANICS.md — индекс всех механик с оценками чеклиста и статусами.

Источники: mechanics/*/spec.md (имя, пара), archive/mechanics/*/spec.md (снятые),
SCORES (чеклист /16 из вердиктов фильтров), VERDICT_NOTES (особые статусы),
prototypes/*/index.html (играбельность). Запуск: python3 scripts/build_mechanics_index.py
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Чеклист /16 (вердикты фильтров; «—» = чеклист не прогонен)
SCORES = {
    "ladle": 16, "avert": 16, "acquaint": 16, "suppose": 16, "herald": 16, "charter": 16,
    "footsteps": 16,
    "haunt": 16,
    "pierce": 16, "halfword": 16, "intent": 16, "crisisride": 16,
    "chronicle": 15, "infill": 15, "swarm": 15, "settle": 15,
    "widen": 15, "captivate": 15, "cultivate": 15, "ignite": 15, "comedy": 15, "weave": 15,
    "queue": 15, "panic": 15,
    "farewell": 15, "tideland": 15, "echo": 16, "ferment": 15, "scar": 15,
    "unseal": 15, "distance": 15, "vaccine": 15, "focus": 16,
    "pursuit": 14, "cuckoo": 14,
    "promise": 13, "silence": 13, "pillar": 13, "starch": 13,
    "tilt": 13, "shadowswap": 12, "night": 12, "warmth": 12, "signature": 12,
    "furniture": 10, "windrope": 9, "feedchain": 8, "merit": 7,
    "gaze": 16, "preposition": 16, "pathos": 16, "acid": 15, "closet": 15, "chip": 15, "settle": 15,
    "sharpen-evening": 15, "screen-rebuff": 15,
    "soak-stage": 16, "deny-path": 16, "waft-credit": 16, "glorify-touch": 16,
    "spill-detail": 16, "pour-algorithm": 16, "circumnavigate-policy": 16, "death-stamp": 16,
    "condemn-day": 16, "courtyard": 16, "disperse": 16, "palpate-regime": 16, "send-tone": 16,
    "closed-list": 16,
}
# Особые статусы поверх автоопределения
NOTES = {
    "tilt": "контрольный прототип: GO фильтра, отказ чеклиста (№10+№14 — ленивые стратегии)",
    "shadowswap": "GO фильтра, отказ чеклиста (№6+№13) — в библиотеке",
    "furniture": "GO фильтра, отказ чеклиста (№6+№13) — в библиотеке",
    "feedchain": "GO фильтра, отказ чеклиста (№3) — в библиотеке",
    "windrope": "GO фильтра, отказ чеклиста (№7) — в библиотеке",
    "merit": "GO фильтра, отказ чеклиста (№3/№7/№16) — в библиотеке",
    "suppose": "сосед Bulbo's Belief System (2027) — повторить веб-чек перед прототипом",
    "vaccine": "сосед: неопознанная word-game «вакцинация букв» (RPS 2021) — повторить веб-чек перед прототипом",
    "hitstop": "GO фильтра условный (3 предохранителя от вырождения в SUPERHOT)",
    "leitmotif": "рабочая v2.2 — эталон читаемости",
    "leitmotif-v2": "играбельная (20 уровней, 4 мира); замечание: L4 «Ремень» — рандом 63%",
    "leitmotif-v3": "«Длинные машины» — третья итерация идеи",
}
# Отказы без спеки (чеклист; спека не создавалась)
NOGO = [
    ("усвоить × крыса", 14, "NO-GO по порогу: №9–16 все 8/8, но №5=1 (крыса — существо, не закон); перепарка: тот же глагол с носителем-законом (стая, молва)"),
    ("зреть × двигатель", 14, "NO-GO по порогу: №9–16 все 8/8, но №4=0 («зреть двигатель» — не идиома); перепарка: носитель-закон (турбина, состав)"),
    ("перетряхивать × толпа", 4, "одна монотонная ось просева, решения нет (№13/№9/№15)"),
    ("гладить × наст", 2, "буквальность (№3), обе физические (№5)"),
]
PAIR_OVERRIDE = {
    "leitmotif": "перебить × лейтмотив",
    "leitmotif-v2": "перебить × лейтмотив (вариация)",
    "leitmotif-v3": "перебить × лейтмотив (третья итерация)",
}


def parse_spec(spec):
    text = spec.read_text(encoding="utf-8")
    name_m = re.search(r"^#\s+(.+?)$", text, re.M)
    name = re.split(r"\s+—\s+", name_m.group(1).strip())[0].strip() if name_m else "?"
    pair_m = re.search(r"Пара-источник\s*[:\s]*([^\n(]+)", text)
    pair = pair_m.group(1).strip() if pair_m else ""
    pair = re.sub(r"_(VERB|NOUN)", "", pair)
    return name, pair


def card(slug, name, pair, score, status, note, spec_link, play_link):
    score_s = f"{score}/16" if score is not None else "—"
    star = "⭐" if (score or 0) >= 15 else ""
    links = []
    if spec_link:
        links.append(f"[спека]({spec_link})")
    if play_link:
        links.append(f"[▶ играть]({play_link})")
    note_html = f"<br>*{html.escape(note)}*" if note else ""
    pair_s = html.escape(pair) if pair else "—"
    return (f"| {html.escape(name)} | `{pair_s}` | {score_s} {star} | {status} | "
            f"{note_html} | {' · '.join(links)} |")


def main():
    rows = []
    seen = set()
    # Спеки в mechanics/
    for spec in sorted((ROOT / "mechanics").glob("*/spec.md")):
        slug = spec.parent.name
        if slug == "_filter":
            continue
        seen.add(slug)
        name, pair = parse_spec(spec)
        pair = PAIR_OVERRIDE.get(slug, pair)
        score = SCORES.get(slug)
        has_proto = (ROOT / "prototypes" / slug / "index.html").exists()
        if has_proto:
            status = "🎮 играбельна"
        elif slug == "tilt":
            status = "🔬 контрольный прототип"
        else:
            status = "спека — ждёт прототипа"
        spec_link = f"mechanics/{slug}/spec.md"
        play_link = f"prototypes/{slug}/index.html" if has_proto else None
        note = NOTES.get(slug, "")
        rows.append((score if score is not None else -1, card(
            slug, name, pair, score, status, note, spec_link, play_link)))
    # Снятые в archive/
    for spec in sorted((ROOT / "archive" / "mechanics").glob("*/spec.md")):
        slug = spec.parent.name
        seen.add(slug)
        name, pair = parse_spec(spec)
        pair = PAIR_OVERRIDE.get(slug, pair)
        note = {"fear-liquid": "снят: непонятен, цель недостижима ботами",
                "quarrel": "снят: непонятен, цель недостижима ботами"}.get(slug, "снят")
        rows.append((-1, card(slug, name, pair, None, "📦 снят (archive)", note,
                              f"archive/mechanics/{slug}/spec.md", None)))
    # Отказы без спеки
    nogo_rows = []
    for pair, score, why in NOGO:
        nogo_rows.append(f"| — | `{pair}` | {score}/16 | ❌ отказ | {why} | — |")

    rows.sort(key=lambda r: r[0], reverse=True)
    playable = sum(1 for s in (ROOT / "prototypes").glob("*/index.html"))
    specs = len(list((ROOT / "mechanics").glob("*/spec.md")))
    archived = len(list((ROOT / "archive" / "mechanics").glob("*/spec.md")))

    header = f"""<!-- Генерируется scripts/build_mechanics_index.py — руками не править -->
# Индекс механик

{specs} спек в библиотеке · {playable} играбельных прототипов · {archived} сняты · порог чеклиста 10/16, цель партий ≥15

| Механика | Пара | Чеклист | Статус | Примечание | Ссылки |
|---|---|---|---|---|---|
"""
    body = "\n".join(r[1] for r in rows)
    nogo_html = "\n".join(nogo_rows)
    page = header + body + f"""

## Отказы чеклиста без спеки

| Механика | Пара | Чеклист | Статус | Причина | Ссылки |
|---|---|---|---|---|---|
{nogo_html}

---
*Чеклист 16 проверок — `mechanics/_filter.md`; формальный фильтр — гейт, чеклист — ранжирование очереди прототипов (порядок по цене ответа). Контрольный прототип из отказов проверяет саму планку.*
"""
    (ROOT / "MECHANICS.md").write_text(page, encoding="utf-8")
    print(f"MECHANICS.md: {specs} спек, {playable} играбельных, {archived} снятых")


if __name__ == "__main__":
    main()
