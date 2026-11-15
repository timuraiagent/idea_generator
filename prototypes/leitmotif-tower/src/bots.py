# Боты «Башни»: логика по этажам, планировщик (порядок, момент, палка из руки), наугад, «зелёная стрелка», «всегда первая палка», темп.
# usage: python3 bots.py [номера через запятую|all|from:N] [runs=6] [meta=0|1]   (meta=1 — записать par и время в meta.json; мерить на сборке NOTIME=1)
import asyncio, json, sys, pathlib
from playwright.async_api import async_playwright
import os
HERE=pathlib.Path(__file__).parent
URL=os.environ.get('TOWER_URL','file://'+str(HERE.parent/'index.html'))
ONLY = sys.argv[1] if len(sys.argv)>1 else 'all'
RUNS = int(sys.argv[2]) if len(sys.argv)>2 else 6
WRITE_META = len(sys.argv)>3 and sys.argv[3]=='1'
JS = r'''
((ONLY,RUNS) => {
const DT=1/60, TAU=Math.PI*2; STK.quiet=true;
const levels = STK.LEVELS.map((_,i)=>i).filter(i=> ONLY==='all' || (ONLY.startsWith('from:')? i+1>=+ONLY.slice(5) : ONLY.split(',').includes(String(i+1))));
function seeded(seed){ let s=seed; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
function load(n,rnd){ const R=Math.random; Math.random=rnd; STK.loadLevel(n); Math.random=R; STK.mode='play'; return STK.G; }
function snap(){ const G=STK.G, lv=G.lv; G.lv=null; const fx=G.fx; G.fx=[]; const c=structuredClone(G); G.lv=lv; G.fx=fx; c.lv=lv; return c; }
function put(c){ const lv=c.lv; c.lv=null; const g=structuredClone(c); c.lv=lv; g.lv=lv; STK.G=g; STK.mode='play'; }
const ready=w=>STK.canJam(w)&&STK.fits(w);
function willEnd(w){ const tl=STK.tolOf(w); if(Math.abs(STK.holeErr(w)+TAU*w.rps*DT*w.spin)>tl) return true;
  if(w.dbl){ const sp=w.idrv>=0?STK.G.wheels[w.idrv].spin:w.spin; if(Math.abs(STK.holeErr2(w)+TAU*w.dbl*DT*sp)>tl) return true; } return false; }
function perms(a){ if(a.length<=1) return [a]; const o=[], seen=new Set(); a.forEach((x,i)=>{ if(seen.has(x)) return; seen.add(x); perms([...a.slice(0,i),...a.slice(i+1)]).forEach(p=>o.push([x,...p])); }); return o; }
function permsBy(a){ if(a.length<=1) return [a]; const o=[], seen=new Set(); a.forEach((x,i)=>{ const key=x.w+':'+x.t; if(seen.has(key)) return; seen.add(key); permsBy([...a.slice(0,i),...a.slice(i+1)]).forEach(p=>o.push([x,...p])); }); return o; }
function subsets(arr,k){ if(k===0) return [[]]; if(arr.length<k) return []; const [h,...r]=arr; return [...subsets(r,k-1).map(s=>[h,...s]), ...subsets(r,k)]; }
function onStates(lv,set){ const W=lv.wheels, jam=i=>set.includes(i);
  const stalled=i=>W.some((c,ci)=>c.mesh&&c.drv===i&&(jam(ci)||stalled(ci)));
  const on=[]; for(let i=0;i<W.length;i++) on[i]=!jam(i)&&!stalled(i)&&(W[i].drv===undefined||on[W[i].drv]); return on; }
function logic(lv){ const B=[STK.CONFIG.X0,...(lv.burrows||[]),(lv.width||STK.CONFIG.W)-84], W=lv.wheels;
  const jam=W.map((w,i)=>i).filter(i=>(W[i].holes===undefined?2:W[i].holes)>0), per=[];
  for(let s=0;s+1<B.length;s++){ const inSeg=x=>x!==undefined&&x>B[s]&&x<B[s+1];
    const ok=set=>{ const on=onStates(lv,set); return W.every((w,i)=>(!inSeg(w.ham)||!on[i])&&(!inSeg(w.gate)||on[i])); };
    let sols=[]; for(let k=0;k<=Math.min(4,jam.length)&&!sols.length;k++) sols=subsets(jam,k).filter(ok); per.push(sols); }
  let best=99; const rec=(s,u)=>{ if(s===per.length){ best=Math.min(best,u.size); return; } for(const c of per[s].slice(0,6)) rec(s+1,new Set([...u,...c])); }; rec(0,new Set());
  return {union:best}; }
// ---------- планировщик по участкам ----------
function execStep(st){ const G=STK.G; if(st.idx>=st.order.length) return;
  STK.setSel(st.pick[st.idx]||0);
  if(st.order[st.idx]===-1){ const b=G.wheels.find(w=>w.holes>0&&w.jam<=0&&w.on&&w.spin>0.5&&!STK.canJam(w)); if(b){ STK.tapWheel(b); st.idx++; st.was=false; } return; }
  const w=G.wheels[st.order[st.idx]], r=ready(w);
  if(r&&!st.was){ if(st.left[st.idx]>0) st.left[st.idx]--; else if(!st.late || willEnd(w)){ STK.tapWheel(w); st.idx++; st.was=false; return; } else return; }
  st.was=r; }
function simulate(base,order,skips,late,seg,pick){ put(base); const st={order,idx:0,left:skips.slice(),was:false,late,pick}; let t=0;
  STK.setSel(pick[0]||0); const G=STK.G, w0=G.wheels[order[0]]; if(!ready(w0)) return false; STK.tapWheel(w0); st.idx=1;
  while(t<16&&STK.mode==='play'&&!STK.G.done&&STK.G.mouse.seg<=seg){ execStep(st); STK.update(DT); t+=DT; }
  return (STK.G.done||STK.G.mouse.seg>seg)?t:null; }
const skipSets=k=>{ let o=[[]]; for(let i=1;i<k;i++){ const nx=[]; for(const s of o) for(const m of [0,1,2]) nx.push([...s,m]); o=nx.filter(v=>v.reduce((a,b)=>a+b,0)<=3); } return o.map(s=>[0,...s]); };
const pickSets=(k,on)=>{ if(!on) return [Array(k).fill(0)]; let o=[[]]; for(let i=0;i<k;i++){ const nx=[]; for(const s of o) for(const m of [0,1]) nx.push([...s,m]); o=nx; } return o.sort((a,b)=>a.reduce((x,y)=>x+y,0)-b.reduce((x,y)=>x+y,0)); };
function runPlan(n,seed,nopick){
  load(n,seeded(seed)); const lv=STK.G.lv, segs=lv.burrows?lv.solution:[lv.solution], mixed=new Set(lv.queue||[]).size>1&&!nopick;
  let t=0, cur=0, st=null, frame=0, idle=0, stuck=0, tFirst=null;
  while(STK.mode==='play'&&!STK.G.done&&t<300){
    const G=STK.G, m=G.mouse;
    if(cur<m.seg) cur=m.seg;
    if(!st){
      if(m.state==='wait'&&m.seg<cur&&STK.blockers(m.x).length){ stuck+=DT; if(stuck>1.5){ cur=m.seg; stuck=0; } } else stuck=0;
      if(cur<segs.length&&frame%4===0&&G.sticks>0){
        const items=segs[cur].map((w,j)=>({w,t:(lv.stype&&lv.stype[cur])?lv.stype[cur][j]:null})).filter((it,k,a)=>it.w===-1||G.wheels[it.w].jam<=0||a.findIndex(x=>x.w===it.w)!==k);
        const todo=items.map(x=>x.w);
        if(!todo.length) cur++;
        else { const firsts=[...new Set(todo)].filter(i=>i>=0&&STK.canJam(G.wheels[i]));
          if(firsts.length&&G.sticks>=todo.length){ const base=snap(); let found=null;
            const q0=G.queue.slice(), u0=G.used, lifeOf=tp=>tp==='N'?(lv.life||STK.CONFIG.STICK_LIFE):(tp==='L'?10:3);
            const narrowLeft=segs.slice(cur).flat().filter(i=>i>=0&&lv.wheels[i].narrow).length;
            const wantLong=w=>segs.slice(cur+1).some(a=>a.includes(w)), wantShort=w=>lv.wheels.some(c=>c.gate!==undefined&&c.drv===w);
            const picksFor=pi=>{ if(nopick) return [{pk:Array(pi.length).fill(0),c:0}]; let parts=[{pk:[],q:q0.slice(),u:u0,c:0}];
              for(const it of pi){ const w=it.w, d=it.t, nx=[]; for(const st of parts){ const hs=Math.min(2,st.q.length-st.u), h0=st.q[st.u], h1=hs>1?st.q[st.u+1]:null;
                  let opts=hs<2?[0]:(d?(h0===d?[0]:(h1===d?[1]:[0,1])):(h1!==h0?[0,1]:[0]));
                  for(const o of opts){ const q=st.q.slice(); if(o===1){ const x=q[st.u]; q[st.u]=q[st.u+1]; q[st.u+1]=x; } const tp=q[st.u]; let c=st.c;
                    if(!d&&w>=0){ c+=wantLong(w)?-lifeOf(tp):(wantShort(w)?lifeOf(tp):0.3*lifeOf(tp)); if(tp==='S'&&!lv.wheels[w].narrow&&q.slice(st.u+1).filter(x=>x==='S').length<narrowLeft) c+=100; }
                    nx.push({pk:[...st.pk,o],q,u:st.u+1,c}); } } parts=nx; }
              return parts; };
            search: for(const late of [false,true]) for(const pi of permsBy(items)){ const p=pi.map(x=>x.w); if(!firsts.includes(p[0])) continue; for(const sk of skipSets(p.length)){ let bk=1e9;
              for(const ps of picksFor(pi)){ const tt=simulate(base,p,sk,late,cur,ps.pk); if(tt===null) continue; const k=ps.c+tt*0.01; if(k<bk){ bk=k; found={order:p,skips:sk,late,pick:ps.pk}; } }
              if(found) break search; } }
            put(base);
            if(found){ STK.setSel(found.pick[0]||0); STK.tapWheel(STK.G.wheels[found.order[0]]); if(tFirst===null) tFirst=t; st={order:found.order,idx:1,left:found.skips.slice(),was:false,late:found.late,pick:found.pick}; } } }
      }
    }
    if(st){ execStep(st); if(st.idx>=st.order.length){ st=null; cur++; } }
    const G2=STK.G; if(G2.mouse.state==='wait'&&!G2.wheels.some(w=>w.jam>0)&&STK.blockers(G2.mouse.x).length) idle+=DT;
    STK.update(DT); t+=DT; frame++;
  }
  const G=STK.G; return {win:G.done, used:G.used, t, active:tFirst===null?0:t-tFirst, idle, reach:G.reach, timeout:!!G.timeout};
}
function runRandom(n,seed){ const rnd=seeded(seed); load(n,rnd); let t=0,next=rnd()*1.5;
  while(STK.mode==='play'&&!STK.G.done&&t<150){ const G=STK.G; if(t>=next){ next=t+0.4+rnd()*1.2; const c=G.wheels.filter(w=>w.holes>0&&w.jam<=0&&w.on); if(c.length){ STK.setSel(rnd()<0.5?0:1); STK.tapWheel(c[Math.floor(rnd()*c.length)]); } } STK.update(DT); t+=DT; }
  return STK.G.done; }
function runGreedy(n,seed){ const rnd=seeded(seed); load(n,rnd); let t=0;
  while(STK.mode==='play'&&!STK.G.done&&t<150){ const G=STK.G; if(G.mouse.state==='wait'){ const c=G.wheels.filter(w=>ready(w)); if(c.length) STK.tapWheel(c[0]); } STK.update(DT); t+=DT; }
  return STK.G.done; }
const out=[];
for(const n of levels){ const lv=STK.LEVELS[n], lg=logic(lv), r=[], mixed=new Set(lv.queue||[]).size>1;
  for(let k=1;k<=RUNS;k++) r.push(runPlan(n,k*7919+n*131,false));
  const w=r.filter(x=>x.win), T=w.reduce((a,x)=>a+x.t,0)||1;
  let np=null; if(mixed){ np=0; for(let k=1;k<=RUNS;k++) if(runPlan(n,k*7919+n*131,true).win) np++; }
  let rw=0; for(let k=1;k<=20;k++) if(runRandom(n,k*104729+n*17)) rw++;
  let gw=0; for(let k=1;k<=20;k++) if(runGreedy(n,k*15485863+n*31)) gw++;
  out.push({n:n+1,id:lv.id,name:lv.name.ru,long:!!lv.burrows,segs:(lv.burrows||[]).length+1,par:lv.par,sticks:lv.sticks,time:lv.time||null,union:lg.union,
    plan:`${w.length}/${RUNS}`, wins:w.length, used:r.map(x=>x.win?x.used:(x.timeout?'T':'x')+x.reach).join(' '), minUsed:w.length?Math.min(...w.map(x=>x.used)):null,
    t:w.length?+(T/w.length).toFixed(1):null, active:w.length?+(w.reduce((a,x)=>a+x.active,0)/w.length).toFixed(1):null, activeMax:w.length?+Math.max(...w.map(x=>x.active)).toFixed(1):null,
    tpm:w.length?+(w.reduce((a,x)=>a+x.used,0)/T*60).toFixed(1):null, idle:w.length?Math.round(w.reduce((a,x)=>a+x.idle,0)/T*100):null,
    nopick:np===null?null:np+'/'+RUNS, random:rw+'/20', greedy:gw+'/20', rnd:rw, grd:gw});
}
return out; })
'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True)
        pg = await b.new_page(viewport={'width':960,'height':640}, locale='ru-RU')
        await pg.add_init_script('window.requestAnimationFrame=()=>0;')
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(300)
        r = await pg.evaluate('('+JS+')('+json.dumps(ONLY)+','+str(RUNS)+')')
        RP = HERE/'results.json'
        prev = json.loads(RP.read_text()) if RP.exists() and ONLY!='all' else []
        byn = {o['n']:o for o in prev if 'wins' in o}; byn.update({o['n']:o for o in r}); RP.write_text(json.dumps([byn[k] for k in sorted(byn)], ensure_ascii=False, indent=0))
        if WRITE_META:
            mp = HERE/'meta.json'; meta = json.loads(mp.read_text()) if mp.exists() else {}
            for o in r:
                if o['minUsed'] is not None:
                    e = meta.get(o['name'], {}); e['par'] = o['minUsed']
                    if not o['time']: e['active'] = o['active']; e['activeMax'] = o['activeMax']      # время меряем только на сборке без таймера
                    meta[o['name']] = e
            mp.write_text(json.dumps(meta, ensure_ascii=False, indent=0))
        for o in r:
            flag = '' if (o['wins']>=0.8*RUNS and o['minUsed']==o['par'] and (not o['long'] or o['segs']<=4 or (o['rnd']<10 and o['grd']<10))) else '  <<< ПРОВЕРИТЬ'
            print(f"{o['n']:3d} {'ДЛ'+str(o['segs']) if o['long'] else 'кор'} «{o['name']}» par {o['par']} из {o['sticks']}{' ⏱'+str(o['time']) if o['time'] else ''} | план {o['plan']} [{o['used']}] мин {o['minUsed']} | {o['t']} с (актив {o['active']}, макс {o['activeMax']}), {o['tpm']}/мин, пусто {o['idle']}% | наугад {o['random']} стрелка {o['greedy']}{' перваяпалка '+o['nopick'] if o['nopick'] else ''}{flag}")
        print('errs',errs)
        await b.close()
asyncio.run(main())
