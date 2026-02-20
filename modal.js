/**
 * modal.js — модальное окно подтверждения поиска игры
 *
 * Открывается при клике на карточку игры.
 * При нажатии «Найти» вызывает sendToBot() и сохраняет игру в историю.
 */

/** Игра, ожидающая подтверждения */
let pendingGame = null;

// DOM-элементы модалки
const modalOverlay = document.getElementById('modalOverlay');
const modalImg     = document.getElementById('modalImg');
const modalTitle   = document.getElementById('modalTitle');
const modalMeta    = document.getElementById('modalMeta');
const modalTags    = document.getElementById('modalTags');
const modalCancel  = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');

/** Открывает модалку с данными игры */
function openModal(game) {
  pendingGame = game;

  // Обложка
  modalImg.style.display = 'block';
  modalImg.src = game.img || '';
  modalImg.alt = game.title;
  modalImg.onerror = function () {
    this.style.display = 'none';
    const ph = this.parentNode.querySelector('.modal-img-placeholder');
    if (ph) ph.style.display = 'flex';
  };

  // Сбрасываем placeholder если был показан
  const placeholder = modalImg.parentNode.querySelector('.modal-img-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  // Заголовок и студия
  modalTitle.textContent = game.title;
  modalMeta.innerHTML =
    `<span>📁 ${game.group}</span>` +
    (game.hasDlc ? ' <span class="modal-dlc">DLC</span>' : '');

  // Теги
  const tags = game.tags || [];
  const opts = game.opts || [];
  const tagItems = tags.map(t => `<span class="modal-tag">${t}</span>`);
  if (opts.includes('ru'))     tagItems.push('<span class="modal-tag">🇷🇺 Русский</span>');
  if (opts.includes('online')) tagItems.push('<span class="modal-tag">🌐 Онлайн</span>');
  modalTags.innerHTML = tagItems.join('');

  // Открываем
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/** Закрывает модалку */
function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  pendingGame = null;
}

// ── Обработчики ──────────────────────────────────────────────────

modalCancel.addEventListener('click', closeModal);

// Закрытие по клику на затемнение (не на само окно)
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

// Закрытие по Escape
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (modalOverlay.classList.contains('open')) closeModal();
  else closeDrawer();
});

// Подтверждение — отправить в бот и сохранить в историю
modalConfirm.addEventListener('click', () => {
  if (!pendingGame) return;
  sendToBot(pendingGame.title, pendingGame);
  closeModal();
});
