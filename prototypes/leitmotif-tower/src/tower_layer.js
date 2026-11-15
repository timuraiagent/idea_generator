
/* ================= БАШНЯ: вертикальная раскладка. Логика та же — одномерный путь мышонка; участок = этаж.
   Мышонок поднимается зигзагом, молоты падают сверху, приводы стоят в правой колонке. Всё, что нужно для текущего
   этажа, должно быть на экране; башню можно потянуть пальцем, чтобы осмотреть этажи выше. ================= */
var T={ FH:258, L:42, COLX:462, ANCH:704, TOP:142, BOT:846, SEG:320 };   // var: fit() вызывается ещё до этого места
var PAN=null;                                                               // палец тянет башню
var LS={y:0,drag:null,tiles:[]};                                            // прокрутка экрана уровней
var POOLQ=lsGet('tower.pool',{});                                           // запас палок на главу: что осталось к началу каждой башни
function poolLoad(){ const lv=G.lv; if(!lv.pool) return; const q=(G.n%5&&POOLQ[lv.id])?POOLQ[lv.id]:lv.queue; G.queue=q.slice(); G.sticks=G.queue.length; }
function poolSave(){ const lv=G.lv, nx=LEVELS[G.n+1]; if(!lv.pool||!nx||!nx.pool) return; const rest=G.queue.slice(G.used);
  if(!POOLQ[nx.id]||rest.length>=POOLQ[nx.id].length){ POOLQ[nx.id]=rest; if(!QUIET) lsSet('tower.pool',POOLQ); } }
CONFIG.W=540; CONFIG.H=960; window.TOWER=T;
Object.assign(S.ru,{ poolLbl:'Запас главы', poolFail:'Запас главы кончился: сэкономь палки на прошлых башнях.', poolBack:'К началу главы', chain:'Без остановки! +1 с', chain0:'Без остановки!', towerDone:'Башня пройдена!', toLevels:'К уровням', lookUp:'потяни башню — осмотрись',
  sub1:'Мышонок лезет за сыром на самый верх башни.', sub2:'Вставь палку в колесо — молот замрёт. Этаж затих — мышонок бежит дальше.',
  helpT:['Ткни в колесо, когда дырка под зелёной стрелкой: палка заклинит его, и молот замрёт. Мимо дырки — палка ломается.',
         'Мышонок пробегает этаж, только когда на нём стоят все молоты, и лезет по лестнице выше. На лестнице он в безопасности.',
         'Палки общие на всю башню. Палка держит несколько секунд (цифра над ней) и ломается: не клинь верхние этажи заранее.',
         'В руке две палки. Тапни по ним, чтобы выбрать другую: тонкая держит 3 секунды, толстая — 10.',
         'Точное попадание — дырка ровно под стрелкой: молоты молчат ещё секунду после того, как палка сломалась.',
         'Ремень: остановишь привод справа — встанут все молоты, которые он крутит. Серое колесо без дырок заклинить нельзя.',
         'Решётка открыта, пока её колесо крутится. Остановил привод решётки — жди, пока палка сломается.',
         'Узкая синяя дырка: лезет только тонкая палка. Заслонка: колесо открыто, только пока стоит колесо-ключ (к нему идёт цепь).',
         'Кот: первая палка его будит, идёт отсчёт. Прошёл лестницу без остановки — плюс секунда.',
         'Потяни башню пальцем вверх, чтобы осмотреть этажи выше. Провалился — тапни, и попытка начнётся заново.'] });
