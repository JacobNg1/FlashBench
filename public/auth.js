/* ============================================================
 * Chloe的超能工作台 - 认证模块
 * 注册 / 登录 / JWT 管理
 * ============================================================ */

const Auth = {
  TOKEN_KEY: 'etw_token',
  USER_KEY: 'etw_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },

  setToken(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  },

  async api(path, options = {}) {
    const url = '/api' + path;
    const headers = options.headers || {};
    const token = this.getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      this.clear();
      showAuthModal();
      throw new Error('登录已过期');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || '请求失败');
    return data;
  },

  async register(username, password) {
    const data = await this.api('/auth/register', { method: 'POST', body: { username, password } });
    this.setToken(data.access_token, data.user);
    return data.user;
  },

  async login(username, password) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const data = await this.api('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    this.setToken(data.access_token, data.user);
    return data.user;
  },

  async me() {
    return await this.api('/auth/me');
  },

  async updateProfile(nickname) {
    const user = await this.api('/auth/profile', { method: 'PUT', body: { nickname } });
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    return user;
  },

  logout() {
    this.clear();
    location.reload();
  }
};

function showAuthModal(mode = 'login') {
  const existing = document.getElementById('auth-modal');
  if (existing) existing.remove();

  const isLogin = mode === 'login';
  const html = `
    <div id="auth-modal" class="auth-overlay">
      <div class="auth-card">
        <div class="auth-icon">🌸</div>
        <h2>Chloe 的超能工作台</h2>
        <p class="auth-subtitle">${isLogin ? '登录后继续工作吧 ✨' : '创建一个新账号 🌱'}</p>
        <form id="auth-form" class="auth-form">
          <div class="form-group">
            <label>用户名</label>
            <input type="text" id="auth-username" placeholder="${isLogin ? '请输入用户名' : '用户名至少 6 个字符'}" ${isLogin ? '' : 'minlength="6"'} maxlength="32" required autocomplete="username">
          </div>
          <div class="form-group">
            <label>密码</label>
            <input type="password" id="auth-password" placeholder="至少 6 位密码" minlength="6" required autocomplete="${isLogin ? 'current-password' : 'new-password'}">
          </div>
          <div id="auth-error" class="auth-error"></div>
          ${isLogin ? '<div class="auth-forgot"><a href="#" id="auth-forgot">忘记密码？</a><span id="auth-forgot-tip"></span></div>' : ''}
          <button type="submit" class="btn btn-primary auth-submit">${isLogin ? '登录' : '注册'}</button>
        </form>
        <div class="auth-toggle">
          ${isLogin ? '还没有账号？<a href="#" id="auth-switch">去注册</a>' : '已有账号？<a href="#" id="auth-switch">去登录</a>'}
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('auth-modal');
  const form = document.getElementById('auth-form');
  const errorEl = document.getElementById('auth-error');
  const switchLink = document.getElementById('auth-switch');
  const forgotLink = document.getElementById('auth-forgot');

  if (forgotLink) forgotLink.onclick = (event) => {
    event.preventDefault();
    document.getElementById('auth-forgot-tip').textContent = '忘记密码请联系 jacob_ng@163.com';
  };

  switchLink.onclick = (event) => {
    event.preventDefault();
    showAuthModal(isLogin ? 'register' : 'login');
  };

  form.onsubmit = async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!isLogin && username.length < 6) {
      errorEl.textContent = '用户名至少需要 6 个字符';
      return;
    }
    const button = form.querySelector('.auth-submit');
    button.disabled = true;
    button.textContent = isLogin ? '登录中...' : '注册中...';
    try {
      if (isLogin) await Auth.login(username, password);
      else await Auth.register(username, password);
      modal.remove();
      await App.init();
    } catch (error) {
      errorEl.textContent = error.message;
      button.disabled = false;
      button.textContent = isLogin ? '登录' : '注册';
    }
  };
}

async function ensureAuth() {
  const token = Auth.getToken();
  if (!token) {
    showAuthModal('login');
    return false;
  }
  try {
    const user = await Auth.me();
    Auth.setToken(token, user);
    return true;
  } catch (error) {
    showAuthModal('login');
    return false;
  }
}
