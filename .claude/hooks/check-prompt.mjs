#!/usr/bin/env node
// Хук UserPromptSubmit: спрацьовує, коли користувачка відправляє повідомлення,
// ще ДО того, як його побачить Claude. Якщо в повідомленні є номер телефону,
// якого немає в .claude/contacts.json, — попереджає (нічого не блокує):
//   • користувачку — рядком у інтерфейсі (systemMessage);
//   • Claude — підказкою в контексті (additionalContext).

import { readFileSync, writeSync } from 'node:fs';
import { resolve } from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;

let prompt = '';
try { prompt = JSON.parse(input || '{}').prompt || ''; } catch { process.exit(0); }

// Номери на кшталт 063 389 06 18, 0633890618, +380 63 389-06-18, +380633890618
const found = [...prompt.matchAll(/(?:\+?38)?[\s(-]*0\d{2}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b/g)]
  .map((m) => ({ raw: m[0].trim(), key: m[0].replace(/\D/g, '').slice(-9) }));
if (!found.length) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || resolve(import.meta.dirname, '../..');
let known = new Set();
try {
  const { phones } = JSON.parse(readFileSync(resolve(root, '.claude/contacts.json'), 'utf8'));
  known = new Set(phones.map((p) => p.tel.replace(/\D/g, '').slice(-9)));
} catch { process.exit(0); }

const unknown = [...new Map(found.filter((f) => !known.has(f.key)).map((f) => [f.key, f.raw])).values()];
if (!unknown.length) process.exit(0);

writeSync(1, JSON.stringify({
  systemMessage: `⚠️ У повідомленні є номер, якого немає в .claude/contacts.json: ${unknown.join(', ')}. Якщо це новий номер Максима чи Іллі — спершу онови contacts.json вручну.`,
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: `Хук: у повідомленні користувачки номер(и) ${unknown.join(', ')}, яких немає в .claude/contacts.json. Не став їх на сайт (PreToolUse однаково заборонить). Уточни, чий це номер, і якщо він справжній — попроси її вручну оновити .claude/contacts.json.`,
  },
}));
