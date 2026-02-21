/**
 * app.js — точка входа приложения
 *
 * Изменения:
 *  - addToHistory вызывается в modal.js до tg.sendData()
 *  - горячие клавиши: / и Ctrl+F фокусируют поиск, ? открывает статистику
 *  - pull-to-refresh на мобиле
 *  - восстановление фильтров из sessionStorage
 */

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0f0d17');
  tg.setBackgroundColor('#0f0d17');
}

function sendToBot(name, game) {
  if (tg) {
    tg.sendData(name);
  } else {
    showToast(`✅ Отправлено: ${name}`);
  }
  // history добавляется в modal.js ДО этого вызова
}

// ── Загрузка и запуск ────────────────────────────────────────────
(async () => {
  listEl.innerHTML = `
    <div class="loader">
      <div class="loader-spinner"></div>
      <div class="loader-text">Загрузка каталога...</div>
    </div>
  `;

  try {
    const games = await fetchGames();

    const seen = new Set();
    ALL = games.filter(game => {
      if (!game.title || seen.has(game.title)) return false;
      seen.add(game.title);
      return true;
    });

    STUDIOS  = [...new Set(ALL.filter(g => !g.group.startsWith('Инди')).map(g => g.group))];
    GENRES   = [...new Set(ALL.filter(g =>  g.group.startsWith('Инди')).map(g => g.group))];
    ALL_TAGS = [...new Set(ALL.flatMap(g => g.tags || []))].sort();

    // Восстановить фильтры из sessionStorage
    restoreFilters();
    restoreFilterUI();

    buildSidebarButtons();
    syncButtonStates();
    renderHistory();
    renderFavorites();
    render();

    // Секции сворачиваем по умолчанию (Студия, Жанр, Теги)
    ['sec-studio', 'sec-genre', 'sec-tags'].forEach(id => {
      document.getElementById(id)?.classList.add('collapsed');
    });

  } catch (err) {
    console.error('Ошибка загрузки каталога:', err);
    listEl.innerHTML = `
      <div class="loader">
        <div class="empty-icon">⚠️</div>
        <div class="loader-text">Ошибка загрузки данных</div>
      </div>
    `;
  }
})();

// ── Горячие клавиши ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  // Игнорируем если фокус в input/textarea
  const tag = document.activeElement?.tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  // / или Ctrl+F → фокус на поиск
  if ((e.key === '/' && !inInput) || (e.ctrlKey && e.key === 'f')) {
    e.preventDefault();
    const searchEl = document.getElementById('search');
    if (searchEl) {
      searchEl.focus();
      searchEl.select();
      // На мобиле открываем дровер
      if (window.innerWidth <= 700) openDrawer();
    }
    return;
  }

  // ? → статистика
  if (e.key === '?' && !inInput) {
    toggleStats();
    return;
  }
});

// ── Кнопка статистики в шапке ────────────────────────────────────
document.getElementById('statsBtn')?.addEventListener('click', toggleStats);

// ── Pull-to-refresh (мобиль) ─────────────────────────────────────
let ptr_startY   = 0;
let ptr_pulling  = false;
let ptr_el       = null;

document.addEventListener('touchstart', e => {
  if (window.scrollY > 0) return;
  ptr_startY  = e.touches[0].clientY;
  ptr_pulling = true;
}, { passive: true });

document.addEventListener('touchmove', e => {
  if (!ptr_pulling) return;
  const dy = e.touches[0].clientY - ptr_startY;
  if (dy > 60 && !ptr_el) {
    ptr_el = document.createElement('div');
    ptr_el.className = 'ptr-indicator';
    ptr_el.textContent = '↓ Обновить';
    document.body.prepend(ptr_el);
  }
  if (ptr_el) ptr_el.style.opacity = Math.min(dy / 120, 1);
}, { passive: true });

document.addEventListener('touchend', e => {
  if (!ptr_pulling) return;
  ptr_pulling = false;
  const dy = e.changedTouches[0].clientY - ptr_startY;
  if (ptr_el) { ptr_el.remove(); ptr_el = null; }
  if (dy > 100) {
    // Перезагружаем каталог
    renderHistory();
    renderFavorites();
    render();
    showToast('🔄 Обновлено');
  }
});