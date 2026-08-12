/* ============================================================
 * 超能工作台 - 核心引擎
 * 数据层 / 图标 / UI工具 / 布局 / 路由
 * ============================================================ */

/* ===== 数据存储层 ===== */
const Store = {
  SCHEMA_VERSION: 7,
  data: null,
  saving: false,
  saveTimer: null,

  async init() {
    const res = await Auth.api('/data', { method: 'GET' });
    this.data = res.data;
    const needsScheduleMigration = !this.data.scheduleWorkspace;
    if (typeof ScheduleCore !== 'undefined') ScheduleCore.ensure(this.data);
    if (needsScheduleMigration) this.save();
    if (!this.data.schemaVersion || this.data.schemaVersion < this.SCHEMA_VERSION) {
      this.data.schemaVersion = this.SCHEMA_VERSION;
    }
    this.data.classes ||= [];
    if (!this.data.classes.some(item => item.id === this.data.currentClassId)) {
      this.data.currentClassId = (this.data.classes[0] || {}).id || null;
    }
    if (typeof ensureWorkspaceManagementData === 'function') ensureWorkspaceManagementData(this.data);
  },

  save() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this._sync(), 600);
  },

  async _sync() {
    if (this.saving) return;
    this.saving = true;
    try {
      await Auth.api('/data', { method: 'POST', body: { data: this.data } });
    } catch (err) {
      UI.toast('保存失败：' + err.message, 'error');
    } finally {
      this.saving = false;
    }
  },

  reset() {
    this.data = createEmptyData();
    this.save();
  },

  export() {
    return JSON.stringify(this.data, null, 2);
  },

  import(jsonStr) {
    this.data = JSON.parse(jsonStr);
    this.save();
  },

  getCurrentClass() {
    return this.data.classes.find(c => c.id === this.data.currentClassId) || this.data.classes[0];
  },

  setCurrentClass(id) {
    this.data.currentClassId = id;
    this.save();
  },

  // 获取按班级存储的数据
  cd(key) {
    const cid = this.data.currentClassId;
    if (!this.data[key]) this.data[key] = {};
    if (!this.data[key][cid]) this.data[key][cid] = [];
    return this.data[key][cid];
  },

  // 获取全局数据
  gd(key) {
    if (!this.data[key]) this.data[key] = [];
    return this.data[key];
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
};

/* ===== 空初始数据 ===== */
function createEmptyData() {
  return {
    schemaVersion: Store.SCHEMA_VERSION,
    classes: [],
    currentClassId: null,
    students: {},
    schedule: {},
    recitation: {},
    dictation: {},
    exams: {},
    grades: {},
    homework: {},
    violations: {},
    seating: {},
    conversations: {},
    communications: {},
    lessonPlans: [],
    workRecords: [],
    todos: [],
    notes: [],
    resources: [],
    news: [],
    classSwaps: [],
    customKitQA: [],
    examDates: { midterm: '', final: '' },
    schoolProfile: { schoolName: '', subjects: [], teachingSubjectIds: [], careerRecords: [] },
    scheduleWorkspace: null
  };
}

/* ===== UI 工具 ===== */
const UI = {
  toast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    const icon = type === 'success' ? ICON.success : type === 'error' ? ICON.alert : type === 'warning' ? ICON.alert : ICON.info;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = icon + '<span>' + msg + '</span>';
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; el.style.transition = 'all 0.3s'; setTimeout(() => el.remove(), 300); }, 2500);
  },

  modal(title, bodyHtml, footerHtml) {
    const ov = document.getElementById('modal-overlay');
    ov.innerHTML = `<div class="modal">
      <div class="modal-header"><span class="modal-title">${title}</span>
      <button class="modal-close" onclick="UI.closeModal()">${ICON.close}</button></div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>`;
    ov.classList.add('show');
    ov.onclick = (e) => { if (e.target === ov) UI.closeModal(); };
  },

  closeModal() {
    const ov = document.getElementById('modal-overlay');
    ov.classList.remove('show');
    ov.innerHTML = '';
  },

  confirm(msg, onOk) {
    this.modal('确认操作', `<p style="font-size:14px;line-height:1.6;">${msg}</p>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
       <button class="btn btn-primary" id="confirm-ok-btn">确定</button>`);
    document.getElementById('confirm-ok-btn').onclick = () => { UI.closeModal(); onOk(); };
  },

  avatar(name, color) {
    return `<div class="avatar" style="background:${color || '#10b981'}">${name.slice(-2)}</div>`;
  },

  badge(text, type = 'green') {
    return `<span class="badge badge-${type}">${text}</span>`;
  },

  empty(icon, text) {
    return `<div class="empty-state">${icon || ICON.folder}<p>${text || '暂无数据'}</p></div>`;
  },

  exportWord(title, htmlContent) {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:'微软雅黑',sans-serif;font-size:12pt;line-height:1.8}h1{font-size:18pt;text-align:center}table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:6pt}</style>
    </head><body>${htmlContent}</body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = title + '.doc';
    a.click();
    URL.revokeObjectURL(url);
    this.toast('已导出Word文档');
  }
};

