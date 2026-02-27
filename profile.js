/**
 * profile.js — страницы Профиля и Комьюнити
 *
 * Зависит от: auth.js (Auth, apiCall, AUTH_CONFIG)
 * Подключать ПОСЛЕ auth.js
 */

// ══════════════════════════════════════════════════════════════════
// LAST GAMES — постоянная история (не удаляется)
// ══════════════════════════════════════════════════════════════════

const LAST_GAMES_KEY = 'thepass_last_games';

function loadLastGamesLocal() {
  try { return JSON.parse(localStorage.getItem(LAST_GAMES_KEY) || '[]'); } catch { return []; }
}

function saveLastGamesLocal(list) {
  try { localStorage.setItem(LAST_GAMES_KEY, JSON.stringify(list)); } catch {}
}

/**
 * Записать игру в last_games.
 * Если уже есть — поднимает наверх (по title).
 * Вызывать при каждом openGamePage().
 */
async function trackLastGame(game) {
  const title = game.title || game.name || '';
  if (!title) return;

  // Локально — всегда, даже без авторизации
  let list = loadLastGamesLocal().filter(g => g.game_title !== title);
  list.unshift({
    game_title: title,
    game_img:   game.img || game.image || null,
    game_group: game.group || game.genre || null,
    played_at:  new Date().toISOString(),
  });
  if (list.length > 50) list = list.slice(0, 50);
  saveLastGamesLocal(list);

  // На сервер — если авторизован
  if (Auth.isLoggedIn()) {
    try {
      await apiCall('POST', '/profile/last-games', {
        game_title: title,
        game_img:   game.img || game.image || null,
        game_group: game.group || game.genre || null,
      });
    } catch {}
  }
}

async function fetchLastGames(userId = null) {
  if (userId && Auth.isLoggedIn()) {
    try { return await apiCall('GET', `/profile/last-games/${userId}`); } catch {}
  }
  if (Auth.isLoggedIn()) {
    try { return await apiCall('GET', '/profile/last-games'); } catch {}
  }
  return loadLastGamesLocal();
}

// ══════════════════════════════════════════════════════════════════
// NAV-RAIL — система вкладок
// ══════════════════════════════════════════════════════════════════

let _currentPage = 'catalog';

function initNavRail() {
  const rail = document.getElementById('navRail');
  if (!rail) return;

  // Свайп на мобиле — открыть/закрыть rail
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (dy > 60) return; // вертикальный скролл — игнор

    if (dx > 60 && touchStartX < 30) {
      // Свайп вправо от левого края — открыть
      rail.classList.add('open');
      document.getElementById('navRailOverlay')?.classList.add('open');
    } else if (dx < -60 && rail.classList.contains('open')) {
      // Свайп влево — закрыть
      closeNavRail();
    }
  }, { passive: true });

  // Клик по overlay — закрыть
  document.getElementById('navRailOverlay')?.addEventListener('click', closeNavRail);

  // Клики по кнопкам
  rail.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      switchPage(page);
      if (window.innerWidth <= 768) closeNavRail();
    });
  });

  // Пинг онлайн-статуса при открытии
  if (Auth.isLoggedIn()) {
    apiCall('POST', '/profile/online').catch(() => {});
    // Оффлайн при закрытии вкладки
    window.addEventListener('beforeunload', () => {
      navigator.sendBeacon(
        AUTH_CONFIG.BASE_URL + '/api/profile/offline',
        JSON.stringify({ token: Auth.token })
      );
    });
  }
}

function closeNavRail() {
  document.getElementById('navRail')?.classList.remove('open');
  document.getElementById('navRailOverlay')?.classList.remove('open');
}

function switchPage(pageId) {
  if (_currentPage === pageId) return;
  _currentPage = pageId;

  // Активная кнопка
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  // Скрываем все страницы
  document.getElementById('catalogPage')?.classList.remove('active');
  document.getElementById('profilePage')?.classList.remove('active');
  document.getElementById('communityPage')?.classList.remove('active');

  const target = document.getElementById(pageId + 'Page');
  if (target) {
    target.classList.add('active');
  }

  if (pageId === 'profile')   renderProfilePage();
  if (pageId === 'community') renderCommunityPage();
}

