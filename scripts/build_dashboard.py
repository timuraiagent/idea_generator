#!/usr/bin/env python3
"""Генерирует index.html — дашборд механик, прошедших фильтр.

Источник данных: mechanics/<slug>/spec.md (спека появляется только после GO фильтра),
ссылки: prototypes/<slug>/index.html (игра, если собран), mechanics/<slug>/reference.html
(визреференс). Запуск: python3 scripts/build_dashboard.py — после каждого прогона пайплайна.
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent

SECTION_KEYS = {
    "pair": ("пара",),
    "rule": ("правило",),
    "question": ("вопрос",),
}


def parse_spec(path):
    text = path.read_text(encoding="utf-8")
    name_m = re.search(r"^#\s+(.+?)$", text, re.M)
    name = re.split(r"\s+—\s+", name_m.group(1).strip())[0].strip() if name_m else path.parent.name
    sections = {}
    for part in re.split(r"^##\s+", text, flags=re.M)[1:]:
        title, _, body = part.partition("\n")
        sections[title.strip().lower()] = body.strip()

    def body_of(key):
        for k, v in sections.items():
            if k.startswith(SECTION_KEYS[key]):
                return v.split("\n\n")[0].replace("\n", " ").strip()
        return ""

    return name, body_of("pair"), body_of("rule"), body_of("question")


def card(slug, name, pair, rule, question, has_proto, has_ref):
    m = re.search(r"([а-яё]+)_VERB\s*[×x]\s*([а-яё]+)_NOUN", pair)
    pair_badge = f"{m.group(1)} × {m.group(2)}" if m else pair[:60]
    sim_m = re.search(r"sim\s*=\s*([−\-+0-9.]+)", pair)
    sim = f" · sim {sim_m.group(1)}" if sim_m else ""

    links = []
    if has_proto:
        links.append(f'<a class="play" href="/prototypes/{slug}/index.html">▶ ИГРАТЬ</a>')
    if has_ref:
        links.append(f'<a href="/mechanics/{slug}/reference.html">визреференс</a>')
    links.append(f'<a href="/mechanics/{slug}/spec.md">спека</a>')
    links_html = "\n      ".join(links)

    proto_note = "" if has_proto else '<div class="note">прошёл фильтр, прототип ещё не собран</div>'
    question_html = f'<p class="q">{html.escape(question)}</p>' if question else ""
    rule_html = f'<p class="rule">{html.escape(rule)}</p>' if rule else ""
    return f"""
  <article class="card">
    <header><h2>{html.escape(name)}</h2><span class="chip">прошёл фильтр</span></header>
    <div class="pair">{html.escape(pair_badge)}<span class="sim">{html.escape(sim)}</span></div>
    {rule_html}
    {question_html}
    {proto_note}
    <nav>
      {links_html}
    </nav>
  </article>"""


def main():
    cards = []
    n_playable = 0
    for spec in sorted((ROOT / "mechanics").glob("*/spec.md"), key=lambda p: p.stat().st_mtime, reverse=True):
        slug = spec.parent.name
        has_proto = (ROOT / "prototypes" / slug / "index.html").exists()
        has_ref = (ROOT / "mechanics" / slug / "reference.html").exists()
        n_playable += has_proto
        cards.append(card(slug, *parse_spec(spec), has_proto, has_ref))

    page = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>idea_generator — дашборд механик</title>
<style>
  body{{margin:0;background:#0d0a12;color:#e8e6f0;font-family:sans-serif;}}
  main{{max-width:760px;margin:0 auto;padding:32px 16px;}}
  h1{{font-size:24px;color:#b26bff;margin:0 0 4px;}}
  .stats{{color:#8f86a8;margin:0 0 28px;font-size:14px;}}
  .card{{background:#17131f;border:1px solid #2a2338;border-radius:10px;padding:18px 20px;margin-bottom:18px;}}
  .card header{{display:flex;align-items:center;gap:12px;margin-bottom:6px;}}
  .card h2{{font-size:19px;margin:0;}}
  .chip{{font-size:11px;color:#9fe8b0;border:1px solid #2f4a38;border-radius:99px;padding:2px 10px;}}
  .pair{{color:#b26bff;font-size:14px;margin-bottom:10px;}}
  .sim{{color:#5b5372;font-size:12px;margin-left:8px;}}
  .rule{{margin:6px 0;color:#cfcbe0;font-size:14px;line-height:1.5;}}
  .q{{margin:6px 0;color:#8f86a8;font-size:13px;line-height:1.5;}}
  .q::before{{content:"? ";color:#b26bff;font-weight:bold;}}
  .note{{color:#ffd166;font-size:13px;margin:6px 0;}}
  nav{{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;}}
  nav a{{color:#e8e6f0;text-decoration:none;font-size:14px;border:1px solid #3a3050;border-radius:8px;padding:8px 14px;}}
  nav a.play{{background:#b26bff;border-color:#b26bff;color:#17131f;font-weight:bold;}}
  nav a:hover{{border-color:#b26bff;}}
  footer{{color:#5b5372;font-size:12px;margin-top:24px;}}
</style>
</head>
<body>
<main>
  <h1>Дашборд игровых механик</h1>
  <p class="stats">{len(cards)} прошли фильтр · {n_playable} играбельны · сэмплер: word2vec «глагол × существительное» на достаточном расстоянии</p>
  {"".join(cards)}
  <footer>пайплайн: сэмплер → фильтр → Codex-референс → HTML-прототип; дашборд собирает scripts/build_dashboard.py</footer>
</main>
</body>
</html>
"""
    out = ROOT / "index.html"
    out.write_text(page, encoding="utf-8")
    print(f"дашборд собран: {out} (карточек: {len(cards)}, играбельных: {n_playable})")


if __name__ == "__main__":
    main()