Object.assign(S.en,{ poolLbl:'Chapter supply', poolFail:'The chapter supply ran out: save sticks on the earlier towers.', poolBack:'Chapter start', chain:'Non-stop! +1 s', chain0:'Non-stop!', towerDone:'Tower complete!', toLevels:'Levels', lookUp:'drag the tower to look around',
  sub1:'The mouse climbs for the cheese at the very top of the tower.', sub2:'Jam a stick into a wheel — the hammer freezes. A quiet floor lets the mouse run on.',
  helpT:['Tap a wheel when a hole is under the green arrow: the stick jams it and the hammer freezes. Miss the hole and the stick breaks.',
         'The mouse crosses a floor only when all its hammers stand still, then climbs the ladder. On a ladder it is safe.',
         'Sticks are shared by the whole tower. A stick holds a few seconds (the number above it) and snaps: do not jam upper floors too early.',
         'You hold two sticks. Tap them to pick the other one: a thin stick holds 3 seconds, a thick one 10.',
         'A perfect hit — the hole exactly under the arrow: the hammers stay quiet one more second after the stick snaps.',
         'Belt: stop the drive on the right and every hammer it turns stops. A grey wheel without holes cannot be jammed.',
         'A gate stays open while its wheel spins. If you stopped the gate drive, wait until the stick snaps.',
         'Narrow blue hole: only a thin stick fits. Shutter: the wheel is open only while its key wheel stands still (a chain leads to it).',
         'The cat: the first stick wakes it and the countdown starts. Take a ladder without stopping — plus one second.',
         'Drag the tower up with a finger to look at the floors above. Failed? Tap and the attempt restarts.'] });
cv.addEventListener('pointermove',e=>{ const q=toWorld(e);
  if(PAN&&G&&e.pointerId===PAN.id){ G.panY=clamp(PAN.base+(q.y-PAN.y),0,Math.max(0,(G.nfl-1)*T.FH)); G.panT=now; }
  if(LS.drag&&e.pointerId===LS.drag.id){ const dy=q.y-LS.drag.y; if(Math.abs(dy)>8) LS.drag.moved=true; LS.y=LS.drag.base-dy; } });
cv.addEventListener('pointerdown',e=>{ if(mode==='levels'){ const q=toWorld(e); LS.drag={id:e.pointerId,y:q.y,base:LS.y,moved:false,x0:q.x,y0:q.y}; } });
addEventListener('pointerup',()=>{ PAN=null;
  if(LS.drag){ const d=LS.drag; LS.drag=null; if(!d.moved&&mode==='levels'&&d.y0>88){ const tl=LS.tiles.find(q=>d.x0>=q.x&&d.x0<=q.x+q.w&&d.y0>=q.y&&d.y0<=q.y+q.h); if(tl) goLevel(tl.i); } } });
addEventListener('pointercancel',()=>{ PAN=null; LS.drag=null; });

