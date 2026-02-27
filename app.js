/**
 * app.js — точка входа приложения
 *
 * Изменения:
 *  - скелетон-загрузка при старте (вместо спиннера)
 *  - addToHistory вызывается в modal.js до tg.sendData()
 *  - горячие клавиши: / и Ctrl+F фокусируют поиск, ? открывает статистику
 *  - pull-to-refresh на мобиле
 *  - восстановление фильтров из sessionStorage
 */

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0f0d17');
  tg.setBackgroundColor('#0f0d17');
}

function sendToBot(name, game) {
  if (tg) {
    tg.sendData(name);
  } else {
    showToast(`✅ Отправлено: ${name}`);
  }
}

// ── Загрузка и запуск ────────────────────────────────────────────
(async () => {
  // Показываем скелетон вместо спиннера
  renderSkeleton(8);

  try {
    const games = await fetchGames();

    const seen = new Set();
    ALL = games.filter(game => {
      if (!game.title || seen.has(game.title)) return false;
      seen.add(game.title);
      return true;
    });

    STUDIOS  = [...new Set(ALL.filter(g => !g.group.startsWith('Инди')).map(g => g.group))];
    GENRES   = [...new Set(ALL.filter(g =>  g.group.startsWith('Инди')).map(g => g.group))];
    ALL_TAGS = [...new Set(ALL.flatMap(g => g.tags || []))].sort();

    // Восстановить фильтры из sessionStorage
    restoreFilters();
    restoreFilterUI();

    buildSidebarButtons();
    syncButtonStates();
    renderHistory();
    renderFavorites();
    render();

    // Скрываем загрузчик — данные готовы
    if (typeof window._hideLoader === 'function') window._hideLoader();

    // Секции сворачиваем по умолчанию
    ['sec-studio', 'sec-genre', 'sec-tags'].forEach(id => {
      document.getElementById(id)?.classList.add('collapsed');
    });

  } catch (err) {
    console.error('Ошибка загрузки каталога:', err);
    listEl.innerHTML = `
      <div style="text-align:center;padding:60px 20px">
        <div style="font-size:38px;margin-bottom:12px;opacity:.5">⚠️</div>
        <div style="font-family:'Syne',sans-serif;font-size:15px;color:var(--muted)">Ошибка загрузки данных</div>
      </div>
    `;
  }
})();

// ── Горячие клавиши ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  if ((e.key === '/' && !inInput) || (e.ctrlKey && e.key === 'f')) {
    e.preventDefault();
    const searchEl = document.getElementById('search');
    if (searchEl) {
      searchEl.focus();
      searchEl.select();
      if (window.innerWidth <= 700) openDrawer();
    }
    return;
  }

  if (e.key === '?' && !inInput) {
    toggleStats();
    return;
  }
});

// ── Кнопка статистики ────────────────────────────────────────────
document.getElementById('statsBtn')?.addEventListener('click', toggleStats);

// ── Pull-to-refresh (мобиль) ─────────────────────────────────────
let ptr_startY   = 0;
let ptr_pulling  = false;
let ptr_el       = null;

document.addEventListener('touchstart', e => {
  if (window.scrollY > 0) return;
  ptr_startY  = e.touches[0].clientY;
  ptr_pulling = true;
}, { passive: true });

document.addEventListener('touchmove', e => {
  if (!ptr_pulling) return;
  const dy = e.touches[0].clientY - ptr_startY;
  if (dy > 60 && !ptr_el) {
    ptr_el = document.createElement('div');
    ptr_el.className = 'ptr-indicator';
    ptr_el.textContent = '↓ Обновить';
    document.body.prepend(ptr_el);
  }
  if (ptr_el) ptr_el.style.opacity = Math.min(dy / 120, 1);
}, { passive: true });

document.addEventListener('touchend', e => {
  if (!ptr_pulling) return;
  ptr_pulling = false;
  const dy = e.changedTouches[0].clientY - ptr_startY;
  if (ptr_el) { ptr_el.remove(); ptr_el = null; }
  if (dy > 100) {
    renderHistory();
    renderFavorites();
    render();
    showToast('🔄 Обновлено');
  }
});
// ══════════ НАВИГАЦИЯ И ВКЛАДКИ ══════════
const navItems = document.querySelectorAll('.nav-item');
const profileSec = document.getElementById('section-profile');
const commSec = document.getElementById('section-community');
const catalogSec = document.querySelector('.main'); 

navItems.forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Убираем активный класс у всех и вешаем на нажатую
    navItems.forEach(b => b.classList.remove('active'));
    const target = e.currentTarget;
    target.classList.add('active');

    const page = target.dataset.page; // 'catalog', 'profile', 'community'

    // Переключаем видимость секций
    catalogSec.style.display = page === 'catalog' ? 'block' : 'none';
    profileSec.style.display = page === 'profile' ? 'block' : 'none';
    commSec.style.display = page === 'community' ? 'block' : 'none';

    // Скрываем шапку с кнопками поиска и фильтра, если мы не в каталоге
    const header = document.querySelector('.header');
    if (header) header.style.display = page === 'catalog' ? 'flex' : 'none';

    // Загружаем данные для нужной вкладки
    if (page === 'profile') loadProfile();
    if (page === 'community') loadCommunity();
  });
});

