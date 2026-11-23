#!/usr/bin/env python3
"""Приёмка «Фитиля» v2 в настоящем Chrome: python3 browser_test.py [url] [папка для скриншотов]
Боты ходят через window.FUSE; ввод — настоящие тапы, свайпы и клавиши. GAMES — случайных партий на уровень (по умолчанию 60)."""
import json, os, sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8788/prototypes/fuse/index.html'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
GAMES = int(os.environ.get('GAMES', '60'))
fails, errs = [], []
def check(ok, what):
    print(('  ✓ ' if ok else '  ✗ ') + what)
    if not ok: fails.append(what)
def shot(pg, name):
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, name + '.png'))

PLAN_ALL = """(() => { const out = []; for (let n = 1; n <= FUSE.LEVELS.length; n++) { const lv = FUSE.LEVELS[n - 1]; FUSE.load(n); let r = null; for (const ch of lv.plan) r = FUSE.step(ch); const s = FUSE.state();
  out.push({ id: lv.id, won: s.won, t: s.t, par: lv.par, stars: r && r.stars }); } return out; })()"""
RANDOM = """(games) => { const out = []; let seed = 99; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let n = 1; n <= FUSE.LEVELS.length; n += 3) { let wins = 0, bad = 0; for (let g = 0; g < games; g++) { FUSE.load(n); for (let k = 0; k < 80; k++) { const ds = FUSE.legal(); if (!ds.length) break; const before = FUSE.state(), d = ds[Math.floor(rnd() * ds.length)], r = FUSE.step(d), s = FUSE.state();
        if (!s.won && (s.flame !== s.fuse[0] || s.player !== s.fuse[s.fuse.length - 1] || s.fuse.length > s.n + 1)) bad++;
        if (r.reason && !r.won) { if (s.t !== before.t || s.player !== before.player) bad++; break; }       // провал: игрок остаётся на ход раньше
        if (s.won) { wins++; break; } } }
    out.push({ id: FUSE.LEVELS[n - 1].id, rate: wins / games, bad }); } return out; }"""
LIGHT = """(() => { let bad = 0, n = 0; for (const lvl of [1, 13, 30, 41, 55, 70, 85, 97]) { FUSE.load(lvl); const plan = FUSE.LEVELS[lvl - 1].plan; for (let k = 0; k < plan.length - 1; k++) { FUSE.step(plan[k]); FUSE.settle(); const lit = FUSE.state().lit.flat(), scr = FUSE.light(); n++;
      for (let i = 0; i < lit.length; i++) if ((scr[i] > 0.5) !== !!lit[i]) { bad++; break; } } } return { bad, n }; })()"""
