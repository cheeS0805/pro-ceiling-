# PRO CEILING — план практичного проєкту

## Мета

Це навчальний проєкт: після курсів Anthropic Academy (Claude 101, Cowork, Claude Code 101,
Agent Skills, Subagents, Claude Code in Action) відпрацювати **на практиці** все з курсів —
CLAUDE.md, skills, hooks, субагентів, MCP, плагіни — на справжньому сайті.

Сайт — лендинг фірми натяжних стель **PRO CEILING**.

**Як допомагати:** користувачка вчиться (18 років). Пояснювати українською, простими словами.
На кожному кроці казати, **що** робимо, **навіщо** і **з якого уроку курсу** це. Частину дій
давати робити їй самій (Shift+Tab, /init, /agents, /hooks), підказуючи.

## Посібник: конспекти всіх курсів

**«Зошит з Claude»** — https://claude.ai/artifact/2pyh1dJJEGFiJyQ7Zk1Tpp

Це сайт-артефакт з конспектами всіх 6 курсів, які пройшла користувачка: головна думка кожного
уроку, терміни англійською з поясненням, приклади, «Перевір себе». Там саме ті формулювання й
приклади, на яких вона вчилася, — посилайся на них, коли пояснюєш («як в уроці 2.4 Hooks курсу
Claude Code in Action…»).

- Читати його інструментом **Artifact** (`action: "read"`, `url` вище), не WebFetch.
- Вкладки курсів: Claude 101 · Claude Cowork · Claude Code 101 · Agent Skills · Subagents ·
  Claude Code in Action. У кожної свій «Словник курсу».
- Особливо корисні: **★ Шпаргалка «Що є що»** в Claude Code 101 (CLAUDE.md vs skills vs
  субагенти vs MCP vs hooks, аналогія зі школою) та підсумкова сторінка Claude Code in Action.
- Позначення уроків у кроках нижче: CC101 = Claude Code 101, In Action = Claude Code in Action.
- Сайт не редагувати без її прохання (це окремий проєкт).

## Що вже є

- Дизайн зроблено в Claude Design, експорт «Архів проєкту».
- `index.html` — сторінка. Стилі пишемо в `src/scss/` (SCSS), логіку в `src/script.ts` (TypeScript). `npm run build` збирає з них `styles.css` і `script.js` у корені — **ці два файли руками не редагувати**. Локально: `npm run serve` (= `py -m http.server 8000`).
- Дизайн-версії v1–v3 (`.dc.html`) і `support.js` видалено — вони є в історії Git (4cd97d6).
- Стиль: темний фон `#0e1014`, жовтий `#f2d41c`, синій `#3f63c9`, шрифт Onest.
- Реальні дані: Черкаси та Сміла, Instagram @\_proceiling, телефони Максима та Іллі.
  Решта (ціни, email, адреса, фото робіт) — заглушки. **Не вигадувати** відгуків, років досвіду, кількості об'єктів.

## Кроки (кожен — тема з курсів)

1. **Git + перший коміт** «як є з дизайну». _(CC101 3.1, 3.3)_
2. **Plan mode** (Shift+Tab): план перетворення v3 у звичайний HTML + CSS без `support.js`; виконати. _(CC101 2.2, 3.1; In Action 1.1)_
3. **/init → CLAUDE.md** проєкту (бренд, кольори, правила, «заглушки не вигадувати»); особистий `~/.claude/CLAUDE.md`. _(CC101 4.1; In Action 2.1)_
4. **Skill «add-portfolio-item»** — додати роботу в портфоліо за шаблоном. _(Agent Skills 1–3)_
5. **Verification skill** — перевірка сайту: валідний HTML, посилання, картинки, телефони. _(In Action 2.2)_
6. **Hook PostToolUse** — після кожного редагування перевірка, exit 2 при помилці. _(CC101 4.5; In Action 2.4)_
7. **Hook PreToolUse** — захист контактів/телефонів від випадкових змін. _(In Action 2.4)_
8. **Субагент-рецензент** (лише читання, формат звіту + Obstacles): тексти, SEO, мобільний вигляд. _(Subagents 1–4)_
9. **Claude in Chrome (MCP)** — відкрити сайт і перевірити вигляд у браузері. _(CC101 4.4)_
10. **Запакувати** skills/hooks/агента в **плагін**. _(In Action 4.2)_

Далі (за бажанням): реальні фото, форма заявки (Telegram-бот), публікація на хостинг.

## Прогрес

- [x] Дизайн у Claude Design, архів розпаковано
- [x] 1. Git + перший коміт (4cd97d6)
- [x] 2. Plan mode: v3 → звичайний HTML + CSS + JS (+ виправлено смугу на мобільному, + hover-ефекти)
- [x] Додатково: TypeScript (`src/script.ts`) і SCSS (`src/scss/`), збірка `npm run build`
- [x] 3. /init → CLAUDE.md проєкту (32bee20) + особистий ~/.claude/CLAUDE.md
- [x] Додатково: токени дизайну в `src/scss/_tokens.scss` (764c7cc)
- [ ] 4. Skill «add-portfolio-item» — готовий і протестований (6e99625, ec8e5e0); ✅ після першого справжнього фото від Макса
- [x] 5. Skill «verify-site»: `npm run verify` / `verify:quick` (09751e3)
- [x] 6. Hook PostToolUse: `.claude/settings.json` → `.claude/hooks/after-edit.mjs` (збірка + verify:quick, exit 2 при ❌)
- [x] 7. Hook PreToolUse: `.claude/hooks/before-edit.mjs` — заборона чужих номерів, правок `contacts.json` і згенерованих файлів
- [x] 8. Субагент `site-reviewer` (`.claude/agents/`) + правки за його звітом: SEO, тексти, доступність, мобільний вигляд
- [x] 9. Claude in Chrome (MCP): перевірка в справжньому Chrome — 375px, Tab, консоль, калькулятор; знайдено й виправлено баг із заголовками під шапкою; GIF калькулятора
- [x] 10. Плагін `landing-guard@sonia-plugins` (окремий репозиторій `C:\Users\User\claude-plugins`): 4 хуки + skills `debugging` і `setup`, налаштування сайту в `.claude/landing-guard.json`
