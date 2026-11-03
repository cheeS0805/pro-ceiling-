#!/usr/bin/env node
// Хук SessionStart: на початку кожної сесії підказує Claude, де ми зупинились —
// наступний крок із PLAN.md, незакомічені зміни й останні коміти.
// Ідея — з хука session-context у конфігу керівника; реалізація своя.

import { execSync } from 'node:child_process';
import { readFileSync, writeSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || resolve(import.meta.dirname, '../..');
const sh = (cmd) => { try { return execSync(cmd, { cwd: root, encoding: 'utf8' }).trim(); } catch { return ''; } };

// Прогрес із PLAN.md
let done = 0;
let next = 'усі кроки плану виконано 🎉';
try {
  const plan = readFileSync(resolve(root, 'PLAN.md'), 'utf8');
  const progress = plan.split('## Прогрес')[1] || '';
  done = (progress.match(/^- \[x\] \d+\./gm) || []).length;
  // Усі відкриті пункти, коротко (до « — »): деякі кроки просто чекають на дані від Максима
  const open = [...progress.matchAll(/^- \[ \] (.+)$/gm)].map((m) => m[1].split(' — ')[0].trim());
  if (open.length) next = `відкриті пункти — ${open.join('; ')}`;
} catch { /* немає PLAN.md — просто пропускаємо */ }

const status = sh('git status --short');
const commits = sh('git log --oneline -5');

const lines = [
  '[PRO CEILING — де ми зупинились]',
  `План: виконано кроків ${done} з 10. Наступне: ${next}. Деталі й прогрес — PLAN.md.`,
  status
    ? `Незакомічені зміни (не загуби їх і спитай перед комітом):\n${status}`
    : 'Робоча папка чиста — усе закомічено.',
  commits && `Останні коміти:\n${commits}`,
].filter(Boolean);

writeSync(1, JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lines.join('\n') },
}));