function tpos(s){ const FL=G.flen||T.SEG, k=clamp(Math.floor((s-CONFIG.X0)/FL),0,G.nfl-1), u=(s-CONFIG.X0-FL*k)*T.SEG/FL, odd=k%2===1; return {k, x:T.L+(odd?T.SEG-u:u), y:-k*T.FH, dir:odd?-1:1}; }
function towerLayout(){
  const path=G.cheese-22-CONFIG.X0, whole=Math.abs(path/T.SEG-Math.round(path/T.SEG))<0.01;
  if(G.lv.burrows||whole){ G.flen=T.SEG; G.nfl=Math.max(1,Math.round(path/T.SEG)); } else { G.flen=path; G.nfl=1; }   // короткий старый уровень — сжат в один этаж
  G.camY=0; G.panY=0;
  const col=[];
  for(const w of G.wheels){ const sx=w.ham!==undefined?w.ham:w.gate;
    if(sx!==undefined){ const p=tpos(sx); w.r=Math.min(w.r,w.mesh||w.gear?47:(w.dbl?44:36)); w.x=p.x; w.y=p.y-172; } else col.push(w); }
  for(const w of col){ const kids=G.wheels.filter(c=>(c.drv===w.i||c.idrv===w.i||c.lock===w.i)&&!col.includes(c));
    w.r=Math.min(w.r,38); w.x=T.COLX; w.y=kids.length?kids.reduce((a,c)=>a+c.y,0)/kids.length:-172;
    if(kids.length&&kids.every(c=>c.y===kids[0].y)) w.y-=118; }                 // все ведомые на одном этаже — привод выше ряда, ремни идут веером
  const row=G.wheels.filter(w=>!col.includes(w));                       // соседи на этаже не должны налезать (шестерни — должны касаться)
  for(const a of row) for(const b of row) if(a!==b&&a.y===b.y&&!(a.gear&&b.gear)){ const d=Math.abs(a.x-b.x); if(d<a.r+b.r+6){ a.r=Math.min(a.r,Math.max(24,d/2-3)); b.r=Math.min(b.r,Math.max(24,d/2-3)); } }
  col.sort((a,b)=>b.y-a.y);
  for(let i=1;i<col.length;i++) if(col[i-1].y-col[i].y<98) col[i].y=col[i-1].y-98;       // приводы в колонке не налезают друг на друга
}
function fit(){ const dpr=Math.min(2,window.devicePixelRatio||1), v=vp();
  if(T){ CONFIG.H=clamp(Math.round(CONFIG.W*v.h/v.w),900,1240); T.BOT=CONFIG.H-114; T.ANCH=T.BOT-34; }       // высота поля — по экрану
  const sc=Math.min(v.w/CONFIG.W, v.h/CONFIG.H);
  cv.style.width=Math.floor(CONFIG.W*sc)+'px'; cv.style.height=Math.floor(CONFIG.H*sc)+'px';
  cv.width=Math.max(1,Math.floor(CONFIG.W*sc*dpr)); cv.height=Math.max(1,Math.floor(CONFIG.H*sc*dpr)); SCALE=cv.width/CONFIG.W; SIDE_UI=false; sideEl.classList.remove('show'); }
