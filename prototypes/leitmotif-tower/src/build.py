# Сборка «Башни» (вертикальная версия «Палок в колёса»).
#   base.html   — движок (снимок prototypes/leitmotif-v3/index.html: норки, рука из двух палок, таймер, точное попадание)
#   chapters.py — главы и уровни (описываются узорами; логика уровня одномерная: путь мышонка, участок = этаж)
#   meta.json   — что намерили боты: par и время прохождения (пишет bots.py)
# Запуск:  python3 build.py            → ../index.html с таймерами
#          NOTIME=1 python3 build.py   → без таймеров (чтобы боты намерили время)
import json, pathlib, itertools, os, math
HERE = pathlib.Path(__file__).parent
SEG = 320; X0 = 64
bx = lambda k: X0 + SEG * k
SLOT = {'1': 115, '2': 215, 'm': 165, 'a': 85, 'b': 245}      # места молотов на этаже; a/b — широко (для циферблатов)
META = json.loads((HERE / 'meta.json').read_text()) if (HERE / 'meta.json').exists() else {}
_r = itertools.cycle([.22, .26, .2, .24, .28, .21, .25, .23, .27])
R = lambda: next(_r)


class M:
    """Уровень-башня из n этажей. Узоры добавляют колёса, решение по этажам (sol) и задуманный сорт палки (stp)."""
    def __init__(s, ru, en, tru, ten, n, sticks=None, par=None, life=None, queue=None, tf=None, dial=False, extra='', through=()):
        s.ru, s.en, s.tru, s.ten, s.n = ru, en, tru, ten, n
        s.sticks, s.par, s.life, s.queue, s.tf, s.dial, s.extra, s.through = sticks, par, life, queue, tf, dial, extra, set(through)   # through — этажи без лестницы-убежища наверх
        s.w = []; s.sol = [[] for _ in range(n)]; s.stp = [[] for _ in range(n)]; s.need = []; s.tmap = {}

    def add(s, d): s.w.append(d); return len(s.w) - 1
    def ham(s, k, slot, holes=2, rps=None, drv=None, **kw):
        x = bx(k) + SLOT[slot]; d = dict(x=x, y=345, r=40, holes=holes, rps=rps or R(), ham=x)
        if drv is not None: d['drv'] = drv
        d.update(kw); return s.add(d)
    def drv(s, x, holes=2, rps=None, **kw):
        d = dict(x=int(x), y=180, r=42, holes=holes, rps=rps or R()); d.update(kw); return s.add(d)
    def gate(s, k, slot, drv):
        x = bx(k) + SLOT[slot]; return s.add(dict(x=x, y=255, r=32, holes=0, rps=.2, drv=drv, gate=x))
    def put(s, k, i, t): s.sol[k].append(i); s.stp[k].append(t); s.tmap.setdefault(i, t)

    # ---- узоры ----
    def one(s, k, holes=2, slot='m', t='S', **kw):
        i = s.ham(k, slot, holes, **kw); s.put(k, i, t); s.need.append(t); return i
    def two(s, k, h1=2, h2=2, t=('S', 'S'), kw1=None, kw2=None, slots=('1', '2'), **kw):
        a = s.ham(k, slots[0], h1, **dict(kw, **(kw1 or {}))); b = s.ham(k, slots[1], h2, **dict(kw, **(kw2 or {})))
        s.put(k, a, t[0]); s.put(k, b, t[1]); s.need += list(t); return a, b
    def shared(s, k, n=2, slots=None, holes=2, t=None):            # один привод на n этажей подряд
        slots = slots or ['m'] * n; xs = [bx(k + j) + SLOT[slots[j]] for j in range(n)]; d = s.drv(sum(xs) / n, holes)
        tt = t or ('L' if n >= 3 else 'N')
        for j in range(n): s.ham(k + j, slots[j], 0, .2, d); s.put(k + j, d, tt)
        s.need.append(tt); return d
    def driven2(s, k, t='N'):                                       # привод крутит оба молота одного этажа
        d = s.drv(bx(k) + 165); s.ham(k, '1', 0, .2, d); s.ham(k, '2', 0, .2, d); s.put(k, d, t); s.need.append(t); return d
    def gate_ahead(s, k, gk, slot='m', t='S'):                      # привод молота на этаже k держит решётку на этаже gk
        d = s.drv(bx(k) + SLOT[slot]); s.ham(k, slot, 0, .2, d); s.gate(gk, '1', d); s.put(k, d, t); s.need.append(t); return d
    def gate_behind(s, gk, k, slot='m', t='S'):                     # привод держит решётку на этаже gk и крутит молот выше
        d = s.drv((bx(gk) + SLOT['1'] + bx(k) + SLOT[slot]) / 2); s.gate(gk, '1', d); s.ham(k, slot, 0, .2, d)
        s.put(k, d, t); s.need.append(t); return d
    def lock(s, k, slot, key, holes=2, t='S', **kw):                # молот под заслонкой: открыт, пока стоит колесо-ключ
        i = s.ham(k, slot, holes, lock=key, **kw)
        if key not in s.sol[k]: s.put(k, key, s.tmap.get(key, 'S'))
        s.put(k, i, t); s.need.append(t); return i
    def gears(s, k, gate_at=None, t='S'):                           # шестерни: заклинишь ведомую — встанет и ведущая
        a = s.ham(k, '1', 0, .2, r=47); b = s.ham(k, '2', 2, .235, drv=a, mesh=True, r=47)
        if gate_at is not None: s.gate(gate_at, '1', a)
        s.put(k, b, t); s.need.append(t); return a, b
    def double(s, k, slot='m', t='S', **kw):                        # двойное колесо: палка проходит, когда сошлись обе дырки
        i = s.ham(k, slot, 1, .25, dbl=.375, P=8, r=44, **kw); s.put(k, i, t); s.need.append(t); return i
    def syncpair(s, k, d=3.5, rps=1/7, t='S', real='S', who='a'):   # жертва: два молота идут врозь — одно колесо (who) придержать палкой t
        a = s.ham(k, 'a', 1, rps); b = s.ham(k, 'b', 1, rps, sync=[a, d]); x = a if who == 'a' else b
        s.put(k, x, t); s.put(k, a, real); s.put(k, b, real); s.need += [t, real, real]; return a, b
    def speedpair(s, k, c=3, t=('S', 'S')):                         # разные скорости: сходятся сами на одном обороте из нескольких
        a = s.ham(k, 'a', 1, 1/6); b = s.ham(k, 'b', 1, .25, sync=[a, c]); s.put(k, a, t[0]); s.put(k, b, t[1]); s.need += list(t); return a, b
    def composite(s, k, ioff=5, t='S', **kw):                       # составное колесо: диск крутит колесо из колонки
        x = s.drv(bx(k) + 165, 2, .125); w = s.ham(k, 'm', 1, .125, dbl=.125, idrv=x, ioff=ioff, r=44, **kw)
        s.put(k, x, t); s.put(k, w, 'S'); s.need += [t, 'S']; return x, w
    def autoq(s, spare=1, sp='S'):                                  # очередь: в каждой паре нужная палка — вторая в руке
        q = s.need[:]
        for i in range(0, len(q) - 1, 2):
            if q[i] != q[i + 1]: q[i], q[i + 1] = q[i + 1], q[i]
        s.queue = q + [sp] * spare; return s

    def js(s):
        def val(v): return ('%g' % v) if isinstance(v, float) else (json.dumps(v) if isinstance(v, (list, bool)) else str(v))
        def wj(d): return '{' + ','.join(f"{k}:{val(v)}" for k, v in d.items()) + '}'
        rows = [', '.join(wj(d) for d in s.w[i:i + 3]) for i in range(0, len(s.w), 3)]
        meta = META.get(s.ru, {}); par = s.par if s.par is not None else meta.get('par', 0)
        sticks = len(s.queue) if s.queue else s.sticks
        head = f"  {{ name:{{ru:'{s.ru}', en:'{s.en}'}}, sticks:{sticks}, par:{par},"
        if s.queue: head += f" queue:{json.dumps(s.queue)},"
        if s.life: head += f" life:{s.life},"
        if s.dial: head += " dial:true,"
        if s.extra: head += ' ' + s.extra
        if s.tf and meta.get('active') and not os.environ.get('NOTIME'):
            head += f" time:{math.ceil(max(meta['active'] * s.tf + 2, meta['activeMax'] * 1.2 + 2))},"
        ok = all(len(a) == len(b) for a, b in zip(s.sol, s.stp)) and any(s.stp)
        geo = f" width:{bx(s.n) + 84}," + (f" burrows:{json.dumps([bx(k) for k in range(1, s.n) if (k - 1) not in s.through])}," if s.n > 1 else '')
        if s.through and ok:                                        # этажи без лестницы сливаются в один участок
            ms, mt = [[]], [[]]
            for k in range(s.n):
                for w_, t_ in zip(s.sol[k], s.stp[k]):
                    if not (ms[-1] and (w_, t_) in list(zip(ms[-1], mt[-1])) and s.w[w_].get('ham') is None): ms[-1].append(w_); mt[-1].append(t_)
                if k not in s.through and k < s.n - 1: ms.append([]); mt.append([])
            s_sol, s_stp = ms, mt
        else: s_sol, s_stp = s.sol, s.stp
        sol = s_sol if s.n > 1 else s.sol[0]; stp = s_stp if s.n > 1 else s.stp[0]
        head += geo + f" solution:{json.dumps(sol)}," + (f" stype:{json.dumps(stp if s.n > 1 else [stp])}," if ok else '') + "\n"
        return head + f"    tip:{{ru:'{s.tru}',\n         en:'{s.ten}'}},\n    wheels:[ " + ',\n             '.join(rows) + " ] },"


