/**
 * auth.js — система аккаунтов The Pass
 *
 * ИСПРАВЛЕНИЕ: BASE_URL теперь берётся из auth_config.js (константа THEPASS_API_URL).
 * Это позволяет сайту на GitHub Pages работать с API на отдельном сервере.
 *
 * Подключи в index.html В ТАКОМ ПОРЯДКЕ:
 * <script src="auth_config.js"></script>   ← сначала конфиг с адресом API
 * <script src="auth.js"></script>           ← потом сама логика
 */

// ══════════════════════════════════════════════════════════════════
// КОНФИГ — URL берётся из auth_config.js
// ══════════════════════════════════════════════════════════════════

const AUTH_CONFIG = {
  // THEPASS_API_URL задаётся в auth_config.js
  // Если файл не подключён или URL пустой — авторизация отключается
  BASE_URL:    (typeof THEPASS_API_URL !== 'undefined' && THEPASS_API_URL)
                 ? THEPASS_API_URL.replace(/\/$/, '')  // убираем trailing slash
                 : '',
  SESSION_KEY: 'thepass_session',
};

// Если API не настроен — не показываем кнопку аккаунта вообще
const AUTH_ENABLED = !!AUTH_CONFIG.BASE_URL;

// ══════════════════════════════════════════════════════════════════
// Состояние
// ══════════════════════════════════════════════════════════════════

const Auth = {
  user:  null,   // { id, login, username, role, sub_until, avatar_url, created_at, num_id }
  token: null,   // JWT токен

  load() {
    try {
      const raw = sessionStorage.getItem(AUTH_CONFIG.SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      this.user  = s.user  || null;
      this.token = s.token || null;
    } catch {}
  },

  save() {
    try {
      sessionStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify({
        user:  this.user,
        token: this.token,
      }));
    } catch {}
  },

  clear() {
    this.user  = null;
    this.token = null;
    try { sessionStorage.removeItem(AUTH_CONFIG.SESSION_KEY); } catch {}
  },

  isLoggedIn()  { return !!this.user; },
  isPremium()   { return this.user?.role === 'premium' || this.user?.role === 'admin' || this._subActive(); },
  isAdmin()     { return this.user?.role === 'admin'; },

  _subActive() {
    if (!this.user?.sub_until) return false;
    return new Date(this.user.sub_until) > new Date();
  },
};

// ══════════════════════════════════════════════════════════════════
// API-запросы к бэкенду
// ══════════════════════════════════════════════════════════════════

async function apiCall(method, path, body = null) {
  if (!AUTH_ENABLED) throw new Error('API не настроен');

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (Auth.token) opts.headers['Authorization'] = `Bearer ${Auth.token}`;
  if (body)       opts.body = JSON.stringify(body);

  let res, data;
  try {
    res  = await fetch(AUTH_CONFIG.BASE_URL + '/api' + path, opts);
    data = await res.json().catch(() => ({}));
  } catch (e) {
    throw new Error('Сервер недоступен. Проверьте подключение.');
  }

  if (!res.ok) throw new Error(data.detail || data.error || `Ошибка ${res.status}`);
  return data;
}

// ══════════════════════════════════════════════════════════════════
// Действия авторизации
// ══════════════════════════════════════════════════════════════════

async function authLogin(login, password) {
  const data = await apiCall('POST', '/auth/login', { login, password });
  Auth.user  = data.user;
  Auth.token = data.token;
  Auth.save();
  return data.user;
}

async function authChangePassword(oldPwd, newPwd) {
  return await apiCall('POST', '/auth/change-password', {
    old_password: oldPwd,
    new_password: newPwd,
  });
}

async function authChangeUsername(newUsername) {
  const data = await apiCall('POST', '/auth/change-username', { username: newUsername });
  Auth.user.username = data.username;
  Auth.save();
  return data;
}