function drawWorld(){
  const F=CONFIG.FLOOR, m=G.mouse, VW=CONFIG.W;
  ctx.fillStyle='#1b1722'; ctx.fillRect(0,T.TOP,VW,T.BOT-T.TOP);
  ctx.save(); ctx.beginPath(); ctx.rect(0,T.TOP,VW,T.BOT-T.TOP); ctx.clip();
  ctx.translate(0,T.ANCH-G.camY+G.panY);
  const vis=y=>{ const q=y+T.ANCH-G.camY+G.panY; return q>T.TOP-280&&q<T.BOT+150; };
  for(let k=0;k<G.nfl;k++){ const Y=-k*T.FH; if(!vis(Y)) continue;
    ctx.fillStyle='#231d2c'; ctx.fillRect(8,Y-94,388,94);             // коридор этажа
    ctx.fillStyle='#2c2536'; ctx.fillRect(8,Y-132,388,38);             // балка с молотами
    ctx.fillStyle='#3a3346'; ctx.fillRect(8,Y,388,12);                 // пол
    if(G.nfl>1) text(String(k+1),VW-22,Y-40,13,'#51475f','right'); }
  ctx.fillStyle='#120e19'; ctx.beginPath(); ctx.arc(14,0,26,Math.PI,0); ctx.fill();     // вход
  for(let k=0;k+1<G.nfl;k++){ const x=T.L+(k%2?0:T.SEG), Y=-k*T.FH, bi=G.burrows.indexOf(CONFIG.X0+T.SEG*(k+1)), isB=bi>=0; if(!vis(Y)) continue;      // лестницы между этажами; с норкой — убежище, без неё — проходная
    ctx.fillStyle='#120e19'; ctx.fillRect(x-18,Y-T.FH-1,36,14);
    ctx.strokeStyle=isB?(bi<G.reach?GREEN:'#8f86a8'):'#ff9a3c'; ctx.lineWidth=3; if(!isB) ctx.setLineDash([7,6]); line(x-11,Y,x-11,Y-T.FH+8); line(x+11,Y,x+11,Y-T.FH+8); ctx.setLineDash([]);
    for(let r=1;r<11;r++) line(x-11,Y-r*24,x+11,Y-r*24);
    if(isB){ ctx.fillStyle='#120e19'; ctx.beginPath(); ctx.arc(x,Y,24,Math.PI,0); ctx.fill(); ctx.strokeStyle=bi<G.reach?GREEN:'#51475f'; ctx.beginPath(); ctx.arc(x,Y,24,Math.PI,0); ctx.stroke(); }
    else text('⇈',x+(k%2?26:-26),Y-30,20,'#ff9a3c'); }
  let hover=null;
  if(mode==='play'&&mouse.inside&&!G.done) hover=wheelAt({x:mouse.x,y:mouse.y-T.ANCH+G.camY-G.panY},8);
  const sol=HINT[G.n]?G.lv.solution.flat():null;
  for(const w of G.wheels) if(w.drv>=0) drawBelt(G.wheels[w.drv],w);
  for(const w of G.wheels) if(w.idrv>=0) drawInnerBelt(G.wheels[w.idrv],w);
  for(const w of G.wheels) if(w.drv<0) drawMotor(w);
  for(const w of G.wheels){
    if(w.ham!==undefined){ const p=tpos(w.ham), dy=p.y-F, calm=isCalm(w); ctx.save(); ctx.translate(0,dy);
      drawHammer(p.x,hamOffset(w),w.on&&!calm,w.x,w.y+w.r-4-dy); if(calm) text('💤',p.x+30,CONFIG.CEIL+18+Math.sin(now*6)*3,18,'#ffd166'); ctx.restore(); }
    if(w.gate!==undefined){ const p=tpos(w.gate), dy=p.y-F; ctx.save(); ctx.translate(0,dy); drawGate(p.x,w.open,w.x,w.y+w.r-4-dy); ctx.restore(); }
  }
@@WHEELS@@
  if(G.lv.scaffold && mode==='play' && !G.done){                        // первый уровень: прямо пишем, когда тыкать
    const w=G.wheels.find(v=>v.holes>0&&v.jam<=0&&v.on);
    if(w){ const ok=canJam(w)&&fits(w); text(ok?t('now'):t('wait'),w.x+w.r+74,w.y-w.r-10,ok?26:18,ok?GREEN:'#8f86a8','center','900');
      if(G.used===0) text('👆',w.x+w.r*0.55,w.y+w.r*0.75+Math.sin(now*8)*4,34,'#fff'); } }
  { const p=tpos(G.cheese); drawCheese(p.x,p.y); }
  const blk=G.done?[]:blockers(m.x), mp=tpos(m.x);
  if(mp.k!==m.vk){ if(m.vk!==undefined&&mp.k>m.vk) m.climbAt=G.time; m.vk=mp.k; }               // поднялся на этаж — короткий подъём по лестнице
  const climb=m.climbAt!==undefined?Math.max(0,1-(G.time-m.climbAt)/0.22):0, my=mp.y+climb*T.FH;
  drawMouse(mp.x,my,{face:m.face*mp.dir,run:m.state==='run'||m.state==='back'||climb>0,scared:m.state==='wait'&&blk.length>0,t:m.t});
  if(m.state==='wait' && mode==='play' && !G.done && climb<=0){          // мысль мышонка: чего он боится
    const n=Math.min(blk.length,5), bw=blk.length?26+n*22:64, bx=clamp(mp.x-34,12,388-bw), by=mp.y-84;
    ctx.fillStyle='#f2f0f7'; rr(bx,by,bw,36,12); ctx.fill();
    if(blk.length){ blk.slice(0,5).forEach((b,i)=>{ const ix=bx+24+i*22; if(b.kind==='ham') iconHammer(ix,by+20); else iconGate(ix,by+20); }); }
    else text('🧀 !',bx+bw/2,by+25,20,'#17131f');
  }
@@FX@@
  ctx.restore();
  // ---- интерфейс: подсказка сверху, палки и таймер снизу (под большой палец) ----
  ctx.fillStyle='#17131f'; ctx.fillRect(0,72,VW,T.TOP-72);
  const tip=wrapLines(L(G.lv.tip),512,14); tip.slice(0,3).forEach((q,i)=>text(q,VW/2,92+i*19,14,'#e8e6f0'));
  if(G.burrows.length){ const x=VW-8, y0=T.BOT-16, y1=T.TOP+16, fy=sx=>y0+(y1-y0)*(sx-CONFIG.X0)/(G.cheese-22-CONFIG.X0);     // путь наверх — полоска справа
    ctx.strokeStyle='#51475f'; ctx.lineWidth=3; line(x,y0,x,y1); ctx.strokeStyle=GREEN; line(x,y0,x,fy(m.x));
    G.burrows.forEach((b,k)=>{ ctx.fillStyle=k<G.reach?GREEN:'#51475f'; circ(x,fy(b),4.5); ctx.fill(); });
    ctx.fillStyle='#ffd166'; circ(x,y1,5.5); ctx.fill(); ctx.fillStyle='#e8e6f0'; circ(x,fy(m.x),6); ctx.fill();
    if(G.nfl>3&&G.used===0&&mode==='play') text('↕ '+t('lookUp'),VW/2-70,T.TOP+18,12,'#6b6280','center','normal'); }
  ctx.fillStyle='#120e19'; ctx.fillRect(0,T.BOT,VW,CONFIG.H-T.BOT);
  { const hs=handSize(), selIdx=G.used+(G.sel===1&&hs>1?1:0); let qx=206;
    for(let j=0;j<2;j++){ const i=G.used+j, x=18+j*78, has=j<hs, isSel=has&&i===selIdx;
      ctx.fillStyle=isSel?'rgba(255,209,102,.18)':'rgba(255,255,255,.05)'; rr(x,T.BOT+10,68,94,10); ctx.fill(); ctx.strokeStyle=isSel?'#ffd166':'#4a4158'; ctx.lineWidth=isSel?3:1.5; ctx.stroke();
      if(has){ const q=G.queue[i]; ctx.save(); ctx.translate(x+34,T.BOT+96); ctx.scale(1.5,1.5); drawStickIcon(0,0,38,1,q); ctx.restore(); text(stickLife(q)+' '+t('sec'),x+34,T.BOT+29,13,isSel?'#ffd166':'#cfcbe0'); } }
    if(hs>1&&mode==='play'&&!G.done) uiButtons.push({x:10,y:T.BOT+2,w:164,h:110,act:swapHand});       // тап по руке — выбрать другую палку
    text(G.lv.pool?t('poolLbl'):t('sticks'),206,T.BOT+28,13,G.lv.pool?'#ffd166':'#8f86a8','left','normal');
    const mixedQ=new Set(G.queue).size>1;
    let shown=0; G.queue.forEach((q,i)=>{ if(i<G.used+hs||shown>=(G.lv.time?5:8)) return; shown++; drawStickIcon(qx+6,T.BOT+92,30,0.9,q); if(mixedQ) text(String(stickLife(q)),qx+6,T.BOT+54,11,'#8f86a8'); qx+=STICKS[q].w+(mixedQ?14:8); });   // дальше восьми — только числом
    text(String(G.sticks),Math.max(qx+16,222),T.BOT+90,28,G.sticks?'#ffd166':RED,'left','900'); }
  if(G.lv.time){ const hot=G.clock&&G.timeLeft<6;
    ctx.fillStyle='rgba(13,10,18,.9)'; rr(392,T.BOT+12,136,40,20); ctx.fill(); ctx.strokeStyle=hot?RED:(G.clock?'#ffd166':'#51475f'); ctx.lineWidth=2; ctx.stroke();
    text((G.clock?'😼 ':'😴 ')+Math.ceil(G.timeLeft)+' '+t('sec'),460,T.BOT+39,18,hot?RED:(G.clock?'#ffd166':'#cfcbe0')); }
  if(G.toast){ const a=clamp(G.toast.t/0.3,0,1)*clamp((G.toast.max-G.toast.t)/0.15,0,1);
    ctx.globalAlpha=a; ctx.font=`bold 15px ${FONT}`; const w=Math.min(520,ctx.measureText(G.toast.s).width+30);
    ctx.fillStyle='rgba(13,10,18,.96)'; rr(VW/2-w/2,T.BOT-44,w,34,17); ctx.fill(); ctx.strokeStyle=G.toast.color; ctx.lineWidth=2; ctx.stroke();
    text(G.toast.s,VW/2,T.BOT-22,15,G.toast.color); ctx.globalAlpha=1; }
  cv.style.cursor=((hover&&hover.holes>0)||mouseOverButton())?'pointer':'default';
}
function drawTopBar(){
  if(mode==='start'||mode==='levels'||mode==='help'||mode==='final'||!G) return;
  ctx.fillStyle='#0f0b16'; ctx.fillRect(0,0,CONFIG.W,72);
  const wi=Math.floor(G.n/5); text(`${t('level')} ${G.n+1} ${t('of')} ${LEVELS.length} · ${L(WORLDS[wi])}`,14,27,13,WORLDS[wi].c,'left');
  let nm=L(G.lv.name); ctx.font=`bold 18px ${FONT}`; while(ctx.measureText(nm).width>340&&nm.length>6) nm=nm.slice(0,-2)+'…';
  text(nm,14,54,18,'#e8e6f0','left');
  [['↺',()=>{ if(mode==='play'||mode==='fail') restartLevel(); }],['☰',openLevels],['?',openHelp]].forEach((b,i)=>button(b[0],396+i*56,36,50,56,b[1],false,20,true));
}
function drawStart(){ const W2=CONFIG.W/2, tw=t('title').split(' ');
  ctx.fillStyle='#17131f'; ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
  ctx.save(); ctx.shadowColor='#e9c46a'; ctx.shadowBlur=20; text(tw[0],W2,150,46,'#f2e6c4','center','900'); text(tw.slice(1).join(' '),W2,204,46,'#f2e6c4','center','900'); ctx.restore();
  text(t('sub1'),W2,250,16,'#cfcbe0','center','normal'); wrapLines(t('sub2'),470,16,'normal').forEach((q,i)=>text(q,W2,274+i*21,16,'#cfcbe0','center','normal'));
  const w={x:W2,y:430,r:56,holes:1,a:now*1.6,jam:0}, ok=Math.abs(holeErr(w))<=0.5;        // живая картинка: когда тыкать
  drawWheel(w,{}); drawBracket({...w,on:true,spin:1},{ok}); if(ok){ text(t('now'),W2+124,392,22,GREEN,'center','900'); text('👆',W2+36,480,30,'#fff'); }
  drawMouse(W2-150,520,{face:1,run:false,t:now}); drawCheese(W2+150,520);
  button(t('play'),W2,610,320,72,startGame,true,26,true);
  button('☰ '+t('levels'),W2-84,696,156,62,openLevels,false,18,true); button('? '+t('help'),W2+84,696,156,62,openHelp,false,18,true);
  button(muted?'🔇':'🔊',W2-42,776,70,56,toggleMute,false,20,true); button(LANG==='ru'?'EN':'RU',W2+42,776,70,56,toggleLang,false,18,true);
  const all=LEVELS.reduce((a,_,i)=>a+bestOf(i),0); text(`${LEVELS.length} ${t('nLevels')} · ${Math.ceil(LEVELS.length/5)} ${t('nWorlds')} · ★ ${all}/${LEVELS.length*3}`,W2,852,15,'#8f86a8');
}
function drawLevels(){ const W2=CONFIG.W/2, top=84, nW=Math.ceil(LEVELS.length/5), rowH=112, tw=92, th=70, gx=10, x0=(CONFIG.W-(5*tw+4*gx))/2;
  ctx.fillStyle='#17131f'; ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
  LS.y=clamp(LS.y,0,Math.max(0,nW*rowH+30-(CONFIG.H-top))); LS.tiles=[];
  ctx.save(); ctx.beginPath(); ctx.rect(0,top,CONFIG.W,CONFIG.H-top); ctx.clip();
  for(let wi=0;wi<nW;wi++){ const y0=top+14+wi*rowH-LS.y; if(y0>CONFIG.H||y0<-rowH) continue;
    text(`${wi+1}. ${L(WORLDS[wi])}`,x0,y0+14,15,WORLDS[wi].c,'left');
    for(let k=0;k<5;k++){ const i=wi*5+k; if(i>=LEVELS.length) break; const x=x0+k*(tw+gx), y=y0+24, best=bestOf(i), cur=G&&G.n===i;
      ctx.fillStyle=cur?'#3a3050':(best?hexA(WORLDS[wi].c,0.22):'#241c31'); rr(x,y,tw,th,10); ctx.fill(); ctx.strokeStyle=cur?'#ffffff':WORLDS[wi].c; ctx.lineWidth=cur?3:2; ctx.stroke();
      text(String(i+1),x+tw/2,y+34,24,'#e8e6f0','center','900'); if(LEVELS[i].time) text('😼',x+tw-15,y+19,12,'#fff');
      for(let st=0;st<3;st++){ ctx.fillStyle=st<best?'#ffd166':'#3a3050'; starShape(x+tw/2-16+st*16,y+54,6); ctx.fill(); }
      LS.tiles.push({x,y,w:tw,h:th,i}); } }
  ctx.restore();
  ctx.fillStyle='#0f0b16'; ctx.fillRect(0,0,CONFIG.W,top-4); text(`${t('levels')} · ${LEVELS.length}`,W2,50,24,'#e8e6f0','center','900');
  button('←',44,40,64,58,()=>{ mode=levelsReturn; },false,24,true);
}
function drawHelp(){ const W2=CONFIG.W/2, lines=t('helpT'), per=4, pages=Math.ceil(lines.length/per);
  ctx.fillStyle='#17131f'; ctx.fillRect(0,0,CONFIG.W,CONFIG.H); text(t('help'),W2,70,28,'#e8e6f0','center','900'); let y=130;
  lines.slice(helpPage*per,helpPage*per+per).forEach(q=>{ wrapLines(q,470,17,'normal').forEach((ln,k)=>{ text(ln,W2,y,17,k?'#bdb6cf':'#e8e6f0','center','normal'); y+=24; }); y+=24; });
  text(`${helpPage+1} / ${pages}`,W2,CONFIG.H-150,14,'#8f86a8');
  if(helpPage+1<pages) button(t('more'),W2,CONFIG.H-88,300,66,()=>{ helpPage++; },true,20,true); else button(t('got'),W2,CONFIG.H-88,300,66,()=>{ mode=helpReturn; },true,20,true);
}
function drawFinal(){ const W2=CONFIG.W/2, all=LEVELS.reduce((a,_,i)=>a+bestOf(i),0);
  ctx.fillStyle='#17131f'; ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
  text(t('towerDone'),W2,300,36,'#ffd166','center','900'); drawCheese(W2,420); drawMouse(W2-70,420,{face:1,run:false,t:now});
  text(`★ ${all} / ${LEVELS.length*3}`,W2,500,26,'#e8e6f0','center','900');
  button('☰ '+t('toLevels'),W2,600,300,70,()=>{ levelsReturn='start'; mode='levels'; },true,22,true);
}
function drawIntro(){ const wi=Math.floor(G.n/5), W2=CONFIG.W/2;
  ctx.fillStyle='rgba(10,8,15,.72)'; ctx.fillRect(0,72,CONFIG.W,CONFIG.H-72); panel(24,250,492,440);
  text(`${t('level')} ${G.n+1} · ${L(WORLDS[wi])}`,W2,292,15,WORLDS[wi].c);
  const nm=wrapLines(L(G.lv.name),450,28,'900'); nm.slice(0,2).forEach((q,i)=>text(q,W2,334+i*33,28,'#e8e6f0','center','900'));
  const y0=334+Math.min(2,nm.length)*33+6; wrapLines(L(G.lv.tip),450,16).slice(0,7).forEach((q,i)=>text(q,W2,y0+i*22,16,'#cfcbe0'));
  if(G.lv.time) text(`😼 ${G.lv.time} ${t('sec')} — ${t('catIntro')}`,W2,606,14,'#ffd166');
  button(t('got'),W2,648,270,62,()=>{ mode='play'; },true,22,true);
}
function drawDone(){ const W2=CONFIG.W/2;
  ctx.fillStyle='rgba(10,8,15,.72)'; ctx.fillRect(0,72,CONFIG.W,CONFIG.H-72); panel(30,300,480,340);
  text(t('win'),W2,352,32,'#ffd166','center','900');
  for(let i=0;i<3;i++){ const k=clamp((G.doneT-0.15-i*0.2)/0.25,0,1), r=28*(i<G.stars?(k<1?0.6+0.6*k:1):1); drawStar(W2-76+i*76,416,r,i<G.stars&&k>0); }
  text(`${t('used')}: ${G.used} · ${t('canDo')} ${G.lv.par}`,W2,478,18,'#e8e6f0');
  const extra=[]; if(G.perfects) extra.push(`${t('perfect1').split('!')[0]}: ${G.perfects}`); if(G.chain) extra.push(`${t('chain0').replace('!','')}: ${G.chain}`); if(G.lv.time) extra.push(`😼 ${Math.ceil(G.timeLeft)} ${t('sec')}`);
  if(extra.length) text(extra.join(' · '),W2,506,14,'#ffd166','center','normal');
  button(t('again'),150,580,200,62,()=>{ TRIES[G.n]=0; restartLevel(); },false,18,true);
  button(t('next'),390,580,200,62,nextLevel,true,20,true);
}
function drawFail(){ const W2=CONFIG.W/2, nb=G.burrows.length, lines=[];
  if(nb) lines.push(G.reach?t('failReach').replace('%1',G.reach).replace('%2',nb):t('failReach0'));
  if(G.near!==null && G.near<1.55) lines.push(t('failNear').replace('%',Math.max(0.1,G.near).toFixed(1)));
  if(!lines.length) lines.push(t('failText'));
  if(G.lv.pool&&!G.timeout&&G.n%5) lines.push(t('poolFail'));
  const canHint=!HINT[G.n] && TRIES[G.n]>=2 && G.lv.solution, canSkip=G.lv.pool?G.n%5>0:(TRIES[G.n]>=3 && G.n+1<LEVELS.length), h=170+lines.length*46+((canHint||canSkip)?80:0), skipLbl=G.lv.pool?t('poolBack'):t('skipBtn'), skipAct=G.lv.pool?prevChapterStart:skipLevel;
  ctx.fillStyle='rgba(10,8,15,.5)'; ctx.fillRect(0,72,CONFIG.W,CONFIG.H-72); panel(24,300,492,h,'#ff9a3c');
  text(G.timeout?t('failTime'):t('failTitle'),W2,350,28,'#e8e6f0','center','900'); let y=388;
  lines.forEach((q,i)=>wrapLines(q,450,17,'normal').forEach(ln=>{ text(ln,W2,y,17,i===0&&nb?'#ffd166':'#cfcbe0','center','normal'); y+=23; }));
  text(t('tapAgainT'),W2,y+22+Math.sin(now*5)*2,20,'#9fe8b0','center','900');
  const by=300+h-52;
  if(canHint&&canSkip){ button(t('hintBtn'),146,by,210,60,useHint,false,18,true); button(skipLbl,394,by,210,60,skipAct,false,16,true); }
  else if(canHint) button(t('hintBtn'),W2,by,240,60,useHint,false,18,true);
  else if(canSkip) button(skipLbl,W2,by,260,60,skipAct,false,17,true);
}
fit();
{ const q=+(new URLSearchParams(location.search).get('l')); if(q) goLevel(clamp(q-1,0,LEVELS.length-1)); }     // ?l=N — сразу в уровень
