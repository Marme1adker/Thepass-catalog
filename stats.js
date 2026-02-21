/**
 * stats.js — панель статистики каталога
 *
 * Показывает: всего игр, локальных, из базы данных, топ тегов, студий
 */

function renderStats() {
  const panel = document.getElementById('statsPanel');
  if (!panel || !ALL.length) return;

  const total      = ALL.length;
  const localCount = ALL.filter(g => g.source === 'local').length;
  const steamCount = ALL.filter(g => g.source === 'steam').length;
  const dlcCount   = ALL.filter(g => g.hasDlc).length;
  const onlineCount = ALL.filter(g => (g.opts || []).includes('online')).length;

  // Топ-5 тегов
  const tagMap = {};
  ALL.forEach(g => (g.tags || []).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
  const topTags = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  panel.innerHTML = `
    <div class="stats-header">
      <span class="stats-title">📊 Статистика каталога</span>
      <button class="stats-close" id="statsClose">✕</button>
    </div>
    <div class="stats-grid">
      <div class="stats-card">
        <div class="stats-num">${total}</div>
        <div class="stats-label">Всего игр</div>
      </div>
      <div class="stats-card local">
        <div class="stats-num">⚡ ${localCount}</div>
        <div class="stats-label">Локальных</div>
      </div>
      <div class="stats-card steam">
        <div class="stats-num">🔵 ${steamCount}</div>
        <div class="stats-label">Из базы данных</div>
      </div>
      <div class="stats-card">
        <div class="stats-num">${dlcCount}</div>
        <div class="stats-label">С DLC</div>
      </div>
      <div class="stats-card">
        <div class="stats-num">${onlineCount}</div>
        <div class="stats-label">С онлайном</div>
      </div>
    </div>
    <div class="stats-section-title">🏷️ Популярные теги</div>
    <div class="stats-tags">
      ${topTags.map(([tag, count]) =>
        `<div class="stats-tag-item">
          <span class="stats-tag-name">${escapeHtml(tag)}</span>
          <span class="stats-tag-count">${count}</span>
        </div>`
      ).join('')}
    </div>
  `;

  document.getElementById('statsClose')?.addEventListener('click', toggleStats);
}

function toggleStats() {
  const panel = document.getElementById('statsPanel');
  if (!panel) return;
  const open = panel.classList.toggle('visible');
  if (open) renderStats();
}