/* ===== 布局渲染 ===== */
const NAV = [
  { section: '教学管理', items: [
    { id: 'dashboard', label: '仪表盘', icon: 'dashboard' },
    { id: 'schedule', label: '课表', icon: 'schedule' },
    { id: 'students', label: '学生管理', icon: 'students' },
    { id: 'grades', label: '成绩分析', icon: 'grades' },
  ]},
  { section: '日常教学', items: [
    { id: 'homework', label: '作业管理', icon: 'homework' },
    { id: 'recitation', label: '背书统计', icon: 'recitation' },
    { id: 'dictation', label: '默写登记', icon: 'book' },
    { id: 'lesson', label: '教师备课', icon: 'lesson' },
    { id: 'teacherKit', label: '教师锦囊', icon: 'teacherKit' },
  ]},
  { section: '沟通记录', items: [
    { id: 'records', label: '工作留痕', icon: 'records' },
    { id: 'conversations', label: '谈话记录', icon: 'conversations' },
    { id: 'communication', label: '家校沟通', icon: 'communication' },
  ]},
  { section: '工具资源', items: [
    { id: 'todo', label: '待办备忘', icon: 'todo' },
    { id: 'resources', label: '学习资源', icon: 'resources' },
    { id: 'pictureBooks', label: '绘本资源', icon: 'pictureBook' },
    { id: 'news', label: '时政热点', icon: 'news' },
  ]}
];

function renderSidebar() {
  const sb = document.getElementById('sidebar');
  let html = `<div class="sidebar-header">
    <div class="sidebar-logo">${ICON.lesson}</div>
    <div><div class="sidebar-title">超能工作台</div><div class="sidebar-subtitle">宝月小学 · 五年级</div></div>
  </div><nav class="sidebar-nav">`;

  NAV.forEach(sec => {
    html += `<div class="nav-section-label">${sec.section}</div>`;
    sec.items.forEach(item => {
      html += `<div class="nav-item ${App.currentModule === item.id ? 'active' : ''}" data-module="${item.id}">
        ${ICON[item.icon]}<span>${item.label}</span></div>`;
    });
  });
  html += `</nav><div class="sidebar-footer">Powered by Gene<br><a href="mailto:wjj_gene@163.com">wjj_gene@163.com</a></div>`;
  sb.innerHTML = html;

  sb.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => {
      App.navigate(el.dataset.module);
      if (window.innerWidth <= 768) closeSidebar();
    };
  });
}

function getSchoolWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 8, 1); // 9月1日
  if (now < start) start.setFullYear(start.getFullYear() - 1);
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diff / 7) + 1;
  return week > 0 ? week : 1;
}

function getExamCountdown() {
  const now = new Date();
  const dates = Store.data.examDates || {};
  const mid = dates.midterm ? new Date(dates.midterm) : null;
  const fin = dates.final ? new Date(dates.final) : null;
  const days = (d) => d ? Math.ceil((d - now) / (1000*60*60*24)) : null;
  return { midterm: days(mid), final: days(fin) };
}

