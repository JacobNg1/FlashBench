/* 统一班级、学校科目、学期与教职生涯管理 */
(function () {
  const PRIMARY_SUBJECTS = ['语文','数学','英语','科学','道德与法治','体育','音乐','美术','信息科技','劳动','综合实践','班会'];
  const GRADE_LABELS = ['一年级','二年级','三年级','四年级','五年级','六年级'];
  const CLASS_DATA_KEYS = ['students','schedule','recitation','dictation','exams','grades','homework','violations','seating','conversations','communications'];
  const originalScheduleTerm = window.scheduleTerm;
  const originalNavigate = App.navigate.bind(App);

  const normalize = value => ScheduleCore.normalizeName(value);
  const itemId = prefix => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function schoolData(data = Store.data) {
    data.schoolProfile ||= { schoolName:'', subjects:[], teachingSubjectIds:[], careerRecords:[] };
    const profile = data.schoolProfile;
    profile.schoolName ||= '';
    profile.subjects ||= [];
    profile.teachingSubjectIds ||= [];
    profile.careerRecords ||= [];
    return profile;
  }

  function collectSubjectUsage(data) {
    const used = new Set();
    const workspace = data.scheduleWorkspace;
    (workspace && workspace.semesters || []).forEach(term => {
      (term.adjustments || []).forEach(item => { if (item.subjectId) used.add(item.subjectId); });
      Object.values(term.classSchedules || {}).forEach(days => Object.values(days || {}).forEach(slots =>
        Object.values(slots || {}).forEach(cell => { if (cell && cell.subjectId) used.add(cell.subjectId); })
      ));
    });
    return used;
  }

  function ensureSchoolSubjects(data) {
    const profile = schoolData(data);
    const byName = new Map(profile.subjects.map(item => [item.name, item]));
    const terms = (data.scheduleWorkspace && data.scheduleWorkspace.semesters) || [];
    terms.forEach(term => (term.subjects || []).forEach(subject => {
      if (!byName.has(subject.name)) {
        const item = { id:subject.id || itemId('subject'), name:subject.name };
        profile.subjects.push(item); byName.set(item.name, item);
      }
    }));
    if (!profile.subjects.length) {
      PRIMARY_SUBJECTS.forEach((name,index) => profile.subjects.push({id:'subject_' + (index + 1),name}));
    }
    terms.forEach(term => {
      const oldByName = new Map((term.subjects || []).map(item => [item.name,item.id]));
      const remap = {};
      profile.subjects.forEach(subject => {
        const oldId = oldByName.get(subject.name);
        if (oldId && oldId !== subject.id) remap[oldId] = subject.id;
      });
      Object.values(term.classSchedules || {}).forEach(days => Object.values(days || {}).forEach(slots =>
        Object.values(slots || {}).forEach(cell => { if (cell && remap[cell.subjectId]) cell.subjectId = remap[cell.subjectId]; })
      ));
      (term.classes || []).forEach(cls => {
        const next = {};
        Object.entries(cls.subjectTeachers || {}).forEach(([id,teacher]) => { next[remap[id] || id] = teacher; });
        cls.subjectTeachers = next;
      });
      term.subjects = profile.subjects.map(item => ({...item}));
    });
  }

  function ensureUnifiedClasses(data) {
    data.classes ||= [];
    const terms = (data.scheduleWorkspace && data.scheduleWorkspace.semesters) || [];
    terms.forEach(term => (term.classes || []).forEach(scheduleClass => {
      let top = data.classes.find(item => item.id === scheduleClass.linkedClassId || item.id === scheduleClass.id)
        || data.classes.find(item => normalize(item.name) === normalize(scheduleClass.name));
      if (!top) {
        top = { id:scheduleClass.linkedClassId || itemId('class'), name:scheduleClass.name, studentCount:0 };
        data.classes.push(top);
      }
      scheduleClass.linkedClassId = top.id;
      scheduleClass.name = top.name;
    }));
    terms.forEach(term => {
      data.classes.forEach(top => {
        let scheduleClass = term.classes.find(item => item.linkedClassId === top.id || item.id === top.id)
          || term.classes.find(item => normalize(item.name) === normalize(top.name));
        if (!scheduleClass) {
          scheduleClass = { id:top.id, name:top.name, linkedClassId:top.id, subjectTeachers:{} };
          term.classes.push(scheduleClass);
          term.classSchedules[scheduleClass.id] ||= {};
        } else {
          scheduleClass.linkedClassId = top.id;
          scheduleClass.name = top.name;
          scheduleClass.subjectTeachers ||= {};
          term.classSchedules[scheduleClass.id] ||= {};
        }
      });
      const topIds = new Set(data.classes.map(item => item.id));
      term.classes = term.classes.filter(item => topIds.has(item.linkedClassId || item.id));
    });
    if (!data.classes.some(item => item.id === data.currentClassId)) data.currentClassId = (data.classes[0] || {}).id || null;
  }

  function careerPeriod(term) {
    const date = new Date((term.startDate || new Date().toISOString().slice(0,10)) + 'T00:00:00');
    return date.getFullYear() + '年' + (date.getMonth() < 6 ? '上半年' : '下半年');
  }

  function ensureCareerForTerm(data, term) {
    const profile = schoolData(data);
    let record = profile.careerRecords.find(item => item.semesterId === term.id);
    const teachingNames = profile.subjects.filter(item => profile.teachingSubjectIds.includes(item.id)).map(item => item.name);
    if (!record) {
      record = {
        id:itemId('career'), semesterId:term.id, period:careerPeriod(term),
        schoolName:profile.schoolName, subjectNames:teachingNames,
        startDate:term.startDate, endDate:term.endDate,
        status:term.archived ? '已完结' : '任教中', note:''
      };
      profile.careerRecords.unshift(record);
    } else {
      record.period ||= careerPeriod(term);
      record.startDate = term.startDate;
      record.endDate = term.endDate;
      record.status = term.archived ? '已完结' : '任教中';
    }
  }

  window.ensureWorkspaceManagementData = function (data) {
    const before = JSON.stringify({classes:data.classes,schoolProfile:data.schoolProfile});
    ensureSchoolSubjects(data);
    ensureUnifiedClasses(data);
    const workspace = data.scheduleWorkspace;
    (workspace && workspace.semesters || []).forEach(term => ensureCareerForTerm(data,term));
    if (typeof syncProfileTeacherAcrossTerms === 'function' && Auth.getUser()) syncProfileTeacherAcrossTerms(Auth.getUser());
    if (JSON.stringify({classes:data.classes,schoolProfile:data.schoolProfile}) !== before && Store.data === data) Store.save();
    return data;
  };

  window.scheduleTerm = function () {
    ensureWorkspaceManagementData(Store.data);
    const term = originalScheduleTerm();
    ensureUnifiedClasses(Store.data);
    term.subjects = schoolData().subjects.map(item => ({...item}));
    return term;
  };

  function className(grade, number) {
    return grade + '（' + number + '）班';
  }

  window.showClassManager = function () {
    const rows = Store.data.classes.map(item => {
      const count = ((Store.data.students || {})[item.id] || []).length;
      return '<tr><td><strong>' + esc(item.name) + '</strong></td><td>' + count + ' 名学生</td><td><button class="btn btn-danger btn-sm" onclick="removeManagedClass(\'' + item.id + '\')">删除</button></td></tr>';
    }).join('');
    UI.modal('班级管理',
      '<div class="schedule-notice muted">' + ICON.info + '<div><strong>班级是工作台的核心</strong><span>这里的班级同时用于学生、成绩、作业、沟通和课表，不需要在其他页面重复添加。</span></div></div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">年级</label><select class="form-select" id="managed-grade">' +
      GRADE_LABELS.map(item => '<option value="' + item + '">' + item + '</option>').join('') +
      '</select></div><div class="form-group"><label class="form-label">班号</label><select class="form-select" id="managed-number">' +
      Array.from({length:20},(_,index)=>'<option value="' + (index+1) + '">' + (index+1) + ' 班</option>').join('') +
      '</select></div></div><button class="btn btn-primary mb-4" onclick="createManagedClass()">' + ICON.plus + ' 添加任课班级</button>' +
      (rows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>班级</th><th>学生</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : UI.empty(ICON.users,'尚未添加任课班级')),
      '<button class="btn btn-primary" onclick="UI.closeModal()">完成</button>');
  };

  window.createManagedClass = function () {
    const name = className(document.getElementById('managed-grade').value, document.getElementById('managed-number').value);
    if (Store.data.classes.some(item => item.name === name)) return UI.toast('该班级已存在','warning');
    const item = {id:itemId('class'),name,studentCount:0};
    Store.data.classes.push(item);
    CLASS_DATA_KEYS.forEach(key => { Store.data[key] ||= {}; Store.data[key][item.id] ||= []; });
    Store.data.currentClassId = item.id;
    ensureUnifiedClasses(Store.data);
    Store.save(); UI.closeModal(); renderTopbar(); renderSidebar(); showClassManager();
  };

  window.removeManagedClass = function (id) {
    const cls = Store.data.classes.find(item => item.id === id);
    if (!cls) return;
    UI.confirm('删除“' + esc(cls.name) + '”后，该班学生、成绩、作业等班级数据将不再显示。建议先导出备份。确定删除？', () => {
      Store.data.classes = Store.data.classes.filter(item => item.id !== id);
      CLASS_DATA_KEYS.forEach(key => { if (Store.data[key]) delete Store.data[key][id]; });
      const workspace = Store.data.scheduleWorkspace;
      (workspace && workspace.semesters || []).forEach(term => {
        const removed = term.classes.filter(item => (item.linkedClassId || item.id) === id);
        removed.forEach(item => {
          delete term.classSchedules[item.id];
          term.adjustments = (term.adjustments || []).filter(adj => adj.sourceClassId !== item.id && adj.targetClassId !== item.id);
        });
        term.classes = term.classes.filter(item => (item.linkedClassId || item.id) !== id);
      });
      Store.data.currentClassId = (Store.data.classes[0] || {}).id || null;
      Store.save(); UI.closeModal(); renderTopbar(); renderSidebar();
      if (Store.data.classes.length) showClassManager(); else App.navigate('dashboard');
    });
  };

  window.addClass = window.showClassManager;

  window.switchClass = function (id) {
    Store.setCurrentClass(id);
    const term = scheduleTerm();
    const scheduleClass = term.classes.find(item => (item.linkedClassId || item.id) === id);
    if (scheduleClass) ScheduleUI.classId = scheduleClass.id;
    const dropdown = document.getElementById('class-dropdown');
    if (dropdown) dropdown.classList.remove('show');
    renderTopbar(); renderSidebar(); App.navigate(App.currentModule);
    const current = Store.getCurrentClass();
    if (current) UI.toast('已切换到 ' + current.name);
  };

  window.renderTopbar = function () {
    const tb = document.getElementById('topbar'), cls = Store.getCurrentClass(), user = Auth.getUser();
    const displayName = user ? (user.nickname || user.username) : '教师';
    const now = new Date(), weekDays = ['日','一','二','三','四','五','六'];
    const dateStr = I18n.locale === 'en-US' ? I18n.formatDate(now, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) + ' · Week ' + getSchoolWeek() : now.getFullYear() + '年' + (now.getMonth()+1) + '月' + now.getDate() + '日 周' + weekDays[now.getDay()] + ' 第' + getSchoolWeek() + '周';
    tb.innerHTML =
      '<button class="hamburger" onclick="toggleSidebar()">' + ICON.menu + '</button>' +
      '<div class="class-selector" onclick="showClassDropdown(event)">' + ICON.users + '<span class="class-name">' + esc(cls ? cls.name : '尚未添加班级') + '</span>' + ICON.chevronDown + '</div>' +
      '<div class="dropdown-menu" id="class-dropdown">' +
      Store.data.classes.map(item => '<div class="dropdown-item" onclick="switchClass(\'' + item.id + '\')">' + ICON.users + '<span>' + esc(item.name) + '</span>' + (item.id===Store.data.currentClassId?ICON.check:'') + '</div>').join('') +
      (!Store.data.classes.length ? '<div class="dropdown-item muted">暂无任课班级</div>' : '') + '</div>' +
      '<button class="btn btn-outline btn-sm class-manage-button" onclick="showClassManager()">' + ICON.plus + ' 班级管理</button>' +
      '<div class="topbar-spacer"></div><div class="topbar-datetime"><div class="topbar-date">' + dateStr + '</div><div class="topbar-time" id="topbar-time">' + now.toTimeString().slice(0,8) + '</div></div>' +
      '<button class="appearance-trigger" type="button" onclick="toggleAppearancePanel(event)" title="外观与语言" aria-label="外观与语言">' + ICON.palette + '</button>' +
      '<div class="topbar-user-wrap" onclick="showUserDropdown(event)"><div class="topbar-user" title="' + esc(displayName) + '">' + esc(Array.from(displayName)[0] || '师') + '</div>' +
      '<div class="dropdown-menu account-menu" id="user-dropdown">' +
      '<div class="dropdown-item" onclick="showProfile()">' + ICON.user + '<span>个人中心</span></div>' +
      '<div class="dropdown-item" onclick="showCareerManagement()">' + ICON.records + '<span>生涯管理</span></div>' +
      '<div class="dropdown-item" onclick="showSemesterManagement()">' + ICON.schedule + '<span>学期信息</span></div>' +
      '<div class="dropdown-item" onclick="showSettings()">' + ICON.grid + '<span>数据管理</span></div>' +
      '<div class="account-menu-separator"></div><div class="dropdown-item" onclick="Auth.logout()">' + ICON.logout + '<span>退出登录</span></div></div></div>';
  };

  window.renderSidebar = function () {
    const sb = document.getElementById('sidebar'), school = schoolData().schoolName;
    let html = '<div class="sidebar-header"><div class="sidebar-logo">' + ICON.lesson + '</div><div><div class="sidebar-title">超能工作台</div><div class="sidebar-subtitle">' + esc(school || '学校未设置') + '</div></div></div><nav class="sidebar-nav">';
    NAV.forEach(section => {
      html += '<div class="nav-section-label">' + section.section + '</div>';
      section.items.forEach(item => { html += '<div class="nav-item ' + (App.currentModule===item.id?'active':'') + '" data-module="' + item.id + '">' + ICON[item.icon] + '<span>' + item.label + '</span></div>'; });
    });
    sb.innerHTML = html + '</nav><div class="sidebar-footer">Powered by Gene<br><a href="mailto:wjj_gene@163.com">wjj_gene@163.com</a></div>';
    sb.querySelectorAll('.nav-item').forEach(element => {
      element.onclick = () => { App.navigate(element.dataset.module); if (window.innerWidth <= 768) closeSidebar(); };
    });
  };

  function subjectChecks(profile) {
    const names = [...new Set([...PRIMARY_SUBJECTS, ...profile.subjects.map(item => item.name)])];
    return names.map(name => {
      const existing = profile.subjects.find(item => item.name === name);
      return '<label class="management-check"><input type="checkbox" class="school-subject-check" value="' + esc(name) + '" ' + (existing?'checked':'') + '><span>' + esc(name) + '</span></label>';
    }).join('');
  }

  function teachingChecks(profile) {
    return profile.subjects.map(item => '<label class="management-check"><input type="checkbox" class="teaching-subject-check" value="' + item.id + '" ' + (profile.teachingSubjectIds.includes(item.id)?'checked':'') + '><span>' + esc(item.name) + '</span></label>').join('');
  }

  window.showCareerManagement = function () {
    const profile = schoolData();
    const records = profile.careerRecords.map(item => '<tr onclick="editCareerRecord(\'' + item.id + '\')"><td><strong>' + esc(item.period) + '</strong><br><span class="text-sm text-muted">' + esc(item.schoolName || '学校未设置') + '</span></td><td>' + esc((item.subjectNames||[]).join('、') || '未设置') + '</td><td><span class="status-pill ' + (item.status==='任教中'?'success':'') + '">' + esc(item.status) + '</span></td></tr>').join('');
    UI.modal('生涯管理',
      '<div class="management-section"><div class="management-title">学校信息</div><div class="form-group"><label class="form-label">学校名称</label><input class="form-input" id="career-school-name" value="' + esc(profile.schoolName) + '" placeholder="未设置时左上角显示“学校未设置”"></div>' +
      '<label class="form-label">学校开设科目</label><div class="management-check-grid">' + subjectChecks(profile) + '</div><div class="form-group mt-3"><label class="form-label">其他科目（用顿号分隔）</label><input class="form-input" id="career-custom-subjects" placeholder="如：书法、心理健康"></div></div>' +
      '<div class="management-section"><div class="management-title">我的任教科目</div><p class="text-sm text-muted mb-2">可多选；这些科目会默认把本人设为各任课班级的科任教师。</p><div class="management-check-grid" id="teaching-subject-list">' + teachingChecks(profile) + '</div></div>' +
      '<button class="btn btn-primary mb-4" onclick="saveSchoolCareerSettings()">保存学校与科目</button>' +
      '<div class="management-section"><div class="management-title">教职生涯 <button class="btn btn-outline btn-sm" onclick="editCareerRecord()">' + ICON.plus + ' 添加经历</button></div>' +
      (records?'<div class="table-wrap"><table class="data-table career-table"><thead><tr><th>时期与学校</th><th>任教科目</th><th>状态</th></tr></thead><tbody>'+records+'</tbody></table></div>':UI.empty(ICON.records,'创建学期后会自动生成一条任教中记录')) + '</div>',
      '<button class="btn btn-primary" onclick="UI.closeModal()">完成</button>');
  };

  window.saveSchoolCareerSettings = function () {
    const profile = schoolData();
    syncProfileTeacherAcrossTerms(Auth.getUser());
    const selectedNames = Array.from(document.querySelectorAll('.school-subject-check:checked')).map(item=>item.value);
    document.getElementById('career-custom-subjects').value.split(/[、,，]/).map(item=>item.trim()).filter(Boolean).forEach(name=>{if(!selectedNames.includes(name))selectedNames.push(name);});
    const used = collectSubjectUsage(Store.data);
    const removedUsed = profile.subjects.filter(item=>used.has(item.id) && !selectedNames.includes(item.name));
    if (removedUsed.length) return UI.toast('这些科目已有课表数据，不能移除：' + removedUsed.map(item=>item.name).join('、'),'warning');
    const oldByName = new Map(profile.subjects.map(item=>[item.name,item]));
    profile.subjects = selectedNames.map(name=>oldByName.get(name)||{id:itemId('subject'),name});
    profile.schoolName = document.getElementById('career-school-name').value.trim();
    const requestedTeaching = Array.from(document.querySelectorAll('.teaching-subject-check:checked')).map(item=>item.value);
    profile.teachingSubjectIds = requestedTeaching.filter(id=>profile.subjects.some(item=>item.id===id));
    const workspace = Store.data.scheduleWorkspace;
    (workspace && workspace.semesters || []).forEach(term => {
      term.subjects = profile.subjects.map(item=>({...item}));
      const selfId = term.selfTeacherId;
      term.classes.forEach(cls => profile.teachingSubjectIds.forEach(id => { if (!cls.subjectTeachers[id]) cls.subjectTeachers[id] = selfId; }));
      ensureCareerForTerm(Store.data,term);
    });
    profile.careerRecords.filter(item=>item.status==='任教中').forEach(item => {
      item.schoolName = profile.schoolName;
      item.subjectNames = profile.subjects.filter(subject=>profile.teachingSubjectIds.includes(subject.id)).map(subject=>subject.name);
    });
    Store.save(); renderSidebar(); UI.closeModal(); showCareerManagement(); UI.toast('学校与任教科目已保存');
  };

  window.editCareerRecord = function (id) {
    const profile = schoolData(), record = profile.careerRecords.find(item=>item.id===id) || {};
    UI.modal(id?'编辑教职经历':'添加教职经历',
      '<div class="form-row"><div class="form-group"><label class="form-label">时期（半年）</label><input class="form-input" id="career-period" value="' + esc(record.period||'') + '" placeholder="如：2026年上半年"></div><div class="form-group"><label class="form-label">状态</label><select class="form-select" id="career-status"><option ' + (record.status!=='已完结'?'selected':'') + '>任教中</option><option ' + (record.status==='已完结'?'selected':'') + '>已完结</option></select></div></div>' +
      '<div class="form-group"><label class="form-label">学校</label><input class="form-input" id="career-record-school" value="' + esc(record.schoolName||profile.schoolName) + '"></div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">开始日期</label><input class="form-input" type="date" id="career-start" value="' + esc(record.startDate||'') + '"></div><div class="form-group"><label class="form-label">结束日期</label><input class="form-input" type="date" id="career-end" value="' + esc(record.endDate||'') + '"></div></div>' +
      '<div class="form-group"><label class="form-label">任教科目</label><input class="form-input" id="career-subjects" value="' + esc((record.subjectNames||[]).join('、')) + '" placeholder="用顿号分隔"></div><div class="form-group"><label class="form-label">备注</label><textarea class="form-textarea" id="career-note">' + esc(record.note||'') + '</textarea></div>',
      '<button class="btn btn-ghost" onclick="UI.closeModal();showCareerManagement()">取消</button><button class="btn btn-primary" onclick="saveCareerRecord(\'' + (id||'') + '\')">保存</button>');
  };

  window.saveCareerRecord = function (id) {
    const profile=schoolData(), period=document.getElementById('career-period').value.trim();
    if (!/^\d{4}年[上下]半年$/.test(period)) return UI.toast('时期格式应为“2026年上半年”', 'warning');
    const next={id:id||itemId('career'),period,status:document.getElementById('career-status').value,schoolName:document.getElementById('career-record-school').value.trim(),startDate:document.getElementById('career-start').value,endDate:document.getElementById('career-end').value,subjectNames:document.getElementById('career-subjects').value.split(/[、,，]/).map(x=>x.trim()).filter(Boolean),note:document.getElementById('career-note').value.trim()};
    const index=profile.careerRecords.findIndex(item=>item.id===id);
    if(index>=0)profile.careerRecords[index]={...profile.careerRecords[index],...next};else profile.careerRecords.unshift(next);
    Store.save();UI.closeModal();showCareerManagement();
  };

  window.showSemesterManagement = function () {
    const workspace=ScheduleCore.ensure(Store.data), active=ScheduleCore.activeSemester(Store.data);
    const rows=workspace.semesters.map(term=>'<tr><td><strong>'+esc(term.name)+'</strong><br><span class="text-sm text-muted">'+term.startDate+' 至 '+term.endDate+'</span></td><td><span class="status-pill '+(!term.archived?'success':'')+'">'+(term.archived?'已完结':'进行中')+'</span></td><td><button class="btn btn-outline btn-sm" onclick="setScheduleSemester(\''+term.id+'\');editScheduleSemester()">编辑</button></td></tr>').join('');
    UI.modal('学期信息','<div class="schedule-notice muted">'+ICON.info+'<div><strong>学期与生涯自动关联</strong><span>创建学期会生成“任教中”经历，归档学期会将其标记为“已完结”。</span></div></div><button class="btn btn-primary mb-3" onclick="addScheduleSemester()">'+ICON.plus+' 新建学期</button><div class="table-wrap"><table class="data-table"><thead><tr><th>学期</th><th>状态</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>',
      '<button class="btn btn-primary" onclick="UI.closeModal()">完成</button>');
  };

  window.addScheduleSemester = function () {
    const workspace=Store.data.scheduleWorkspace, term=ScheduleCore.newSemester();
    term.subjects=schoolData().subjects.map(item=>({...item}));
    workspace.semesters.push(term);workspace.activeSemesterId=term.id;
    ensureUnifiedClasses(Store.data);ensureCareerForTerm(Store.data,term);syncProfileTeacherAcrossTerms(Auth.getUser());
    Store.save();UI.closeModal();editScheduleSemester();
  };

  window.saveScheduleSemester = function () {
    const term=scheduleTerm(),name=document.getElementById('term-name').value.trim(),start=document.getElementById('term-start').value,end=document.getElementById('term-end').value;
    if(!name||!start||!end||start>end)return UI.toast('请填写有效的学期名称和日期','warning');
    Object.assign(term,{name,startDate:start,endDate:end,archived:document.getElementById('term-archived').checked});
    ensureCareerForTerm(Store.data,term);scheduleSave('学期信息已保存');UI.closeModal();
    if(App.currentModule==='schedule')M.schedule();else showSemesterManagement();
  };

  window.renderScheduleSettings = function (term) {
    if(!ScheduleUI.mappingClassId||!scheduleEntity(term.classes,ScheduleUI.mappingClassId))ScheduleUI.mappingClassId=(term.classes[0]||{}).id||'';
    const mapClass=scheduleEntity(term.classes,ScheduleUI.mappingClassId);
    const slotRows=term.slots.map((item,index)=>'<tr><td>'+(index+1)+'</td><td><strong>'+esc(item.label)+'</strong></td><td>'+esc(ScheduleCore.timeText(item))+'</td><td>'+(item.enabled===false?'停用':'启用')+'</td><td><button class="btn btn-outline btn-sm" onclick="editScheduleSlot(\''+item.id+'\')">编辑</button></td></tr>').join('');
    const teacherRows=term.teachers.map(item=>'<tr><td>'+esc(item.name)+'</td><td>'+(item.id===term.selfTeacherId?'<span class="status-pill success">本人</span>':'—')+'</td><td>'+(item.id===term.selfTeacherId?'<span class="text-sm text-muted">账号固定</span>':'—')+'</td></tr>').join('');
    const mapping=mapClass?'<div class="schedule-filter mb-3"><label>任课班级</label><select class="form-select" onchange="ScheduleUI.mappingClassId=this.value;M.schedule()">'+scheduleOption(term.classes,mapClass.id)+'</select></div><div class="teacher-mapping-grid">'+term.subjects.map(subject=>'<label><span>'+esc(subject.name)+'</span><select class="form-select" onchange="saveSubjectTeacher(\''+mapClass.id+'\',\''+subject.id+'\',this.value)"><option value="">未配置</option>'+scheduleOption(term.teachers,mapClass.subjectTeachers[subject.id])+'</select></label>').join('')+'</div>':'<div class="schedule-notice">'+ICON.info+'<div><strong>尚未添加班级</strong><span>请使用顶部“班级管理”添加任课班级。</span></div><button class="btn btn-primary btn-sm" onclick="showClassManager()">班级管理</button></div>';
    return '<div class="settings-grid">'+renderScheduleTimeline(term)+'</div><div class="settings-grid"><section class="card schedule-settings-card wide"><div class="card-title">时间段 <button class="btn btn-outline btn-sm" onclick="editScheduleSlot()">'+ICON.plus+' 添加</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>顺序</th><th>名称</th><th>时间</th><th>状态</th><th></th></tr></thead><tbody>'+slotRows+'</tbody></table></div></section><section class="card schedule-settings-card"><div class="card-title">教师 <button class="btn btn-outline btn-sm" onclick="addScheduleTeacher()">'+ICON.plus+' 添加教师</button></div>'+(teacherRows?'<div class="table-wrap"><table class="data-table"><thead><tr><th>教师</th><th>身份</th><th></th></tr></thead><tbody>'+teacherRows+'</tbody></table></div>':UI.empty(ICON.user,'尚未添加教师'))+'</section><section class="card schedule-settings-card"><div class="card-title">各班科任教师</div><p class="text-sm text-muted mb-3">班级来自顶部班级管理，科目来自生涯管理中的学校科目。</p>'+mapping+'</section></div>';
  };

  App.navigate = function (moduleId) {
    const needsClass=['dashboard','students','grades','homework','recitation','dictation','records','conversations','communication'];
    if(!Store.getCurrentClass()&&needsClass.includes(moduleId)){
      this.currentModule=moduleId;renderSidebar();
      document.getElementById('content').innerHTML='<div class="module-header"><div><div class="module-title">'+ICON.users+' 尚未添加任课班级</div><div class="module-subtitle">先建立班级，再管理学生、成绩和所有教学事务。</div></div></div><div class="card empty-class-guide">'+UI.empty(ICON.users,'注册后班级默认为空，请通过年级和班号选项添加')+'<button class="btn btn-primary" onclick="showClassManager()">打开班级管理</button></div>';
      return;
    }
    originalNavigate(moduleId);
  };
})();
