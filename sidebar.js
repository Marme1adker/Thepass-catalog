/**
 * sidebar.js — управление сайдбаром фильтров
 *
 * Изменения:
 *  - debounce на поиск (150мс) — ФИХ #UX-1
 *  - badge pop-анимация при смене счётчика — ФИХ #UX-4
 *  - счётчик filterBadge учитывает source
 *  - счётчик активных фильтров на заголовках секций
 *  - секции Теги / Студии / Жанры свёрнуты по умолчанию
 *  - исправлен swipeCurX сброс при touchstart
 *  - сохранение фильтров через state.saveFilters()
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
const sourceLocal   = document.getElementById('sourceLocal');
const sourceSteam   = document.getElementById('sourceSteam');
const sourceMarme   = document.getElementById('sourceMarme');
const sortSel       = document.getElementById('sortSelect');

// ── Debounce ──────────────────────────────────────────────────────
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

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

filterToggle.addEventListener('click', e => { e.stopPropagation(); openDrawer(); });

overlay.addEventListener('click', e => {
  if (!sidebar.contains(e.target)) closeDrawer();
});
overlay.addEventListener('touchend', e => {
  if (!sidebar.classList.contains('open')) return;
  if (e.target === overlay) { e.preventDefault(); closeDrawer(); }
});

// ── Swipe ────────────────────────────────────────────────────────
let swipeStartX = 0;
let swipeCurX   = 0;
let swipeActive = false;

sidebar.addEventListener('touchstart', e => {
  if (window.innerWidth > 700) return;
  swipeStartX = e.touches[0].clientX;
  swipeCurX   = swipeStartX;
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
sidebar.addEventListener('click', handleSidebarClick, true);
sidebar.addEventListener('touchend', handleSidebarClick, true);

['touchstart', 'mousedown', 'mouseup'].forEach(evt => {
  sidebar.addEventListener(evt, e => e.stopPropagation(), true);
});

function handleSidebarClick(e) {
  e.stopPropagation();

  // Источник
  const srcBtn = e.target.closest('.tag-btn[data-source]');
  if (srcBtn) {
    const val = srcBtn.dataset.source;
    if (val === 'marme1adker') {
      state.marme1adker = !state.marme1adker;
    } else {
      state.source = (state.source === val) ? null : val;
    }
    syncAndRender(); return;
  }

  // Студия / жанр / тег
  const tagBtn = e.target.closest('.tag-btn[data-type]');
  if (tagBtn) {
    const { type, val } = tagBtn.dataset;
    const setMap = { studio: state.studios, genre: state.genres, tag: state.tags };
    const set = setMap[type];
    if (set) { set.has(val) ? set.delete(val) : set.add(val); }
    syncAndRender(); return;
  }

  // Параметры
  const optBtn = e.target.closest('.tag-btn[data-opt]');
  if (optBtn) {
    const opt = optBtn.dataset.opt;
    state.opts.has(opt) ? state.opts.delete(opt) : state.opts.add(opt);
    syncAndRender(); return;
  }

  // Сворачивание секции
  const hdr = e.target.closest('.sb-section-hdr');
  if (hdr) hdr.parentElement.classList.toggle('collapsed');
}

// ── Поиск по тегам внутри сайдбара ───────────────────────────────
tagSearchEl.addEventListener('input', () => {
  const q = tagSearchEl.value.trim().toLowerCase();
  tagListEl.querySelectorAll('.tag-btn[data-type="tag"]').forEach(btn => {
    btn.style.display = btn.dataset.val.toLowerCase().includes(q) ? '' : 'none';
  });
});
['click', 'focus', 'mousedown', 'touchstart'].forEach(evt => {
  tagSearchEl.addEventListener(evt, e => e.stopPropagation());
});

// ── Поиск по названию (с debounce) ───────────────────────────────
const _doSearch = debounce(() => {
  state.query = searchEl.value;
  render();
  saveFilters();
}, 150);

searchEl.addEventListener('input', () => {
  clearBtn.classList.toggle('visible', searchEl.value.length > 0);
  _doSearch();
});

clearBtn.addEventListener('click', e => {
  e.stopPropagation();
  searchEl.value = '';
  state.query = '';
  clearBtn.classList.remove('visible');
  render();
  saveFilters();
});
['click', 'focus', 'mousedown', 'touchstart'].forEach(evt => {
  searchEl.addEventListener(evt, e => e.stopPropagation());
});

// ── Сортировка ───────────────────────────────────────────────────
sortSel.addEventListener('change', () => {
  state.sort = sortSel.value;
  render();
  saveFilters();
});

// ── Кнопка «Сбросить фильтры» ────────────────────────────────────
resetBtn.addEventListener('click', e => {
  e.stopPropagation();
  state.studios.clear();
  state.genres.clear();
  state.tags.clear();
  state.opts.clear();
  state.source      = null;
  state.marme1adker = false;
  state.sort        = 'default';
  state.query  = '';
  searchEl.value = '';
  clearBtn.classList.remove('visible');
  if (sortSel) sortSel.value = 'default';
  syncAndRender();
});

// ── Кнопка «Готово» ──────────────────────────────────────────────
doneBtn.addEventListener('click', e => { e.stopPropagation(); closeDrawer(); });

function updateDoneBtn() {
  const total = totalActiveFilters();
  doneBtn.textContent = total > 0 ? `Готово (${total})` : 'Готово';
}

function totalActiveFilters() {
  return state.studios.size + state.genres.size +
    state.tags.size + state.opts.size + (state.source ? 1 : 0) + (state.marme1adker ? 1 : 0);
}

// ── Генерация кнопок в сайдбаре ──────────────────────────────────

function createFilterBtn(type, value, icon, label, count) {
  const btn = document.createElement('button');
  btn.className    = 'tag-btn';
  btn.dataset.type = type;
  btn.dataset.val  = value;
  btn.innerHTML = `<span class="tag-ico">${icon}</span>${escapeHtml(label)}<span class="tag-count">${count}</span>`;
  return btn;
}

function buildSidebarButtons() {
  studioList.innerHTML = '';
  STUDIOS.forEach(studio => {
    const count = ALL.filter(g => g.group === studio).length;
    studioList.appendChild(createFilterBtn('studio', studio, '🎮', studio, count));
  });

  genreList.innerHTML = '';
  GENRES.forEach(genre => {
    const count = ALL.filter(g => g.group === genre).length;
    const label = genre.replace('Инди • ', '');
    genreList.appendChild(createFilterBtn('genre', genre, '🕹️', label, count));
  });

  tagListEl.innerHTML = '';
  ALL_TAGS.forEach(tag => {
    const count = ALL.filter(g => (g.tags || []).includes(tag)).length;
    tagListEl.appendChild(createFilterBtn('tag', tag, '🏷️', tag, count));
  });
}

// ── Синхронизация активных состояний ─────────────────────────────

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
  if (sourceLocal) sourceLocal.classList.toggle('active', state.source === 'local');
  if (sourceSteam) sourceSteam.classList.toggle('active', state.source === 'steam');
  if (sourceMarme) sourceMarme.classList.toggle('active', state.marme1adker);

  updateSectionCounters();
}

function updateSectionCounters() {
  const sections = {
    'sec-studio': state.studios.size,
    'sec-genre':  state.genres.size,
    'sec-tags':   state.tags.size,
    'sec-opts':   state.opts.size,
    'sec-source': (state.source ? 1 : 0) + (state.marme1adker ? 1 : 0),
  };
  Object.entries(sections).forEach(([id, count]) => {
    const sec = document.getElementById(id);
    if (!sec) return;
    let badge = sec.querySelector('.sb-section-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sb-section-badge';
      const hdr = sec.querySelector('.sb-section-hdr');
      if (hdr) {
        const chevron = hdr.querySelector('.sb-chevron');
        hdr.insertBefore(badge, chevron);
      }
    }
    badge.textContent = count > 0 ? count : '';
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

// ── Активные чипы над списком ─────────────────────────────────────

function updateActiveFilters() {
  activeFilters.innerHTML = '';

  const addChip = (label, onRemove) => {
    const chip = document.createElement('div');
    chip.className = 'af-chip';
    chip.innerHTML = `${escapeHtml(label)}<span class="af-chip-x">×</span>`;
    chip.addEventListener('click', onRemove);
    activeFilters.appendChild(chip);
  };

  state.studios.forEach(v => addChip(v,                        () => { state.studios.delete(v); syncAndRender(); }));
  state.genres.forEach(v  => addChip(v.replace('Инди • ', ''), () => { state.genres.delete(v);  syncAndRender(); }));
  state.tags.forEach(v    => addChip(`🏷 ${v}`,               () => { state.tags.delete(v);    syncAndRender(); }));

  if (state.opts.has('dlc'))    addChip('🔖 DLC',        () => { state.opts.delete('dlc');    syncAndRender(); });
  if (state.opts.has('ru'))     addChip('🇷🇺 Русский',   () => { state.opts.delete('ru');     syncAndRender(); });
  if (state.opts.has('online')) addChip('🌐 Онлайн',     () => { state.opts.delete('online'); syncAndRender(); });
  if (state.source === 'local') addChip('⚡ Локальные',   () => { state.source = null; syncAndRender(); });
  if (state.source === 'steam') addChip('🔵 База данных', () => { state.source = null; syncAndRender(); });
  if (state.marme1adker)        addChip('➕ Plus',  () => { state.marme1adker = false; syncAndRender(); });

  // Обновляем badge с pop-анимацией
  const total   = totalActiveFilters();
  const prevVal = parseInt(filterBadge.textContent || '0', 10);

  filterBadge.textContent = total;
  filterBadge.classList.toggle('show', total > 0);

  // Pop только если счётчик вырос
  if (total > prevVal && total > 0) {
    filterBadge.classList.remove('pop');
    void filterBadge.offsetWidth; // reflow для перезапуска анимации
    filterBadge.classList.add('pop');
  }
}

// ── Главная функция синхронизации ────────────────────────────────

function syncAndRender() {
  syncButtonStates();
  updateActiveFilters();
  updateDoneBtn();
  saveFilters();
  render();
}

// ── Восстановление UI при загрузке (вызывается из app.js) ────────

function restoreFilterUI() {
  if (state.query) {
    searchEl.value = state.query;
    clearBtn.classList.add('visible');
  }
  if (state.sort && sortSel) {
    sortSel.value = state.sort;
  }
}