(function (root) {
  const state = { mode: 'closed', classId: '', editingTeacherId: '', studentPromptId: '', deletePromptId: '' };
  const classDataKeys = ['students','schedule','recitation','dictation','exams','grades','homework','violations','seating','conversations','communications'];
  const gradeLabels = ['一年级','二年级','三年级','四年级','五年级','六年级'];
  const messages = {
    'zh-CN': {
      'topbar.menu':'打开菜单','topbar.classSelector':'选择班级','topbar.semesterSelector':'选择全局学期','topbar.week':'{date} · 第 {week} 周','topbar.account':'账户菜单',
      'semester.configure':'设置生涯','semester.readOnly':'只读','semester.active':'任教中','semester.planned':'计划任教',
      'class.switch':'切换班级','class.manage':'班级管理','class.none':'暂无任课班级','class.add':'添加任课班级','class.grade':'年级','class.number':'班号','class.name':'班级','class.students':'学生','class.teachers':'教师','class.studentCount':'{count} 名学生','class.studentPrompt':'前往学生管理编辑“{name}”的学生信息？','class.deletePrompt':'删除“{name}”后，该班学生、成绩、作业等数据将不再显示。确定删除？','class.coreHint':'在这里统一维护学生、班主任、科任教师与联系方式。','class.close':'关闭班级区域','class.back':'返回班级管理','class.import':'导入教师配置','class.template':'下载模板',
      'teacher.setup':'{name} · 教师配置','teacher.add':'添加教师','teacher.edit':'编辑教师','teacher.name':'教师姓名','teacher.contact':'联系方式（可选）','teacher.contactHint':'手机号、邮箱或办公电话','teacher.notProvided':'未填写','teacher.homeroom':'班主任','teacher.homeroomHint':'本人也可以兼任班主任。','teacher.subjects':'各科科任教师','teacher.me':'本人','teacher.unset':'未配置','teacher.summary':'{homeroom} · {count} 位科任教师','teacher.noHomeroom':'未设置班主任',
      'common.edit':'编辑','common.delete':'删除','common.save':'保存','common.cancel':'取消','common.confirm':'确定','common.done':'完成','common.import':'导入表格','common.actions':'操作',
      'nav.profile':'个人中心','nav.career':'生涯管理','nav.semesters':'学期信息','nav.data':'数据管理','nav.about':'关于','nav.logout':'退出登录'
    },
    'en-US': {
      'topbar.menu':'Open menu','topbar.classSelector':'Select class','topbar.semesterSelector':'Select global semester','topbar.week':'{date} · Week {week}','topbar.account':'Account menu',
      'semester.configure':'Set career','semester.readOnly':'Read only','semester.active':'Teaching','semester.planned':'Planned',
      'class.switch':'Switch class','class.manage':'Manage classes','class.none':'No teaching classes','class.add':'Add teaching class','class.grade':'Grade','class.number':'Class number','class.name':'Class','class.students':'Students','class.teachers':'Teachers','class.studentCount':'{count} students','class.studentPrompt':'Open Students to edit information for “{name}”?','class.deletePrompt':'Deleting “{name}” hides its students, grades, homework, and other class data. Continue?','class.coreHint':'Manage students, homeroom teachers, subject teachers, and contact details here.','class.close':'Close class area','class.back':'Back to classes','class.import':'Import teacher setup','class.template':'Download template',
      'teacher.setup':'{name} · Teacher setup','teacher.add':'Add teacher','teacher.edit':'Edit teacher','teacher.name':'Teacher name','teacher.contact':'Contact (optional)','teacher.contactHint':'Phone, email, or office number','teacher.notProvided':'Not provided','teacher.homeroom':'Homeroom teacher','teacher.homeroomHint':'Your own account can also be the homeroom teacher.','teacher.subjects':'Subject teachers','teacher.me':'Me','teacher.unset':'Not configured','teacher.summary':'{homeroom} · {count} subject teachers','teacher.noHomeroom':'No homeroom teacher',
      'common.edit':'Edit','common.delete':'Delete','common.save':'Save','common.cancel':'Cancel','common.confirm':'Confirm','common.done':'Done','common.import':'Import spreadsheet','common.actions':'Actions',
      'nav.profile':'Profile','nav.career':'Career','nav.semesters':'Semesters','nav.data':'Data','nav.about':'About','nav.logout':'Sign out'
    }
  };
  Object.entries(messages).forEach(([locale, values]) => Object.assign(I18n.messages[locale], values));
  const t = (key, params) => I18n.t(key, params);
  const drawer = () => document.getElementById('topbar-drawer');
  const topClass = id => (Store.data.classes || []).find(item => item.id === id);
  const activeConfig = id => {
    const term = scheduleTerm();
    return { term, scheduleClass: term.classes.find(item => (item.linkedClassId || item.id) === id) };
  };
  const teacherOptions = (term, selected) => '<option value="">' + t('teacher.unset') + '</option>' + (term.teachers || []).map(item => '<option value="' + item.id + '" ' + (item.id === selected ? 'selected' : '') + '>' + esc(item.name + (item.contact ? ' · ' + item.contact : '')) + '</option>').join('');

  let transitionToken = 0;
  function drawerHeight(mode, panel, wrapper) {
    if (mode === 'manager' || mode === 'teacher') {
      const bar = document.getElementById('topbar');
      return Math.max(0, wrapper.clientHeight - (bar ? bar.offsetHeight : 0));
    }
    return panel.scrollHeight;
  }
  function updateShell() {
    const wrapper = document.getElementById('main-wrapper');
    const panel = drawer();
    if (!wrapper || !panel) return;
    const mode = state.mode, token = ++transitionToken;
    if (mode === 'closed') {
      wrapper.dataset.drawerMode = 'closed';
      panel.setAttribute('aria-hidden','true');
      panel.style.height = panel.getBoundingClientRect().height + 'px';
      panel.classList.add('is-transitioning');
      requestAnimationFrame(() => {
        if (token !== transitionToken) return;
        panel.classList.remove('is-open','mode-classes','mode-manager','mode-teacher');
        panel.style.height = '0px';
      });
      const finishClose = event => {
        if (event.propertyName !== 'height' || token !== transitionToken) return;
        panel.removeEventListener('transitionend',finishClose);
        panel.classList.remove('is-transitioning'); panel.innerHTML=''; panel.style.height='';
      };
      panel.addEventListener('transitionend',finishClose);
      root.renderTopbar();
      return;
    }
    const currentHeight = panel.getBoundingClientRect().height;
    wrapper.dataset.drawerMode = mode;
    panel.setAttribute('aria-hidden','false');
    panel.style.height = currentHeight + 'px';
    renderDrawer();
    panel.className = 'topbar-drawer is-open is-transitioning mode-' + mode;
    root.renderTopbar();
    requestAnimationFrame(() => {
      if (token !== transitionToken) return;
      panel.style.height = drawerHeight(mode,panel,wrapper) + 'px';
    });
    const finishOpen = event => {
      if (event.propertyName !== 'height' || token !== transitionToken) return;
      panel.removeEventListener('transitionend',finishOpen);
      panel.classList.remove('is-transitioning');
      if (mode === 'classes') panel.style.height='auto';
    };
    panel.addEventListener('transitionend',finishOpen);
  }

  function classSummary(classId) {
    const { term, scheduleClass } = activeConfig(classId);
    if (!scheduleClass) return t('teacher.unset');
    const homeroom = (term.teachers || []).find(item => item.id === scheduleClass.homeroomTeacherId);
    const count = new Set(Object.values(scheduleClass.subjectTeachers || {}).filter(Boolean)).size;
    return t('teacher.summary', { homeroom: homeroom ? homeroom.name : t('teacher.noHomeroom'), count: I18n.formatNumber(count) });
  }

  function classMatrix() {
    const classes = Store.data.classes || [];
    return '<div class="drawer-compact"><div class="drawer-head"><strong>' + t('class.switch') + '</strong><div class="drawer-actions"><button class="btn btn-outline btn-sm" onclick="showClassManager()">' + ICON.grid + ' ' + t('class.manage') + '</button><button class="icon-button" onclick="WorkspaceHeader.close()" title="' + t('class.close') + '" aria-label="' + t('class.close') + '">' + ICON.close + '</button></div></div><div class="class-option-grid">' + (classes.length ? classes.map(item => '<button type="button" class="class-option ' + (item.id === Store.data.currentClassId ? 'active' : '') + '" onclick="switchClass(\'' + item.id + '\')">' + ICON.users + '<span>' + esc(item.name) + '</span>' + (item.id === Store.data.currentClassId ? ICON.check : '') + '</button>').join('') : '<div class="drawer-empty">' + t('class.none') + '</div>') + '</div></div>';
  }

  function managerView() {
    const rows = (Store.data.classes || []).map(item => {
      const count = ((Store.data.students || {})[item.id] || []).length;
      return '<article class="class-manage-row"><div class="class-manage-name"><span class="mobile-field-label">' + t('class.name') + '</span><strong>' + esc(item.name) + '</strong></div><div><span class="mobile-field-label">' + t('class.students') + '</span><button class="table-link" onclick="promptClassStudents(\'' + item.id + '\')">' + t('class.studentCount', {count:I18n.formatNumber(count)}) + '</button></div><div class="class-teacher-cell"><span><span class="mobile-field-label">' + t('class.teachers') + '</span>' + esc(classSummary(item.id)) + '</span><button class="btn btn-outline btn-sm" onclick="showClassTeacherEditor(\'' + item.id + '\')">' + t('common.edit') + '</button></div><button class="btn btn-danger btn-sm" onclick="requestRemoveManagedClass(\'' + item.id + '\')">' + t('common.delete') + '</button></article>';
    }).join('');
    const prompted = topClass(state.studentPromptId);
    const deleting = topClass(state.deletePromptId);
    const confirmation = prompted ? '<div class="drawer-confirm">' + ICON.info + '<span>' + esc(t('class.studentPrompt',{name:prompted.name})) + '</span><button class="btn btn-ghost btn-sm" onclick="dismissClassPrompt()">' + t('common.cancel') + '</button><button class="btn btn-primary btn-sm" onclick="confirmClassStudents(\'' + prompted.id + '\')">' + t('common.confirm') + '</button></div>' : deleting ? '<div class="drawer-confirm danger">' + ICON.alert + '<span>' + esc(t('class.deletePrompt',{name:deleting.name})) + '</span><button class="btn btn-ghost btn-sm" onclick="dismissClassPrompt()">' + t('common.cancel') + '</button><button class="btn btn-danger btn-sm" onclick="removeManagedClass(\'' + deleting.id + '\')">' + t('common.delete') + '</button></div>' : '';
    return '<div class="drawer-full"><div class="drawer-head"><div><h2>' + t('class.manage') + '</h2><p>' + t('class.coreHint') + '</p></div><button class="icon-button" onclick="WorkspaceHeader.close()" title="' + t('class.close') + '" aria-label="' + t('class.close') + '">' + ICON.close + '</button></div>' + confirmation + '<div class="class-create-row"><div class="form-group"><label class="form-label">' + t('class.grade') + '</label><select class="form-select" id="managed-grade">' + gradeLabels.map(item => '<option value="' + item + '">' + item + '</option>').join('') + '</select></div><div class="form-group"><label class="form-label">' + t('class.number') + '</label><select class="form-select" id="managed-number">' + Array.from({length:20},(_,i) => '<option value="' + (i+1) + '">' + (i+1) + '</option>').join('') + '</select></div><button class="btn btn-primary" onclick="createManagedClass()">' + ICON.plus + ' ' + t('class.add') + '</button></div><div class="class-manage-columns"><span>' + t('class.name') + '</span><span>' + t('class.students') + '</span><span>' + t('class.teachers') + '</span><span>' + t('common.actions') + '</span></div><div class="class-manage-list">' + (rows || '<div class="drawer-empty">' + t('class.none') + '</div>') + '</div><div class="drawer-footer"><button class="btn btn-outline" onclick="importTeacherConfiguration()">' + ICON.upload + ' ' + t('class.import') + '</button><button class="btn btn-ghost" onclick="downloadTeacherConfigurationTemplate()">' + t('class.template') + '</button></div></div>';
  }

  function teacherView() {
    const top = topClass(state.classId);
    if (!top) return managerView();
    const { term, scheduleClass } = activeConfig(state.classId);
    const teacher = (term.teachers || []).find(item => item.id === state.editingTeacherId) || {};
    const editor = state.editingTeacherId !== '' ? '<div class="inline-teacher-editor"><div class="form-group"><label class="form-label">' + t('teacher.name') + '</label><input class="form-input" id="managed-teacher-name" value="' + esc(teacher.name || '') + '"></div><div class="form-group"><label class="form-label">' + t('teacher.contact') + '</label><input class="form-input" id="managed-teacher-contact" value="' + esc(teacher.contact || '') + '" placeholder="' + t('teacher.contactHint') + '"></div><button class="btn btn-ghost" onclick="cancelManagedTeacherEdit()">' + t('common.cancel') + '</button><button class="btn btn-primary" onclick="saveManagedTeacher(\'' + state.classId + '\',\'' + (teacher.id || '') + '\')">' + t('common.save') + '</button></div>' : '';
    const teacherRows = (term.teachers || []).map(item => '<article class="teacher-manage-row"><div><strong>' + esc(item.name) + '</strong>' + (item.id === term.selfTeacherId ? ' <span class="status-pill success">' + t('teacher.me') + '</span>' : '') + '</div><span>' + esc(item.contact || t('teacher.notProvided')) + '</span><button class="btn btn-outline btn-sm" onclick="editManagedTeacher(\'' + state.classId + '\',\'' + item.id + '\')">' + t('common.edit') + '</button></article>').join('');
    const mappings = (term.subjects || []).map(subject => '<label><span>' + esc(subject.name) + '</span><select class="form-select" onchange="saveManagedSubjectTeacher(\'' + state.classId + '\',\'' + subject.id + '\',this.value)">' + teacherOptions(term,(scheduleClass.subjectTeachers || {})[subject.id]) + '</select></label>').join('');
    return '<div class="drawer-full"><div class="drawer-head"><div><button class="btn btn-ghost btn-sm" onclick="showClassManager()">' + '<span class="back-icon">' + ICON.chevronRight + '</span>' + ' ' + t('class.back') + '</button><h2>' + esc(t('teacher.setup',{name:top.name})) + '</h2></div><button class="icon-button" onclick="WorkspaceHeader.close()" title="' + t('class.close') + '" aria-label="' + t('class.close') + '">' + ICON.close + '</button></div><div class="teacher-editor-toolbar"><button class="btn btn-primary btn-sm" onclick="editManagedTeacher(\'' + state.classId + '\',\'__new__\')">' + ICON.plus + ' ' + t('teacher.add') + '</button><button class="btn btn-outline btn-sm" onclick="importTeacherConfiguration()">' + ICON.upload + ' ' + t('common.import') + '</button><button class="btn btn-ghost btn-sm" onclick="downloadTeacherConfigurationTemplate()">' + t('class.template') + '</button></div>' + editor + '<div class="teacher-manage-list">' + teacherRows + '</div><div class="form-group teacher-homeroom"><label class="form-label">' + t('teacher.homeroom') + '</label><select class="form-select" onchange="saveManagedHomeroom(\'' + state.classId + '\',this.value)">' + teacherOptions(term,scheduleClass.homeroomTeacherId) + '</select><p class="form-hint">' + t('teacher.homeroomHint') + '</p></div><div class="management-title">' + t('teacher.subjects') + '</div><div class="teacher-mapping-grid">' + mappings + '</div></div>';
  }

  function renderDrawer() {
    const panel = drawer();
    if (!panel) return;
    panel.innerHTML = state.mode === 'classes' ? classMatrix() : state.mode === 'manager' ? managerView() : state.mode === 'teacher' ? teacherView() : '';
  }

  root.WorkspaceHeader = {
    state,
    open(mode, classId) { state.mode = mode; if (classId) state.classId = classId; updateShell(); },
    close() { Object.assign(state,{mode:'closed',classId:'',editingTeacherId:'',studentPromptId:'',deletePromptId:''}); updateShell(); },
    render: updateShell,
    refreshLocale() { renderDrawer(); root.renderTopbar(); }
  };

  root.showClassDropdown = function (event) { if (event) event.stopPropagation(); state.mode === 'classes' ? root.WorkspaceHeader.close() : root.WorkspaceHeader.open('classes'); };
  root.addClass = root.showClassManager = function () { Object.assign(state,{mode:'manager',editingTeacherId:'',studentPromptId:'',deletePromptId:''}); updateShell(); };
  root.showClassTeacherEditor = function (classId) { Object.assign(state,{mode:'teacher',classId,editingTeacherId:'',studentPromptId:'',deletePromptId:''}); updateShell(); };
  root.editManagedTeacher = function (classId, teacherId) { Object.assign(state,{mode:'teacher',classId,editingTeacherId:teacherId || '__new__'}); updateShell(); };
  root.cancelManagedTeacherEdit = function () { state.editingTeacherId=''; updateShell(); };
  root.promptClassStudents = function (classId) { state.studentPromptId=classId; state.deletePromptId=''; updateShell(); };
  root.requestRemoveManagedClass = function (classId) { state.deletePromptId=classId; state.studentPromptId=''; updateShell(); };
  root.dismissClassPrompt = function () { state.studentPromptId=''; state.deletePromptId=''; updateShell(); };
  root.confirmClassStudents = function (classId) { Store.setCurrentClass(classId); root.WorkspaceHeader.close(); root.renderSidebar(); App.navigate('students'); };
  root.removeManagedClass = function (id) {
    if (state.deletePromptId !== id) return root.requestRemoveManagedClass(id);
    Store.data.classes = (Store.data.classes || []).filter(item => item.id !== id);
    classDataKeys.forEach(key => { if (Store.data[key]) delete Store.data[key][id]; });
    const workspace = Store.data.scheduleWorkspace;
    ((workspace && workspace.semesters) || []).forEach(term => {
      const removed = term.classes.filter(item => (item.linkedClassId || item.id) === id);
      removed.forEach(item => { delete term.classSchedules[item.id]; });
      term.adjustments = (term.adjustments || []).filter(item => item.sourceClassId !== id && item.targetClassId !== id);
      term.classes = term.classes.filter(item => (item.linkedClassId || item.id) !== id);
    });
    Store.data.currentClassId = ((Store.data.classes || [])[0] || {}).id || null;
    Store.save(); state.deletePromptId=''; root.renderSidebar(); updateShell();
  };
  root.switchClass = function (id) {
    Store.setCurrentClass(id);
    const term = scheduleTerm();
    const scheduleClass = term.classes.find(item => (item.linkedClassId || item.id) === id);
    if (scheduleClass) ScheduleUI.classId = scheduleClass.id;
    root.WorkspaceHeader.close(); root.renderSidebar(); App.navigate(App.currentModule);
    const current = Store.getCurrentClass(); if (current) UI.toast((I18n.locale === 'en-US' ? 'Switched to ' : '已切换到 ') + current.name);
  };

  root.renderTopbar = function () {
    const bar = document.getElementById('topbar'); if (!bar) return;
    const cls = Store.getCurrentClass(), user = Auth.getUser(), displayName = user ? (user.nickname || user.username) : (I18n.locale === 'en-US' ? 'Teacher' : '教师');
    const workspace = ScheduleCore.ensure(Store.data);
    const now = new Date(), date = I18n.formatDate(now,{weekday:'short',year:'numeric',month:'short',day:'numeric'});
    const semesterOptions = workspace.semesters.filter(term => !term.onboarding).map(term => {
      const record = (((Store.data.schoolProfile || {}).careerRecords) || []).find(item => item.semesterId === term.id);
      const suffix = record && record.status === '任教中' ? t('semester.active') : record && record.status === '计划任教' ? t('semester.planned') : t('semester.readOnly');
      return '<option value="' + term.id + '" ' + (term.id === workspace.selectedSemesterId ? 'selected' : '') + '>' + esc(term.name) + ' · ' + suffix + '</option>';
    }).join('');
    const semesterControl = semesterOptions
      ? '<label class="semester-selector" title="' + t('topbar.semesterSelector') + '">' + ICON.schedule + '<select onchange="selectWorkspaceSemester(this.value)" aria-label="' + t('topbar.semesterSelector') + '">' + semesterOptions + '</select>' + ICON.chevronDown + '</label>'
      : '<button type="button" class="semester-selector needs-career" onclick="showCareerManagement()">' + ICON.schedule + '<span>' + t('semester.configure') + '</span></button>';
    bar.innerHTML = '<button class="hamburger" onclick="toggleSidebar()" title="' + t('topbar.menu') + '" aria-label="' + t('topbar.menu') + '">' + ICON.menu + '</button>' + semesterControl + '<button type="button" class="class-selector" onclick="showClassDropdown(event)" aria-expanded="' + (state.mode === 'classes') + '" aria-label="' + t('topbar.classSelector') + '">' + ICON.users + '<span class="class-name">' + esc(cls ? cls.name : t('class.none')) + '</span>' + ICON.chevronDown + '</button><div class="topbar-spacer"></div><div class="topbar-datetime"><div class="topbar-date">' + t('topbar.week',{date,week:I18n.formatNumber(getSchoolWeek())}) + '</div><div class="topbar-time" id="topbar-time">' + I18n.formatTime(now) + '</div></div><button class="appearance-trigger" type="button" onclick="toggleAppearancePanel(event)" title="' + I18n.t('appearance.title') + '" aria-label="' + I18n.t('appearance.title') + '">' + ICON.palette + '</button><div class="topbar-user-wrap" onclick="showUserDropdown(event)"><button class="topbar-user" type="button" title="' + esc(displayName) + '" aria-label="' + t('topbar.account') + '">' + esc(Array.from(displayName)[0] || 'T') + '</button><div class="dropdown-menu account-menu" id="user-dropdown"><div class="dropdown-item" onclick="showProfile()">' + ICON.user + '<span>' + t('nav.profile') + '</span></div><div class="dropdown-item" onclick="showCareerManagement()">' + ICON.records + '<span>' + t('nav.career') + '</span></div><div class="dropdown-item" onclick="showSettings()">' + ICON.grid + '<span>' + t('nav.data') + '</span></div><div class="dropdown-item" onclick="showAbout()">' + ICON.info + '<span>' + t('nav.about') + '</span></div><div class="account-menu-separator"></div><div class="dropdown-item" onclick="Auth.logout()">' + ICON.logout + '<span>' + t('nav.logout') + '</span></div></div></div>';
  };

  document.addEventListener('localechange', () => root.WorkspaceHeader.refreshLocale());
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && state.mode !== 'closed') root.WorkspaceHeader.close(); });
})(window);
