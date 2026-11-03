// PRO CEILING — інтерактив лендингу.
// Це джерело на TypeScript. Браузер отримує скомпільований script.js:
// після змін запусти `npm run build` (або тримай відкритим `npm run watch:ts`).

// ---------- Типи ----------
type CeilingTypeId = 'mat' | 'gloss' | 'satin' | 'two' | 'print' | 'led' | 'float';
type TextureId = 'mat' | 'gloss' | 'satin';

interface CeilingType {
  id: CeilingTypeId;
  label: string;
  /** Ціна за м², грн */
  price: number;
}

interface Texture {
  id: TextureId;
  label: string;
  /** Яскравість відблиску: від 0 (мат) до 1 (дзеркало) */
  shine: number;
  /** CSS-фон прев'ю */
  bg: string;
  desc: string;
}

interface CalcState {
  area: number;
  type: CeilingTypeId;
  lights: number;
}

// ---------- Дані ----------
// ДЕМО-ціни (заглушки) — замініть на реальні
const TYPES: readonly CeilingType[] = [
  { id: 'mat', label: 'Матова', price: 400 },
  { id: 'gloss', label: 'Глянцева', price: 450 },
  { id: 'satin', label: 'Сатинова', price: 450 },
  { id: 'two', label: 'Двоярусна', price: 900 },
  { id: 'print', label: 'З фотодруком', price: 1100 },
  { id: 'led', label: 'З підсвіткою', price: 800 },
  { id: 'float', label: '«Ширяюча»', price: 700 },
];
const LIGHT_PRICE = 150;

const TEXTURES: readonly Texture[] = [
  { id: 'mat', label: 'Мат', shine: 0, bg: 'linear-gradient(180deg,#f3f2ef,#e8e6e2)', desc: 'Рівна поверхня без блиску, схожа на ідеально пофарбовану стелю. Підходить для будь-якого інтер\'єру й класичних кімнат.' },
  { id: 'gloss', label: 'Глянець', shine: 0.95, bg: 'linear-gradient(160deg,#e9ecf1 0%,#c9ced8 38%,#f7f8fa 52%,#bfc5d0 66%,#e6e9ee 100%)', desc: 'Дзеркальний ефект відбиває світло й меблі, кімната здається вищою. Гарно виглядає в невеликих приміщеннях.' },
  { id: 'satin', label: 'Сатин', shine: 0.45, bg: 'linear-gradient(165deg,#f1eee8,#e3ded5 45%,#f3f0ea 58%,#ddd8ce)', desc: 'М\'який перламутровий відблиск без дзеркальності. Поверхня ніби тканинна, змінює відтінок залежно від освітлення.' },
];

const MOBILE_QUERY = window.matchMedia('(max-width: 899.98px)');

// ---------- Помічники ----------
/** Знаходить один елемент. Якщо його немає в HTML — одразу зрозуміла помилка в консолі. */
function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`PRO CEILING: не знайдено елемент ${selector}`);
  return el;
}

function $$<T extends HTMLElement = HTMLElement>(selector: string): NodeListOf<T> {
  return document.querySelectorAll<T>(selector);
}

const fmt = (n: number): string => n.toLocaleString('uk-UA');

document.addEventListener('DOMContentLoaded', () => {
  initMenu();
  initCallButton();
  initTextures();
  initCalculator();
  initBeforeAfter();
  initLightbox();
  initFaq();
  initForm();
  initKeyboard();
  initScrollProgress();
  initAnimations();
});

// ---------- Мобільне меню ----------
let menuOpen = false;

function setMenu(open: boolean): void {
  menuOpen = open;
  $('#mobile-menu').hidden = !open;
  $<HTMLButtonElement>('#menu-open').setAttribute('aria-expanded', String(open));
}

function initMenu(): void {
  $<HTMLButtonElement>('#menu-open').addEventListener('click', () => setMenu(!menuOpen));
  $$('[data-menu-close]').forEach((el) => el.addEventListener('click', () => setMenu(false)));
  // Перехід на десктопну ширину закриває меню (як у дизайні)
  MOBILE_QUERY.addEventListener('change', (e) => { if (!e.matches) setMenu(false); });
}

