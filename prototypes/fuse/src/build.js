// Сборка prototypes/fuse/index.html: логика + уровни (par и plan — из решателя) + лист спрайтов + интерфейс.
//   node build.js        LEVELS=путь — другой файл уровней, OUT=путь — куда писать (для черновиков)
const fs = require('fs'), path = require('path'), C = require('./logic.js');
const here = f => path.join(__dirname, f), data = require(process.env.LEVELS ? path.resolve(process.env.LEVELS) : './levels.js');
const out = data.LEVELS.map((lv, i) => { const r = C.solve(lv); if (!r.solvable) throw new Error(`уровень ${lv.id} не решается`); return Object.assign({}, lv, { par: r.par, plan: r.plan }); });
const logic = fs.readFileSync(here('logic.js'), 'utf8').replace(/\nif \(typeof module[^\n]*\n?/, '\n');
const levels = 'const FUSE_WORLDS = ' + JSON.stringify(data.WORLDS) + ';\nconst FUSE_LEVELS = [\n' + out.map(l => '  ' + JSON.stringify(l)).join(',\n') + '\n];';
const svg = fs.readFileSync(here('../assets.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
const app = ['app_core.js', 'app_audio.js', 'app_view.js', 'app_ui.js'].map(f => fs.readFileSync(here(f), 'utf8')).join('\n');
const html = fs.readFileSync(here('ui.html'), 'utf8').replace('/*__LOGIC__*/', () => logic).replace('/*__LEVELS__*/', () => levels).replace('/*__ATLAS__*/', () => 'const FUSE_ATLAS = ' + JSON.stringify(svg) + ';').replace('/*__APP__*/', () => app);
const target = process.env.OUT ? path.resolve(process.env.OUT) : here('../index.html');
fs.writeFileSync(target, html);
console.log(`${target}: ${html.length} байт, уровней ${out.length}, миров ${data.WORLDS.length}, par от ${Math.min(...out.map(l => l.par))} до ${Math.max(...out.map(l => l.par))}`);