async function authUploadAvatar(file) {
  if (!AUTH_ENABLED) throw new Error('API не настроен');
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(AUTH_CONFIG.BASE_URL + '/api/auth/avatar', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${Auth.token}` },
    body:    formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Ошибка загрузки');
  Auth.user.avatar_url = data.avatar_url;
  Auth.save();
  return data.avatar_url;
}

async function authRefreshUser() {
  try {
    const data = await apiCall('GET', '/auth/me');
    Auth.user = data;
    Auth.save();
  } catch {
    Auth.clear();
  }
}

// ══════════════════════════════════════════════════════════════════
// UI — иконка аккаунта в шапке
// ══════════════════════════════════════════════════════════════════

function renderAccountIcon() {
  const existing = document.getElementById('accountBtn');
  if (existing) existing.remove();

  // Если API не настроен — кнопку не показываем
  if (!AUTH_ENABLED) return;

  const btn = document.createElement('button');
  btn.id        = 'accountBtn';
  btn.className = 'account-btn';
  btn.title     = Auth.isLoggedIn() ? Auth.user.username || Auth.user.login : 'Войти';

  if (Auth.isLoggedIn() && Auth.user.avatar_url) {
    const avatarSrc = Auth.user.avatar_url.startsWith('http')
      ? Auth.user.avatar_url
      : AUTH_CONFIG.BASE_URL + Auth.user.avatar_url;
    btn.innerHTML = `<img src="${avatarSrc}" class="account-btn-avatar" alt="">`;
  } else if (Auth.isLoggedIn()) {
    const initials = (Auth.user.username || Auth.user.login || '?')[0].toUpperCase();
    btn.innerHTML  = `<span class="account-btn-initials">${initials}</span>`;
  } else {
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>`;
  }

  if (Auth.isPremium() && !Auth.isAdmin()) {
    btn.classList.add('account-btn--premium');
  } else if (Auth.isAdmin()) {
    btn.classList.add('account-btn--admin');
  }

  btn.addEventListener('click', () => {
    if (Auth.isLoggedIn()) openProfileModal();
    else                   openLoginModal();
  });

  const themeBtn = document.getElementById('themeBtn');
  const header   = document.querySelector('.header');
  if (themeBtn && header) {
    header.insertBefore(btn, themeBtn);
  }
}

// ══════════════════════════════════════════════════════════════════
// UI — Модалка входа
// ══════════════════════════════════════════════════════════════════