// ---------- Плаваюча кнопка дзвінка ----------
function initCallButton(): void {
  const btn = $<HTMLButtonElement>('#call-toggle');
  const list = $('#call-list');
  btn.addEventListener('click', () => {
    const open = list.hidden;
    list.hidden = !open;
    btn.textContent = open ? '×' : 'Дзвінок';
    btn.setAttribute('aria-expanded', String(open));
  });
}

// ---------- Зразки фактур ----------
function initTextures(): void {
  const buttons = $$<HTMLButtonElement>('[data-texture]');
  const preview = $('#texture-preview');
  const shine = $('#texture-shine');
  const desc = $('#texture-desc');
  const label = $('#texture-label');

  const pick = (id: string | undefined): void => {
    const tex = TEXTURES.find((t) => t.id === id);
    if (!tex) return;
    buttons.forEach((b) => b.classList.toggle('is-active', b.dataset.texture === tex.id));
    preview.style.background = tex.bg;
    shine.style.background =
      `linear-gradient(115deg,transparent 30%,rgba(255,255,255,${tex.shine}) 48%,transparent 62%)`;
    desc.textContent = tex.desc;
    label.textContent = `${tex.label} · імітація`;
  };

  buttons.forEach((b) => b.addEventListener('click', () => pick(b.dataset.texture)));
  pick('mat');
}

// ---------- Калькулятор ----------
function initCalculator(): void {
  const state: CalcState = { area: 20, type: 'mat', lights: 6 };
  const typeButtons = $$<HTMLButtonElement>('[data-type]');
  const range = $<HTMLInputElement>('#calc-area');

  const setText = (key: string, value: string | number): void => {
    $$(`[data-calc="${key}"]`).forEach((el) => { el.textContent = String(value); });
  };

  const render = (): void => {
    const t = TYPES.find((x) => x.id === state.type);
    if (!t) return;
    const sumCeil = state.area * t.price;
    const sumLights = state.lights * LIGHT_PRICE;
    typeButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.type === state.type));
    setText('area', state.area);
    setText('lights', state.lights);
    setText('typeLabel', t.label);
    setText('typePrice', fmt(t.price));
    setText('lightPrice', fmt(LIGHT_PRICE));
    setText('sumCeil', fmt(sumCeil));
    setText('sumLights', fmt(sumLights));
    setText('total', fmt(sumCeil + sumLights));
  };

  range.value = String(state.area);
  range.addEventListener('input', () => { state.area = Number(range.value); render(); });
  typeButtons.forEach((b) => b.addEventListener('click', () => {
    const type = TYPES.find((x) => x.id === b.dataset.type);
    if (!type) return;
    state.type = type.id;
    render();
  }));
  $<HTMLButtonElement>('#lights-inc').addEventListener('click', () => { state.lights = Math.min(60, state.lights + 1); render(); });
  $<HTMLButtonElement>('#lights-dec').addEventListener('click', () => { state.lights = Math.max(0, state.lights - 1); render(); });
  render();
}

// ---------- До / після ----------
function initBeforeAfter(): void {
  const range = $<HTMLInputElement>('#ba-range');
  const before = $('#ba-before');
  const line = $('#ba-line');
  const update = (): void => {
    const v = Number(range.value);
    before.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
    line.style.left = `${v}%`;
  };
  range.value = '50';
  range.addEventListener('input', update);
  update();
}

// ---------- Лайтбокс портфоліо ----------
// Кількість робіт не задана в коді: скрипт рахує кнопки [data-work] в index.html.
// Справжня робота містить <img class="work__img">, заглушка — ні.

/** Усі картки портфоліо в порядку, як на сторінці */
let works: HTMLButtonElement[] = [];
/** Номер відкритої роботи (з нуля) або null, якщо лайтбокс закритий */
let lb: number | null = null;

function setLightbox(i: number | null): void {
  lb = i;
  $('#lightbox').hidden = i === null;
  if (i === null) return;

  const photo = works[i]?.querySelector<HTMLImageElement>('.work__img');
  const big = $<HTMLImageElement>('#lightbox-img');
  big.hidden = !photo;
  if (photo) {
    big.src = photo.currentSrc || photo.src;
    big.alt = photo.alt;
  } else {
    big.removeAttribute('src');
  }
  const caption = photo ? `${photo.alt} ·` : 'Фото роботи';
  $('#lightbox-label').textContent = `${caption} ${i + 1} / ${works.length}`;
}

