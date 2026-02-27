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
  BASE_URL:    (typeof THEPASS_API_URL !== 'undefined' && THEPASS_API_URL)
                 ? THEPASS_API_URL.replace(/\/$/, '')
                 : '',
  SESSION_KEY: 'thepass_session',
};

const AUTH_ENABLED = !!AUTH_CONFIG.BASE_URL;

// ══════════════════════════════════════════════════════════════════
// Состояние
// ══════════════════════════════════════════════════════════════════

const Auth = {
  user:  null,
  token: null,

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

async function authUploadBanner(file) {
  if (!AUTH_ENABLED) throw new Error('API не настроен');
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(AUTH_CONFIG.BASE_URL + '/api/auth/banner', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${Auth.token}` },
    body:    formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Ошибка загрузки баннера');
  Auth.user.banner_url = data.banner_url;
  Auth.save();
  return data.banner_url;
}

async function apiGetUsers() {
  try { return await apiCall('GET', '/users'); }
  catch { return []; }
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

      <div id="authTgView">
        <button class="auth-btn-tg" id="authTgBtn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L2 9.5L8.5 12.5L13 9L9.5 13.5L18 19.5L22 2Z" fill="currentColor"/>
          </svg>
          Войти через Telegram
        </button>
        <div class="auth-switch-link" id="showPwdBtn">Войти по логину и паролю</div>
      </div>

      <div id="authPwdView" style="display: none;">
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
        
        <div class="auth-switch-link" id="showTgBtn">← Назад</div>
      </div>

      <div class="auth-modal-hint" style="margin-top: 16px;">
        Возникли проблемы?<br>
        Обратитесь в <a href="https://t.me/marme1adochka" target="_blank">поддержку</a>.
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  // Элементы
  const tgView      = document.getElementById('authTgView');
  const pwdView     = document.getElementById('authPwdView');
  const showPwdBtn  = document.getElementById('showPwdBtn');
  const showTgBtn   = document.getElementById('showTgBtn');
  const tgBtn       = document.getElementById('authTgBtn');

  const loginField    = document.getElementById('authLoginField');
  const passwordField = document.getElementById('authPasswordField');
  const errorEl       = document.getElementById('authLoginError');
  const submitBtn     = document.getElementById('authSubmitBtn');
  const submitText    = document.getElementById('authSubmitText');
  const submitSpinner = document.getElementById('authSubmitSpinner');
  const eyeBtn        = document.getElementById('authEyeBtn');

  // Переключение экранов
  showPwdBtn.onclick = () => { tgView.style.display = 'none'; pwdView.style.display = 'block'; };
  showTgBtn.onclick  = () => { pwdView.style.display = 'none'; tgView.style.display = 'block'; errorEl.textContent=''; };

  // Логика кнопки Telegram
  tgBtn.onclick = async () => {
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.initData) {
      showToast('❌ Ошибка: Откройте каталог внутри Telegram-бота!');
      return;
    }

    const originalText = tgBtn.innerHTML;
    tgBtn.innerHTML = '<span class="auth-spinner" style="display:inline-block"></span> Загрузка...';
    tgBtn.disabled = true;

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
        closeAllAuthModals();
        renderAccountIcon();
        if (typeof applySubscriptionUI === 'function') applySubscriptionUI();
        showToast(`⚡ Добро пожаловать, ${Auth.user.username || Auth.user.login}!`);
      } else {
        showToast('❌ Ошибка авторизации');
        tgBtn.innerHTML = originalText;
        tgBtn.disabled = false;
      }
    } catch (err) {
      showToast('❌ Ошибка сервера');
      tgBtn.innerHTML = originalText;
      tgBtn.disabled = false;
    }
  };

  // Логика обычного пароля
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
// Модалка входа
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

      <div id="authTgView">
        <button class="auth-btn-tg" id="authTgBtn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L2 9.5L8.5 12.5L13 9L9.5 13.5L18 19.5L22 2Z" fill="currentColor"/>
          </svg>
          Войти через Telegram
        </button>
        <div class="auth-switch-link" id="showPwdBtn">Войти по логину и паролю</div>
      </div>

      <div id="authPwdView" style="display: none;">
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
        
        <div class="auth-switch-link" id="showTgBtn">← Назад</div>
      </div>

      <div class="auth-modal-hint" style="margin-top: 16px;">
        Возникли проблемы?<br>
        Обратитесь в <a href="https://t.me/marme1adochka" target="_blank">поддержку</a>.
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  // Элементы
  const tgView      = document.getElementById('authTgView');
  const pwdView     = document.getElementById('authPwdView');
  const showPwdBtn  = document.getElementById('showPwdBtn');
  const showTgBtn   = document.getElementById('showTgBtn');
  const tgBtn       = document.getElementById('authTgBtn');

  const loginField    = document.getElementById('authLoginField');
  const passwordField = document.getElementById('authPasswordField');
  const errorEl       = document.getElementById('authLoginError');
  const submitBtn     = document.getElementById('authSubmitBtn');
  const submitText    = document.getElementById('authSubmitText');
  const submitSpinner = document.getElementById('authSubmitSpinner');
  const eyeBtn        = document.getElementById('authEyeBtn');

  // Переключение экранов
  showPwdBtn.onclick = () => { tgView.style.display = 'none'; pwdView.style.display = 'block'; };
  showTgBtn.onclick  = () => { pwdView.style.display = 'none'; tgView.style.display = 'block'; errorEl.textContent=''; };

  // Логика кнопки Telegram
  tgBtn.onclick = async () => {
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.initData) {
      showToast('❌ Ошибка: Откройте каталог внутри Telegram-бота!');
      return;
    }

    const originalText = tgBtn.innerHTML;
    tgBtn.innerHTML = '<span class="auth-spinner" style="display:inline-block"></span> Загрузка...';
    tgBtn.disabled = true;

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
        closeAllAuthModals();
        renderAccountIcon();
        if (typeof applySubscriptionUI === 'function') applySubscriptionUI();
        showToast(`⚡ Добро пожаловать, ${Auth.user.username || Auth.user.login}!`);
      } else {
        showToast('❌ Ошибка авторизации');
        tgBtn.innerHTML = originalText;
        tgBtn.disabled = false;
      }
    } catch (err) {
      showToast('❌ Ошибка сервера');
      tgBtn.innerHTML = originalText;
      tgBtn.disabled = false;
    }
  };

  // Логика обычного пароля
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

  // Роль: admin = 👑 Admin, premium/sub = 💎 Customer, иначе 👤 User
  const roleLabel = Auth.isAdmin()
    ? '👑 Admin'
    : Auth.isPremium()
      ? '💎 Customer'
      : '👤 User';
  const uidHtml = u.num_id ? `<span class="profile-uid">UID: ${u.num_id}</span>` : '';

  const avatarSrc = u.avatar_url
    ? (u.avatar_url.startsWith('http') ? u.avatar_url : AUTH_CONFIG.BASE_URL + u.avatar_url)
    : null;

  const bannerSrc = u.banner_url
    ? (u.banner_url.startsWith('http') ? u.banner_url : AUTH_CONFIG.BASE_URL + u.banner_url)
    : null;

  const bannerStyle = bannerSrc
    ? `background-image:url('${bannerSrc}');background-size:cover;background-position:center;`
    : '';

  const avatarHtml = avatarSrc
    ? `<img src="${avatarSrc}" class="profile-avatar-img" alt="">`
    : `<div class="profile-avatar-placeholder">${(u.username || u.login || '?')[0].toUpperCase()}</div>`;

  // 3D корона только для admin
  const crownHtml = Auth.isAdmin()
    ? `<div class="profile-crown" title="Admin">👑</div>`
    : '';

  const regDate = u.created_at
    ? new Date(u.created_at).toLocaleDateString('ru', { day:'2-digit', month:'long', year:'numeric' })
    : '—';

  // Реальное количество активаций из credits
  const activations = u.credits ?? u.activations ?? 0;

  const modal = document.createElement('div');
  modal.id        = 'authProfileModal';
  modal.className = 'auth-modal-overlay';
  modal.innerHTML = `
    <div class="auth-modal profile-modal">
      <button class="auth-modal-close" id="profileClose">✕</button>

      <!-- Баннер с кнопкой редактирования -->
      <div class="profile-banner" id="profileBannerEl" style="${bannerStyle}">
        <button class="profile-banner-edit-btn" id="profileBannerEditBtn" title="Сменить баннер">🖼️</button>
        <input type="file" id="profileBannerInput" accept="image/*" style="display:none">
      </div>

      <!-- Аватар + имя, выступающие из баннера -->
      <div class="profile-avatar-area">
        <div class="profile-avatar-wrap-outer">
          ${crownHtml}
          <div class="profile-avatar" id="profileAvatarWrap">
            ${avatarHtml}
            <div class="profile-avatar-edit" id="profileAvatarEdit" title="Изменить аватар">📷</div>
            <input type="file" id="profileAvatarInput" accept="image/*" style="display:none">
          </div>
        </div>
        <div class="profile-info">
          <div class="profile-username">${escapeHtml(u.username || u.login)}</div>
          <div class="profile-login">@${escapeHtml(u.login)}</div>
          <div class="profile-meta-row">
            <span class="profile-role">${roleLabel}</span>
            ${uidHtml}
          </div>
        </div>
      </div>

      <div class="profile-divider"></div>

      <div class="profile-body">
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
            <div class="profile-stat-val">${activations}</div>
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

  // Аватар — редактирование
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
      const fullUrl = url.startsWith('http') ? url : AUTH_CONFIG.BASE_URL + url;
      // Обновляем аватар в модалке
      const wrap = document.getElementById('profileAvatarWrap');
      const img  = wrap.querySelector('img, .profile-avatar-placeholder');
      if (img) img.remove();
      const newImg     = document.createElement('img');
      newImg.src       = fullUrl;
      newImg.className = 'profile-avatar-img';
      wrap.prepend(newImg);
      // Синхронизируем аватар на странице профиля
      _syncProfilePageAvatar(fullUrl, Auth.user.username || Auth.user.login);
      renderAccountIcon();
      showToast('✅ Аватар обновлён');
    } catch (err) {
      document.getElementById('profileError').textContent = err.message;
    }
  });

  // Баннер — редактирование
  document.getElementById('profileBannerEditBtn').addEventListener('click', () => {
    document.getElementById('profileBannerInput').click();
  });
  document.getElementById('profileBannerInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      document.getElementById('profileError').textContent = 'Файл слишком большой (макс. 8 МБ)';
      return;
    }
    try {
      const url = await authUploadBanner(file);
      const fullUrl = url.startsWith('http') ? url : AUTH_CONFIG.BASE_URL + url;
      // Обновляем баннер в модалке
      const bannerEl = document.getElementById('profileBannerEl');
      if (bannerEl) {
        bannerEl.style.backgroundImage = `url('${fullUrl}')`;
        bannerEl.style.backgroundSize = 'cover';
        bannerEl.style.backgroundPosition = 'center';
      }
      // Синхронизируем баннер на странице профиля
      _syncProfilePageBanner(fullUrl);
      showToast('✅ Баннер обновлён');
    } catch (err) {
      document.getElementById('profileError').textContent = err.message;
    }
  });
}