// ══════════════════════════════════════════════════════════════════
// СТРАНИЦА ПРОФИЛЯ
// ══════════════════════════════════════════════════════════════════

async function renderProfilePage() {
  const page = document.getElementById('profilePage');
  if (!page) return;

  if (!Auth.isLoggedIn()) {
    page.innerHTML = `
      <div class="pp-not-logged">
        <div class="pp-not-logged-icon">🔐</div>
        <div class="pp-not-logged-title">Войдите в аккаунт</div>
        <div class="pp-not-logged-sub">чтобы видеть свой профиль</div>
        <button class="pp-login-btn" onclick="openLoginModal()">Войти</button>
      </div>`;
    return;
  }

  const u = Auth.user;

  // Показываем скелетон
  page.innerHTML = `
    <div class="pp-skeleton">
      <div class="pp-banner-skeleton skeleton"></div>
      <div class="pp-avatar-skeleton skeleton"></div>
    </div>`;

  // Загружаем данные параллельно
  let profile = u;
  let lastGames = [];
  try {
    [profile, lastGames] = await Promise.all([
      apiCall('GET', `/profile/${u.id}`).catch(() => u),
      fetchLastGames(),
    ]);
  } catch {}

  const avatarSrc = profile.avatar_url
    ? (profile.avatar_url.startsWith('http') ? profile.avatar_url : AUTH_CONFIG.BASE_URL + profile.avatar_url)
    : null;
  const bannerSrc = profile.banner_url
    ? (profile.banner_url.startsWith('http') ? profile.banner_url : AUTH_CONFIG.BASE_URL + profile.banner_url)
    : null;

  const roleLabel  = Auth.isAdmin() ? '👑 Admin' : Auth.isPremium() ? '💎 Premium' : '👤 User';
  const regDate    = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('ru', { day:'2-digit', month:'short', year:'numeric' })
    : '—';
  const onlineHtml = profile.is_online
    ? `<span class="pp-online-dot"></span><span class="pp-online-text">онлайн</span>`
    : profile.last_seen
      ? `<span class="pp-offline-dot"></span><span class="pp-online-text">${_formatLastSeen(profile.last_seen)}</span>`
      : '';

  page.innerHTML = `
    <!-- БАННЕР с flowing lines анимацией -->
    <div class="pp-banner" id="ppBanner">
      ${bannerSrc
        ? `<img src="${bannerSrc}" class="pp-banner-img" alt="">`
        : `<canvas class="pp-banner-canvas" id="ppBannerCanvas"></canvas>`}
      <label class="pp-banner-edit" title="Изменить баннер">
        📷
        <input type="file" id="ppBannerInput" accept="image/*" style="display:none">
      </label>
    </div>

    <!-- ШАПКА ПРОФИЛЯ -->
    <div class="pp-header">
      <div class="pp-avatar-wrap">
        <div class="pp-avatar" id="ppAvatar">
          ${avatarSrc
            ? `<img src="${avatarSrc}" class="pp-avatar-img" alt="">`
            : `<div class="pp-avatar-placeholder">${(u.username || u.login || '?')[0].toUpperCase()}</div>`}
          <label class="pp-avatar-edit" title="Изменить аватар">
            📷
            <input type="file" id="ppAvatarInput" accept="image/*" style="display:none">
          </label>
        </div>
      </div>
      <div class="pp-header-right">
        <div class="pp-stats-row">
          <div class="pp-stat">
            <div class="pp-stat-val">${profile.games_count ?? lastGames.length}</div>
            <div class="pp-stat-lbl">игр найдено</div>
          </div>
          <div class="pp-stat">
            <div class="pp-stat-val">${regDate}</div>
            <div class="pp-stat-lbl">дата регистрации</div>
          </div>
          <div class="pp-stat">
            <div class="pp-stat-val">${profile.credits ?? 0}</div>
            <div class="pp-stat-lbl">активаций</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ИМЯ, РОЛЬ, ОНЛАЙН -->
    <div class="pp-info">
      <div class="pp-name-row">
        <div class="pp-username">${escapeHtml(u.username || u.login)}</div>
        <div class="pp-role-badge">${roleLabel}</div>
      </div>
      <div class="pp-login-row">
        <span class="pp-login">@${escapeHtml(u.login)}</span>
        <span class="pp-online-status">${onlineHtml}</span>
      </div>
    </div>

    <!-- КНОПКИ ДЕЙСТВИЙ -->
    <div class="pp-actions">
      <button class="pp-action-btn" id="ppEditUsername">✏️ Изменить имя</button>
      <button class="pp-action-btn" id="ppEditPassword">🔑 Сменить пароль</button>
      <button class="pp-action-btn pp-action-danger" id="ppLogout">🚪 Выйти</button>
    </div>

    <!-- LAST GAMES -->
    <div class="pp-section">
      <div class="pp-section-title">🎮 Last Games</div>
      ${lastGames.length === 0
        ? `<div class="pp-empty-games">Ещё не открывали игры</div>`
        : `<div class="pp-games-grid" id="ppGamesGrid">
            ${lastGames.slice(0, 20).map(g => _gameCard(g)).join('')}
           </div>`}
    </div>
  `;

  // Запускаем flowing lines если нет баннера
  if (!bannerSrc) _initFlowingLines('ppBannerCanvas');

  // Слушатели
  document.getElementById('ppLogout')?.addEventListener('click', () => {
    Auth.clear();
    renderAccountIcon();
    if (typeof applySubscriptionUI === 'function') applySubscriptionUI();
    switchPage('catalog');
    showToast('👋 Вы вышли из аккаунта');
  });

  document.getElementById('ppEditUsername')?.addEventListener('click', openChangeUsernameModal);
  document.getElementById('ppEditPassword')?.addEventListener('click', openChangePasswordModal);

  // Загрузка аватара
  document.getElementById('ppAvatarInput')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await authUploadAvatar(file);
      const img = document.querySelector('#ppAvatar img, #ppAvatar .pp-avatar-placeholder');
      if (img) img.remove();
      const newImg = document.createElement('img');
      newImg.src = url.startsWith('http') ? url : AUTH_CONFIG.BASE_URL + url;
      newImg.className = 'pp-avatar-img';
      document.getElementById('ppAvatar').prepend(newImg);
      renderAccountIcon();
      showToast('✅ Аватар обновлён');
    } catch(err) { showToast('❌ ' + err.message); }
  });

  // Загрузка баннера
  document.getElementById('ppBannerInput')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(AUTH_CONFIG.BASE_URL + '/api/profile/banner', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Auth.token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка');
      const banner = document.getElementById('ppBanner');
      const canvas = banner.querySelector('canvas');
      if (canvas) canvas.remove();
      let img = banner.querySelector('.pp-banner-img');
      if (!img) { img = document.createElement('img'); img.className = 'pp-banner-img'; banner.prepend(img); }
      img.src = data.banner_url.startsWith('http') ? data.banner_url : AUTH_CONFIG.BASE_URL + data.banner_url;
      showToast('✅ Баннер обновлён');
    } catch(err) { showToast('❌ ' + err.message); }
  });

  // Клики по карточкам last games
  document.getElementById('ppGamesGrid')?.querySelectorAll('.pp-game-card').forEach((card, i) => {
    card.addEventListener('click', () => {
      const game = ALL?.find(g => (g.title || g.name) === lastGames[i]?.game_title);
      if (game) { switchPage('catalog'); setTimeout(() => openGamePage(game), 100); }
    });
  });
}

