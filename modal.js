/**
 * modal.js — модальное окно подтверждения поиска
 *
 * Изменения:
 *  - бейдж источника (⚡ Локальная / 🔵 База данных)
 *  - кнопка избранного ❤️
 *  - addToHistory вызывается ДО tg.sendData() чтобы успело записаться
 */

let pendingGame = null;

const modalOverlay = document.getElementById('modalOverlay');
const modalImg     = document.getElementById('modalImg');
const modalTitle   = document.getElementById('modalTitle');
const modalMeta    = document.getElementById('modalMeta');
const modalTags    = document.getElementById('modalTags');
const modalSource  = document.getElementById('modalSource');
const modalCancel  = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const modalFavBtn  = document.getElementById('modalFavBtn');

function openModal(game) {
  pendingGame = game;

  // Обложка
  modalImg.style.display = 'block';
  modalImg.src = game.img || '';
  modalImg.alt = escapeHtml(game.title);

  // Сбрасываем placeholder
  const ph = modalImg.parentNode.querySelector('.modal-img-placeholder');
  if (ph) ph.style.display = 'none';

  modalImg.onerror = function () {
    this.style.display = 'none';
    const ph2 = this.parentNode.querySelector('.modal-img-placeholder');
    if (ph2) ph2.style.display = 'flex';
  };

  // Заголовок + студия + DLC
  modalTitle.textContent = game.title;
  modalMeta.innerHTML =
    `<span>📁 ${escapeHtml(game.group)}</span>` +
    (game.hasDlc ? ' <span class="modal-dlc">DLC</span>' : '');

  // Источник
  if (modalSource) {
    const isLocal = game.source === 'local';
    modalSource.className = `modal-source ${isLocal ? 'local' : 'steam'}`;
    modalSource.textContent = isLocal ? '⚡ Локальная база' : '🔵 База данных';
  }

  // Теги
  const tags = game.tags || [];
  const opts = game.opts || [];
  const tagItems = tags.map(t => `<span class="modal-tag">${escapeHtml(t)}</span>`);
  if (opts.includes('ru'))     tagItems.push('<span class="modal-tag">🇷🇺 Русский</span>');
  if (opts.includes('online')) tagItems.push('<span class="modal-tag">🌐 Онлайн</span>');
  modalTags.innerHTML = tagItems.join('');

  // Кнопка избранного
  if (modalFavBtn) {
    modalFavBtn.dataset.title = game.title;
    const fav = isFavorite(game.title);
    modalFavBtn.textContent = fav ? '❤️' : '🤍';
    modalFavBtn.classList.toggle('active', fav);
    modalFavBtn.title = fav ? 'Убрать из избранного' : 'В избранное';
  }

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  pendingGame = null;
}

// Избранное в модалке
if (modalFavBtn) {
  modalFavBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (pendingGame) toggleFavorite(pendingGame);
  });
}

modalCancel.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (modalOverlay.classList.contains('open')) closeModal();
  else if (typeof closeDrawer === 'function') closeDrawer();
});

// ФИХ: addToHistory ДО sendData — чтобы localStorage успел записаться
// перед закрытием WebApp
modalConfirm.addEventListener('click', () => {
  if (!pendingGame) return;
  addToHistory(pendingGame);   // сначала история
  sendToBot(pendingGame.title, pendingGame);
  closeModal();
});