// ── Синхронизация аватара и баннера на странице профиля ──────────

function _syncProfilePageAvatar(avatarUrl, fallbackName) {
  const wrap = document.getElementById('profAvatarWrap');
  if (wrap) {
    wrap.innerHTML = avatarUrl
      ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" alt="">`
      : (fallbackName || '?')[0].toUpperCase();
  }
  const textEl = document.getElementById('profAvatarText');
  if (textEl && !avatarUrl) textEl.textContent = (fallbackName || '?')[0].toUpperCase();
}

function _syncProfilePageBanner(bannerUrl) {
  const bannerEl = document.getElementById('profPageBanner');
  if (bannerEl) {
    bannerEl.style.backgroundImage = bannerUrl ? `url('${bannerUrl}')` : '';
    if (bannerUrl) { bannerEl.style.backgroundSize='cover'; bannerEl.style.backgroundPosition='center'; }
  }
}

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

function closeAllAuthModals() {
  ['authLoginModal', 'authProfileModal', 'authChangeUsernameModal',
   'authChangePasswordModal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    setTimeout(() => el.remove(), 250);
  });
}

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

async function authViaTelegram() {
  if (!AUTH_ENABLED || Auth.isLoggedIn()) return;

  const tg = window.Telegram?.WebApp;
  
  // Проверка: видит ли скрипт Telegram вообще?
  if (!tg || !tg.initData) {
    console.warn('[Auth] Telegram initData не найден. Если вы в браузере — это нормально.');
    return; 
  }

  try {
    const res = await fetch(`${AUTH_CONFIG.BASE_URL}/api/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ init_data: tg.initData })
    });

    const data = await res.json();

    if (res.ok) {
      Auth.token = data.token;
      Auth.user  = data.user;
      Auth.save();
      console.info(`[Auth] ⚡ Успешный вход! ID: #${data.user.num_id}`);
      renderAccountIcon(); // Сразу перерисовываем иконку
    } else {
      console.error('[Auth] Сервер отклонил данные:', data.detail || data.error);
    }
  } catch (err) {
    console.error('[Auth] Ошибка подключения к API:', err);
  }
}

