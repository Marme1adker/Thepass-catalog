/**
 * modal.js — модальное окно подтверждения поиска
 *
 * Изменения:
 *  - анимация закрытия (.closing класс)
 *  - кнопка «Поделиться» (копирует название в буфер)
 *  - addToHistory вызывается ДО tg.sendData()
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

  // Убираем класс закрытия если остался
  modalOverlay.classList.remove('closing');

  // Обложка
  modalImg.style.display = 'block';
  modalImg.src = game.img || '';
  modalImg.alt = escapeHtml(game.title);

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

  // Добавляем кнопку «Поделиться» если её ещё нет
  const actionsEl = document.querySelector('.modal-actions');
  if (actionsEl && !actionsEl.querySelector('.modal-btn-share')) {
    const shareBtn = document.createElement('button');
    shareBtn.className = 'modal-btn modal-btn-share';
    shareBtn.title = 'Скопировать название';
    shareBtn.textContent = '📋';
    shareBtn.addEventListener('click', e => {
      e.stopPropagation();
      navigator.clipboard?.writeText(game.title).then(() => {
        showToast('📋 Название скопировано');
        shareBtn.textContent = '✅';
        setTimeout(() => { shareBtn.textContent = '📋'; }, 1500);
      }).catch(() => showToast('❌ Ошибка копирования'));
    });
    // Вставляем перед кнопкой Отмена
    actionsEl.insertBefore(shareBtn, modalCancel);
  } else if (actionsEl) {
    // Обновляем обработчик для новой игры
    const existing = actionsEl.querySelector('.modal-btn-share');
    if (existing) {
      existing.onclick = e => {
        e.stopPropagation();
        navigator.clipboard?.writeText(game.title).then(() => {
          showToast('📋 Название скопировано');
          existing.textContent = '✅';
          setTimeout(() => { existing.textContent = '📋'; }, 1500);
        }).catch(() => showToast('❌ Ошибка копирования'));
      };
    }
  }

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (!modalOverlay.classList.contains('open')) return;

  // Запускаем анимацию закрытия
  modalOverlay.classList.add('closing');

  setTimeout(() => {
    modalOverlay.classList.remove('open');
    modalOverlay.classList.remove('closing');
    document.body.style.overflow = '';
    pendingGame = null;
  }, 200);
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

// ФИХ: addToHistory ДО sendData
modalConfirm.addEventListener('click', () => {
  if (!pendingGame) return;
  addToHistory(pendingGame);
  sendToBot(pendingGame.title, pendingGame);
  closeModal();
});