class Raw:
    def __init__(s, ru, js): s.ru = ru; s._js = js
    def js(s): return s._js


CH = []
def chapter(ru, en, c, items): CH.append((ru, en, c, items))
exec((HERE / 'chapters.py').read_text())

# ================= 1. уровни → движок =================
s = (HERE / 'base.html').read_text()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, ('COUNT', s.count(old), old[:90]); s = s.replace(old, new)

out = []; order = []; nid = 51
for ru, en, c, items in CH:
    for it in items:
        if isinstance(it, int): order.append(it)
        else: out.append(it.js()); order.append(nid); nid += 1
a = s.index("  // ================= v3: длинные машины"); b = s.index("\n];", a)
s = s[:a] + "  // ================= башня: уровни собраны build.py из chapters.py =================\n" + '\n'.join(out) + s[b:]
a = s.index("const ORDER = ["); b = s.index("];", a) + 2
s = s[:a] + "const ORDER = [ " + ',\n                '.join(', '.join(f'{x:3d}' for x in order[i:i + 5]) for i in range(0, len(order), 5)) + " ];" + s[b:]
a = s.index("const WORLDS = ["); b = s.index("];", a) + 2
s = s[:a] + "const WORLDS = [ " + ',\n                 '.join(f"{{ru:'{ru}',en:'{en}',c:'{c}'}}" for ru, en, c, _ in CH) + " ];" + s[b:]

