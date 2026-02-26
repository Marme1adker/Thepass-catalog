/**
 * favorites.js — избранное (localStorage)
 *
 * Хранит игры добавленные в избранное.
 * Кнопка ❤️ на карточках и в модалке.
 */

const FAV_KEY = 'thepass_favorites';

// Используем sessionStorage как основное хранилище,
// с попыткой синхронизировать через Telegram CloudStorage если доступен
const tgStorage = window.Telegram?.WebApp?.CloudStorage;

function loadFavorites() {
  try { return JSON.parse(sessionStorage.getItem(FAV_KEY) || '[]'); }
  catch { return []; }
}

function saveFavorites(list) {
  try {
    sessionStorage.setItem(FAV_KEY, JSON.stringify(list));
    // Дублируем в CloudStorage если доступен (асинхронно, не блокирует UI)
    tgStorage?.setItem(FAV_KEY, JSON.stringify(list));
  } catch {}
}

// При загрузке страницы — пробуем восстановить из CloudStorage
if (tgStorage) {
  tgStorage.getItem(FAV_KEY, (err, value) => {
    if (!err && value) {
      try {
        // Берём CloudStorage только если sessionStorage пуст
        if (!sessionStorage.getItem(FAV_KEY)) {
          sessionStorage.setItem(FAV_KEY, value);
          renderFavorites();
        }
      } catch {}
    }
  });
}

function isFavorite(title) {
  return loadFavorites().some(f => f.title === title);
}

function toggleFavorite(game) {
  let favs = loadFavorites();
  const idx = favs.findIndex(f => f.title === game.title);
  if (idx >= 0) {
    favs.splice(idx, 1);
    showToast(`💔 Убрано из избранного`);
  } else {
    favs.unshift({ title: game.title, short: game.short || '', img: game.img, source: game.source });
    showToast(`❤️ Добавлено в избранное`);
  }
  saveFavorites(favs);
  renderFavorites();
  // Обновить кнопки на карточках
  document.querySelectorAll(`.fav-btn[data-title="${CSS.escape(game.title)}"]`).forEach(btn => {
    btn.classList.toggle('active', isFavorite(game.title));
    btn.title = isFavorite(game.title) ? 'Убрать из избранного' : 'В избранное';
  });
  // Обновить кнопку в модалке если открыта
  const modalFavBtn = document.getElementById('modalFavBtn');
  if (modalFavBtn && modalFavBtn.dataset.title === game.title) {
    modalFavBtn.classList.toggle('active', isFavorite(game.title));
    modalFavBtn.textContent = isFavorite(game.title) ? '❤️' : '🤍';
  }
}

function renderFavorites() {
  const panel = document.getElementById('favPanel');
  const list  = document.getElementById('favList');
  const count = document.getElementById('favCount');
  if (!panel || !list) return;

  const favs = loadFavorites();

  if (count) count.textContent = favs.length || '';

  if (!favs.length) { panel.classList.remove('visible'); return; }
  panel.classList.add('visible');

  list.innerHTML = favs.map(item => `
    <div class="fav-chip" data-title="${escapeHtml(item.title)}">
      ${item.source === 'local' ? '⚡' : '🔵'} ${escapeHtml(item.title)}
    </div>
  `).join('');

  list.querySelectorAll('.fav-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const game = ALL.find(g => g.title === chip.dataset.title);
      if (game) openModal(game);
    });
  });
}

// Кнопка очистки избранного
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('favClear')?.addEventListener('click', () => {
    saveFavorites([]);
    renderFavorites();
    showToast('🗑️ Избранное очищено');
  });
});
