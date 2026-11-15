# Глава «Запас»: проход пяти башен подряд с переносом запаса палок.
#   план     — бот-планировщик (берёт задуманную палку): должен дойти до вершины
#   первая   — тот же бот, но всегда берёт первую палку из руки (транжира): до вершины дойти не должен
import asyncio, json, re, pathlib
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent
JS = re.search(r"JS = r'''(.*?)'''", (HERE / 'bots.py').read_text(), re.S).group(1)
head = JS[:JS.index("const out=[];")]
CHAIN = head + r'''
const res={};
for(const mode of ['план','первая']){
  Object.keys(POOLQ).forEach(k=>delete POOLQ[k]);
  const first=STK.LEVELS.findIndex(l=>l.pool), log=[]; let ok=true;
  for(let n=first;n<first+5;n++){
    const r=runPlan(n,7919+n*131,mode==='первая'), G=STK.G;
    log.push(`${n+1}: ${r.win?'прошёл':'НЕ прошёл'} — было ${G.queue.length}, потратил ${r.used}, осталось ${G.queue.length-G.used}`);
    if(!r.win){ ok=false; break; }
    const nx=STK.LEVELS[n+1]; if(nx&&nx.pool) POOLQ[nx.id]=G.queue.slice(G.used);
  }
  res[mode]={ok,log};
}
return res; })
'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True); pg = await b.new_page()
        await pg.add_init_script('window.requestAnimationFrame=()=>0;'); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(HERE.parent / 'index.html')); await pg.wait_for_timeout(300)
        r = await pg.evaluate('(' + CHAIN + ')("all",1)')
        for mode, v in r.items():
            print(mode, '→', 'дошёл до вершины' if v['ok'] else 'не дошёл'); [print('   ', x) for x in v['log']]
        print('errs', errs); await b.close()
asyncio.run(main())
