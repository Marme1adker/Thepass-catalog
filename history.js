/**
 * history.js — история просмотров (localStorage)
 *
 * Исправления:
 *  - ФИХ #1: historyClear?.addEventListener — защита от null
 */

const HISTORY_KEY = 'thepass_history';
const HISTORY_MAX = 10;

const _tgStorageHist = window.Telegram?.WebApp?.CloudStorage;

function loadHistory() {
  try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveHistory(list) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    _tgStorageHist?.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {}
}

// При загрузке — восстанавливаем из CloudStorage если sessionStorage пуст
if (_tgStorageHist) {
  _tgStorageHist.getItem(HISTORY_KEY, (err, value) => {
    if (!err && value) {
      try {
        if (!sessionStorage.getItem(HISTORY_KEY)) {
          sessionStorage.setItem(HISTORY_KEY, value);
          renderHistory();
        }
      } catch {}
    }
  });
}

function addToHistory(game) {
  let history = loadHistory().filter(x => x.title !== game.title);
  history.unshift({ title: game.title, short: game.short || '', img: game.img, ts: Date.now() });
  if (history.length > HISTORY_MAX) history = history.slice(0, HISTORY_MAX);
  saveHistory(history);
  renderHistory();
}

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)     return 'только что';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)} мин`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч`;
  return `${Math.floor(diff / 86_400_000)} д`;
}

function renderHistory() {
  const history = loadHistory();
  const panel   = document.getElementById('historyPanel');
  const list    = document.getElementById('historyList');
  if (!panel || !list) return;

  if (!history.length) { panel.classList.remove('visible'); return; }
  panel.classList.add('visible');

  list.innerHTML = history.map(item => `
    <div class="history-chip" data-title="${escapeHtml(item.title)}">
      🎮 ${escapeHtml(item.title)}
      <span class="history-chip-time">${formatTime(item.ts)}</span>
    </div>
  `).join('');

  list.querySelectorAll('.history-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const game = ALL.find(g => g.title === chip.dataset.title);
      if (game) openModal(game);
    });
  });
}

// ФИХ #1: используем ?. чтобы не падать если элемент не найден
document.getElementById('historyClear')?.addEventListener('click', () => {
  saveHistory([]);
  renderHistory();
});