/** Крок по колу: +1 — наступна робота, -1 — попередня */
function stepLightbox(delta: 1 | -1): void {
  if (lb === null || works.length === 0) return;
  setLightbox((lb + delta + works.length) % works.length);
}

function initLightbox(): void {
  works = Array.from($$<HTMLButtonElement>('[data-work]'));
  works.forEach((b, i) => b.addEventListener('click', () => setLightbox(i)));
  $('#lightbox').addEventListener('click', () => setLightbox(null));
  $('#lightbox-stage').addEventListener('click', (e) => e.stopPropagation());
  $<HTMLButtonElement>('#lightbox-prev').addEventListener('click', () => stepLightbox(-1));
  $<HTMLButtonElement>('#lightbox-next').addEventListener('click', () => stepLightbox(1));
}

// ---------- FAQ: відкрите одне питання ----------
function initFaq(): void {
  const items = $$('.faq-item');
  items.forEach((item) => {
    const question = item.querySelector<HTMLButtonElement>('.faq-item__q');
    question?.addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');
      items.forEach((other) => {
        const open = other === item && willOpen;
        other.classList.toggle('is-open', open);
        other.querySelector('.faq-item__q')?.setAttribute('aria-expanded', String(open));
      });
    });
  });
}

// ---------- Форма заявки (поки без справжньої відправки) ----------
function initForm(): void {
  const form = $<HTMLFormElement>('#request-form');
  const thanks = $('#request-thanks');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.hidden = true;
    thanks.hidden = false;
  });
  $<HTMLButtonElement>('#request-reset').addEventListener('click', () => {
    thanks.hidden = true;
    form.hidden = false;
  });
}

// ---------- Клавіатура: Esc, ← → ----------
function initKeyboard(): void {
  window.addEventListener('keydown', (e) => {
    if (lb === null) {
      if (e.key === 'Escape') setMenu(false);
      return;
    }
    if (e.key === 'Escape') setLightbox(null);
    if (e.key === 'ArrowRight') stepLightbox(1);
    if (e.key === 'ArrowLeft') stepLightbox(-1);
  });
}

// ---------- Прогрес прокручування в шапці ----------
function initScrollProgress(): void {
  const bar = $('[data-progress]');
  const onScroll = (): void => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---------- Анімації (вимикаються, якщо в системі ввімкнено «менше руху») ----------
function initAnimations(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  $$('[data-pulse]').forEach((el) => el.animate(
    [{ transform: 'scale(1)', opacity: 0.6 }, { transform: 'scale(1.7)', opacity: 0 }],
    { duration: 1800, iterations: Infinity, easing: 'ease-out' }));

  $$('[data-glow]').forEach((el, i) => el.animate(
    [{ opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }],
    { duration: 4200 + i * 900, delay: i * 600, iterations: Infinity, easing: 'ease-in-out' }));

  $$('[data-float]').forEach((el, i) => {
    const base = getComputedStyle(el).transform;
    const b = base === 'none' ? '' : base;
    const dx = i % 2 ? -10 : 10;
    const dy = i % 2 ? 10 : -10;
    el.animate(
      [{ transform: `${b} translate(0,0)` }, { transform: `${b} translate(${dx}px,${dy}px)` }, { transform: `${b} translate(0,0)` }],
      { duration: 7000, iterations: Infinity, easing: 'ease-in-out' });
  });

  $$('[data-marquee]').forEach((el) => el.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }],
    { duration: 45000, iterations: Infinity }));

  // Поява блоків під час прокручування
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target as HTMLElement;
    el.animate([{ opacity: 0, transform: 'translateY(36px)' }, { opacity: 1, transform: 'none' }],
      { duration: 850, delay: Number(el.dataset.delay ?? 0), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    el.style.opacity = '';
    io.unobserve(el);
  }), { threshold: 0.12 });
  $$('[data-reveal]').forEach((el) => { el.style.opacity = '0'; io.observe(el); });
}
