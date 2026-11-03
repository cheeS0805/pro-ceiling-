#!/usr/bin/env node
// Хук PostToolUse: після кожної правки файлу сайту запускає швидку перевірку
// (npm run build + verify --quick). Якщо щось зламалось — код виходу 2:
// Claude Code показує Claude звіт зі stderr, і той мусить полагодити.
//
// Claude Code передає на stdin JSON, напр.:
//   {"tool_name":"Edit","tool_input":{"file_path":"C:\\...\\pro-ceiling\\index.html", ...}}

import { spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';

// Файли, після зміни яких є сенс перевіряти сайт
const WATCH = [/^index\.html$/, /^src\//, /^package\.json$/, /^tsconfig\.json$/];

let input = '';
for await (const chunk of process.stdin) input += chunk;

let file = '';
try {
  const data = JSON.parse(input || '{}');
  file = data.tool_input?.file_path || data.tool_input?.notebook_path || '';
} catch {
  process.exit(0); // незрозумілий вхід — не заважаємо роботі
}

const root = process.env.CLAUDE_PROJECT_DIR || resolve(import.meta.dirname, '../..');
const rel = relative(root, resolve(root, file)).replace(/\\/g, '/');
if (!file || rel.startsWith('..') || !WATCH.some((re) => re.test(rel))) process.exit(0);

// Збираємо тільки те, що змінилось: index.html збирати не треба зовсім,
// SCSS → лише стилі, TS → лише скрипт, конфіги → усе.
const buildScript = rel.startsWith('src/scss/') ? 'build:css'
  : rel.startsWith('src/') ? 'build:ts'
  : rel === 'index.html' ? null
  : 'build';
if (buildScript) {
  const build = spawnSync(`npm run ${buildScript}`, { cwd: root, encoding: 'utf8', shell: true });
  if (build.status !== 0) {
    const out = `${build.stdout || ''}${build.stderr || ''}`.trim().split('\n').slice(-8).join('\n');
    process.stderr.write(`Після правки ${rel} не зібралось (npm run ${buildScript}):\n${out}\n\nПолагодь це, перш ніж іти далі.\n`);
    process.exit(2);
  }
}

const run = spawnSync(process.execPath, ['.claude/skills/verify-site/verify.mjs', '--quick', '--no-build'], {
  cwd: root,
  encoding: 'utf8',
});
if (run.status === 0) process.exit(0);

const problems = (run.stdout || '').split('\n').filter((l) => l.startsWith('❌'));
process.stderr.write(
  `Після правки ${rel} швидка перевірка сайту знайшла проблеми:\n` +
  (problems.length ? problems.join('\n') : (run.stdout || run.stderr || 'перевірка не запустилась').trim()) +
  '\n\nПолагодь це, перш ніж іти далі (повний звіт: npm run verify:quick).\n',
);
process.exit(2);
