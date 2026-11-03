#!/usr/bin/env node
// Перевірка сайту PRO CEILING. Друкує звіт ✅/❌/⚠️ і повертає код 1, якщо є ❌.
//
//   node .claude/skills/verify-site/verify.mjs            повна перевірка (збірка + файли + браузер)
//   node .claude/skills/verify-site/verify.mjs --quick    без браузера (швидко, для хуків)
//   node .claude/skills/verify-site/verify.mjs --no-build не запускати npm run build
//
// Браузер шукається в стандартних місцях Chrome/Edge або в змінній CHROME_PATH.

import { execSync, execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SKILL_DIR, '../../..');
const args = new Set(process.argv.slice(2));
const QUICK = args.has('--quick');
const NO_BUILD = args.has('--no-build');

// Справжні телефони фірми — інших tel: на сайті бути не повинно
const PHONES = {
  '+380633890618': { name: 'Максим', text: '063 389 06 18' },
  '+380638129083': { name: 'Ілля', text: '063 812 90 83' },
};

const report = [];
const ok = (name, info = '') => report.push({ s: '✅', name, info });
const fail = (name, info = '') => report.push({ s: '❌', name, info });
const warn = (name, info = '') => report.push({ s: '⚠️', name, info });
const note = (name, info = '') => report.push({ s: 'ℹ️', name, info });
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ---------- 1. Збірка ----------
if (!NO_BUILD) {
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
    ok('Збірка npm run build');
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`.trim().split('\n').slice(-6).join('\n');
    fail('Збірка npm run build', out);
  }
}

// Згенеровані файли свіжіші за джерела
const newest = (dir) => Math.max(...readdirSync(join(ROOT, dir)).map((f) => statSync(join(ROOT, dir, f)).mtimeMs));
const fresh = [
  ['styles.css', newest('src/scss')],
  ['script.js', statSync(join(ROOT, 'src/script.ts')).mtimeMs],
].filter(([out, srcTime]) => !existsSync(join(ROOT, out)) || statSync(join(ROOT, out)).mtimeMs + 1000 < srcTime);
if (fresh.length) fail('styles.css / script.js зібрані з останніх джерел', `застарілі: ${fresh.map((f) => f[0]).join(', ')} — запусти npm run build`);
else ok('styles.css / script.js зібрані з останніх джерел');

// ---------- 2. index.html без браузера ----------
const html = read('index.html');
const noComments = html.replace(/<!--[\s\S]*?-->/g, '');
const attrs = (re) => [...noComments.matchAll(re)].map((m) => m[1]);

// Телефони
const tels = attrs(/href="tel:([^"]*)"/g);
const unknown = [...new Set(tels.filter((t) => !PHONES[t]))];
const missing = Object.keys(PHONES).filter((t) => !tels.includes(t));
const missingText = Object.values(PHONES).filter((p) => !noComments.includes(p.text));
if (unknown.length || missing.length || missingText.length) {
  fail('Телефони', [
    unknown.length && `невідомі номери: ${unknown.join(', ')}`,
    missing.length && `немає посилань на: ${missing.map((t) => PHONES[t].name).join(', ')}`,
    missingText.length && `немає тексту номера: ${missingText.map((p) => p.text).join(', ')}`,
  ].filter(Boolean).join('; '));
} else {
  ok('Телефони', Object.entries(PHONES).map(([t, p]) => `${p.name} ×${tels.filter((x) => x === t).length}`).join(', '));
}

// Дублікати id
const ids = attrs(/\sid="([^"]+)"/g);
const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
if (dupIds.length) fail('Унікальні id', `повторюються: ${dupIds.join(', ')}`);
else ok('Унікальні id', `${ids.length} шт.`);

// Посилання-якорі #…
const anchors = [...new Set(attrs(/href="#([^"]+)"/g))];
const badAnchors = anchors.filter((a) => !ids.includes(a));
if (badAnchors.length) fail('Якорі меню ведуть на секції', `немає id: ${badAnchors.join(', ')}`);
else ok('Якорі меню ведуть на секції', `${anchors.length} шт.`);

// Локальні файли (src / href)
const local = attrs(/\s(?:src|href)="([^"#]+)"/g)
  .filter((u) => !/^(https?:|tel:|mailto:|data:|\/\/)/.test(u));
const missingFiles = [...new Set(local)].filter((u) => !existsSync(join(ROOT, decodeURI(u))));
if (missingFiles.length) fail('Локальні файли існують', `немає: ${missingFiles.join(', ')}`);
else ok('Локальні файли існують', `${new Set(local).size} шт.`);

// Картинки: alt і розмір
const imgs = [...noComments.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
const noAlt = imgs.filter((t) => !/\sid="lightbox-img"/.test(t) && !/\salt="[^"]+"/.test(t));
if (noAlt.length) fail('Картинки мають alt', `без alt: ${noAlt.length}`);
else ok('Картинки мають alt', `${imgs.length} шт.`);
const heavy = imgs.map((t) => (t.match(/\ssrc="([^"]+)"/) || [])[1])
  .filter((src) => src && existsSync(join(ROOT, decodeURI(src))))
  .map((src) => [src, statSync(join(ROOT, decodeURI(src))).size / 1024])
  .filter(([, kb]) => kb > 500);
if (heavy.length) warn('Картинки до 500 КБ', heavy.map(([s, kb]) => `${s} ${Math.round(kb)} КБ`).join(', '));

// Селектори зі script.ts існують у HTML
const ts = read('src/script.ts');
const selectors = [...new Set([...ts.matchAll(/\$\$?(?:<[^>]+>)?\('([^']+)'\)/g)].map((m) => m[1]))];
const has = (sel) => {
  if (sel.startsWith('#')) return ids.includes(sel.slice(1));
  if (sel.startsWith('.')) return new RegExp(`class="[^"]*\\b${sel.slice(1)}\\b`).test(noComments);
  const a = sel.match(/^\[([\w-]+)/);
  return a ? new RegExp(`\\s${a[1]}[\\s=>]`).test(noComments) : true;
};
const lost = selectors.filter((s) => !has(s));
if (lost.length) fail('Усе, що шукає script.ts, є в HTML', `не знайдено: ${lost.join(', ')}`);
else ok('Усе, що шукає script.ts, є в HTML', `${selectors.length} селекторів`);

// SCSS: кольори тільки з токенів
const scssDir = join(ROOT, 'src/scss');
const rawHex = readdirSync(scssDir)
  .filter((f) => f.endsWith('.scss') && f !== '_tokens.scss')
  .flatMap((f) => readFileSync(join(scssDir, f), 'utf8').split('\n')
    .map((line, i) => ({ f, i: i + 1, line }))
    .filter(({ line }) => /#[0-9a-fA-F]{3,8}\b/.test(line.replace(/\/\/.*$/, '')) && !/^\s*\$/.test(line)));
if (rawHex.length) fail('SCSS: кольори тільки з _tokens.scss', rawHex.slice(0, 5).map((h) => `${h.f}:${h.i}`).join(', '));
else ok('SCSS: кольори тільки з _tokens.scss');

// Заглушки — не помилка, а нагадування
const text = noComments.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
const holes = {};
for (const m of text.matchAll(/\[[^\]\n]{1,40}\]/g)) holes[m[0]] = (holes[m[0]] || 0) + 1;
const holeList = Object.entries(holes).map(([k, n]) => (n > 1 ? `${k} ×${n}` : k));
if (holeList.length) note(`Заглушки, які ще чекають на дані (${holeList.length})`, holeList.join(', '));
const demo = /ДЕМО-ціни \(заглушки\)/.test(ts);
if (demo) note('Калькулятор', 'ДЕМО-ціни в src/script.ts');

// ---------- 3. Браузер ----------
const shots = [];
if (!QUICK) {
  const chrome = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].find((p) => p && existsSync(p));

  if (!chrome) {
    warn('Браузерні перевірки', 'Chrome/Edge не знайдено — задай CHROME_PATH');
  } else {
    const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
    const server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = path === '/__verify/probe.html' ? join(SKILL_DIR, 'probe.html') : join(ROOT, path === '/' ? 'index.html' : path);
      if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' }).end(readFileSync(file));
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    const runChrome = (extra, url) => new Promise((done) => {
      execFile(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-prefers-reduced-motion',
        '--virtual-time-budget=10000', '--enable-logging=stderr', '--v=0', ...extra, url],
        { timeout: 90000, maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => done({ err, stdout: String(stdout), stderr: String(stderr) }));
    });

    // Кліки й ширина
    const probe = await runChrome(['--dump-dom'], `${base}/__verify/probe.html`);
    const raw = (probe.stdout.match(/<pre id="out">([\s\S]*?)<\/pre>/) || [])[1];
    let results = null;
    try { results = JSON.parse(raw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')); } catch { /* нижче */ }
    if (!results) fail('Браузерні перевірки', `тестувальник не відповів${probe.err ? ': ' + probe.err.message : ''}`);
    else results.forEach((r) => (r.ok ? ok : fail)(r.name, r.info));

    // Помилки в консолі (сторінка сайту, не тестувальник)
    // Формат рядка залежить від версії Chrome: «CONSOLE(28)]» або «CONSOLE:28]»
    const consoleErrors = [...probe.stderr.matchAll(/CONSOLE[:(]\d+\)?\] "(.*?)", source: (\S+)/g)]
      .filter(([, msg, src]) => /error|uncaught|failed/i.test(msg) && !src.includes('/__verify/'))
      .map(([, msg]) => msg);
    if (consoleErrors.length) fail('Консоль без помилок', [...new Set(consoleErrors)].slice(0, 5).join(' | '));
    else ok('Консоль без помилок');

    // Скриншоти для перегляду очима
    const outDir = join(tmpdir(), 'pro-ceiling-verify');
    mkdirSync(outDir, { recursive: true });
    for (const [name, size] of [['desktop-1280.png', '1280,6400'], ['mobile-600.png', '600,2400']]) {
      const file = join(outDir, name);
      const r = await runChrome([`--window-size=${size}`, `--screenshot=${file}`], `${base}/index.html`);
      if (!r.err && existsSync(file)) shots.push(file);
    }
    server.close();
  }
}

// ---------- Звіт ----------
const width = Math.max(...report.map((r) => r.name.length));
console.log('\nПеревірка сайту PRO CEILING\n');
for (const r of report) console.log(`${r.s} ${r.name.padEnd(width)}${r.info ? '  — ' + r.info : ''}`);
const fails = report.filter((r) => r.s === '❌').length;
const warns = report.filter((r) => r.s === '⚠️').length;
console.log(`\nПідсумок: ${report.filter((r) => r.s === '✅').length} ✅  ${fails} ❌  ${warns} ⚠️${QUICK ? '  (швидка перевірка, без браузера)' : ''}`);
if (shots.length) console.log(`Скриншоти:\n${shots.map((s) => '  ' + s).join('\n')}`);
process.exit(fails ? 1 : 0);
