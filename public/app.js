/* ============================================================
 * Chloe的工作台 - 核心引擎
 * 数据层 / 图标 / UI工具 / 布局 / 路由
 * ============================================================ */

/* ===== 数据存储层 ===== */
const Store = {
  SCHEMA_VERSION: 5,
  data: null,
  saving: false,
  saveTimer: null,

  async init() {
    const res = await Auth.api('/data', { method: 'GET' });
    this.data = res.data;
    if (!this.data.schemaVersion || this.data.schemaVersion < this.SCHEMA_VERSION) {
      this.data.schemaVersion = this.SCHEMA_VERSION;
    }
    // 新用户没有班级时自动创建一个默认班级，避免仪表盘渲染报错
    if (!this.data.classes || this.data.classes.length === 0) {
      const defaultClass = { id: this.uid(), name: '五年级（1）班' };
      this.data.classes = [defaultClass];
      this.data.currentClassId = defaultClass.id;
      this.save();
    }
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
    examDates: { midterm: '', final: '' }
  };
}

/* ===== 科学主题线性图标 ===== */
const ICON = {
  // 望远镜 - 仪表盘
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l4-4 4 2"/><path d="M7 4l3 7"/><circle cx="16" cy="14" r="4"/><path d="M14 18l-2 3"/><path d="M18 18l2 3"/><path d="M16 10V8"/><path d="M12 14h-2"/></svg>',
  // 日晷 - 课程表
  schedule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="6"/><path d="M12 14l3-4"/><path d="M12 8V4"/><path d="M8 6l2 2"/><path d="M16 6l-2 2"/><path d="M6 14H3"/><path d="M21 14h-3"/></svg>',
  // 声波 - 背书统计
  recitation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h2"/><path d="M7 8v8"/><path d="M11 4v16"/><path d="M15 7v10"/><path d="M19 10v4"/><path d="M21 12h0"/></svg>',
  // DNA - 学生管理
  students: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3c0 4 10 5 10 9s-10 5-10 9"/><path d="M17 3c0 4-10 5-10 9s10 5 10 9"/><path d="M8 7h8"/><path d="M8 12h8"/><path d="M8 17h8"/></svg>',
  // 原子 - 成绩分析
  grades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)"/></svg>',
  // 试管 - 作业管理
  homework: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6"/><path d="M10 2v14a2 2 0 002 2 2 2 0 002-2V2"/><path d="M10 8h6"/><circle cx="11" cy="13" r="0.5" fill="currentColor"/><circle cx="13" cy="15" r="0.5" fill="currentColor"/></svg>',
  // 显微镜 - 教师备课
  lesson: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h12"/><path d="M8 18l-2 3"/><path d="M16 18l2 3"/><path d="M9 4l4 4-2 2-4-4z"/><path d="M11 6l2-2"/><path d="M8 12v3a4 4 0 004 4h2"/></svg>',
  // 时钟齿轮 - 工作留痕
  records: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2 2"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/></svg>',
  // 信号波 - 谈话记录
  conversations: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12a5 5 0 015-5h0"/><path d="M2 12a5 5 0 005 5h0"/><path d="M7 7a8 8 0 010 10"/><path d="M17 7a8 8 0 010 10"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  // 卫星 - 家校沟通
  communication: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19l4-4"/><path d="M9 15l-3-3a4 4 0 015.7-5.7L15 9"/><path d="M15 9l3 3a4 4 0 01-5.7 5.7"/><path d="M19 5l-3 3"/><circle cx="17" cy="7" r="1.5"/></svg>',
  // 星轨 - 待办备忘
  todo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/><path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9z"/><path d="M5 16l.5 1.5L7 18l-1.5.5L5 20l-.5-1.5L3 18l1.5-.5z"/></svg>',
  // 分子 - 学习资源
  resources: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><circle cx="6" cy="14" r="2"/><path d="M8 7l3 10"/><path d="M16 7l-3 10"/><path d="M8 6h8"/><path d="M7 14l3 3"/></svg>',
  // 闪电 - 违纪记录
  violations: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  // 星球轨道 - 时政热点
  news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/><circle cx="20" cy="8" r="1" fill="currentColor"/></svg>',

  // UI 通用图标
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 010 20 15 15 0 010-20z"/></svg>',
  newsIcon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9a2 2 0 012-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>',
  audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>',
  word: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><path d="M12 19v3"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  percent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  teacherKit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 002 2h4a2 2 0 002-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 00-7-7z"/><path d="M9 21h6"/></svg>',
  pictureBook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>'
};

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
    { id: 'schedule', label: '我的课表', icon: 'schedule' },
    { id: 'masterSchedule', label: '课程总表', icon: 'grid' },
    { id: 'students', label: '学生管理', icon: 'students' },
    { id: 'grades', label: '成绩分析', icon: 'grades' },
  ]},
  { section: '日常教学', items: [
    { id: 'homework', label: '作业管理', icon: 'homework' },
    { id: 'recitation', label: '背书统计', icon: 'recitation' },
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
    <div><div class="sidebar-title">Chloe的工作台</div><div class="sidebar-subtitle">宝月小学 · 五年级</div></div>
  </div><nav class="sidebar-nav">`;

  NAV.forEach(sec => {
    html += `<div class="nav-section-label">${sec.section}</div>`;
    sec.items.forEach(item => {
      html += `<div class="nav-item ${App.currentModule === item.id ? 'active' : ''}" data-module="${item.id}">
        ${ICON[item.icon]}<span>${item.label}</span></div>`;
    });
  });
  html += `</nav>`;
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
  const now = new Date();
  const weekDays = ['日','一','二','三','四','五','六'];
  const weekNum = getSchoolWeek();
  const countdown = getExamCountdown();
  let examInfo = '';
  if (countdown.midterm !== null && countdown.midterm > 0) examInfo += ` 期中${countdown.midterm}天`;
  if (countdown.final !== null && countdown.final > 0) examInfo += ` 期末${countdown.final}天`;
  const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 周${weekDays[now.getDay()]} 第${weekNum}周${examInfo ? ' ·' + examInfo : ''}`;

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
    <button class="topbar-settings-btn" onclick="showSettings()" title="数据管理">${ICON.grid}</button>
    <div class="topbar-user-wrap" onclick="showUserDropdown(event)">
      <div class="topbar-user" title="${user ? user.username : '教师'}">${user ? user.username.slice(0,1) : '师'}</div>
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
      <div class="text-sm text-muted">当前用户：<strong>${user ? user.username : '-'}</strong></div>
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
  const label = 'Chloe工作台_备份_' + todayStr() + '.json';
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

// 启动：先检查登录状态
(async function() {
  const authed = await ensureAuth();
  if (authed) await App.init();
})();
