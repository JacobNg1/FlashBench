(function (root) {
  const messages = {
    'zh-CN': {
      'app.name': '超能工作台', 'app.powered': 'Powered by Gene',
      'auth.login': '登录', 'auth.register': '注册', 'auth.username': '用户名', 'auth.password': '密码',
      'appearance.title': '外观与语言', 'appearance.theme': '主题', 'appearance.style': '主题风格', 'appearance.palette': '主题配色', 'appearance.mode': '明暗模式',
      'appearance.system': '跟随系统', 'appearance.light': '浅色', 'appearance.dark': '深色',
      'appearance.random': '随机配色', 'appearance.randomHint': '每次打开自动换色', 'appearance.language': '语言', 'appearance.close': '关闭',
      'theme.glass': '毛玻璃动态', 'theme.solid': '纯色简约',
      'theme.aurora': '极光蓝紫', 'theme.ocean': '深海青蓝', 'theme.obsidian': '曜石鎏金',
      'theme.peach': '桃汽粉', 'theme.mint': '薄荷奶油', 'theme.lavender': '薰衣草糖果',
      'theme.indigo': '靛蓝', 'theme.emerald': '翡翠', 'theme.graphite': '石墨'
    },
    'en-US': {
      'app.name': 'Power Workspace', 'app.powered': 'Powered by Gene',
      'auth.login': 'Sign in', 'auth.register': 'Register', 'auth.username': 'Username', 'auth.password': 'Password',
      'appearance.title': 'Appearance & language', 'appearance.theme': 'Theme', 'appearance.style': 'Visual style', 'appearance.palette': 'Color palette', 'appearance.mode': 'Color mode',
      'appearance.system': 'System', 'appearance.light': 'Light', 'appearance.dark': 'Dark',
      'appearance.random': 'Random colors', 'appearance.randomHint': 'Changes every time you open the app', 'appearance.language': 'Language', 'appearance.close': 'Close',
      'theme.glass': 'Animated glass', 'theme.solid': 'Solid minimal',
      'theme.aurora': 'Aurora', 'theme.ocean': 'Deep ocean', 'theme.obsidian': 'Obsidian gold',
      'theme.peach': 'Peach soda', 'theme.mint': 'Mint cream', 'theme.lavender': 'Lavender candy',
      'theme.indigo': 'Indigo', 'theme.emerald': 'Emerald', 'theme.graphite': 'Graphite'
    }
  };
  const english = {
    '超能工作台': 'Power Workspace', '教学管理': 'Teaching', '日常教学': 'Daily teaching', '沟通记录': 'Communication', '工具资源': 'Tools & resources',
    '仪表盘': 'Dashboard', '课表': 'Schedule', '我的课表': 'My schedule', '班级课表': 'Class schedule', '课程总表': 'Master schedule', '课表管理': 'Schedule settings',
    '学生管理': 'Students', '成绩分析': 'Grades', '作业管理': 'Homework', '背书统计': 'Recitation', '默写登记': 'Dictation', '教师备课': 'Lesson planning', '教师锦囊': 'Teaching toolkit',
    '工作留痕': 'Work log', '谈话记录': 'Conversations', '家校沟通': 'Family communication', '待办备忘': 'To-dos', '学习资源': 'Learning resources', '绘本资源': 'Picture books', '时政热点': 'Current affairs',
    '班级管理': 'Manage classes', '个人中心': 'Profile', '生涯管理': 'Career', '学期信息': 'Semesters', '数据管理': 'Data', '退出登录': 'Sign out',
    '添加': 'Add', '编辑': 'Edit', '删除': 'Delete', '保存': 'Save', '取消': 'Cancel', '确认': 'Confirm', '关闭': 'Close', '导入': 'Import', '导出': 'Export', '下载': 'Download', '上传': 'Upload', '搜索': 'Search', '重置': 'Reset',
    '暂无数据': 'No data', '暂无记录': 'No records', '操作': 'Actions', '状态': 'Status', '名称': 'Name', '日期': 'Date', '时间': 'Time', '教师': 'Teacher', '学生': 'Student', '班级': 'Class', '科目': 'Subject', '备注': 'Notes',
    '当前学期': 'Current semester', '当前课程': 'Current lesson', '当前用户': 'Current user', '设置': 'Settings', '前往设置': 'Open settings', '使用中': 'Active', '已归档': 'Archived', '已完结': 'Completed', '任教中': 'Teaching',
    '登录': 'Sign in', '注册': 'Register', '用户名': 'Username', '密码': 'Password', '忘记密码？': 'Forgot password?', '去注册': 'Register', '去登录': 'Sign in', '已有账号？': 'Already registered?', '还没有账号？': 'New here?',
    '请输入用户名': 'Enter username', '至少 6 位密码': 'At least 6 characters', '登录中...': 'Signing in...', '注册中...': 'Registering...', '创建一个新账号 🌱': 'Create a new account', '登录后继续工作吧 ✨': 'Sign in to continue',
    '系统': 'System', '浅色': 'Light', '深色': 'Dark', '语言': 'Language', '主题': 'Theme', '随机配色': 'Random theme', '外观与语言': 'Appearance & language',
    '学校未设置': 'School not set', '尚未添加班级': 'No classes yet', '未选择班级': 'No class selected', '暂无任课班级': 'No teaching classes', '模块开发中...': 'Coming soon...',
    '平均分': 'Average', '及格率': 'Pass rate', '最高分': 'Highest', '最低分': 'Lowest', '待办事项': 'To-dos', '快捷操作': 'Quick actions', '今日安排': 'Today', '最近工作记录': 'Recent work', '暂无调课记录': 'No schedule changes',
    '全部': 'All', '详情': 'Details', '类型': 'Type', '原因': 'Reason', '范围': 'Scope', '学期': 'Semester', '学校': 'School', '身份': 'Role', '顺序': 'Order', '未配置': 'Not configured', '新建学期': 'New semester'
  };
  const originals = typeof WeakMap === 'function' ? new WeakMap() : null;
  const normalizeLocale = value => value && value.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
  const interpolate = (value, params) => value.replace(/\{(\w+)\}/g, (_, key) => params[key] == null ? `{${key}}` : params[key]);
  const translateText = value => {
    if (I18n.locale !== 'en-US' || !/[\u3400-\u9fff]/.test(value)) return value;
    const match = value.match(/^(\s*)(.*?)(\s*)$/s);
    return match && english[match[2]] ? match[1] + english[match[2]] + match[3] : value;
  };
  const translateTree = node => {
    if (!node || typeof document === 'undefined') return;
    const nodes = node.nodeType === 3 ? [node] : [];
    if (node.nodeType === 1 || node.nodeType === 9) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) nodes.push(walker.currentNode);
      const elements = node.nodeType === 1 ? [node, ...node.querySelectorAll('*')] : [...node.querySelectorAll('*')];
      elements.forEach(el => ['title', 'aria-label', 'placeholder'].forEach(attr => {
        if (!el.hasAttribute(attr)) return;
        const key = `attr:${attr}`;
        if (!el.dataset[key.replace(':', '')]) el.dataset[key.replace(':', '')] = el.getAttribute(attr);
        el.setAttribute(attr, I18n.locale === 'en-US' ? translateText(el.dataset[key.replace(':', '')]) : el.dataset[key.replace(':', '')]);
      }));
      elements.forEach(el => {
        if (el.tagName !== 'BUTTON' || el.textContent.trim() || !el.querySelector('svg')) return;
        const label = el.getAttribute('title') || (I18n.locale === 'en-US' ? 'Action' : '操作');
        el.setAttribute('title', label); el.setAttribute('aria-label', el.getAttribute('aria-label') || label);
      });
    }
    nodes.forEach(textNode => {
      if (textNode.parentElement && /^(SCRIPT|STYLE|TEXTAREA)$/.test(textNode.parentElement.tagName)) return;
      if (originals && !originals.has(textNode)) originals.set(textNode, textNode.nodeValue);
      const source = originals ? originals.get(textNode) : textNode.nodeValue;
      textNode.nodeValue = I18n.locale === 'en-US' ? translateText(source) : source;
    });
  };
  const I18n = {
    STORAGE_KEY: 'power-workspace-locale', locale: 'zh-CN', messages,
    t(key, params = {}, locale = this.locale) {
      const lang = messages[normalizeLocale(locale)] || messages['zh-CN'];
      return interpolate(lang[key] || messages['zh-CN'][key] || key, params);
    },
    setLocale(locale, options = {}) {
      this.locale = normalizeLocale(locale);
      if (typeof localStorage !== 'undefined') localStorage.setItem(this.STORAGE_KEY, this.locale);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = this.locale;
        document.title = this.t('app.name');
        if (options.render !== false && root.App && root.App.currentModule && typeof root.App.navigate === 'function') {
          if (typeof root.renderSidebar === 'function') root.renderSidebar();
          if (typeof root.renderTopbar === 'function') root.renderTopbar();
          root.App.navigate(root.App.currentModule);
        }
        translateTree(document.body);
        document.dispatchEvent(new CustomEvent('localechange', { detail: this.locale }));
      }
      return this.locale;
    },
    formatDate(value, options) { return new Intl.DateTimeFormat(this.locale, options).format(value); },
    translate(rootNode) { translateTree(rootNode || document.body); }
  };
  if (typeof localStorage !== 'undefined') I18n.locale = normalizeLocale(localStorage.getItem(I18n.STORAGE_KEY));
  root.I18n = I18n;
  if (typeof module !== 'undefined' && module.exports) module.exports = I18n;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = I18n.locale;
    document.addEventListener('DOMContentLoaded', () => {
      I18n.setLocale(I18n.locale, { render: false });
      new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(translateTree))).observe(document.body, { childList: true, subtree: true });
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
