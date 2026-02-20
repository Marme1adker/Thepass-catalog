/**
 * app.js — точка входа приложения
 *
 * Отвечает за:
 *  - инициализацию Telegram WebApp
 *  - функцию sendToBot() — отправка выбранной игры в бот
 *  - загрузку данных и первый рендер
 */

// ── Telegram WebApp ──────────────────────────────────────────────
const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0f0d17');
  tg.setBackgroundColor('#0f0d17');
}

/**
 * Отправляет название игры в Telegram-бот.
 * Если приложение открыто вне Telegram — показывает тост.
 * @param {string} name — название игры
 * @param {object} game — объект игры (для добавления в историю)
 */
function sendToBot(name, game) {
  if (tg) {
    tg.sendData(name);
  } else {
    showToast(`✅ Отправлено: ${name}`);
  }

  if (game) addToHistory(game);
}

// ── Загрузка и запуск ────────────────────────────────────────────
(async () => {
  // Показываем лоадер
  listEl.innerHTML = `
    <div class="loader">
      <div class="loader-spinner"></div>
      <div class="loader-text">Загрузка каталога...</div>
    </div>
  `;

  try {
    const games = await fetchGames();

    // Дедупликация по title
    const seen = new Set();
    ALL = games.filter(game => {
      if (!game.title || seen.has(game.title)) return false;
      seen.add(game.title);
      return true;
    });

    // Собираем индексы для фильтров
    STUDIOS  = [...new Set(ALL.filter(g => !g.group.startsWith('Инди')).map(g => g.group))];
    GENRES   = [...new Set(ALL.filter(g =>  g.group.startsWith('Инди')).map(g => g.group))];
    ALL_TAGS = [...new Set(ALL.flatMap(g => g.tags || []))].sort();

    // Инициализация UI
    buildSidebarButtons();
    syncButtonStates();
    renderHistory();
    render();

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