// ══════════════════════════════════════════════════════════════════
// СТРАНИЦА КОМЬЮНИТИ
// ══════════════════════════════════════════════════════════════════

async function renderCommunityPage() {
  const page = document.getElementById('communityPage');
  if (!page) return;

  if (!Auth.isLoggedIn()) {
    page.innerHTML = `
      <div class="pp-not-logged">
        <div class="pp-not-logged-icon">👥</div>
        <div class="pp-not-logged-title">Войдите в аккаунт</div>
        <div class="pp-not-logged-sub">чтобы видеть комьюнити</div>
        <button class="pp-login-btn" onclick="openLoginModal()">Войти</button>
      </div>`;
    return;
  }

  page.innerHTML = `
    <div class="comm-header">
      <div class="comm-title">👥 Комьюнити</div>
      <div class="comm-sub">Участники The Pass</div>
    </div>
    <div class="comm-grid" id="commGrid">
      ${[1,2,3,4,5,6].map(() => `<div class="comm-card-skeleton skeleton"></div>`).join('')}
    </div>`;

  let users = [];
  try {
    users = await apiCall('GET', '/community/users');
  } catch(e) {
    page.querySelector('#commGrid').innerHTML =
      `<div class="pp-empty-games">Не удалось загрузить участников</div>`;
    return;
  }

  const grid = document.getElementById('commGrid');
  if (!grid) return;

  grid.innerHTML = users.map(u => {
    const avatarSrc = u.avatar_url
      ? (u.avatar_url.startsWith('http') ? u.avatar_url : AUTH_CONFIG.BASE_URL + u.avatar_url)
      : null;
    const bannerSrc = u.banner_url
      ? (u.banner_url.startsWith('http') ? u.banner_url : AUTH_CONFIG.BASE_URL + u.banner_url)
      : null;
    const roleLabel = u.role === 'admin' ? '👑' : u.role === 'premium' ? '💎' : '';
    const onlineDot = u.is_online ? `<span class="comm-online-dot"></span>` : '';

    return `
      <div class="comm-card liquid-glass" data-uid="${escapeHtml(u.id)}">
        <div class="comm-card-banner" style="${bannerSrc ? `background-image:url('${bannerSrc}')` : ''}">
          ${!bannerSrc ? `<div class="comm-card-banner-gradient"></div>` : ''}
        </div>
        <div class="comm-card-body">
          <div class="comm-avatar-wrap">
            ${onlineDot}
            ${avatarSrc
              ? `<img src="${avatarSrc}" class="comm-avatar" alt="">`
              : `<div class="comm-avatar-placeholder">${(u.username || u.login || '?')[0].toUpperCase()}</div>`}
          </div>
          <div class="comm-name">${escapeHtml(u.username || u.login)} ${roleLabel}</div>
          <div class="comm-login">@${escapeHtml(u.login)}</div>
          <div class="comm-games-count">${u.games_count || 0} игр</div>
        </div>
      </div>`;
  }).join('');

  // Клик — открыть профиль
  grid.querySelectorAll('.comm-card').forEach(card => {
    card.addEventListener('click', () => {
      const uid = card.dataset.uid;
      _openUserProfile(uid, users.find(u => u.id === uid));
    });
  });
}

