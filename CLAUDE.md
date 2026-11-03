# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Проєкт

Односторінковий лендинг **PRO CEILING** — натяжні стелі в Черкасах і Смілі. Мова сайту й спілкування — українська.

Це навчальний проєкт: користувачка (18 років) відпрацьовує курси Anthropic Academy. **Перед кожним «крок N» читай [PLAN.md](PLAN.md)** — там кроки, прогрес і як пояснювати (простими словами, що/навіщо/з якого уроку, частину дій давати робити їй самій). Після кроку став `[x]` у PLAN.md.

## Команди

```bash
npm install          # один раз: ставить sass і typescript
npm run build        # src/scss → styles.css, src/script.ts → script.js
npm run build:css    # лише стилі
npm run build:ts     # лише TS (це ж і перевірка типів, strict)
npm run watch:css    # перезбирати стилі при збереженні
npm run watch:ts
npm run serve        # http://127.0.0.1:8000/ (= py -m http.server 8000)
```

- Перевірка: **`npm run verify`** (повна, ~30 с: збірка, файли, телефони, кліки й ширина в headless Chrome, скриншоти) або `npm run verify:quick` (без браузера, ~0,5 с). Деталі — skill `verify-site`. Лінтера немає.
- **Плагін `landing-guard@sonia-plugins`** (джерело — `C:\Users\User\claude-plugins\plugins\landing-guard`, увімкнений у `.claude/settings.json`). Усе конкретне для цього сайту — у **`.claude/landing-guard.json`** (телефони, згенеровані файли, збірка, перевірка, план). Його хуки:
  - **PostToolUse**: після кожного Edit/Write файлів `index.html`, `src/`, `package.json`, `tsconfig.json` сам збирає змінене (SCSS → `build:css`, TS → `build:ts`) і запускає `verify --quick`. ❌ від нього — не збій, а сигнал: полагодь, перш ніж іти далі. Окремо `npm run build` після правок у `src/` запускати не треба.
  - **PreToolUse**: ДО правки забороняє редагувати `styles.css`/`script.js` і `.claude/landing-guard.json`, ставити в `index.html` номер не зі списку або прибирати справжній номер повністю. Отримав відмову — не обходь (через Bash теж), а поясни користувачці, що зробити: новий номер вона сама вписує в `landing-guard.json`.
  - **SessionStart** — контекст «де ми зупинились»; **UserPromptSubmit** — попередження про номер не зі списку в повідомленні.
  - Skills плагіна: `landing-guard:debugging` (баг чи дивна поведінка: відтворити → ізолювати → причина → виправити → довести) і `landing-guard:setup`.
- **`permissions.allow`** і `enabledPlugins` у `settings.json` задає користувачка вручну — Claude їх сам не розширює. Змінюєш код плагіна — це окремий git-репозиторій `claude-plugins`; після змін `claude plugin update landing-guard@sonia-plugins` і перезапуск сесії.
- На цій машині `python` — заглушка Microsoft Store; Python запускати через **`py`**.
- Скриншот без браузера: `"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --hide-scrollbars --force-prefers-reduced-motion --window-size=1280,6400 --virtual-time-budget=6000 --screenshot=out.png http://127.0.0.1:8000/`. Headless Chrome не вміє вікно вужче ~500px — мобільний вигляд перевіряй на `600,1500` (це вже мобільна версія, < 900px) або через iframe потрібної ширини.

## Архітектура

**Джерела в `src/`, результат у корені.** `styles.css` і `script.js` генеруються збіркою і закомічені (щоб сайт працював без збірки й відкривався подвійним кліком). **Ніколи не редагуй їх руками** — правки затреться наступним `npm run build`. Змінив `src/` → запусти збірку і закоміть обидва.