function openLoginModal() {
  closeAllAuthModals();

  const modal = document.createElement('div');
  modal.id        = 'authLoginModal';
  modal.className = 'auth-modal-overlay';
  modal.innerHTML = `
    <div class="auth-modal">
      <button class="auth-modal-close" id="authLoginClose">✕</button>

      <div class="auth-modal-logo">🎮</div>
      <div class="auth-modal-title">The Pass</div>
      <div class="auth-modal-sub">Войдите в свой аккаунт</div>

      <div class="auth-field">
        <label class="auth-label">Логин</label>
        <input class="auth-input" id="authLoginField" type="text"
          placeholder="Ваш логин" autocomplete="username" autocorrect="off" spellcheck="false">
      </div>

      <div class="auth-field">
        <label class="auth-label">Пароль</label>
        <div class="auth-input-wrap">
          <input class="auth-input" id="authPasswordField" type="password"
            placeholder="Ваш пароль" autocomplete="current-password">
          <button class="auth-eye" id="authEyeBtn" type="button">👁</button>
        </div>
      </div>

      <div class="auth-error" id="authLoginError"></div>

      <button class="auth-btn-primary" id="authSubmitBtn">
        <span id="authSubmitText">Войти</span>
        <span id="authSubmitSpinner" class="auth-spinner" style="display:none"></span>
      </button>

      <div class="auth-modal-hint">
        Аккаунт выдаётся администратором.<br>
        Обратитесь в <a href="https://t.me/marme1adochka" target="_blank">поддержку</a>.
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  const loginField    = document.getElementById('authLoginField');
  const passwordField = document.getElementById('authPasswordField');
  const errorEl       = document.getElementById('authLoginError');
  const submitBtn     = document.getElementById('authSubmitBtn');
  const submitText    = document.getElementById('authSubmitText');
  const submitSpinner = document.getElementById('authSubmitSpinner');
  const eyeBtn        = document.getElementById('authEyeBtn');

  eyeBtn.addEventListener('click', () => {
    const isHidden = passwordField.type === 'password';
    passwordField.type = isHidden ? 'text' : 'password';
    eyeBtn.textContent  = isHidden ? '🙈' : '👁';
  });

  [loginField, passwordField].forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });

  document.getElementById('authLoginClose').addEventListener('click', closeAllAuthModals);
  modal.addEventListener('click', e => { if (e.target === modal) closeAllAuthModals(); });
  submitBtn.addEventListener('click', doLogin);

  loginField.focus();

  async function doLogin() {
    const login    = loginField.value.trim();
    const password = passwordField.value;
    errorEl.textContent = '';

    if (!login || !password) {
      errorEl.textContent = 'Заполните все поля.';
      return;
    }

    submitText.style.display    = 'none';
    submitSpinner.style.display = 'inline-block';
    submitBtn.disabled = true;

    try {
      await authLogin(login, password);
      closeAllAuthModals();
      renderAccountIcon();
      applySubscriptionUI();
      showToast(`✅ Добро пожаловать, ${Auth.user.username || Auth.user.login}!`);
    } catch (err) {
      errorEl.textContent = err.message || 'Неверный логин или пароль.';
      submitText.style.display    = 'inline';
      submitSpinner.style.display = 'none';
      submitBtn.disabled = false;
      passwordField.value = '';
      passwordField.focus();
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// UI — Модалка профиля
// ══════════════════════════════════════════════════════════════════

function openProfileModal() {
  closeAllAuthModals();

const u        = Auth.user;
  const subText  = Auth.isPremium()
    ? (u.sub_until ? `до ${new Date(u.sub_until).toLocaleDateString('ru')}` : '∞ безлимит')
    : 'Нет подписки';
  const subClass  = Auth.isPremium() ? 'profile-sub--active' : 'profile-sub--none';
  
  // Создаем плашку роли + красиво добавляем UID рядом
  let roleLabel = Auth.isAdmin() ? '👑 Admin' : Auth.isPremium() ? '💎 Premium' : '👤 User';
  if (u.num_id) {
    roleLabel += `<span class="profile-uid-badge">🆔 UID: ${u.num_id}</span>`;
  }

  const avatarSrc = u.avatar_url
    ? (u.avatar_url.startsWith('http') ? u.avatar_url : AUTH_CONFIG.BASE_URL + u.avatar_url)
    : null;

  const avatarHtml = avatarSrc
    ? `<img src="${avatarSrc}" class="profile-avatar-img" alt="">`
    : `<div class="profile-avatar-placeholder">${(u.username || u.login || '?')[0].toUpperCase()}</div>`;

  const regDate = u.created_at
    ? new Date(u.created_at).toLocaleDateString('ru', { day:'2-digit', month:'long', year:'numeric' })
    : '—';
    
  // Добавляем отображение ID, если он есть
  const idBadge = u.num_id ? `<span class="profile-id-badge">#${u.num_id}</span>` : '';

  const modal = document.createElement('div');
  modal.id        = 'authProfileModal';
  modal.className = 'auth-modal-overlay';
  modal.innerHTML = `
    <div class="auth-modal profile-modal">
      <button class="auth-modal-close" id="profileClose">✕</button>

      <div class="profile-header">
        <div class="profile-avatar" id="profileAvatarWrap">
          ${avatarHtml}
          <div class="profile-avatar-edit" id="profileAvatarEdit" title="Изменить аватар">📷</div>
          <input type="file" id="profileAvatarInput" accept="image/*" style="display:none">
        </div>
        <div class="profile-info">
          <div class="profile-username">${escapeHtml(u.username || u.login)} ${idBadge}</div>
          <div class="profile-login">@${escapeHtml(u.login)}</div>
          <div class="profile-role">${roleLabel}</div>
        </div>
      </div>

      <div class="profile-sub-row ${subClass}">
        <span class="profile-sub-ico">${Auth.isPremium() ? '💎' : '🔒'}</span>
        <span class="profile-sub-text">Подписка: <b>${subText}</b></span>
        ${!Auth.isPremium() ? `<button class="profile-sub-btn" id="profileBuyBtn">Купить</button>` : ''}
      </div>

      <div class="profile-stats-row">
        <div class="profile-stat">
          <div class="profile-stat-val">${regDate}</div>
          <div class="profile-stat-lbl">Регистрация</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-val">${u.credits ?? 0}</div>
          <div class="profile-stat-lbl">Активаций</div>
        </div>
      </div>

      <div class="profile-actions">
        <button class="profile-action-btn" id="profileChangeUsername">✏️ Изменить имя</button>
        <button class="profile-action-btn" id="profileChangePassword">🔑 Сменить пароль</button>
        <button class="profile-action-btn profile-action-btn--danger" id="profileLogout">🚪 Выйти</button>
      </div>

      <div class="auth-error" id="profileError"></div>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  document.getElementById('profileClose').addEventListener('click', closeAllAuthModals);
  modal.addEventListener('click', e => { if (e.target === modal) closeAllAuthModals(); });

  document.getElementById('profileLogout').addEventListener('click', () => {
    Auth.clear();
    closeAllAuthModals();
    renderAccountIcon();
    applySubscriptionUI();
    showToast('👋 Вы вышли из аккаунта');
  });

  document.getElementById('profileBuyBtn')?.addEventListener('click', () => {
    closeAllAuthModals();
    window.open('https://t.me/marme1adochka', '_blank');
    showToast('📱 Переходим в Telegram...');
  });

  document.getElementById('profileChangeUsername').addEventListener('click', openChangeUsernameModal);
  document.getElementById('profileChangePassword').addEventListener('click', openChangePasswordModal);

  document.getElementById('profileAvatarEdit').addEventListener('click', () => {
    document.getElementById('profileAvatarInput').click();
  });
  document.getElementById('profileAvatarInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      document.getElementById('profileError').textContent = 'Файл слишком большой (макс. 5 МБ)';
      return;
    }
    try {
      const url = await authUploadAvatar(file);
      const wrap = document.getElementById('profileAvatarWrap');
      const img  = wrap.querySelector('img, .profile-avatar-placeholder');
      if (img) img.remove();
      const newImg     = document.createElement('img');
      newImg.src       = url.startsWith('http') ? url : AUTH_CONFIG.BASE_URL + url;
      newImg.className = 'profile-avatar-img';
      wrap.prepend(newImg);
      renderAccountIcon();
      showToast('✅ Аватар обновлён');
    } catch (err) {
      document.getElementById('profileError').textContent = err.message;
    }
  });
}

// ── Модалка смены юзернейма ───────────────────────────────────────

function openChangeUsernameModal() {
  closeAllAuthModals();

  const modal = document.createElement('div');
  modal.id        = 'authChangeUsernameModal';
  modal.className = 'auth-modal-overlay';
  modal.innerHTML = `
    <div class="auth-modal">
      <button class="auth-modal-close" id="chUnClose">✕</button>
      <div class="auth-modal-title">Изменить имя</div>
      <div class="auth-field">
        <label class="auth-label">Новый юзернейм</label>
        <input class="auth-input" id="chUnField" type="text"
          placeholder="Имя для отображения" maxlength="32"
          value="${escapeHtml(Auth.user?.username || '')}">
      </div>
      <div class="auth-error" id="chUnError"></div>
      <button class="auth-btn-primary" id="chUnSubmit">Сохранить</button>
      <button class="auth-btn-secondary" id="chUnBack">← Назад</button>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  const field   = document.getElementById('chUnField');
  const errorEl = document.getElementById('chUnError');

  document.getElementById('chUnClose').addEventListener('click', closeAllAuthModals);
  document.getElementById('chUnBack').addEventListener('click', openProfileModal);
  field.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });
  document.getElementById('chUnSubmit').addEventListener('click', doSave);
  field.focus(); field.select();

  async function doSave() {
    const val = field.value.trim();
    errorEl.textContent = '';
    if (!val || val.length < 2) { errorEl.textContent = 'Минимум 2 символа.'; return; }
    try {
      await authChangeUsername(val);
      closeAllAuthModals();
      renderAccountIcon();
      openProfileModal();
      showToast('✅ Имя обновлено');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  }
}

