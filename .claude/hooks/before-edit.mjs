#!/usr/bin/env node
// Хук PreToolUse: спрацьовує ДО правки файлу і може її зупинити.
//
//  • styles.css, script.js — генеруються збіркою → правку ЗАБОРОНЕНО, з підказкою, де правити.
//  • index.html — ЗАБОРОНЕНО, якщо з'являється номер, якого немає в .claude/contacts.json,
//    або справжній номер повністю зникає. Перенести номер чи додати кнопку з відомим — можна.
//  • .claude/contacts.json — ЗАБОРОНЕНО для Claude: список справжніх номерів змінює лише людина вручну.
//
// Чому не «ask»: в авторежимі відповідь «спитати» може вирішити автоперевірка, а не людина.
// Відповідь — JSON у stdout із permissionDecision: "deny". Мовчання (код 0) = дозволено.

import { existsSync, readFileSync, writeSync } from 'node:fs';
import { relative, resolve } from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;

let data;
try { data = JSON.parse(input || '{}'); } catch { process.exit(0); }
const toolInput = data.tool_input || {};
const file = toolInput.file_path || '';
const root = process.env.CLAUDE_PROJECT_DIR || resolve(import.meta.dirname, '../..');
const rel = relative(root, resolve(root, file)).replace(/\\/g, '/');
if (!file || rel.startsWith('..')) process.exit(0);

const decide = (permissionDecision, reason) => {
  // writeSync, а не process.stdout.write: на Windows запис у pipe асинхронний,
  // і process.exit() одразу після нього губить відповідь.
  writeSync(1, JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason: reason },
  }));
  process.exit(0);
};

// 1. Згенеровані файли
const GENERATED = {
  'styles.css': 'src/scss/ (кольори й розміри — у src/scss/_tokens.scss)',
  'script.js': 'src/script.ts',
};
if (GENERATED[rel]) {
  decide('deny', `${rel} генерується збіркою (npm run build) — ручна правка зникне при наступній збірці. Редагуй ${GENERATED[rel]}; хук після правки сам збере ${rel}.`);
}

// 2. Список справжніх телефонів — тільки людина, вручну
if (rel === '.claude/contacts.json') {
  decide('deny', 'contacts.json — список справжніх телефонів PRO CEILING, його змінює лише людина вручну у VS Code (хуки обмежують тільки Claude). Попроси користувачку оновити номер у .claude/contacts.json, а потім онови сайт.');
}

// 3. Телефони на сайті
if (rel === 'index.html') {
  // Переноси рядків зводимо до \n: файл може мати віндові \r\n, а Edit їх не розрізняє
  const lf = (s) => String(s ?? '').replace(/\r\n/g, '\n');
  const before = existsSync(file) ? lf(readFileSync(file, 'utf8')) : '';

  // «Приміряємо» правку: яким стане файл після неї
  const apply = (text, oldS, newS, all) => {
    const o = lf(oldS);
    const n = lf(newS);
    if (!o) return text;
    return all ? text.split(o).join(n) : text.replace(o, () => n);
  };
  let after = before;
  if (data.tool_name === 'Write') after = lf(toolInput.content);
  else if (Array.isArray(toolInput.edits)) for (const e of toolInput.edits) after = apply(after, e.old_string, e.new_string, e.replace_all);
  else after = apply(after, toolInput.old_string, toolInput.new_string, toolInput.replace_all);

  // Усі телефони у файлі: tel:-посилання і видимі номери «0XX XXX XX XX»
  const phones = (text) => {
    const count = {};
    for (const m of text.matchAll(/tel:(\+?\d+)|\b(0\d{2} \d{3} \d{2} \d{2})\b/g)) {
      const key = m[1] ? `tel:${m[1]}` : m[2];
      count[key] = (count[key] || 0) + 1;
    }
    return count;
  };
  const a = phones(before);
  const b = phones(after);
  const changes = [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((k) => (a[k] || 0) !== (b[k] || 0))
    .map((k) => `${k}: ${a[k] || 0} → ${b[k] || 0}`);

  if (changes.length) {
    const contacts = JSON.parse(readFileSync(resolve(root, '.claude/contacts.json'), 'utf8')).phones;
    const known = new Set(contacts.flatMap((p) => [`tel:${p.tel}`, p.text]));
    const unknown = Object.keys(b).filter((k) => !known.has(k));
    const vanished = Object.keys(a).filter((k) => known.has(k) && !b[k]);
    if (unknown.length || vanished.length) {
      decide('deny',
        `Правку зупинено: вона змінює телефони на сайті (${changes.join('; ')}).` +
        (unknown.length ? ` Номерів ${unknown.join(', ')} немає в .claude/contacts.json.` : '') +
        (vanished.length ? ` Справжній номер повністю зникає з сайту: ${vanished.join(', ')}.` : '') +
        ' Якщо номер справді змінився — попроси користувачку спершу вручну оновити .claude/contacts.json, тоді правка пройде.');
    }
    // Інакше всі номери відомі й жоден не зник (перенесли / додали кнопку) — дозволено
  }
}

process.exit(0);