// ══════════════════════════════════════════════════════════════════
// Меню выбора тем оформления
// ══════════════════════════════════════════════════════════════════

function initThemeMenu() {
  let currentTheme = localStorage.getItem('theme') || 'dark';
  document.body.classList.remove('light-theme', 'oled-theme');
  if (currentTheme !== 'dark') document.body.classList.add(`${currentTheme}-theme`);

  let themeBtn = document.getElementById('themeBtn');
  if (!themeBtn) return;

  const icons = { 'dark': '🌙', 'light': '☀️', 'oled': '🌌' };
  themeBtn.textContent = icons[currentTheme] || '🌙';

  let dropdown = document.createElement('div');
  dropdown.className = 'theme-dropdown';
  dropdown.innerHTML = `
    <button class="theme-btn-option ${currentTheme==='dark'?'active':''}" data-theme="dark">🌙 Тёмная</button>
    <button class="theme-btn-option ${currentTheme==='light'?'active':''}" data-theme="light">☀️ Светлая</button>
    <button class="theme-btn-option ${currentTheme==='oled'?'active':''}" data-theme="oled">🌌 OLED Black</button>
  `;
  document.body.appendChild(dropdown);

  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = themeBtn.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 8) + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    dropdown.classList.toggle('open');
  });

  dropdown.querySelectorAll('.theme-btn-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const theme = e.target.getAttribute('data-theme');
      currentTheme = theme;
      localStorage.setItem('theme', theme);

      document.body.classList.remove('light-theme', 'oled-theme');
      if (theme !== 'dark') document.body.classList.add(`${theme}-theme`);

      themeBtn.textContent = icons[theme];
      dropdown.querySelectorAll('.theme-btn-option').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      dropdown.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== themeBtn) {
      dropdown.classList.remove('open');
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// Запуск
// ══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  if (!AUTH_ENABLED) {
    console.info('[Auth] API URL не настроен — авторизация отключена.');
    return;
  }

  // Запускаем красивое меню тем
  initThemeMenu();

  Auth.load();

  if (!Auth.isLoggedIn()) await authViaTelegram();
  if (Auth.isLoggedIn()) await authRefreshUser();

  renderAccountIcon();
  if (typeof applySubscriptionUI === 'function') applySubscriptionUI();

  const gamePage = document.getElementById('gamePage');
  if (gamePage) {
    const observer = new MutationObserver(() => {
      if (gamePage.classList.contains('open')) applySubscriptionUI();
    });
    observer.observe(gamePage, { attributes: true, attributeFilter: ['class'] });
  }

  const modal = document.getElementById('authModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal && typeof AuthModal !== 'undefined') {
        AuthModal.close();
      }
    });
  }
});
// ══════════ СИСТЕМА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК ══════════
document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      switchPage(page);
    });
  });
});

