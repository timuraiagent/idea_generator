/* ===== ФИТИЛЬ: логика (без DOM). Мир пошаговый, детерминированный, по клеткам. =====
   Символы карты: # стена, . пол, _ провал, s камень, ~ вода, o масло, w доски, L лампа, K горящая лампа,
   G страж, g страж на масле, 1 и 2 — катушка (+1 и +2 к длине фитиля), D дверь, P старт. */
const FUSE_CORE = (() => {
  const WALL = 0, FLOOR = 1, STONE = 2, DOOR = 3, LAMP = 4, WATER = 5;   // тип клетки (не меняется)
  const PIT = 1, OIL = 2, BURN = 4, WOOD = 8, BURNW = 16;                 // состояние клетки (меняется)
  const FIRE = BURN | BURNW, BLOCK = PIT | BURN | WOOD | BURNW;
  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

  function compile(lv) {
    const rows = lv.map, H = rows.length, W = Math.max(...rows.map(r => r.length)), n = W * H;
    const type = new Uint8Array(n), init = new Uint8Array(n), lampAt = new Int8Array(n).fill(-1), guardAt = new Int8Array(n).fill(-1), spoolAt = new Int8Array(n).fill(-1);
    const lamps = [], guards = [], spools = [], spoolAdd = []; let start = -1, door = -1, lampLit0 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = rows[y][x] || '#', c = y * W + x;
      if (ch === '#') type[c] = WALL;
      else if (ch === 's') type[c] = STONE;
      else if (ch === '~') type[c] = WATER;
      else if (ch === 'D') { type[c] = DOOR; door = c; }
      else if (ch === 'L' || ch === 'K') { type[c] = LAMP; lampAt[c] = lamps.length; if (ch === 'K') lampLit0 |= 1 << lamps.length; lamps.push(c); }
      else { type[c] = FLOOR;
        if (ch === '_') init[c] = PIT;
        if (ch === 'o' || ch === 'g') init[c] = OIL;
        if (ch === 'w') init[c] = WOOD;
        if (ch === 'G' || ch === 'g') { guardAt[c] = guards.length; guards.push(c); }
        if (ch === '1' || ch === '2') { spoolAt[c] = spools.length; spools.push(c); spoolAdd.push(+ch); }
        if (ch === 'P') start = c; }
    }
    const adj = [];
    for (let c = 0; c < n; c++) { const x = c % W, y = (c - x) / W, a = [];
      if (y > 0) a.push(c - W); if (y < H - 1) a.push(c + W); if (x > 0) a.push(c - 1); if (x < W - 1) a.push(c + 1); adj.push(a); }
    const reach = (c, r) => { const seen = new Set([c]); let fr = [c];        // свет: не дальше r шагов, стены не пропускают
      for (let k = 0; k < r; k++) { const nx = []; for (const a of fr) for (const b of adj[a]) if (type[b] !== WALL && !seen.has(b)) { seen.add(b); nx.push(b); } fr = nx; }
      return [...seen]; };
    const light1 = [], light2 = [];
    for (let c = 0; c < n; c++) { light1.push(type[c] === WALL ? [] : reach(c, 1)); light2.push(type[c] === WALL ? [] : reach(c, 2)); }
    return { W, H, n, N: lv.n, type, init, lampAt, guardAt, spoolAt, lamps, guards, spools, spoolAdd, start, door, lampLit0, adj, light1, light2 };
  }

  // длина фитиля сейчас: начальная + подобранные катушки
  function fuseLen(L, spools) { let N = L.N; for (let k = 0; k < L.spools.length; k++) if (spools >> k & 1) N += L.spoolAdd[k]; return N; }

  function computeLight(L, flame, d, lampLit) {
    const lit = new Uint8Array(L.n);
    if (L.type[flame] !== WATER) for (const c of L.light1[flame]) lit[c] = 1;      // в воде огонёк тлеет: не светит и не поджигает
    for (let i = 0; i < L.n; i++) if (d[i] & FIRE) for (const c of L.light1[i]) lit[c] = 1;
    for (let k = 0; k < L.lamps.length; k++) if (lampLit >> k & 1) for (const c of L.light2[L.lamps[k]]) lit[c] = 1;
    return lit;
  }
  // светлое пятно неспящего стража: связный освещённый кусок, в котором он стоит
  function patchOf(L, lit, g) { const s = L.guards[g]; if (!lit[s]) return null; const seen = new Uint8Array(L.n); seen[s] = 1; const st = [s], out = [s];
    while (st.length) { const a = st.pop(); for (const b of L.adj[a]) if (lit[b] && !seen[b]) { seen[b] = 1; st.push(b); out.push(b); } } return out; }
  function seenCells(L, lit, guardAlive) { const m = new Uint8Array(L.n);
    for (let g = 0; g < L.guards.length; g++) if (guardAlive >> g & 1) { const p = patchOf(L, lit, g); if (p) for (const c of p) m[c] = 1; } return m; }

  function init(L) { const d = L.init.slice(), all = (1 << L.guards.length) - 1;
    return { t: 0, tail: [L.start], d, lampLit: L.lampLit0, guardAlive: all, spools: 0, lit: computeLight(L, L.start, d, L.lampLit0), over: false, won: false, reason: null }; }

  // куда можно шагнуть: [{cell, win}]
  function legal(L, S) { if (S.over) return []; const p = S.tail[S.tail.length - 1], out = [];
    for (const a of L.adj[p]) { const ty = L.type[a];
      if (ty === DOOR) { if (S.lit[a]) out.push({ cell: a, win: true }); continue; }
      if (ty === WALL || ty === LAMP) continue;
      const g = L.guardAt[a]; if (g >= 0 && (S.guardAlive >> g & 1)) continue;
      if (S.d[a] & BLOCK) continue;
      if (S.tail.includes(a)) continue;                              // огонёк или шнур
      out.push({ cell: a, win: false }); }
    return out; }

  // мир после хода: шаг 2 (огонёк), 3 (пожар, лампы), 4 (свет). tail уже с новой клеткой игрока, N — длина фитиля после хода
  function world(L, S, tail, N) { const d = S.d.slice(), n = L.n; let lampLit = S.lampLit, guardAlive = S.guardAlive;
    const prevBurn = []; for (let i = 0; i < n; i++) if (d[i] & FIRE) prevBurn.push(i);
    if (tail.length > N + 1) { const left = tail.shift(); if (L.type[left] === FLOOR) d[left] = PIT; }       // пол и масло выгорают; камень и вода целы
    const flame = tail[0], hot = L.type[flame] !== WATER;
    for (const i of prevBurn) d[i] = (d[i] & BURNW) ? 0 : PIT;                                              // 3а: масло выгорает в провал, доски — в проход
    const newBurn = [], ign = i => { if (d[i] === OIL) { d[i] = BURN; newBurn.push(i); const g = L.guardAt[i]; if (g >= 0) guardAlive &= ~(1 << g); } else if (d[i] === WOOD) { d[i] = BURNW; newBurn.push(i); } };
    if (hot) { ign(flame); for (const a of L.adj[flame]) ign(a); } for (const b of prevBurn) for (const a of L.adj[b]) ign(a);   // 3б
    const lightLamp = i => { const k = L.lampAt[i]; if (k >= 0) lampLit |= 1 << k; };
    if (hot) for (const a of L.adj[flame]) lightLamp(a); for (const b of newBurn) for (const a of L.adj[b]) lightLamp(a);        // 3в
    return { d, lampLit, guardAlive, tail, lit: computeLight(L, flame, d, lampLit), newBurn }; }

  function apply(L, S, cell) { const t = S.t + 1, tail = S.tail.concat(cell);
    if (cell === L.door) return { t, tail, d: S.d, lampLit: S.lampLit, guardAlive: S.guardAlive, spools: S.spools, lit: S.lit, over: true, won: true, reason: null };
    const sp = L.spoolAt[cell], spools = sp >= 0 ? S.spools | 1 << sp : S.spools;
    const w = world(L, S, tail, fuseLen(L, spools)), R = { t, tail: w.tail, d: w.d, lampLit: w.lampLit, guardAlive: w.guardAlive, spools, lit: w.lit, over: false, won: false, reason: null };
    if (w.d[cell] & FIRE) { R.over = true; R.reason = 'burned'; }
    else if (seenCells(L, w.lit, w.guardAlive)[cell]) { R.over = true; R.reason = 'seen'; }
    else if (legal(L, R).length === 0) { R.over = true; R.reason = 'stuck'; }
    return R; }

  // что будет после следующего хода: огонёк, что загорится, свет, опасные клетки.
  // От шага игрока это зависит только через катушку: cell — куда он шагнёт (−1: на клетку без катушки)
  function preview(L, S, cell) { const sp = cell >= 0 ? L.spoolAt[cell] : -1, spools = sp >= 0 ? S.spools | 1 << sp : S.spools;
    const w = world(L, S, S.tail.concat(-1), fuseLen(L, spools)), seen = seenCells(L, w.lit, w.guardAlive), burn = new Uint8Array(L.n);
    for (const c of w.newBurn) burn[c] = 1;
    return { flame: w.tail[0], lit: w.lit, seen, burn, lampLit: w.lampLit, guardAlive: w.guardAlive, d: w.d }; }

  const key = S => String.fromCharCode.apply(null, S.d) + '|' + S.lampLit + '|' + S.guardAlive + '|' + S.spools + '|' + S.tail.join(',');
  const dirChar = (L, a, b) => b === a - L.W ? 'U' : b === a + L.W ? 'D' : b === a - 1 ? 'L' : 'R';
  const cellInDir = (L, a, ch) => { const [dx, dy] = DIRS[ch], x = a % L.W + dx, y = (a - a % L.W) / L.W + dy; return (x < 0 || y < 0 || x >= L.W || y >= L.H) ? -1 : y * L.W + x; };

  // решатель: перебор состояний в ширину от состояния S0 → кратчайший план (строка UDLR) или null
  function solveFrom(L, S0, maxStates) { maxStates = maxStates || 5e6; const t0 = Date.now();
    if (S0.over) return { solvable: S0.won, par: 0, plan: '', states: 1, ms: 0 };
    let frontier = [{ S: S0, id: 0 }]; const seen = new Set([key(S0)]), parent = [-1], move = ['']; let states = 1, depth = 0;
    while (frontier.length) { const next = []; depth++;
      for (const { S, id } of frontier) { const p = S.tail[S.tail.length - 1];
        for (const m of legal(L, S)) { const ch = dirChar(L, p, m.cell);
          if (m.win) { let plan = ch, k = id; while (k > 0) { plan = move[k] + plan; k = parent[k]; } return { solvable: true, par: depth, plan, states, ms: Date.now() - t0 }; }
          const R = apply(L, S, m.cell); if (R.over) continue;
          const kk = key(R); if (seen.has(kk)) continue; seen.add(kk); parent.push(id); move.push(ch); next.push({ S: R, id: parent.length - 1 }); states++;
          if (states > maxStates) return { solvable: null, par: null, plan: null, states, ms: Date.now() - t0, overflow: true }; } }
      frontier = next; }
    return { solvable: false, par: null, plan: null, states, ms: Date.now() - t0 }; }
  function solve(lv, opts) { opts = opts || {}; const L = compile(Object.assign({}, lv, { n: opts.n || lv.n })); return solveFrom(L, init(L), opts.maxStates); }

  return { WALL, FLOOR, STONE, DOOR, LAMP, WATER, PIT, OIL, BURN, WOOD, BURNW, FIRE, BLOCK, DIRS, compile, init, legal, apply, preview, solve, solveFrom, fuseLen, key, dirChar, cellInDir, seenCells, patchOf, computeLight };
})();
if (typeof module !== 'undefined') module.exports = FUSE_CORE;