**`index.html`** — уся розмітка й тексти, статично (жодних шаблонів). Скрипт знаходить елементи через `id` і `data-*`:
- `data-calc="…"` — місця, куди калькулятор пише числа; `data-type` / `data-texture` — кнопки-перемикачі; `data-work` — картки портфоліо (без номерів: кількість і порядок скрипт бере з HTML; справжня робота містить `<img class="work__img">`, заглушка — `.work__bg`); `data-menu-close` — закриває мобільне меню.
- `data-reveal` (+ `data-delay` у мс), `data-glow`, `data-float`, `data-marquee`, `data-pulse`, `data-progress` — хуки анімацій.
- Показ/приховування — атрибутом `hidden` (у CSS `[hidden] { display: none !important }`) і класами `is-open` / `is-active`.

**`src/script.ts`** — увесь інтерактив, без бібліотек. `$()` кидає помилку з назвою селектора, якщо елемента немає в HTML — тож перейменовуючи `id`/`data-*` в `index.html`, онови й TS. ДЕМО-ціни калькулятора (`TYPES`, `LIGHT_PRICE`) — заглушки на початку файлу; таблиця цін в `index.html` — окремі заглушки `[ціна]`, вони не пов'язані.

**`src/scss/`** — `styles.scss` лише підключає частини (`@use`) у порядку секцій на сторінці; новий файл секції додай туди. Кожна частина починається з `@use 'tokens' as *; @use 'mixins' as *;`.
- **`_tokens.scss`** — єдине джерело кольорів, шрифтів, розмірів тексту, заокруглень, тіней, швидкостей, z-index і брейкпоінтів. У файлах секцій **не пиши нових hex/rgb** — додай токен або використай наявний; прозорість через `rgba($blue, 0.5)`.
- **`_mixins.scss`**: `@include hover { … }` — єдиний спосіб писати hover (він обгорнутий у `@media (hover: hover)`, щоб не «залипав» на телефоні); `mobile` / `desktop`; `pill-button(...)`; `wrap`; `smooth`.
- Глобальне `:where(a:hover) { color: $yellow }` має нульову специфічність навмисно: посилання-кнопки зі своїм `color` не мають жовтіти.
- Значення CSS-змінних у Sass інтерполюються: `--logo-bg: #{$bg};` (без `#{}` у CSS потрапить буквально `$bg`).

**Брейкпоінт 900px задано двічі** — `$mobile-max`/`$desktop-min` у `_tokens.scss` і `MOBILE_QUERY` у `src/script.ts`. Міняєш один — міняй обидва.

## Правила контенту

- Справжні дані: Черкаси та Сміла; телефони Максима й Іллі — єдиний список `"phones"` у `.claude/landing-guard.json` (його читають `verify` і плагін); Instagram `@_proceiling`.
- Усе в квадратних дужках — заглушки: `[ціна]`, `[email]`, `[строк гарантії]`, `[графік роботи]`, `[вулиця, будинок]`, `[рік]`, `[@нікнейм]`… **Не замінювати вигаданим.** Не додавати відгуків, років досвіду, кількості об'єктів, рейтингів.
- Портфоліо: фото лежать у `images/portfolio/`, додавати **тільки через skill `add-portfolio-item`** (`.claude/skills/`) — він стискає фото й вставляє картку за шаблоном. Поки справжніх фото немає, там смугасті заглушки. Форма заявки нічого не надсилає (лише показує «Дякуємо»), бекенду немає.

## Відомі пастки

- Тексти FAQ є у двох місцях: секція «Часті питання» і JSON-LD `FAQPage` унизу `index.html` (для Google). Змінив питання чи відповідь — зміни в обох. Так само `meta description` і `og:description` мають збігатися.
- Сторінка не має бути ширшою за екран телефона. Елемент з `aspect-ratio` + `min-height` розтягується вшир (так було з блоком «до/після» `.ba` — виправлено `max-width: 100%`). Перевірка: на ширині 375px `document.documentElement.scrollWidth === clientWidth`.
- Коміти — українською, по одному на логічну зміну.