// ── Модалка смены пароля ─────────────────────────────────────────

function openChangePasswordModal() {
  closeAllAuthModals();

  const modal = document.createElement('div');
  modal.id        = 'authChangePasswordModal';
  modal.className = 'auth-modal-overlay';
  modal.innerHTML = `
    <div class="auth-modal">
      <button class="auth-modal-close" id="chPwClose">✕</button>
      <div class="auth-modal-title">Сменить пароль</div>
      <div class="auth-field">
        <label class="auth-label">Текущий пароль</label>
        <input class="auth-input" id="chPwOld" type="password" placeholder="Текущий пароль">
      </div>
      <div class="auth-field">
        <label class="auth-label">Новый пароль</label>
        <input class="auth-input" id="chPwNew" type="password" placeholder="Новый пароль (мин. 8 симв.)">
      </div>
      <div class="auth-field">
        <label class="auth-label">Повторите пароль</label>
        <input class="auth-input" id="chPwConfirm" type="password" placeholder="Повторите новый пароль">
      </div>
      <div class="auth-error" id="chPwError"></div>
      <button class="auth-btn-primary" id="chPwSubmit">Сохранить</button>
      <button class="auth-btn-secondary" id="chPwBack">← Назад</button>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  const errorEl = document.getElementById('chPwError');

  document.getElementById('chPwClose').addEventListener('click', closeAllAuthModals);
  document.getElementById('chPwBack').addEventListener('click', openProfileModal);
  document.getElementById('chPwSubmit').addEventListener('click', doSave);
  document.getElementById('chPwOld').focus();

  async function doSave() {
    const oldPwd = document.getElementById('chPwOld').value;
    const newPwd = document.getElementById('chPwNew').value;
    const conf   = document.getElementById('chPwConfirm').value;
    errorEl.textContent = '';

    if (!oldPwd || !newPwd || !conf) { errorEl.textContent = 'Заполните все поля.'; return; }
    if (newPwd.length < 8)           { errorEl.textContent = 'Минимум 8 символов.'; return; }
    if (newPwd !== conf)             { errorEl.textContent = 'Пароли не совпадают.'; return; }

    try {
      await authChangePassword(oldPwd, newPwd);
      closeAllAuthModals();
      showToast('✅ Пароль успешно изменён');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  }
}

// ── Закрыть все модалки авторизации ──────────────────────────────

function closeAllAuthModals() {
  ['authLoginModal', 'authProfileModal', 'authChangeUsernameModal',
   'authChangePasswordModal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    setTimeout(() => el.remove(), 250);
  });
}

// ══════════════════════════════════════════════════════════════════
// Логика подписки
// ══════════════════════════════════════════════════════════════════

function applySubscriptionUI() {
  const findBtn = document.getElementById('gamePageFind');
  if (!findBtn) return;

  if (Auth.isLoggedIn() && !Auth.isPremium()) {
    findBtn.textContent = '💎 Купить подписку';
    findBtn.classList.add('gp-btn-sub');
    findBtn.onclick = (e) => {
      e.stopPropagation();
      window.open('https://t.me/marme1adochka', '_blank');
      showToast('📱 Открываем Telegram...');
    };
  } else {
    findBtn.textContent = '🔍 Найти игру';
    findBtn.classList.remove('gp-btn-sub');
    findBtn.onclick = null;
  }
}

// ══════════════════════════════════════════════════════════════════
// Инициализация и Бесшовный вход (Zero-Click)
// ══════════════════════════════════════════════════════════════════

async function authViaTelegram() {
  if (!AUTH_ENABLED || Auth.isLoggedIn()) return;

  const tg = window.Telegram?.WebApp;
  if (!tg || !tg.initData) return; 

  try {
    const res = await fetch(`${AUTH_CONFIG.BASE_URL}/api/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ init_data: tg.initData })
    });

    if (res.ok) {
      const data = await res.json();
      Auth.token = data.token;
      Auth.user  = data.user;
      Auth.save();
      console.info(`[Auth] ⚡ Успешный вход через Telegram! Твой ID: #${data.user.num_id}`);
    }
  } catch (err) {
    console.error('[Auth] ❌ Ошибка бесшовного входа:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!AUTH_ENABLED) {
    console.info('[Auth] API URL не настроен — авторизация отключена.');
    return;
  }

  Auth.load();

  // 1. Пробуем войти без пароля (Zero-Click)
  if (!Auth.isLoggedIn()) await authViaTelegram();

  // 2. Обновляем данные, если вошли
  if (Auth.isLoggedIn()) await authRefreshUser();

  // 3. Рисуем кнопки
  renderAccountIcon();
  if (typeof applySubscriptionUI === 'function') applySubscriptionUI();

  // 4. Наблюдатель за страницей игры (чтобы кнопка менялась на "Купить подписку")
  const gamePage = document.getElementById('gamePage');
  if (gamePage) {
    const observer = new MutationObserver(() => {
      if (gamePage.classList.contains('open')) applySubscriptionUI();
    });
    observer.observe(gamePage, { attributes: true, attributeFilter: ['class'] });
  }

  // 5. Закрытие модалки по клику
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal && typeof AuthModal !== 'undefined') {
        AuthModal.close();
      }
    });
  }
});
