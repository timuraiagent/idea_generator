// Сборка prototypes/fuse/index.html: логика + уровни (par и plan — из решателя) + интерфейс.   node build.js
const fs = require('fs'), path = require('path'), C = require('./logic.js'), LEVELS = require('./levels.js');
const out = LEVELS.map((lv, i) => { const r = C.solve(lv); if (!r.solvable) throw new Error(`L${i + 1} «${lv.name.ru}» не решается`); return Object.assign({}, lv, { par: r.par, plan: r.plan }); });
const logic = fs.readFileSync(path.join(__dirname, 'logic.js'), 'utf8').replace(/\nif \(typeof module[^\n]*\n?/, '\n');
const levels = 'const FUSE_LEVELS = [\n' + out.map(l => '  ' + JSON.stringify(l)).join(',\n') + '\n];';
const html = fs.readFileSync(path.join(__dirname, 'ui.html'), 'utf8').replace('/*__LOGIC__*/', () => logic).replace('/*__LEVELS__*/', () => levels);
fs.writeFileSync(path.join(__dirname, '..', 'index.html'), html);
console.log(`index.html: ${html.length} байт, уровней ${out.length}, par: ${out.map(l => l.par).join(' ')}`);
