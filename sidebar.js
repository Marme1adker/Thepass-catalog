/**
 * sidebar.js — управление сайдбаром фильтров
 *
 * Отвечает за:
 *  - мобильный дровер (открытие / закрытие / swipe)
 *  - генерацию кнопок студий, жанров и тегов
 *  - обработку кликов по фильтрам
 *  - кнопки «Сбросить» и «Готово»
 *  - поиск по тегам внутри сайдбара
 *  - обновление активных чипов над списком
 *  - обновление счётчика на кнопке «Фильтры»
 */

// ── DOM ──────────────────────────────────────────────────────────
const sidebar       = document.getElementById('sidebar');
const overlay       = document.getElementById('sidebarOverlay');
const filterToggle  = document.getElementById('filterToggleBtn');
const filterBadge   = document.getElementById('filterBadge');
const resetBtn      = document.getElementById('resetBtn');
const doneBtn       = document.getElementById('doneBtn');
const studioList    = document.getElementById('studio-list');
const genreList     = document.getElementById('genre-list');
const tagListEl     = document.getElementById('tag-list');
const tagSearchEl   = document.getElementById('tagSearch');
const searchEl      = document.getElementById('search');
const clearBtn      = document.getElementById('clearBtn');
const activeFilters = document.getElementById('activeFilters');

// ── Дровер ───────────────────────────────────────────────────────

function openDrawer() {
  sidebar.classList.add('open');
  overlay.classList.add('open');
  document.body.classList.add('drawer-open');
}

function closeDrawer() {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
  document.body.classList.remove('drawer-open');
}

// Открытие по кнопке «Фильтры»
filterToggle.addEventListener('click', e => {
  e.stopPropagation();
  openDrawer();
});

// Закрытие по тапу на затемнение (не на сайдбар)
overlay.addEventListener('click', e => {
  if (!sidebar.contains(e.target)) closeDrawer();
});
overlay.addEventListener('touchend', e => {
  if (!sidebar.classList.contains('open')) return;
  if (e.target === overlay) {
    e.preventDefault();
    closeDrawer();
  }
});

// ── Swipe влево для закрытия ─────────────────────────────────────
let swipeStartX = 0;
let swipeCurX   = 0;
let swipeActive = false;

sidebar.addEventListener('touchstart', e => {
  if (window.innerWidth > 700) return;
  swipeStartX = e.touches[0].clientX;
  swipeActive = true;
}, { passive: true });

sidebar.addEventListener('touchmove', e => {
  if (!swipeActive) return;
  swipeCurX = e.touches[0].clientX;
  const diff = swipeCurX - swipeStartX;
  if (diff < 0) sidebar.style.transform = `translateX(${diff}px)`;
}, { passive: true });

sidebar.addEventListener('touchend', () => {
  if (!swipeActive) return;
  swipeActive = false;
  if (swipeCurX - swipeStartX < -80) closeDrawer();
  sidebar.style.transform = '';
});

// ── Клики внутри сайдбара ────────────────────────────────────────
// Используем capture-фазу, чтобы перехватить событие до overlay

sidebar.addEventListener('click', handleSidebarClick, true);
sidebar.addEventListener('touchend', handleSidebarClick, true);

// Блокируем всплытие низкоуровневых событий из сайдбара к overlay
['touchstart', 'mousedown', 'mouseup'].forEach(evt => {
  sidebar.addEventListener(evt, e => e.stopPropagation(), true);
});

function handleSidebarClick(e) {
  e.stopPropagation();

  // Кнопка-тег (студия / жанр / тег)
  const tagBtn = e.target.closest('.tag-btn[data-type]');
  if (tagBtn) {
    const { type, val } = tagBtn.dataset;
    const setMap = { studio: state.studios, genre: state.genres, tag: state.tags };
    const set = setMap[type];
    set.has(val) ? set.delete(val) : set.add(val);
    syncAndRender();
    return;
  }

  // Кнопка параметра (dlc / ru / online)
  const optBtn = e.target.closest('.tag-btn[data-opt]');
  if (optBtn) {
    const opt = optBtn.dataset.opt;
    state.opts.has(opt) ? state.opts.delete(opt) : state.opts.add(opt);
    syncAndRender();
    return;
  }

  // Сворачивание/разворачивание секции
  const hdr = e.target.closest('.sb-section-hdr');
  if (hdr) {
    hdr.parentElement.classList.toggle('collapsed');
  }
}

// ── Поиск по тегам ───────────────────────────────────────────────
tagSearchEl.addEventListener('input', () => {
  const q = tagSearchEl.value.trim().toLowerCase();
  tagListEl.querySelectorAll('.tag-btn[data-type="tag"]').forEach(btn => {
    btn.style.display = btn.dataset.val.toLowerCase().includes(q) ? '' : 'none';
  });
});

// Стоп-пропагация для всех событий поля поиска тегов
['click', 'focus', 'mousedown', 'touchstart'].forEach(evt => {
  tagSearchEl.addEventListener(evt, e => e.stopPropagation());
});