# ================= 2. правки движка под башню =================
rep("<title>Длинные машины — держит ли машина из нескольких участков интерес лучше одиночного уровня?</title>",
    "<title>Башня — держит ли вертикальная башня с растущей сложностью и таймером интерес на телефоне?</title>")
rep("  @media (orientation:portrait) and (pointer:coarse){ #rot{display:flex;} }", "")
rep("c.x<w.x&&w.x-c.x<135);", "c.x<w.x&&w.x-c.x<(dial?215:135));")      # у пары циферблатов мотор правого колеса — справа, не на числах соседа
rep("const tolOf = w => G.lv.dial ? (w.dbl?0.3:0.24) : (w.dbl?CONFIG.TOL2:CONFIG.TOL);", "const tolOf = w => (G.lv.dial&&w.holes===1&&w.rps<=0.17) ? (w.dbl?0.3:0.24) : (w.dbl?CONFIG.TOL2:CONFIG.TOL);")
rep("const portraitPause = () => isTouch && vp().h>vp().w;", "const portraitPause = () => false;")
s = s.replace("'sticks3.", "'tower.")
rep("width:lv.width||CONFIG.W, cheese:(lv.width||CONFIG.W)-62, cam:0,", "width:lv.width||960, cheese:(lv.width||960)-62, cam:0, camY:0, nfl:1, chain:0,")
rep("  }\n}\n// участок мышонка: от его норки до следующей", "  }\n  towerLayout();\n}\n// участок мышонка: от его норки до следующей")
rep("  G.cam+=(clamp(m.x-250,0,G.width-CONFIG.W)-G.cam)*Math.min(1,dt*3.5);",
    "  G.camY+=(tpos(m.x).y-G.camY)*Math.min(1,dt*4);\n  if(!PAN&&G.panY>0&&(m.state==='run'||now-G.panT>3)) G.panY=Math.max(0,G.panY-dt*1100);")
