/**
 * state.js — состояние фильтров, сортировки, поиска
 *
 * Изменения:
 *  - сохранение/восстановление фильтров в sessionStorage
 *  - нормализация поиска: убирает спецсимволы (`~!@# и т.д.), лишние пробелы
 *  - поиск теперь ищет и по тегам
 *  - sortMode переведён в state (единая точка изменения)
 *  - исправлен XSS в pubHdr через escapeHtml
 */

let ALL      = [];
let STUDIOS  = [];
let GENRES   = [];
let ALL_TAGS = [];

const STATE_KEY = 'thepass_filters';

const state = {
  query:   '',
  studios: new Set(),
  genres:  new Set(),
  tags:    new Set(),
  opts:    new Set(),   // 'dlc' | 'ru' | 'online'
  source:  null,        // null | 'local' | 'steam'
  sort:    'default',   // 'default' | 'az' | 'za' | 'recent'
};

// ── Нормализация поискового запроса ─────────────────────────────
// Убирает спецсимволы, лишние пробелы, приводит к нижнему регистру
function normalizeQuery(str) {
  return str
    .toLowerCase()
    .replace(/[`~!@#$%^&*()_+\-=\[\]{}|;':",./<>?\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── XSS-безопасное вставление текста в HTML ──────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Сохранение/восстановление фильтров ───────────────────────────

function saveFilters() {
  try {
    const data = {
      query:   state.query,
      studios: [...state.studios],
      genres:  [...state.genres],
      tags:    [...state.tags],
      opts:    [...state.opts],
      source:  state.source,
      sort:    state.sort,
    };
    sessionStorage.setItem(STATE_KEY, JSON.stringify(data));
  } catch {}
}

function restoreFilters() {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.query  = data.query  || '';
    state.source = data.source || null;
    state.sort   = data.sort   || 'default';
    (data.studios || []).forEach(v => state.studios.add(v));
    (data.genres  || []).forEach(v => state.genres.add(v));
    (data.tags    || []).forEach(v => state.tags.add(v));
    (data.opts    || []).forEach(v => state.opts.add(v));
  } catch {}
}

// ── Фильтрация ───────────────────────────────────────────────────

function matchesState(game, s = state) {
  if (s.query) {
    const q = normalizeQuery(s.query);
    const inTitle = normalizeQuery(game.title).includes(q);
    const inShort = normalizeQuery(game.short  || '').includes(q);
    const inGroup = normalizeQuery(game.group  || '').includes(q);
    const inTags  = (game.tags || []).some(t => normalizeQuery(t).includes(q));
    if (!inTitle && !inShort && !inGroup && !inTags) return false;
  }

  if (s.studios.size > 0 || s.genres.size > 0) {
    const activeGroups = new Set([...s.studios, ...s.genres]);
    if (!activeGroups.has(game.group)) return false;
  }

  if (s.tags.size > 0) {
    const gameTags = game.tags || [];
    for (const tag of s.tags) {
      if (!gameTags.includes(tag)) return false;
    }
  }

  if (s.opts.has('dlc')    && !game.hasDlc)                         return false;
  if (s.opts.has('ru')     && !(game.opts || []).includes('ru'))     return false;
  if (s.opts.has('online') && !(game.opts || []).includes('online')) return false;

  if (s.source === 'local' && game.source !== 'local') return false;
  if (s.source === 'steam' && game.source !== 'steam') return false;

  return true;
}

// ── Группировка ──────────────────────────────────────────────────

function groupBy(games) {
  return games.reduce((acc, game) => {
    if (!acc[game.group]) acc[game.group] = [];
    acc[game.group].push(game);
    return acc;
  }, {});
}

function applySortAndGroup(filtered) {
  if (state.sort === 'az') {
    return { '_': [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'ru')) };
  }
  if (state.sort === 'za') {
    return { '_': [...filtered].sort((a, b) => b.title.localeCompare(a.title, 'ru')) };
  }
  if (state.sort === 'recent') {
    const history      = loadHistory();
    const recentTitles = history.map(x => x.title);
    const recent = filtered
      .filter(g => recentTitles.includes(g.title))
      .sort((a, b) => recentTitles.indexOf(a.title) - recentTitles.indexOf(b.title));
    const rest = filtered.filter(g => !recentTitles.includes(g.title));
    const result = {};
    if (recent.length) result['🕐 Недавно смотрели'] = recent;
    Object.assign(result, groupBy(rest));
    return result;
  }
  return groupBy(filtered);
}