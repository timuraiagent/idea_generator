// Пересчёт запаса карт: добавляет к строкам оценку для взрослого (A) и доли побед «внимательного» бота.
//   node rescore.js <вход.jsonl> <выход.jsonl>
const fs = require('fs'), A = require('./analyze.js');
const [inp, out] = process.argv.slice(2), lines = fs.readFileSync(inp, 'utf8').split('\n').filter(Boolean), w = fs.createWriteStream(out);
let kept = 0; for (const ln of lines) { const r = JSON.parse(ln), m = A.metrics({ n: r.n, map: r.map }, 40000); if (!m.solvable) continue; r.A = A.adultDifficulty(m); r.p4 = +m.p4.toFixed(4); r.p6 = +m.p6.toFixed(4); w.write(JSON.stringify(r) + '\n'); kept++; }
w.end(() => console.log(`${inp.split('/').pop()}: ${kept} строк`));
