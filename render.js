/**
 * render.js — отрисовка каталога игр
 *
 * Изменения:
 *  - source-badge перенесён на отдельную строку под названием
 *  - анимация появления карточек (fadeInUp с задержкой по индексу)
 *  - исправлен двойной .slice(0,3)
 *  - кнопка ❤️ на каждой карточке (список и сетка)
 *  - XSS-безопасный pubHdr через escapeHtml
 */

const listEl   = document.getElementById('list');
const emptyEl  = document.getElementById('empty');
const countEl  = document.getElementById('countNum');
const btnList  = document.getElementById('btnList');
const btnGrid  = document.getElementById('btnGrid');
const toastEl  = document.getElementById('toast');

let view       = 'list';
let toastTimer = null;

// ── Утилиты ──────────────────────────────────────────────────────

function hl(text, query) {
  if (!query) return escapeHtml(text);
  const norm    = normalizeQuery(query);
  const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Подсвечиваем по нормализованному запросу в исходном тексте
  const re = new RegExp(`(${escaped})`, 'gi');
  return escapeHtml(text).replace(re, '<mark>$1</mark>');
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// ФИХ: XSS-безопасный pubHdr
function pubHdr(name, extraClass = '') {
  const el = document.createElement('div');
  el.className = `pub-header${extraClass ? ' ' + extraClass : ''}`;
  const safeName = escapeHtml(name);
  el.innerHTML = `
    <div class="pub-dot"></div>
    <div class="pub-name">${safeName}</div>
    <div class="pub-line"></div>
  `;
  return el;
}

// ── Source badge HTML ─────────────────────────────────────────────

function sourceBadgeHtml(source) {
  if (source === 'local') return '<span class="source-badge local">⚡ Локальная</span>';
  return '<span class="source-badge steam">🔵 База данных</span>';
}

// ── Рендер списком ───────────────────────────────────────────────

function renderList(grouped, query) {
  let cardIndex = 0;
  Object.entries(grouped).forEach(([groupName, games]) => {
    if (groupName !== '_') listEl.appendChild(pubHdr(groupName));

    games.forEach(game => {
      const card = document.createElement('div');
      card.className = 'list-card';
      // Анимация — задержка по индексу (максимум 20 карточек с задержкой)
      card.style.animationDelay = `${Math.min(cardIndex, 20) * 30}ms`;
      cardIndex++;

      // ФИХ: один раз вычисляем теги
      const gameTags = game.tags || [];
      const tagsHtml = gameTags.length
        ? `<div class="list-tags">${gameTags.map(t => `<span class="list-tag">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

      const dlcBadge = game.hasDlc ? '<span class="dlc-tag">DLC</span>' : '';

      card.innerHTML = `
        <div class="list-icon">
          <img
            src="${escapeHtml(game.img)}" alt=""
            loading="lazy"
            onerror="this.style.display='none';this.parentNode.innerHTML='🎮'"
          >
        </div>
        <div class="list-info">
          <div class="list-row">
            <div class="list-title">${hl(game.title, query)}</div>
            ${dlcBadge}
          </div>
          <div class="list-source-row">${sourceBadgeHtml(game.source)}</div>
          <div class="list-sub">${escapeHtml(game.short || '')}</div>
          ${tagsHtml}
        </div>
        <button class="fav-btn ${isFavorite(game.title) ? 'active' : ''}"
          data-title="${escapeHtml(game.title)}"
          title="${isFavorite(game.title) ? 'Убрать из избранного' : 'В избранное'}">
          ${isFavorite(game.title) ? '❤️' : '🤍'}
        </button>
        <div class="list-arrow">›</div>
      `;

      // Клик по карточке → модалка
      card.addEventListener('click', e => {
        if (e.target.closest('.fav-btn')) return;
        openModal(game);
      });

      // Клик по ❤️
      card.querySelector('.fav-btn').addEventListener('click', e => {
        e.stopPropagation();
        toggleFavorite(game);
      });

      listEl.appendChild(card);
    });
  });
}

// ── Рендер сеткой ────────────────────────────────────────────────

function renderGrid(grouped, query) {
  let cardIndex = 0;
  Object.entries(grouped).forEach(([groupName, games]) => {
    if (groupName !== '_') listEl.appendChild(pubHdr(groupName, 'grid-pub-hdr'));

    const row = document.createElement('div');
    row.className = 'grid-wrap';

    games.forEach(game => {
      const card = document.createElement('div');
      card.className = `grid-card${game.hasDlc ? ' is-dlc' : ''}`;
      card.style.animationDelay = `${Math.min(cardIndex, 20) * 35}ms`;
      cardIndex++;

      // ФИХ: один раз нарезаем теги
      const topTags = (game.tags || []).slice(0, 3);
      const tagsHtml = topTags.length
        ? `<div class="grid-tags">${topTags.map(t => `<span class="grid-tag">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

      const displayGroup = groupName === '_' ? game.group : groupName;
      const isLocal = game.source === 'local';

      card.innerHTML = `
        <div class="grid-img">
          <img
            src="${escapeHtml(game.img)}" alt="${escapeHtml(game.title)}"
            loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
          >
          <div class="grid-placeholder" style="display:none">🎮</div>
          <div class="grid-badge">${escapeHtml(game.short || '')}</div>
          ${game.hasDlc ? '<div class="grid-dlc-badge">DLC</div>' : ''}
          <div class="grid-source-badge ${isLocal ? 'local' : 'steam'}">${isLocal ? '⚡' : '🔵'}</div>
        </div>
        <div class="grid-info">
          <div class="grid-title">${hl(game.title, query)}</div>
          <div class="grid-pub">${escapeHtml(displayGroup)}</div>
          ${tagsHtml}
        </div>
        <button class="grid-fav-btn fav-btn ${isFavorite(game.title) ? 'active' : ''}"
          data-title="${escapeHtml(game.title)}"
          title="${isFavorite(game.title) ? 'Убрать из избранного' : 'В избранное'}">
          ${isFavorite(game.title) ? '❤️' : '🤍'}
        </button>
      `;

      card.addEventListener('click', e => {
        if (e.target.closest('.fav-btn')) return;
        openModal(game);
      });
      card.querySelector('.fav-btn').addEventListener('click', e => {
        e.stopPropagation();
        toggleFavorite(game);
      });

      row.appendChild(card);
    });

    listEl.appendChild(row);
  });
}

// ── Главный рендер ───────────────────────────────────────────────

function render() {
  const filtered = ALL.filter(game => matchesState(game));

  countEl.textContent = filtered.length;
  listEl.innerHTML = '';

  // Счётчик источников под тулбаром
  updateSourceStats(filtered);

  if (!filtered.length) { emptyEl.classList.add('visible'); return; }
  emptyEl.classList.remove('visible');

  const grouped = applySortAndGroup(filtered);
  if (view === 'list') renderList(grouped, state.query);
  else                 renderGrid(grouped, state.query);
}

/** Обновляет строку "⚡ 14 локальных / 🔵 32 из базы" */
function updateSourceStats(filtered) {
  const statsEl = document.getElementById('sourceStats');
  if (!statsEl) return;
  const localCount = filtered.filter(g => g.source === 'local').length;
  const steamCount = filtered.filter(g => g.source === 'steam').length;
  if (filtered.length === 0) { statsEl.textContent = ''; return; }
  statsEl.innerHTML =
    `<span class="ss-local">⚡ ${localCount} локальных</span>` +
    `<span class="ss-sep">/</span>` +
    `<span class="ss-steam">🔵 ${steamCount} из базы</span>`;
}

// ── Переключатели ─────────────────────────────────────────────────
btnList.addEventListener('click', () => {
  if (view === 'list') return;
  view = 'list';
  btnList.classList.add('active');
  btnGrid.classList.remove('active');
  render();
});

btnGrid.addEventListener('click', () => {
  if (view === 'grid') return;
  view = 'grid';
  btnGrid.classList.add('active');
  btnList.classList.remove('active');
  render();
});