rep("  const w=wheelAt({x:p.x+G.cam,y:p.y}, touchy?22:8);\n  if(w) tapWheel(w);",
    "  if(p.y<T.TOP||p.y>T.BOT) return;\n  const w=wheelAt({x:p.x,y:p.y-T.ANCH+G.camY-G.panY}, touchy?18:8);\n  if(w) tapWheel(w); else PAN={id:e.pointerId,y:p.y,base:G.panY};")
rep("x:w.ham+(Math.random()-0.5)*50, y:CONFIG.FLOOR-4,", "x:tpos(w.ham).x+(Math.random()-0.5)*50, y:tpos(w.ham).y-4,")
rep("G.fx.push({type:'ring', x:goal, y:CONFIG.FLOOR-16,", "G.fx.push({type:'ring', x:tpos(goal-1).x, y:tpos(goal-1).y-16,")
rep("G.fx.push({type:'conf', x:G.cheese, y:CONFIG.FLOOR-30,", "G.fx.push({type:'conf', x:tpos(G.cheese).x, y:tpos(G.cheese).y-30,")
# лестница без остановки: следующий этаж уже тих — кот дремлет лишнюю секунду
rep("m.seg++; G.reach=m.seg; m.state='wait'; m.clearT=0; SFX.hole();",
    "m.seg++; m.climbAt=G.time; G.reach=m.seg; m.state='wait'; m.clearT=0; SFX.hole();\n"
    "            if(!blockers(m.x).length){ G.chain++; if(G.clock) G.timeLeft+=1; const q=tpos(m.x); G.fx.push({type:'txt', x:clamp(q.x,90,300), y:q.y-64, s:t(G.clock?'chain':'chain0'), color:'#ffd166', size:17, life:1.3, max:1.3}); }")
rep("    reach:G.reach+'/'+G.burrows.length,", "    reach:G.reach+'/'+G.burrows.length, chain:G.chain,")
rep("function startGame(){ RESULTS=[]; goLevel(0); }", "function startGame(){ RESULTS=[]; let n=LEVELS.findIndex((_,i)=>!bestOf(i)); goLevel(n<0?0:n); }   // продолжить с первого непройденного")
rep("function nextLevel(){ if(G.n+1<LEVELS.length) goLevel(G.n+1); else mode='final'; }", "function nextLevel(){ if(G.n+1<LEVELS.length) goLevel(G.n+1); else mode='final'; }\nfunction prevChapterStart(){ goLevel(Math.floor(G.n/5)*5); }")
rep("  }\n  towerLayout();\n}", "  }\n  poolLoad(); towerLayout();\n}")                       # запас палок на главу
rep("  logAttempt('победа');", "  poolSave(); logAttempt('победа');")
a = s.index("  for(const w of G.wheels){\n    const sh=G.fx.find(e=>e.type==='shake'&&e.w===w.i);"); b = s.index("  // первые уровни: прямо пишем, когда тыкать", a); WHEELS = s[a:b]
a = s.index("  for(const e of G.fx){\n    const a=clamp(e.life/e.max,0,1);"); b = s.index("  ctx.restore();\n  if(G.toast){", a); FX = s[a:b]

LAYER = (HERE / 'tower_layer.js').read_text().replace('@@WHEELS@@', WHEELS.rstrip('\n')).replace('@@FX@@', FX.rstrip('\n'))
a = s.rindex("// для автотестов в headless-браузере")
s = s[:a] + LAYER + "\n" + s[a:]
(HERE.parent / 'index.html').write_text(s)
print('башня собрана: глав', len(CH), 'уровней', len(order), '(новых', len(out), ')', 'таймеры:', 'нет' if os.environ.get('NOTIME') else s.count(' time:'))