HINTS = """(() => { const out = []; let seed = 7; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let n = 2; n <= FUSE.LEVELS.length; n += 7) { FUSE.load(n); const steps = 2 + Math.floor(rnd() * 5); for (let k = 0; k < steps; k++) { const ds = FUSE.legal(); if (!ds.length) break; FUSE.step(ds[Math.floor(rnd() * ds.length)]); }
    let rewound = 0, guard = 0, ok = true; while (!FUSE.state().won && guard++ < 60) { const h = FUSE.hint(2); if (h.tier !== 2) { ok = false; break; } rewound += h.rewound; const r = FUSE.step(h.dir); if (!r.ok || (r.reason && !r.won)) { ok = false; break; } }
    const won = FUSE.state().won, idea = (FUSE.load(n), FUSE.hint(1)); out.push({ id: FUSE.LEVELS[n - 1].id, ok: ok && won, rewound, tier1: idea.tier }); } return out; })()"""

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg)
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(URL + '?lang=ru'); pg.wait_for_timeout(900)
    total = pg.evaluate('FUSE.LEVELS.length')
    print(f'ТЕЛЕФОН 390×780, уровней {total}, миров {pg.evaluate("FUSE.WORLDS.length")}')
    check(total == 100, 'уровней ровно 100')
    shot(pg, 'p01_first_open')
    # карточка мира на первом запуске закрывается тапом
    if pg.evaluate('!!FUSE.ui.card'):
        pg.touchscreen.tap(195, 400); pg.wait_for_timeout(300)
    check(pg.evaluate('!FUSE.ui.card'), 'карточка нового мира закрывается тапом')
    shot(pg, 'p02_level1')

    print('БОТ-ПЛАН на всех уровнях через window.FUSE')
    res = pg.evaluate(PLAN_ALL)
    lost = [r['id'] for r in res if not r['won'] or r['t'] != r['par']]
    check(not lost, f'бот-план побеждает за par на {len(res) - len(lost)} из {len(res)}' + (f' — не прошёл: {lost}' if lost else ''))
    check(all(r['stars'] == 3 for r in res), 'за проход в минимум ходов без подсказки — три звезды')

    print(f'СЛУЧАЙНЫЙ БОТ на каждом третьем уровне, {GAMES} партий')
    rnd = pg.evaluate(RANDOM, GAMES)
    check(all(r['rate'] < 0.5 for r in rnd), f'случайный бот < 50 % (максимум {max(r["rate"] for r in rnd) * 100:.0f} %)')
    check(sum(r['bad'] for r in rnd) == 0, 'инварианты: огонёк на хвосте шнура, после провала игрок на ход раньше')

    print('СВЕТ НА ЭКРАНЕ = СВЕТ В ЛОГИКЕ')
    lt = pg.evaluate(LIGHT); check(lt['bad'] == 0, f'карта света совпала с освещёнными клетками на {lt["n"]} ходах')

    print('ПОДСКАЗКА из случайных состояний')
    hs = pg.evaluate(HINTS)
    check(all(h['ok'] for h in hs), f'подсказка-шаг довела до победы на {sum(h["ok"] for h in hs)} из {len(hs)}; откатов из тупика {sum(h["rewound"] for h in hs)}')
    check(any(h['tier1'] == 1 for h in hs), f'подсказка-идея есть на {sum(h["tier1"] == 1 for h in hs)} из {len(hs)} проверенных уровней')

    print('ВВОД')
    pg.evaluate('FUSE.reset()'); pg.reload(); pg.wait_for_timeout(800)
    if pg.evaluate('!!FUSE.ui.card'): pg.touchscreen.tap(195, 400); pg.wait_for_timeout(250)
    plan = pg.evaluate('FUSE.LEVELS[0].plan')
    for ch in plan:                                              # уровень 1: тапы по соседней клетке
        c = pg.evaluate('(ch) => FUSE.core.cellInDir(FUSE.core.compile(FUSE.LEVELS[0]), FUSE.state().player, ch)', ch)
        x, y = pg.evaluate('(c) => FUSE.cellXY(c)', c); pg.touchscreen.tap(x, y); pg.wait_for_timeout(190)
    check(pg.evaluate('FUSE.state().won'), 'уровень 1 пройден тапами')
    pg.wait_for_timeout(1500); shot(pg, 'p03_win')
    check(pg.evaluate('!!FUSE.ui.win'), 'окно победы появилось')
    xy = pg.evaluate('FUSE.btnXY("wnext")') or [300, 700]; pg.touchscreen.tap(*xy); pg.wait_for_timeout(400)
    check(pg.evaluate('FUSE.state().level') == 2, 'кнопка «дальше» открыла уровень 2')
    dirs = {'U': (0, -90), 'D': (0, 90), 'L': (-90, 0), 'R': (90, 0)}
    for ch in pg.evaluate('FUSE.LEVELS[1].plan'):                  # уровень 2: свайпы
        dx, dy = dirs[ch]; x0, y0 = 195, 420
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
        for k in (1, 2, 3): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + dx * k / 3, 'y': y0 + dy * k / 3}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(190)
    check(pg.evaluate('FUSE.state().won'), 'уровень 2 пройден свайпами')
    pg.wait_for_timeout(900); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    keys = {'U': 'ArrowUp', 'D': 'ArrowDown', 'L': 'ArrowLeft', 'R': 'ArrowRight'}
    for ch in pg.evaluate('FUSE.LEVELS[2].plan'): pg.keyboard.press(keys[ch]); pg.wait_for_timeout(60)
    check(pg.evaluate('FUSE.state().level == 3 && FUSE.state().won'), 'уровень 3 пройден клавишами')
    # провал возвращает на ход назад; кнопки отмены и рестарта
    pg.evaluate('FUSE.load(1)'); bad = pg.evaluate("""(() => { const L = FUSE.core.compile(FUSE.LEVELS[0]); for (let k = 0; k < 40; k++) { const t = FUSE.state().t; for (const d of FUSE.legal()) { const S = FUSE.view.shown, c = FUSE.core.cellInDir(L, FUSE.state().player, d), R = FUSE.core.apply(L, S, c); if (R.over && !R.won) return { d, t }; } FUSE.step(FUSE.LEVELS[0].plan[t]); } return null; })()""")
    if bad:
        r = pg.evaluate('(d) => FUSE.step(d)', bad['d']); pg.wait_for_timeout(250); shot(pg, 'p04_fail'); pg.wait_for_timeout(800)
        check(r['reason'] in ('stuck', 'burned', 'seen') and pg.evaluate('FUSE.state().t') == bad['t'], f'провал «{r["reason"]}» вернул на ход назад')
    pg.evaluate('FUSE.load(1); FUSE.step(FUSE.LEVELS[0].plan[0]); FUSE.step(FUSE.LEVELS[0].plan[1])'); pg.wait_for_timeout(300)
    xy = pg.evaluate('FUSE.btnXY("undo")'); pg.touchscreen.tap(*xy); pg.wait_for_timeout(250); check(pg.evaluate('FUSE.state().t') == 1, 'кнопка «отмена»')
    xy = pg.evaluate('FUSE.btnXY("restart")'); pg.touchscreen.tap(*xy); pg.wait_for_timeout(250); check(pg.evaluate('FUSE.state().t') == 0, 'кнопка «заново»')
    xy = pg.evaluate('FUSE.btnXY("hint")'); pg.touchscreen.tap(*xy); pg.wait_for_timeout(300); pg.touchscreen.tap(*xy); pg.wait_for_timeout(400); shot(pg, 'p05_hint')
    check(pg.evaluate('!!FUSE.view.move || !!FUSE.view.idea'), 'кнопка «подсказка» показывает идею или шаг')
    # карта миров, закрытый уровень, сохранение
    xy = pg.evaluate('FUSE.btnXY("map")'); pg.touchscreen.tap(*xy); pg.wait_for_timeout(400); shot(pg, 'p06_map')
    check(pg.evaluate('FUSE.ui.screen') == 'map', 'кнопка уровней открывает карту мира')
    xy = pg.evaluate('FUSE.btnXY("lv11")') or [91, 520]; pg.touchscreen.tap(*xy); pg.wait_for_timeout(300); check(pg.evaluate('FUSE.ui.screen') == 'map', 'закрытый уровень не открывается')
    xy = pg.evaluate('FUSE.btnXY("lv4")') or [195, 310]; pg.touchscreen.tap(*xy); pg.wait_for_timeout(400); check(pg.evaluate('FUSE.ui.screen == "play" && FUSE.state().level == 5'), 'тап по открытому уровню на карте запускает его (пропуск разрешён)')
    pg.evaluate('FUSE.ui.screen = "map"; FUSE.ui.mapW = 3'); pg.wait_for_timeout(300); shot(pg, 'p07_map_locked')
    pg.reload(); pg.wait_for_timeout(700); done = pg.evaluate('Object.keys(JSON.parse(localStorage.getItem("fuse2")).done).length')
    check(done >= 3, f'прогресс сохранился после перезагрузки (пройдено {done})')
    pg.evaluate('FUSE.ui.card = null; FUSE.ui.screen = "stats"'); pg.wait_for_timeout(300); shot(pg, 'p08_stats')
    check(len(pg.evaluate('FUSE.stats()')) >= 3, 'журнал плейтеста заполняется')
    # скриншоты миров в середине решения
    for n in (9, 20, 30, 40, 52, 62, 76, 90, 100):
        pg.evaluate('(n) => { FUSE.ui.card = null; FUSE.load(n); const p = FUSE.LEVELS[n - 1].plan; for (let k = 0; k < Math.ceil(p.length * 0.6); k++) FUSE.step(p[k]); }', n); pg.wait_for_timeout(900); shot(pg, f'p10_level{n:03d}')
    pg.evaluate('(() => { FUSE.load(44); const p = FUSE.LEVELS[43].plan; let k = 0; FUSE.perf.frames = 0; FUSE.perf.gap = 0; FUSE.perf.slow = 0; const t = setInterval(() => { if (k < p.length - 1) FUSE.step(p[k++]); else clearInterval(t); }, 220); })()'); pg.wait_for_timeout(3200)
    pf = pg.evaluate('({ n: FUSE.perf.n, avg: FUSE.perf.sum / FUSE.perf.n, max: FUSE.perf.max, frames: FUSE.perf.frames, gap: FUSE.perf.gap / FUSE.perf.frames, slow: FUSE.perf.slow })')
    check(pf['avg'] < 8 and pf['slow'] / max(1, pf['frames']) < 0.05, f'три секунды игры с пожаром: кадров {pf["frames"]}, между кадрами в среднем {pf["gap"]:.1f} мс, дольше 25 мс — {pf["slow"]}; код отрисовки {pf["avg"]:.2f} мс на кадр (безголовый Chrome на Mac, не телефон)')
    ctx.close()
    # десктоп, английский
    ctx = b.new_context(viewport={'width': 1280, 'height': 800}); pg = ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(URL + '?lang=en&level=40'); pg.wait_for_timeout(900); shot(pg, 'd01_desktop_en')
    check(pg.evaluate('FUSE.state().level') == 40, 'десктоп 1280×800: ?level=40&lang=en открывает уровень')
    b.close()
check(not errs, f'ошибок в консоли: {len(errs)}' + (' — ' + '; '.join(errs[:4]) if errs else ''))
print('ПРИЁМКА В БРАУЗЕРЕ: ' + ('пройдена' if not fails else f'НЕ ПРОЙДЕНА ({len(fails)})'))
sys.exit(1 if fails else 0)
