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
    '全部': 'All', '详情': 'Details', '类型': 'Type', '原因': 'Reason', '范围': 'Scope', '学期': 'Semester', '学校': 'School', '身份': 'Role', '顺序': 'Order', '未配置': 'Not configured', '新建学期': 'New semester',
    '切换班级': 'Switch class', '添加任课班级': 'Add teaching class', '完成': 'Done', '返回班级管理': 'Back to classes', '下载模板': 'Download template', '导入教师配置': 'Import teacher setup', '导入表格': 'Import spreadsheet',
    '班主任': 'Homeroom teacher', '科任教师': 'Subject teachers', '各班科任教师': 'Subject teachers by class', '各科科任教师': 'Subject teachers', '联系方式（可选）': 'Contact (optional)', '联系方式': 'Contact', '未填写': 'Not provided', '编辑教师': 'Edit teacher', '添加教师': 'Add teacher', '教师配置': 'Teacher setup', '教师信息已保存': 'Teacher saved', '班主任已保存': 'Homeroom teacher saved',
    '年级': 'Grade', '班号': 'Class number', '学生姓名': 'Student name', '学生人数': 'Students', '任课班级': 'Teaching classes', '任教科目': 'Teaching subjects', '学校信息': 'School information', '学校名称': 'School name', '我的任教科目': 'My subjects', '教职生涯': 'Career history',
    '课表管理': 'Schedule settings', '时间段': 'Time slots', '时间轴': 'Timeline', '当前学期': 'Current semester', '学期名称': 'Semester name', '开始日期': 'Start date', '结束日期': 'End date', '上课时间': 'Class time', '任课教师': 'Teacher', '补课教师': 'Teacher', '补课科目': 'Subject', '调整类型': 'Change type', '生效范围': 'Effective range', '目标日期': 'Target date', '目标安排': 'Target schedule', '原课程': 'Original lesson', '调课日志': 'Schedule change log', '记录调课': 'Add schedule change', '保存调课': 'Save change',
    '新建默写': 'New dictation', '添加学生': 'Add student', '添加考试': 'Add exam', '布置作业': 'Assign homework', '添加记录': 'Add record', '添加待办': 'Add to-do', '新建教案': 'New lesson plan', '添加笔记': 'Add note', '批量导出': 'Export all', '导出全部数据': 'Export all data', '选择备份文件': 'Choose backup file', '重置为初始数据': 'Reset data',
    '暂无作业': 'No homework', '暂无考试': 'No exams', '暂无成绩数据': 'No grade data', '暂无待办事项': 'No to-dos', '暂无谈话记录': 'No conversations', '暂无家访记录': 'No home visits', '暂无默写记录': 'No dictations', '暂无工作记录': 'No work records', '请先添加学生': 'Add students first', '请先添加考试': 'Add an exam first', '请先选择班级': 'Select a class first',
    '平均分': 'Average score', '通过率': 'Pass rate', '提交率': 'Submission rate', '已交': 'Submitted', '未交': 'Missing', '已背': 'Passed', '未背': 'Not passed', '未登': 'Not recorded', '部分': 'Partial', '进行中': 'In progress', '已完成': 'Completed', '启用': 'Enabled', '停用': 'Disabled', '本人': 'Me', '账号固定': 'Account linked',
    "今天": "Today", "上一周": "Previous week", "下一周": "Next week", "本周": "This week", "调课": "Schedule change", "调课管理": "Schedule changes", "编辑调课": "Edit schedule change", "移课": "Move", "互换": "Swap", "停课": "Cancel lesson", "补课": "Extra lesson", "生效中": "Active", "已取消": "Cancelled",
    "课程": "Course", "课程名称": "Course name", "班级名称": "Class name", "班级/地点": "Class / location", "周几": "Day", "节次": "Period", "第几节": "Period", "查看班级": "View class", "配置班级": "Configure class", "点击选择课程": "Select course", "点击编辑": "Edit", "教师与本人": "Teachers and me", "设为本人": "Set as me", "尚未添加教师": "No teachers yet",
    "标题": "Title", "内容": "Content", "优先级": "Priority", "紧急": "Urgent", "一般": "Normal", "高": "High", "中": "Medium", "低": "Low", "姓名": "Name", "性别": "Gender", "男": "Male", "女": "Female", "考试": "Exam", "分数": "Score", "说明": "Notes", "选填": "Optional", "知道了": "Got it"
  };
  Object.assign(english, {
    '周一':'Monday','周二':'Tuesday','周三':'Wednesday','周四':'Thursday','周五':'Friday','周六':'Saturday','周日':'Sunday',
    '数据看板':'Overview','按生查看':'By student','全校':'School-wide','模板':'Template','截止日期':'Due date','原安排':'Original schedule','调至':'Move to','生效时间':'Effective time','课程/时段':'Course / period',
    '学号':'Student ID','编号':'ID','序号':'No.','得分':'Score','评分':'Rating','评语':'Comment','等级':'Level','优秀':'Excellent','良好':'Good','中等':'Average','家长':'Guardian','家长姓名':'Guardian name','家长电话':'Guardian phone','学生电话':'Student phone','电话':'Phone','英语水平':'English level',
    '教学内容':'Teaching content','单元':'Unit','课时':'Lessons','备注信息':'Notes','待办内容':'To-do','可选科目':'Optional subjects','科目选项':'Subject options','任教班级':'Teaching classes','学科':'Subject','星期':'Weekday',
    '导入全校总表':'Import master schedule','下载模板':'Download template','未设置':'Not set','未配置教师':'Teacher not configured','请输入班级名称':'Enter a class name','请输入教师姓名':'Enter a teacher name','如：吴老师':'e.g. Ms. Wu','如：五（1）班':'e.g. Grade 5 Class 1',
    '已添加':'Added','已更新':'Updated','已删除':'Deleted','已保存':'Saved','已复制':'Copied','复制失败':'Copy failed','确定删除此记录？':'Delete this record?','其他':'Other','内容':'Content','名字':'Name'
  });
  const originals = typeof WeakMap === 'function' ? new WeakMap() : null;
  const normalizeLocale = value => value && value.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
  const interpolate = (value, params) => value.replace(/\{(\w+)\}/g, (_, key) => params[key] == null ? `{${key}}` : params[key]);
  const translateText = (value, parent, force = false) => {
    if (I18n.locale !== 'en-US' || !/[\u3400-\u9fff]/.test(value)) return value;
    const match = value.match(/^(\s*)(.*?)(\s*)$/s);
    if (!match) return value;
    if (english[match[2]]) return match[1] + english[match[2]] + match[3];
    const selector = 'button,label,th,dt,.module-title,.module-subtitle,.card-title,.nav-item,.nav-section-label,.modal-title,.schedule-notice,.empty-state,.form-section-label,.management-title,.appearance-label,.class-dropdown-head,.tab,.stat-label,.tk-section-title,.schedule-summary-row,.schedule-free,.status-pill,.toast';
    if (!force && (!parent || !parent.closest || !parent.closest(selector))) return value;
    let translated = match[2];
    Object.keys(english).filter(key => key.length > 1).sort((a,b) => b.length - a.length).forEach(key => { translated = translated.split(key).join(english[key]); });
    return match[1] + translated + match[3];
  };
  const translateTree = node => {
    if (!node || typeof document === 'undefined') return;
    const nodes = node.nodeType === 3 ? [node] : [];
    if (node.nodeType === 1 || node.nodeType === 9) {
      const walker = document.createTreeWalker(node, 4);
      while (walker.nextNode()) nodes.push(walker.currentNode);
      const elements = node.nodeType === 1 ? [node, ...node.querySelectorAll('*')] : [...node.querySelectorAll('*')];
      elements.forEach(el => ['title', 'aria-label', 'placeholder'].forEach(attr => {
        if (!el.hasAttribute(attr)) return;
        const key = `attr:${attr}`;
        if (!el.dataset[key.replace(':', '')]) el.dataset[key.replace(':', '')] = el.getAttribute(attr);
        el.setAttribute(attr, I18n.locale === 'en-US' ? translateText(el.dataset[key.replace(':', '')], el, true) : el.dataset[key.replace(':', '')]);
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
      textNode.nodeValue = I18n.locale === 'en-US' ? translateText(source, textNode.parentElement) : source;
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
    formatTime(value) { return new Intl.DateTimeFormat(this.locale, { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(value); },
    formatNumber(value, options) { return new Intl.NumberFormat(this.locale, options).format(value); },
    translateText(value, parent) { return translateText(value, parent, true); },
    translate(rootNode) { translateTree(rootNode || document.body); }
  };
  if (typeof localStorage !== 'undefined') I18n.locale = normalizeLocale(localStorage.getItem(I18n.STORAGE_KEY));
  I18n.dictionary = english;
  root.I18n = I18n;
  if (typeof module !== 'undefined' && module.exports) module.exports = I18n;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = I18n.locale;
    document.addEventListener('DOMContentLoaded', () => {
      I18n.setLocale(I18n.locale, { render: false });
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
