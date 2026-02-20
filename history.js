/**
 * history.js — история просмотров (localStorage)
 *
 * Хранит последние HISTORY_MAX игр, на которые пользователь нажал «Найти».
 * При каждом обновлении перерисовывает панель истории в DOM.
 */

const HISTORY_KEY = 'thepass_history';
const HISTORY_MAX = 10;

/** Читает историю из localStorage */
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Сохраняет историю в localStorage */
function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch { /* нет доступа к localStorage */ }
}

/**
 * Добавляет игру в начало истории.
 * Если игра уже есть — перемещает её наверх.
 */
function addToHistory(game) {
  let history = loadHistory().filter(x => x.title !== game.title);

  history.unshift({
    title: game.title,
    short: game.short || '',
    img:   game.img,
    ts:    Date.now(),
  });

  if (history.length > HISTORY_MAX) history = history.slice(0, HISTORY_MAX);

  saveHistory(history);
  renderHistory();
}

/** Форматирует разницу времени в читаемый вид */
function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)   return 'только что';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч`;
  return `${Math.floor(diff / 86_400_000)} д`;
}

/** Перерисовывает панель истории */
function renderHistory() {
  const history = loadHistory();
  const panel   = document.getElementById('historyPanel');
  const list    = document.getElementById('historyList');

  if (!history.length) {
    panel.classList.remove('visible');
    return;
  }

  panel.classList.add('visible');

  list.innerHTML = history.map(item => `
    <div class="history-chip" data-title="${item.title}">
      🎮 ${item.title}
      <span class="history-chip-time">${formatTime(item.ts)}</span>
    </div>
  `).join('');

  // Клик по чипу → открыть модалку
  list.querySelectorAll('.history-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const game = ALL.find(g => g.title === chip.dataset.title);
      if (game) openModal(game);
    });
  });
}

// Кнопка очистки истории
document.getElementById('historyClear').addEventListener('click', () => {
  saveHistory([]);
  renderHistory();
});