// ══════════ ЗАГРУЗКА ПРОФИЛЯ ══════════
function loadProfile() {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  
  const usernameEl = document.getElementById('profUsername');
  const avatarEl = document.getElementById('profAvatarText');
  const uidEl = document.getElementById('profUid');
  const regDateEl = document.getElementById('profRegDate');
  const actEl = document.getElementById('profActivations');
  const roleEl = document.getElementById('profRole');

  if (tgUser) {
    usernameEl.textContent = tgUser.username || tgUser.first_name || 'Пользователь';
    avatarEl.textContent = (tgUser.first_name || tgUser.username || '?').charAt(0).toUpperCase();
    uidEl.textContent = `UID: ${tgUser.id}`;
    
    // Генерируем красивую дату регистрации
    const date = new Date();
    regDateEl.textContent = `${('0' + date.getDate()).slice(-2)}.${('0' + (date.getMonth() + 1)).slice(-2)}.${date.getFullYear()}`;
    actEl.textContent = Math.floor(Math.random() * 5) + 1; // Заглушка активаций
    roleEl.textContent = 'USER';
    
    // Если это ты, даем админку
    if (tgUser.username === 'Marme1adka' || tgUser.id === 1) {
      roleEl.textContent = 'ADMIN';
      roleEl.style.color = '#f59e0b';
      roleEl.style.borderColor = '#f59e0b';
    }
  }

  // Запускаем красивые волны
  startProfileCanvas();
}

// ══════════ ЗАГРУЗКА КОМЬЮНИТИ ══════════
function loadCommunity() {
  const list = document.getElementById('communityList');
  if (list.dataset.loaded) return; // Не загружаем дважды
  
  list.innerHTML = ''; // Убираем текст "Загрузка..."
  
  // Моковые данные пользователей (пока нет реальной базы)
  const users = [
    { name: 'Marme1adka', role: 'ADMIN', uid: 1, color: '#f59e0b' },
    { name: 'AlexGamer', role: 'USER', uid: 4218, color: '#a78bfa' },
    { name: 'NightStalker', role: 'PRO', uid: 9932, color: '#34d399' },
    { name: 'ShadowNinja', role: 'USER', uid: 1054, color: '#60a5fa' }
  ];

  users.forEach((u, i) => {
    const delay = i * 50;
    list.innerHTML += `
      <div class="list-card" style="animation: cardFadeIn 0.3s ease both; animation-delay: ${delay}ms; margin-bottom: 8px;">
        <div class="prof-avatar-wrap" style="width: 42px; height: 42px; margin-right: 14px; flex-shrink: 0; border-radius: 50%; background: linear-gradient(135deg, var(--surface2), ${u.color}); display: flex; align-items: center; justify-content: center; font-family: 'Syne'; font-weight: 800; font-size: 18px; color: white;">
          ${u.name.charAt(0)}
        </div>
        <div style="flex: 1;">
          <div style="font-family: 'Syne'; font-weight: 700; font-size: 14px; color: var(--text);">${u.name}</div>
          <div style="display: flex; gap: 6px; margin-top: 5px;">
            <span class="profile-role-badge" style="padding: 2px 6px; font-size: 9px; color: ${u.color}; border-color: ${u.color}40; background: ${u.color}15;">${u.role}</span>
            <span class="profile-uid-badge" style="padding: 2px 6px; font-size: 9px;">UID: ${u.uid}</span>
          </div>
        </div>
      </div>
    `;
  });
  list.dataset.loaded = "true";
}

// ══════════ АНИМАЦИЯ ВОЛН (Слева направо) ══════════
let profileCanvasRunning = false;
function startProfileCanvas() {
  if (profileCanvasRunning) return;
  const canvas = document.getElementById('profileCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  profileCanvasRunning = true;

  let w, h;
  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  let time = 0;
  function animate() {
    ctx.clearRect(0, 0, w, h);
    time += 0.015; // Скорость течения волн

    // Рисуем 4 плавные волны
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      // Линии идут сверху вниз (y от 0 до h), но изгибаются и движутся вправо (по оси X)
      for (let y = 0; y <= h; y += 20) {
        // Формула плавного смещения по X
        const x = (w * 0.1) + Math.sin(y * 0.003 + time + i * 1.5) * (w * 0.4) + (i * w * 0.2);
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 2 + i;
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.1 + i * 0.08})`; // Фиолетовые оттенки
      ctx.stroke();
    }
    requestAnimationFrame(animate);
  }
  animate();
}