// ── Открыть профиль другого пользователя ─────────────────────────

async function _openUserProfile(userId, cachedUser = null) {
  // Создаём оверлей
  let overlay = document.getElementById('userProfileOverlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'userProfileOverlay';
  overlay.className = 'user-profile-overlay';
  overlay.innerHTML = `<div class="user-profile-modal"><div class="skeleton" style="height:100%;border-radius:20px"></div></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  let profile = cachedUser || {};
  let lastGames = [];
  try {
    [profile, lastGames] = await Promise.all([
      apiCall('GET', `/profile/${userId}`),
      apiCall('GET', `/profile/last-games/${userId}`),
    ]);
  } catch {}

  const avatarSrc = profile.avatar_url
    ? (profile.avatar_url.startsWith('http') ? profile.avatar_url : AUTH_CONFIG.BASE_URL + profile.avatar_url)
    : null;
  const bannerSrc = profile.banner_url
    ? (profile.banner_url.startsWith('http') ? profile.banner_url : AUTH_CONFIG.BASE_URL + profile.banner_url)
    : null;
  const roleLabel = profile.role === 'admin' ? '👑 Admin' : profile.role === 'premium' ? '💎 Premium' : '👤 User';
  const regDate   = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('ru', { day:'2-digit', month:'short', year:'numeric' })
    : '—';

  const modal = overlay.querySelector('.user-profile-modal');
  modal.innerHTML = `
    <button class="upm-close" id="upmClose">✕</button>

    <div class="pp-banner upm-banner">
      ${bannerSrc
        ? `<img src="${bannerSrc}" class="pp-banner-img" alt="">`
        : `<canvas class="pp-banner-canvas" id="upmCanvas"></canvas>`}
    </div>

    <div class="pp-header">
      <div class="pp-avatar-wrap">
        <div class="pp-avatar">
          ${avatarSrc
            ? `<img src="${avatarSrc}" class="pp-avatar-img" alt="">`
            : `<div class="pp-avatar-placeholder">${(profile.username || profile.login || '?')[0].toUpperCase()}</div>`}
        </div>
      </div>
      <div class="pp-header-right">
        <div class="pp-stats-row">
          <div class="pp-stat">
            <div class="pp-stat-val">${profile.games_count ?? lastGames.length}</div>
            <div class="pp-stat-lbl">игр найдено</div>
          </div>
          <div class="pp-stat">
            <div class="pp-stat-val">${regDate}</div>
            <div class="pp-stat-lbl">с нами с</div>
          </div>
        </div>
      </div>
    </div>

    <div class="pp-info">
      <div class="pp-name-row">
        <div class="pp-username">${escapeHtml(profile.username || profile.login)}</div>
        <div class="pp-role-badge">${roleLabel}</div>
      </div>
      <div class="pp-login-row">
        <span class="pp-login">@${escapeHtml(profile.login)}</span>
        <span class="pp-online-status">
          ${profile.is_online
            ? `<span class="pp-online-dot"></span><span class="pp-online-text">онлайн</span>`
            : profile.last_seen ? `<span class="pp-offline-dot"></span><span class="pp-online-text">${_formatLastSeen(profile.last_seen)}</span>` : ''}
        </span>
      </div>
    </div>

    <div class="pp-section">
      <div class="pp-section-title">🎮 Last Games</div>
      ${lastGames.length === 0
        ? `<div class="pp-empty-games">Ещё нет истории</div>`
        : `<div class="pp-games-grid">${lastGames.slice(0, 12).map(g => _gameCard(g)).join('')}</div>`}
    </div>
  `;

  if (!bannerSrc) _initFlowingLines('upmCanvas');

  document.getElementById('upmClose')?.addEventListener('click', () => {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay) { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 300); }
  });
}

// ══════════════════════════════════════════════════════════════════
// FLOWING LINES АНИМАЦИЯ для баннера
// ══════════════════════════════════════════════════════════════════

function _initFlowingLines(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, animId;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();

  const LINE_COUNT = 28;
  const lines = Array.from({ length: LINE_COUNT }, (_, i) => ({
    y:     H * (i / LINE_COUNT),
    speed: 0.3 + Math.random() * 0.4,
    amp:   12 + Math.random() * 20,
    freq:  0.008 + Math.random() * 0.006,
    phase: Math.random() * Math.PI * 2,
    color: Math.random() < 0.6
      ? `rgba(139,92,246,`
      : `rgba(167,139,250,`,
    width: 0.6 + Math.random() * 0.8,
  }));

  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Фоновый градиент
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#1a0f3a');
    bg.addColorStop(0.5, '#0f0d1a');
    bg.addColorStop(1, '#1a0f2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    lines.forEach((line, idx) => {
      const yBase = (line.y + t * line.speed) % H;

      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        // Каждая линия — синусоида с несколькими гармониками
        const y = yBase
          + Math.sin(x * line.freq + t * 0.8 + line.phase) * line.amp
          + Math.sin(x * line.freq * 2.3 + t * 0.5 + line.phase * 1.3) * (line.amp * 0.3);

        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      // Линии в середине ярче
      const centerDist = Math.abs(idx - LINE_COUNT / 2) / (LINE_COUNT / 2);
      const alpha = 0.15 + (1 - centerDist) * 0.55;

      ctx.strokeStyle = line.color + alpha + ')';
      ctx.lineWidth = line.width;
      ctx.stroke();
    });

    t += 0.012;
    animId = requestAnimationFrame(draw);
  }

  draw();

  // Остановить когда канвас пропадёт из DOM
  const observer = new MutationObserver(() => {
    if (!document.contains(canvas)) {
      cancelAnimationFrame(animId);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ══════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ══════════════════════════════════════════════════════════════════

function _gameCard(g) {
  const title = g.game_title || '';
  const img   = g.game_img   || '';
  return `
    <div class="pp-game-card" title="${escapeHtml(title)}">
      <div class="pp-game-img">
        ${img
          ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
        <div class="pp-game-ph" style="${img ? 'display:none' : ''}">🎮</div>
      </div>
      <div class="pp-game-title">${escapeHtml(title)}</div>
    </div>`;
}

function _formatLastSeen(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60_000)     return 'только что';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`;
  return `${Math.floor(diff / 86_400_000)} д назад`;
}

// ══════════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initNavRail();
});