// ══════════ УМНАЯ СИСТЕМА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК ══════════
function switchPage(pageId) {
  // АВТО-ЗАКРЫТИЕ ФИЛЬТРОВ ПРИ СМЕНЕ ВКЛАДКИ
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');

  // 1. Меняем активную кнопку
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === pageId);
  });

  // 2. Скрываем всё, показываем нужную секцию
  document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
  const target = document.getElementById(`section-${pageId}`);
  if (target) {
    target.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 3. Логика для конкретных страниц
  if (pageId === 'profile') {
    if (!Auth.isLoggedIn()) {
      showToast("❌ Сначала войдите в аккаунт");
      if (typeof openLoginModal === 'function') openLoginModal();
      // Если не вошел - возвращаем визуально на вкладку каталога
      switchPage('catalog'); 
      return;
    }
    
    // Заполняем данные пользователя
    if (document.getElementById('profUsername')) {
      const u = Auth.user;
      document.getElementById('profUsername').textContent = u.username || u.login;

      // Роль
      const roleEl = document.getElementById('profRole');
      if (roleEl) {
        if (u.role === 'admin') {
          roleEl.textContent = '👑 Admin';
          roleEl.style.color = '#f59e0b';
          roleEl.style.borderColor = '#f59e0b60';
          roleEl.style.background = '#f59e0b18';
        } else if (Auth.isPremium()) {
          roleEl.textContent = '💎 Customer';
          roleEl.style.color = '#a78bfa';
          roleEl.style.borderColor = '#8b5cf640';
        } else {
          roleEl.textContent = '👤 User';
        }
      }
      document.getElementById('profUid').textContent = `UID: ${u.num_id || u.id || '---'}`;

      // Аватар
      const avatarUrl = u.avatar_url
        ? (u.avatar_url.startsWith('http') ? u.avatar_url : AUTH_CONFIG.BASE_URL + u.avatar_url)
        : null;
      _syncProfilePageAvatar(avatarUrl, u.username || u.login);

      // Баннер
      const bannerUrl = u.banner_url
        ? (u.banner_url.startsWith('http') ? u.banner_url : AUTH_CONFIG.BASE_URL + u.banner_url)
        : null;
      _syncProfilePageBanner(bannerUrl);

      // Статы
      const regEl = document.getElementById('profRegDate');
      if (regEl && u.created_at) {
        regEl.textContent = new Date(u.created_at).toLocaleDateString('ru', { day:'2-digit', month:'2-digit', year:'numeric' });
      }
      const actEl = document.getElementById('profActivations');
      if (actEl) actEl.textContent = u.credits ?? u.activations ?? 0;

      // Корона над аватаром
      const crownEl = document.getElementById('profCrown');
      if (crownEl) crownEl.style.display = (u.role === 'admin') ? 'flex' : 'none';
    }
    
    // Запускаем абстрактные линии
    if (typeof startProfileLines === 'function') startProfileLines();
  } 
  else if (pageId === 'community') {
    const commList = document.getElementById('communityList');
    if (!commList) return;

    // Показываем спиннер
    commList.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:13px;">⏳ Загрузка пользователей...</div>`;

    apiGetUsers().then(users => {
      if (!users || !users.length) {
        commList.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:13px;">Пользователи не найдены</div>`;
        return;
      }
      commList.innerHTML = users.map((u, i) => {
        const avatarSrc = u.avatar_url
          ? (u.avatar_url.startsWith('http') ? u.avatar_url : AUTH_CONFIG.BASE_URL + u.avatar_url)
          : null;
        const initials = (u.username || u.login || '?')[0].toUpperCase();
        const roleText = u.role === 'admin' ? '👑 Admin' : (u.role === 'premium' ? '💎 Customer' : '👤 User');
        const roleColor = u.role === 'admin' ? '#f59e0b' : (u.role === 'premium' ? '#a78bfa' : '#9390b0');
        const avatarHtml = avatarSrc
          ? `<img src="${avatarSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentNode.textContent='${initials}'" alt="">`
          : initials;
        return `
          <div class="list-card comm-user-card" style="animation-delay:${i*40}ms">
            <div class="comm-avatar" style="background:linear-gradient(135deg,var(--surface2),${roleColor}40);">
              ${avatarHtml}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-family:'Syne';font-weight:700;font-size:14px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(u.username || u.login)}</div>
              <div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;">
                <span class="profile-role-badge" style="color:${roleColor};border-color:${roleColor}40;background:${roleColor}15;">${roleText}</span>
                <span class="profile-uid-badge">UID: ${u.num_id || u.id || '?'}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }).catch(() => {
      commList.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:13px;">⚠️ Ошибка загрузки</div>`;
    });
}

// ══════════ АНИМАЦИЯ АБСТРАКТНЫХ ЛИНИЙ (ПРОФИЛЬ) ══════════
let profileAnimId = null;
function startProfileLines() {
  const canvas = document.getElementById('profileCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  const lines = Array.from({ length: 15 }, () => ({
    y: Math.random() * canvas.height,
    speed: 0.5 + Math.random() * 1.5,
    width: 2 + Math.random() * 4,
    opacity: 0.1 + Math.random() * 0.4,
    wave: Math.random() * 100
  }));

  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    time += 0.02;
    
    lines.forEach(line => {
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 20) {
        const yOffset = Math.sin(x * 0.01 + time + line.wave) * 30;
        ctx.lineTo(x, line.y + yOffset);
      }
      ctx.strokeStyle = `rgba(139, 92, 246, ${line.opacity})`;
      ctx.lineWidth = line.width;
      ctx.stroke();
      
      line.y -= line.speed;
      if (line.y < -50) line.y = canvas.height + 50;
    });
    profileAnimId = requestAnimationFrame(draw);
  }
  
  if (profileAnimId) cancelAnimationFrame(profileAnimId);
  draw();
}
