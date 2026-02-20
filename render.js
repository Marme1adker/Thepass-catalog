/**
 * render.js — отрисовка каталога игр
 *
 * Содержит:
 *  - render()      — главная функция перерисовки
 *  - renderList()  — вид «Список»
 *  - renderGrid()  — вид «Сетка»
 *  - pubHdr()      — заголовок группы
 *  - hl()          — подсветка совпадений поиска
 */

// ── DOM ──────────────────────────────────────────────────────────
const listEl   = document.getElementById('list');
const emptyEl  = document.getElementById('empty');
const countEl  = document.getElementById('countNum');
const btnList  = document.getElementById('btnList');
const btnGrid  = document.getElementById('btnGrid');
const sortSel  = document.getElementById('sortSelect');
const toastEl  = document.getElementById('toast');

let view      = 'list';
let toastTimer = null;

// ── Вспомогательные функции ──────────────────────────────────────

/** Подсвечивает вхождение строки q в тексте t тегом <mark> */
function hl(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

/** Показывает тост-уведомление */
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

/** Создаёт заголовок группы */
function pubHdr(name, extraClass = '') {
  const el = document.createElement('div');
  el.className = `pub-header${extraClass ? ' ' + extraClass : ''}`;
  el.innerHTML = `
    <div class="pub-dot"></div>
    <div class="pub-name">${name}</div>
    <div class="pub-line"></div>
  `;
  return el;
}

// ── Рендер списком ───────────────────────────────────────────────

function renderList(grouped, query) {
  Object.entries(grouped).forEach(([groupName, games]) => {
    if (groupName !== '_') listEl.appendChild(pubHdr(groupName));

    games.forEach(game => {
      const card = document.createElement('div');
      card.className = 'list-card';

      const dlcBadge = game.hasDlc ? '<span class="dlc-tag">DLC</span>' : '';
      const tagsHtml = (game.tags || []).length
        ? `<div class="list-tags">
            ${(game.tags).map(t => `<span class="list-tag">${t}</span>`).join('')}
           </div>`
        : '';

      card.innerHTML = `
        <div class="list-icon">
          <img
            src="${game.img}" alt=""
            loading="lazy"
            onerror="this.style.display='none'; this.parentNode.textContent='🎮'"
          >
        </div>
        <div class="list-info">
          <div class="list-row">
            <div class="list-title">${hl(game.title, query)}</div>
            ${dlcBadge}
          </div>
          <div class="list-sub">${game.short || ''}</div>
          ${tagsHtml}
        </div>
        <div class="list-arrow">›</div>
      `;

      card.addEventListener('click', () => openModal(game));
      listEl.appendChild(card);
    });
  });
}

// ── Рендер сеткой ────────────────────────────────────────────────

function renderGrid(grouped, query) {
  Object.entries(grouped).forEach(([groupName, games]) => {
    if (groupName !== '_') listEl.appendChild(pubHdr(groupName, 'grid-pub-hdr'));

    const row = document.createElement('div');
    row.className = 'grid-wrap';

    games.forEach(game => {
      const card = document.createElement('div');
      card.className = `grid-card${game.hasDlc ? ' is-dlc' : ''}`;

      const tagsHtml = (game.tags || []).slice(0, 3).length
        ? `<div class="grid-tags">
            ${(game.tags).slice(0, 3).map(t => `<span class="grid-tag">${t}</span>`).join('')}
           </div>`
        : '';

      const displayGroup = groupName === '_' ? game.group : groupName;

      card.innerHTML = `
        <div class="grid-img">
          <img
            src="${game.img}" alt="${game.title}"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
          >
          <div class="grid-placeholder" style="display:none">🎮</div>
          <div class="grid-badge">${game.short || ''}</div>
          ${game.hasDlc ? '<div class="grid-dlc-badge">DLC</div>' : ''}
        </div>
        <div class="grid-info">
          <div class="grid-title">${hl(game.title, query)}</div>
          <div class="grid-pub">${displayGroup}</div>
          ${tagsHtml}
        </div>
      `;

      card.addEventListener('click', () => openModal(game));
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

  if (!filtered.length) {
    emptyEl.classList.add('visible');
    return;
  }
  emptyEl.classList.remove('visible');

  const grouped = applySortAndGroup(filtered);

  if (view === 'list') renderList(grouped, state.query);
  else                 renderGrid(grouped, state.query);
}

// ── Переключатель вида ───────────────────────────────────────────
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

// ── Переключатель сортировки ─────────────────────────────────────
sortSel.addEventListener('change', () => {
  sortMode = sortSel.value;
  render();
});
