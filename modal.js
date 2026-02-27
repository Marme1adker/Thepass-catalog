/**
 * modal.js — модальное окно подтверждения поиска
 *
 * ФИКС: все getElementById и addEventListener перенесены внутрь
 *       DOMContentLoaded — элементы гарантированно существуют
 * ФИКС: null-проверки перед каждым .addEventListener
 */

let pendingGame = null;

// Геттеры — вызываем только когда DOM уже готов
function _el(id) { return document.getElementById(id); }

function openModal(game) {
  const modalOverlay = _el('modalOverlay');
  const modalImg     = _el('modalImg');
  const modalTitle   = _el('modalTitle');
  const modalMeta    = _el('modalMeta');
  const modalTags    = _el('modalTags');
  const modalSource  = _el('modalSource');
  const modalFavBtn  = _el('modalFavBtn');
  const modalCancel  = _el('modalCancel');

  if (!modalOverlay) return;

  pendingGame = game;

  // Убираем класс закрытия если остался
  modalOverlay.classList.remove('closing');

  // Обложка
  if (modalImg) {
    modalImg.style.display = 'block';
    modalImg.src = game.img || '';
    modalImg.alt = escapeHtml(game.title);

    const ph = modalImg.parentNode?.querySelector('.modal-img-placeholder');
    if (ph) ph.style.display = 'none';

    modalImg.onerror = function () {
      this.style.display = 'none';
      const ph2 = this.parentNode?.querySelector('.modal-img-placeholder');
      if (ph2) ph2.style.display = 'flex';
    };
  }

  // Заголовок + студия + DLC
  if (modalTitle) modalTitle.textContent = game.title;
  if (modalMeta) {
    modalMeta.innerHTML =
      `<span>📁 ${escapeHtml(game.group)}</span>` +
      (game.hasDlc ? ' <span class="modal-dlc">DLC</span>' : '');
  }

  // Источник
  if (modalSource) {
    const isLocal = game.source === 'local';
    modalSource.className = `modal-source ${isLocal ? 'local' : 'steam'}`;
    modalSource.textContent = isLocal ? '⚡ Локальная база' : '🔵 База данных';
  }

  // Теги
  if (modalTags) {
    const tags = game.tags || [];
    const opts = game.opts || [];
    const tagItems = tags.map(t => `<span class="modal-tag">${escapeHtml(t)}</span>`);
    if (opts.includes('ru'))     tagItems.push('<span class="modal-tag">🇷🇺 Русский</span>');
    if (opts.includes('online')) tagItems.push('<span class="modal-tag">🌐 Онлайн</span>');
    modalTags.innerHTML = tagItems.join('');
  }

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
    if (modalCancel) actionsEl.insertBefore(shareBtn, modalCancel);
    else actionsEl.appendChild(shareBtn);
  } else if (actionsEl) {
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
  const modalOverlay = _el('modalOverlay');
  if (!modalOverlay || !modalOverlay.classList.contains('open')) return;

  modalOverlay.classList.add('closing');

  setTimeout(() => {
    modalOverlay.classList.remove('open');
    modalOverlay.classList.remove('closing');
    document.body.style.overflow = '';
    pendingGame = null;
  }, 200);
}

// ── Навешиваем слушатели только когда DOM готов ──────────────────
document.addEventListener('DOMContentLoaded', () => {
  const modalOverlay = _el('modalOverlay');
  const modalCancel  = _el('modalCancel');
  const modalConfirm = _el('modalConfirm');
  const modalFavBtn  = _el('modalFavBtn');

  // Избранное в модалке
  modalFavBtn?.addEventListener('click', e => {
    e.stopPropagation();
    if (pendingGame) toggleFavorite(pendingGame);
  });

  // Отмена
  modalCancel?.addEventListener('click', closeModal);

  // Клик по оверлею
  modalOverlay?.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });

  // Подтверждение — отправить в бот
  modalConfirm?.addEventListener('click', () => {
    if (!pendingGame) return;
    addToHistory(pendingGame);
    sendToBot(pendingGame.title, pendingGame);
    closeModal();
  });
});

// Escape — глобально
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const modalOverlay = _el('modalOverlay');
  if (modalOverlay?.classList.contains('open')) closeModal();
  else if (typeof closeDrawer === 'function') closeDrawer();
});