function renderTopbar() {
  const tb = document.getElementById('topbar');
  const cls = Store.getCurrentClass();
  const user = Auth.getUser();
  const displayName = user ? (user.nickname || user.username) : '教师';
  const now = new Date();
  const weekDays = ['日','一','二','三','四','五','六'];
  const weekNum = getSchoolWeek();
  const countdown = getExamCountdown();
  let examInfo = '';
  if (countdown.midterm !== null && countdown.midterm > 0) examInfo += ` 期中${countdown.midterm}天`;
  if (countdown.final !== null && countdown.final > 0) examInfo += ` 期末${countdown.final}天`;
  const dateStr = I18n.locale === 'en-US' ? I18n.formatDate(now, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) + ' · Week ' + weekNum : now.getFullYear() + '年' + (now.getMonth()+1) + '月' + now.getDate() + '日 周' + weekDays[now.getDay()] + ' 第' + weekNum + '周' + (examInfo ? ' ·' + examInfo : '');

  tb.innerHTML = `
    <button class="hamburger" onclick="toggleSidebar()">${ICON.menu}</button>
    <div class="class-selector" onclick="showClassDropdown(event)">
      ${ICON.users}
      <span class="class-name">${cls ? cls.name : '未选择班级'}</span>
      ${ICON.chevronDown}
    </div>
    <div class="dropdown-menu" id="class-dropdown">
      ${Store.data.classes.map(c => `<div class="dropdown-item" onclick="switchClass('${c.id}')">
        ${ICON.users}<span>${c.name}</span>
        ${c.id === Store.data.currentClassId ? ICON.check : ''}
      </div>`).join('')}
      <div style="border-top:1px solid var(--border-light);margin:4px 0"></div>
      <div class="dropdown-item" onclick="addClass()">${ICON.plus}<span>添加班级</span></div>
    </div>
    <div class="topbar-spacer"></div>
    <div class="topbar-datetime">
      <div class="topbar-date">${dateStr}</div>
      <div class="topbar-time" id="topbar-time">${now.toTimeString().slice(0,8)}</div>
    </div>
    <button class="appearance-trigger" type="button" onclick="toggleAppearancePanel(event)" title="外观与语言" aria-label="外观与语言">${ICON.palette}</button>
    <button class="topbar-settings-btn" onclick="showSettings()" title="数据管理">${ICON.grid}</button>
    <div class="topbar-user-wrap" onclick="showUserDropdown(event)">
      <div class="topbar-user" title="${esc(displayName)}">${esc(Array.from(displayName)[0] || '师')}</div>
      <div class="dropdown-menu" id="user-dropdown" style="right:0;left:auto;top:44px;">
        <div class="dropdown-item" onclick="showProfile()">${ICON.user}<span>个人中心</span></div>
        <div style="border-top:1px solid var(--border-light);margin:4px 0"></div>
        <div class="dropdown-item" onclick="Auth.logout()">${ICON.logout}<span>退出登录</span></div>
      </div>
    </div>
  `;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

function showClassDropdown(e) {
  e.stopPropagation();
  document.getElementById('class-dropdown').classList.toggle('show');
  document.addEventListener('click', function handler() {
    document.getElementById('class-dropdown').classList.remove('show');
    document.removeEventListener('click', handler);
  });
}

function showUserDropdown(e) {
  e.stopPropagation();
  document.getElementById('user-dropdown').classList.toggle('show');
  document.addEventListener('click', function handler() {
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.remove('show');
    document.removeEventListener('click', handler);
  });
}

function showProfile() {
  const user = Auth.getUser();
  UI.modal('个人中心', `
    <div class="form-group"><label class="form-label">用户名</label>
    <input class="form-input" value="${esc(user ? user.username : '')}" disabled></div>
    <div class="form-group"><label class="form-label">用户 ID</label>
    <input class="form-input" value="${esc(user ? user.id : '')}" disabled></div>
  `, `<button class="btn btn-primary" onclick="UI.closeModal()">知道了</button>`);
}

function switchClass(id) {
  Store.setCurrentClass(id);
  document.getElementById('class-dropdown').classList.remove('show');
  renderTopbar();
  renderSidebar();
  App.navigate(App.currentModule);
  UI.toast('已切换到 ' + Store.getCurrentClass().name);
}

function addClass() {
  document.getElementById('class-dropdown').classList.remove('show');
  UI.modal('添加班级', `
    <div class="form-group"><label class="form-label">班级名称</label>
    <input class="form-input" id="new-class-name" placeholder="如：四年级03班"></div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="doAddClass()">添加</button>`);
}

function doAddClass() {
  const name = document.getElementById('new-class-name').value.trim();
  if (!name) return UI.toast('请输入班级名称', 'error');
  const id = 'c' + Date.now().toString(36);
  Store.data.classes.push({ id, name, studentCount: 0 });
  ['students','schedule','recitation','exams','grades','homework','violations','seating','conversations','communications'].forEach(k => {
    if (!Store.data[k]) Store.data[k] = {};
    Store.data[k][id] = [];
  });
  Store.setCurrentClass(id);
  Store.save();
  UI.closeModal();
  renderTopbar();
  renderSidebar();
  App.navigate('dashboard');
  UI.toast('班级已添加');
}

/* ===== 数据管理（备份/恢复/重置） ===== */
function showSettings() {
  const dataSize = JSON.stringify(Store.data).length;
  const sizeStr = dataSize > 1024*1024 ? (dataSize / 1024 / 1024).toFixed(2) + ' MB' : (dataSize / 1024).toFixed(1) + ' KB';
  const user = Auth.getUser();

  UI.modal('数据管理', `
    <div class="mb-4">
      <div style="font-weight:600;margin-bottom:8px">${ICON.info} 账号与存储</div>
      <div class="text-sm text-muted">当前用户：<strong>${user ? (user.nickname || user.username) : '-'}</strong></div>
      <div class="text-sm text-muted">数据大小：<strong>${sizeStr}</strong></div>
      <div class="text-sm text-muted">存储位置：Turso 云端数据库 ✨</div>
      <div class="text-sm" style="color:var(--success)">数据已自动同步到云端，换设备登录即可查看。</div>
    </div>

    <div class="card mb-3" style="background:#f0fdf4">
      <div class="card-title" style="font-size:14px">${ICON.download} 数据备份</div>
      <p class="text-sm text-muted mb-2">将全部数据导出为JSON文件保存到电脑。</p>
      <button class="btn btn-primary" onclick="exportAllData()">${ICON.download} 导出全部数据</button>
    </div>

    <div class="card mb-3" style="background:#fef3c7">
      <div class="card-title" style="font-size:14px">${ICON.upload} 数据恢复</div>
      <p class="text-sm text-muted mb-2">从之前导出的JSON备份文件中恢复全部数据。<strong style="color:var(--danger)">将覆盖当前数据！</strong></p>
      <label class="btn btn-outline" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">
        ${ICON.upload} 选择备份文件
        <input type="file" id="import-file-input" accept=".json" style="display:none" onchange="handleImportFile(event)">
      </label>
    </div>

    <div class="card mb-3" style="background:#fef2f2">
      <div class="card-title" style="font-size:14px;color:var(--danger)">${ICON.alert} 重置数据</div>
      <p class="text-sm text-muted mb-2">清空所有数据，恢复为空初始状态。<strong style="color:var(--danger)">此操作不可撤销！建议先备份。</strong></p>
      <button class="btn btn-danger" onclick="resetAllData()">${ICON.refresh} 重置为初始数据</button>
    </div>

    <div class="card" style="background:#eff6ff">
      <div class="card-title" style="font-size:14px;color:var(--primary)">${ICON.logout} 账号</div>
      <p class="text-sm text-muted mb-2">退出当前账号，返回登录页面。</p>
      <button class="btn btn-outline" onclick="Auth.logout()">${ICON.logout} 退出登录</button>
    </div>
  `);
}

function exportAllData() {
  // 确保旧作业记录的 submittedIds 字段存在
  Object.keys(Store.data.homework || {}).forEach(cid => {
    const hw = Store.data.homework[cid];
    if (hw) hw.forEach(h => { if (!h.submittedIds) h.submittedIds = []; });
  });

  const jsonStr = JSON.stringify(Store.data, null, 2);
  const blob = new Blob([jsonStr], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const label = '超能工作台_备份_' + todayStr() + '.json';
  a.href = url;
  a.download = label;
  a.click();
  URL.revokeObjectURL(url);
  UI.toast('数据已导出！请妥善保存备份文件');
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.classes || !data.students) {
        UI.toast('备份文件格式不正确，请检查', 'error');
        return;
      }
      UI.confirm('确定从备份文件恢复全部数据？当前数据将被覆盖。', () => {
        Store.data = data;
        Store.save();
        UI.closeModal();
        renderTopbar();
        renderSidebar();
        App.navigate('dashboard');
        UI.toast('数据已恢复！共 ' + data.classes.length + ' 个班级');
      });
    } catch(err) {
      UI.toast('文件解析失败，请确认是有效的JSON备份文件', 'error');
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  UI.confirm('⚠️ 确定重置所有数据？此操作不可撤销！<br>建议先导出备份。', () => {
    Store.reset();
    renderTopbar();
    renderSidebar();
    App.navigate('dashboard');
    UI.toast('数据已重置为初始状态');
  });
}

/* ===== 应用核心 ===== */
const App = {
  currentModule: 'dashboard',
  charts: [],

  async init() {
    await Store.init();
    renderSidebar();
    renderTopbar();
    this.navigate('dashboard');

    document.getElementById('sidebar-overlay').onclick = closeSidebar;

    // 实时时钟
    setInterval(() => {
      const el = document.getElementById('topbar-time');
      if (el) el.textContent = new Date().toTimeString().slice(0, 8);
    }, 1000);

    // 键盘ESC关闭弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') UI.closeModal();
    });
  },

  navigate(moduleId) {
    this.currentModule = moduleId;
    this.charts.forEach(c => { try { c.destroy(); } catch(e){} });
    this.charts = [];

    renderSidebar();
    document.getElementById('sidebar').querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.module === moduleId);
    });

    const fn = M[moduleId];
    if (fn) fn();
    else document.getElementById('content').innerHTML = UI.empty(ICON.alert, '模块开发中...');
  },

  regChart(c) { this.charts.push(c); return c; }
};

globalThis.App = App;

// 启动：先检查登录状态
(async function() {
  const authed = await ensureAuth();
  if (authed) await App.init();
})();
