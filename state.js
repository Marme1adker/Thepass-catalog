/**
 * state.js — состояние фильтров и сортировки
 *
 * Содержит:
 *  - глобальный массив ALL (все игры после дедупликации)
 *  - объект state (активные фильтры)
 *  - текущий режим сортировки
 *  - функцию matchesState() — проверяет, подходит ли игра под фильтры
 *  - функцию applySortAndGroup() — сортирует и группирует отфильтрованные игры
 */

/** Все игры (заполняется в app.js после загрузки) */
let ALL = [];

/** Индексы для фильтров сайдбара */
let STUDIOS  = []; // студии (не-инди группы)
let GENRES   = []; // жанры (инди-группы)
let ALL_TAGS = []; // все теги

/** Активные фильтры */
const state = {
  query:   '',
  studios: new Set(),
  genres:  new Set(),
  tags:    new Set(),
  opts:    new Set(), // 'dlc' | 'ru' | 'online'
  source:  null,     // null | 'local' | 'steam'
};

/** Текущий режим сортировки */
let sortMode = 'default'; // 'default' | 'az' | 'za' | 'recent'

/**
 * Проверяет, соответствует ли игра текущим (или переданным) фильтрам.
 * @param {object} game
 * @param {object} s — объект state (можно передать копию для предварительного подсчёта)
 */
function matchesState(game, s = state) {
  // Поиск по тексту
  if (s.query) {
    const q = s.query;
    const inTitle = game.title.toLowerCase().includes(q);
    const inShort = (game.short  || '').toLowerCase().includes(q);
    const inGroup = (game.group  || '').toLowerCase().includes(q);
    if (!inTitle && !inShort && !inGroup) return false;
  }

  // Студия / жанр
  if (s.studios.size > 0 || s.genres.size > 0) {
    const activeGroups = new Set([...s.studios, ...s.genres]);
    if (!activeGroups.has(game.group)) return false;
  }

  // Теги (все выбранные теги должны присутствовать)
  if (s.tags.size > 0) {
    const gameTags = game.tags || [];
    for (const tag of s.tags) {
      if (!gameTags.includes(tag)) return false;
    }
  }

  // Параметры
  if (s.opts.has('dlc')    && !game.hasDlc)                        return false;
  if (s.opts.has('ru')     && !(game.opts || []).includes('ru'))    return false;
  if (s.opts.has('online') && !(game.opts || []).includes('online')) return false;

  // Источник (local / steam)
  if (s.source === 'local' && game.source !== 'local') return false;
  if (s.source === 'steam' && game.source !== 'steam') return false;

  return true;
}

/**
 * Группирует массив игр по полю group.
 * @returns {object} { groupName: [game, ...], ... }
 */
function groupBy(games) {
  return games.reduce((acc, game) => {
    if (!acc[game.group]) acc[game.group] = [];
    acc[game.group].push(game);
    return acc;
  }, {});
}

/**
 * Применяет текущую сортировку к отфильтрованному массиву игр
 * и возвращает объект { groupName: [game, ...] }.
 * Специальный ключ '_' означает «без заголовка группы».
 */
function applySortAndGroup(filtered) {
  // А → Я
  if (sortMode === 'az') {
    const sorted = [...filtered].sort((a, b) =>
      a.title.localeCompare(b.title, 'ru')
    );
    return { '_': sorted };
  }

  // Я → А
  if (sortMode === 'za') {
    const sorted = [...filtered].sort((a, b) =>
      b.title.localeCompare(a.title, 'ru')
    );
    return { '_': sorted };
  }

  // Недавние сначала
  if (sortMode === 'recent') {
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

  // По умолчанию — по группам
  return groupBy(filtered);
}
