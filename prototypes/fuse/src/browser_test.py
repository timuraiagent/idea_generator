"""Приёмка «Фитиля» в настоящем браузере через window.FUSE (страница должна раздаваться сервером из корня репо):
   python3 browser_test.py [http://localhost:8788/prototypes/fuse/index.html] [папка для скриншотов]
Проверяет: бот-план 10/10 и ходов = par; рандом-бот 2000 партий на уровень < 50 % + инварианты по state()/preview();
настоящие тапы, свайпы и клавиши; вспышку провала с возвратом на ход назад; делает скриншоты."""
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8788/prototypes/fuse/index.html'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
BOTS = r"""
() => { const F = window.FUSE, out = []; let seed = 12345; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  for (let n = 1; n <= F.LEVELS.length; n++) { const lv = F.LEVELS[n - 1]; let planWins = 0, planMoves = 0;
    for (let k = 0; k < 10; k++) { F.load(n); for (const ch of lv.plan) F.step(ch); const s = F.state(); if (s.won) planWins++; planMoves = s.t; }
    let wins = 0, bad = []; const games = GAMES;
    for (let g = 0; g < games; g++) { F.load(n); const path = [F.state().player]; let floors = 1e9, lampsLit = 0;
      for (;;) { const s0 = F.state(); if (s0.over) break; const lg = F.legal(); if (!lg.length) { bad.push('нет ходов, но партия не окончена'); break; }
        const pv = F.preview(), dir = lg[Math.floor(rnd() * lg.length)], r = F.step(dir); if (!r.ok) { bad.push('legal() дал недопустимый ход'); break; }
        const s = F.state(); path.push(s.player); if (s.won) break;
        const want = path[Math.max(0, s.t - s.n)]; if (s.flame.x !== want.x || s.flame.y !== want.y) bad.push('огонёк не на path[t-N]');
        const fl = s.cells.join('').split('').filter(c => c === '.' || c === 'o' || c === '*').length; if (fl > floors) bad.push('пол вырос'); floors = fl;
        const ll = s.lamps.filter(l => l.lit).length; if (ll < lampsLit) bad.push('лампа погасла'); lampsLit = ll;
        const ch = s.cells[s.player.y][s.player.x]; if (ch === '_') bad.push('игрок на провале'); if (ch === '*' && s.reason !== 'burned') bad.push('игрок в огне без провала');
        if (s.fuse.some(c => c.x === s.player.x && c.y === s.player.y)) bad.push('игрок на шнуре');
        for (const gd of s.guards) if (gd.alive && gd.awake !== !!s.lit[gd.y][gd.x]) bad.push('страж: сон не совпал со светом');
        if (pv.flame.x !== s.flame.x || pv.flame.y !== s.flame.y || JSON.stringify(pv.lit) !== JSON.stringify(s.lit)) bad.push('preview не совпал');
        const seenNow = pv.seen.some(c => c.x === s.player.x && c.y === s.player.y), burnNow = pv.burned.some(c => c.x === s.player.x && c.y === s.player.y);
        if ((s.reason === 'seen') !== (seenNow && !burnNow) && s.reason !== 'burned') bad.push('preview.seen не совпал с провалом'); if ((s.reason === 'burned') !== burnNow) bad.push('preview.burned не совпал с провалом'); }
      if (F.state().won) wins++; }
    out.push({ n, name: lv.name.ru, par: lv.par, planWins, planMoves, random: wins / games, bad: [...new Set(bad)] }); }
  return out; }
"""
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, device_scale_factor=3, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); errors = []
    pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('response', lambda r: errors.append(f'{r.status} {r.url}') if r.status >= 400 and not r.url.endswith('favicon.ico') else None)
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.goto(URL + '?level=1&lang=ru'); pg.wait_for_function('window.FUSE && window.FUSE.state()')
    print('заголовок страницы:', pg.title())
    import os
    res = pg.evaluate(BOTS.replace('GAMES', os.environ.get('GAMES', '2000'))); fails = 0
    for r in res:
        ok = r['planWins'] == 10 and r['planMoves'] == r['par'] and r['random'] < 0.5 and not r['bad']; fails += 0 if ok else 1
        print(f"L{r['n']} «{r['name']}»: бот-план {r['planWins']}/10, ходов {r['planMoves']}/{r['par']}; рандом {r['random']*100:.1f}%; инварианты: {'ок' if not r['bad'] else r['bad']} {'✓' if ok else '✗'}")
    # --- настоящие тапы: первый уровень по плану ---
    def cell_xy(x, y):
        return pg.evaluate("([x,y]) => { const F = window.FUSE, cv = document.getElementById('c'), r = cv.getBoundingClientRect(), s = r.width / F.CONFIG.W; const st = F.state(), W = st.cells[0].length, H = st.cells.length;"
                           " const top = F.CONFIG.header + 44, bot = F.CONFIG.H - F.CONFIG.panel - 56, cs = Math.max(24, Math.min(F.CONFIG.cellMax, Math.floor((F.CONFIG.W - 24) / W), Math.floor((bot - top) / H)));"
                           " const ox = Math.round((F.CONFIG.W - W * cs) / 2), oy = Math.round(top + (bot - top - H * cs) / 2); return [r.left + (ox + (x + .5) * cs) * s, r.top + (oy + (y + .5) * cs) * s]; }", [x, y])
    D = {'U': (0, -1), 'D': (0, 1), 'L': (-1, 0), 'R': (1, 0)}
    def tap_dir(ch):
        st = pg.evaluate('window.FUSE.state()'); x, y = cell_xy(st['player']['x'] + D[ch][0], st['player']['y'] + D[ch][1]); pg.touchscreen.tap(x, y); pg.wait_for_timeout(170)
    pg.evaluate('window.FUSE.load(1)'); pg.wait_for_timeout(300)
    if SHOTS: pg.screenshot(path=f'{SHOTS}/fuse_L1_start.png')
    for ch in pg.evaluate('window.FUSE.LEVELS[0].plan'): tap_dir(ch)
    st = pg.evaluate('window.FUSE.state()'); print('тапы по плану L1:', 'победа ✓' if st['won'] else f'✗ {st}'); fails += 0 if st['won'] else 1
    pg.wait_for_timeout(700)
    if SHOTS: pg.screenshot(path=f'{SHOTS}/fuse_L1_won.png')
    # кнопка «дальше» → уровень 2
    box = pg.evaluate("() => { const cv = document.getElementById('c'), r = cv.getBoundingClientRect(), s = r.width / 390, bot = 700 - 72 - 56; return [r.left + (246 + 61) * s, r.top + (bot + 2 + 66 + 20) * s]; }")
    pg.touchscreen.tap(box[0], box[1]); pg.wait_for_timeout(200); lvl = pg.evaluate('window.FUSE.state().level'); print('кнопка «дальше»:', 'уровень 2 ✓' if lvl == 2 else f'✗ уровень {lvl}'); fails += 0 if lvl == 2 else 1
    # клавиши: уровень 2 по плану
    keys = {'U': 'ArrowUp', 'D': 'ArrowDown', 'L': 'ArrowLeft', 'R': 'ArrowRight'}
    for ch in pg.evaluate('window.FUSE.LEVELS[1].plan'): pg.keyboard.press(keys[ch]); pg.wait_for_timeout(40)
    st = pg.evaluate('window.FUSE.state()'); print('клавиши по плану L2:', 'победа ✓' if st['won'] else '✗'); fails += 0 if st['won'] else 1
    # свайпы (CDP): уровень 3 по плану
    pg.evaluate('window.FUSE.load(3)'); pg.wait_for_timeout(200); cdp = ctx.new_cdp_session(pg)
    def swipe(ch):
        x0, y0 = 195, 420; dx, dy = D[ch][0] * 70, D[ch][1] * 70
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + dx, 'y': y0 + dy}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(170)
    for ch in pg.evaluate('window.FUSE.LEVELS[2].plan'): swipe(ch)
    st = pg.evaluate('window.FUSE.state()'); print('свайпы по плану L3:', 'победа ✓' if st['won'] else f"✗ t={st['t']}"); fails += 0 if st['won'] else 1
    # провал: короткий путь на L3 → тупик → вспышка → возврат на ход назад; затем отмена и заново кнопками
    pg.evaluate('window.FUSE.load(3)'); pg.wait_for_timeout(150)
    for ch in 'RRDR': tap_dir(ch)
    st = pg.evaluate('window.FUSE.state()')
    print('L3, короткий путь RRDR: дверь', 'закрыта ✓' if not st['doorOpen'] else 'открыта ✗', '| ходы дальше:', pg.evaluate('window.FUSE.legal()'))
    # доходим до тупика случайными допустимыми ходами
    for _ in range(12):
        lg = pg.evaluate('window.FUSE.legal()'); s = pg.evaluate('window.FUSE.state()')
        if s['over'] or not lg: break
        t0 = s['t']; tap_dir(lg[0]); s2 = pg.evaluate('window.FUSE.state()')
        if s2['over']:
            if SHOTS: pg.screenshot(path=f'{SHOTS}/fuse_fail_flash.png')
            pg.wait_for_timeout(750); s3 = pg.evaluate('window.FUSE.state()'); good = (not s3['over']) and s3['t'] == t0
            print(f"провал «{s2['reason']}» на ходу {s2['t']} → через 0,75 с партия на ходу {s3['t']}:", 'возврат на ход назад ✓' if good else '✗'); fails += 0 if good else 1
            if SHOTS: pg.screenshot(path=f'{SHOTS}/fuse_fail_after.png')
            break
    def panel(i):
        return pg.evaluate("(i) => { const cv = document.getElementById('c'), r = cv.getBoundingClientRect(), s = r.width / 390, w = 112, g = 9, x0 = (390 - 3 * w - 2 * g) / 2; return [r.left + (x0 + i * (w + g) + w / 2) * s, r.top + (700 - 72 + 35) * s]; }", i)
    t1 = pg.evaluate('window.FUSE.state().t'); x, y = panel(0); pg.touchscreen.tap(x, y); pg.wait_for_timeout(120); t2 = pg.evaluate('window.FUSE.state().t')
    print('кнопка «отмена»:', f'{t1} → {t2}', '✓' if t2 == t1 - 1 else '✗'); fails += 0 if t2 == t1 - 1 else 1
    x, y = panel(1); pg.touchscreen.tap(x, y); pg.wait_for_timeout(120); t3 = pg.evaluate('window.FUSE.state().t'); print('кнопка «заново»:', '✓' if t3 == 0 else '✗'); fails += 0 if t3 == 0 else 1
    x, y = panel(2); pg.touchscreen.tap(x, y); pg.wait_for_timeout(250)
    if SHOTS: pg.screenshot(path=f'{SHOTS}/fuse_levels.png')
    # тап по плитке уровня 8 в списке
    tile = pg.evaluate("() => { const cv = document.getElementById('c'), r = cv.getBoundingClientRect(), s = r.width / 390, w = 108, h = 82, g = 10, x0 = (390 - 3 * w - 2 * g) / 2, i = 7; return [r.left + (x0 + (i % 3) * (w + g) + w / 2) * s, r.top + (80 + Math.floor(i / 3) * (h + g) + h / 2) * s]; }")
    pg.touchscreen.tap(tile[0], tile[1]); pg.wait_for_timeout(200); lvl = pg.evaluate('window.FUSE.state().level'); print('выбор уровня тапом:', 'уровень 8 ✓' if lvl == 8 else f'✗ {lvl}'); fails += 0 if lvl == 8 else 1
    if SHOTS:
        def shot(n, moves, name):
            pg.evaluate(f'window.FUSE.load({n})'); pg.wait_for_timeout(120)
            for ch in moves: pg.keyboard.press(keys[ch]); pg.wait_for_timeout(150)
            pg.wait_for_timeout(250); pg.screenshot(path=f'{SHOTS}/{name}.png')
        plans = pg.evaluate('window.FUSE.LEVELS.map(l => l.plan)')
        shot(3, plans[2][:5], 'fuse_L3_mid'); shot(8, plans[7][:6], 'fuse_L8_fire'); shot(10, plans[9][:6], 'fuse_L10_guard'); shot(12, plans[11][:7], 'fuse_L12_bonfire'); shot(14, plans[13][:10], 'fuse_L14_mid'); shot(11, '', 'fuse_L11_start'); shot(5, '', 'fuse_L5_start')
    print('ошибки консоли:', errors if errors else 'нет'); fails += len(errors)
    print('ИТОГ:', 'всё прошло' if not fails else f'провалов: {fails}'); b.close(); sys.exit(1 if fails else 0)