// ── Поиск по названию ────────────────────────────────────────────
searchEl.addEventListener('input', () => {
  state.query = searchEl.value.trim().toLowerCase();
  clearBtn.classList.toggle('visible', searchEl.value.length > 0);
  render();
});

clearBtn.addEventListener('click', e => {
  e.stopPropagation();
  searchEl.value = '';
  state.query = '';
  clearBtn.classList.remove('visible');
  render();
});

['click', 'focus', 'mousedown', 'touchstart'].forEach(evt => {
  searchEl.addEventListener(evt, e => e.stopPropagation());
});

// ── Кнопка «Сбросить фильтры» ────────────────────────────────────
resetBtn.addEventListener('click', e => {
  e.stopPropagation();
  state.studios.clear();
  state.genres.clear();
  state.tags.clear();
  state.opts.clear();
  state.query = '';
  searchEl.value = '';
  clearBtn.classList.remove('visible');
  syncAndRender();
});

// ── Кнопка «Готово» ──────────────────────────────────────────────
doneBtn.addEventListener('click', e => {
  e.stopPropagation();
  closeDrawer();
});

/** Обновляет текст кнопки «Готово» со счётчиком активных фильтров */
function updateDoneBtn() {
  const total =
    state.studios.size + state.genres.size +
    state.tags.size + state.opts.size;
  doneBtn.textContent = total > 0 ? `Готово (${total})` : 'Готово';
}

// ── Генерация кнопок в сайдбаре ──────────────────────────────────

/** Создаёт одну кнопку-фильтр */
function createFilterBtn(type, value, icon, label, count) {
  const btn = document.createElement('button');
  btn.className    = 'tag-btn';
  btn.dataset.type = type;
  btn.dataset.val  = value;
  btn.innerHTML    = `<span class="tag-ico">${icon}</span>${label}<span class="tag-count">${count}</span>`;
  return btn;
}

/** Строит все кнопки сайдбара (студии, жанры, теги) */
function buildSidebarButtons() {
  // Студии
  studioList.innerHTML = '';
  STUDIOS.forEach(studio => {
    const count = ALL.filter(g => g.group === studio).length;
    studioList.appendChild(createFilterBtn('studio', studio, '🎮', studio, count));
  });

  // Жанры (инди-группы) — убираем префикс «Инди • » для краткости
  genreList.innerHTML = '';
  GENRES.forEach(genre => {
    const count = ALL.filter(g => g.group === genre).length;
    const label = genre.replace('Инди • ', '');
    genreList.appendChild(createFilterBtn('genre', genre, '🕹️', label, count));
  });

  // Теги
  tagListEl.innerHTML = '';
  ALL_TAGS.forEach(tag => {
    const count = ALL.filter(g => (g.tags || []).includes(tag)).length;
    tagListEl.appendChild(createFilterBtn('tag', tag, '🏷️', tag, count));
  });
}

/** Подсвечивает активные кнопки фильтров */
function syncButtonStates() {
  document.querySelectorAll('.tag-btn[data-type]').forEach(btn => {
    const { type, val } = btn.dataset;
    const active =
      type === 'studio' ? state.studios.has(val) :
      type === 'genre'  ? state.genres.has(val)  :
      type === 'tag'    ? state.tags.has(val)     : false;
    btn.classList.toggle('active', active);
  });

  document.querySelectorAll('.tag-btn[data-opt]').forEach(btn => {
    btn.classList.toggle('active', state.opts.has(btn.dataset.opt));
  });
}

/** Обновляет чипы активных фильтров над списком */
function updateActiveFilters() {
  activeFilters.innerHTML = '';

  const addChip = (label, onRemove) => {
    const chip = document.createElement('div');
    chip.className = 'af-chip';
    chip.innerHTML = `${label}<span class="af-chip-x">×</span>`;
    chip.addEventListener('click', onRemove);
    activeFilters.appendChild(chip);
  };

  state.studios.forEach(v => addChip(v,                        () => { state.studios.delete(v); syncAndRender(); }));
  state.genres.forEach(v  => addChip(v.replace('Инди • ', ''), () => { state.genres.delete(v);  syncAndRender(); }));
  state.tags.forEach(v    => addChip(`🏷 ${v}`,               () => { state.tags.delete(v);    syncAndRender(); }));

  if (state.opts.has('dlc'))    addChip('🔖 DLC',        () => { state.opts.delete('dlc');    syncAndRender(); });
  if (state.opts.has('ru'))     addChip('🇷🇺 Русский',   () => { state.opts.delete('ru');     syncAndRender(); });
  if (state.opts.has('online')) addChip('🌐 Онлайн',     () => { state.opts.delete('online'); syncAndRender(); });

  // Счётчик на кнопке «Фильтры» (мобиль)
  const total =
    state.studios.size + state.genres.size +
    state.tags.size + state.opts.size;
  filterBadge.textContent = total;
  filterBadge.classList.toggle('show', total > 0);
}

/** Синхронизирует UI и перерисовывает каталог */
function syncAndRender() {
  syncButtonStates();
  updateActiveFilters();
  updateDoneBtn();
  render();
}
