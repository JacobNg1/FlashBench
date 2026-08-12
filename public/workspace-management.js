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
    profile.activeCareerId ||= '';
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
    terms.forEach(term => {
      (term.teachers || []).forEach(teacher => { teacher.contact ||= ''; });
      (term.classes || []).forEach(scheduleClass => {
      let top = data.classes.find(item => item.id === scheduleClass.linkedClassId || item.id === scheduleClass.id)
        || data.classes.find(item => normalize(item.name) === normalize(scheduleClass.name));
      if (!top) {
        top = { id:scheduleClass.linkedClassId || itemId('class'), name:scheduleClass.name, studentCount:0 };
        data.classes.push(top);
      }
      scheduleClass.linkedClassId = top.id;
      scheduleClass.name = top.name;
      scheduleClass.homeroomTeacherId ||= '';
      scheduleClass.homeroomTeacherName ||= top.homeroomTeacherName || '';
      top.homeroomTeacherName ||= scheduleClass.homeroomTeacherName || '';
      });
    });
    terms.forEach(term => {
      data.classes.forEach(top => {
        let scheduleClass = term.classes.find(item => item.linkedClassId === top.id || item.id === top.id)
          || term.classes.find(item => normalize(item.name) === normalize(top.name));
        if (!scheduleClass) {
          scheduleClass = { id:top.id, name:top.name, linkedClassId:top.id, subjectTeachers:{}, homeroomTeacherId:'', homeroomTeacherName:top.homeroomTeacherName || '' };
          term.classes.push(scheduleClass);
          term.classSchedules[scheduleClass.id] ||= {};
        } else {
          scheduleClass.linkedClassId = top.id;
          scheduleClass.name = top.name;
          scheduleClass.subjectTeachers ||= {};
          scheduleClass.homeroomTeacherId ||= '';
          scheduleClass.homeroomTeacherName ||= top.homeroomTeacherName || '';
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

  function todayValue() {
    return ScheduleCore.localDate(new Date());
  }

  function careerTerm(data, record) {
    const workspace = ScheduleCore.ensure(data);
    return workspace.semesters.find(term => term.id === record.semesterId);
  }

  function syncCareerToTerm(data, record) {
    const workspace = ScheduleCore.ensure(data);
    let term = careerTerm(data, record);
    if (!term) {
      term = workspace.semesters.find(item => item.onboarding) || ScheduleCore.newSemester(record.semesterName || record.period);
      if (!workspace.semesters.includes(term)) workspace.semesters.push(term);
      delete term.onboarding;
      record.semesterId = term.id;
    }
    term.name = record.semesterName || record.period;
    term.startDate = record.startDate;
    term.endDate = record.endDate;
    term.archived = !['任教中','计划任教'].includes(record.status);
    term.careerStatus = record.status;
    term.subjects = schoolData(data).subjects.map(item => ({...item}));
    return term;
  }

  function ensureCareerForTerm(data, term) {
    if (term.onboarding) return null;
    const profile = schoolData(data);
    let record = profile.careerRecords.find(item => item.semesterId === term.id)
      || profile.careerRecords.find(item => !item.semesterId && item.startDate === term.startDate && item.endDate === term.endDate);
    const teachingNames = profile.subjects.filter(item => profile.teachingSubjectIds.includes(item.id)).map(item => item.name);
    if (!record) {
      record = {
        id:itemId('career'), semesterId:term.id, period:careerPeriod(term), semesterName:term.name,
        schoolName:profile.schoolName, subjectNames:teachingNames,
        startDate:term.startDate, endDate:term.endDate,
        status:term.archived ? '已完结' : '任教中', note:''
      };
      profile.careerRecords.unshift(record);
    } else {
      record.semesterId = term.id;
      record.period ||= careerPeriod(term);
      record.semesterName ||= term.name || record.period;
      record.startDate ||= term.startDate;
      record.endDate ||= term.endDate;
      record.status = ['计划任教','任教中','已完结','中断'].includes(record.status) ? record.status : (term.archived ? '已完结' : '任教中');
    }
    syncCareerToTerm(data, record);
    return record;
  }

  function normalizeCareers(data) {
    const profile = schoolData(data), workspace = ScheduleCore.ensure(data), today = todayValue();
    workspace.semesters.forEach(term => ensureCareerForTerm(data,term));
    profile.careerRecords.forEach(record => {
      record.semesterName ||= record.period || careerPeriod({startDate:record.startDate});
      record.period ||= record.semesterName;
      record.subjectNames ||= [];
      record.note ||= '';
      if (!['计划任教','任教中','已完结','中断'].includes(record.status)) record.status = '已完结';
      if (record.status !== '中断' && record.endDate && record.endDate < today) record.status = '已完结';
      else if (['计划任教','任教中'].includes(record.status) && record.startDate > today) record.status = '计划任教';
      else if (['计划任教','任教中'].includes(record.status) && (!record.startDate || record.startDate <= today) && (!record.endDate || record.endDate >= today)) record.status = '任教中';
      syncCareerToTerm(data,record);
    });
    const active = profile.careerRecords
      .filter(record => ['任教中','计划任教'].includes(record.status))
      .sort((a,b) => {
        if (a.status !== b.status) return a.status === '任教中' ? -1 : 1;
        return a.status === '任教中'
          ? String(b.startDate).localeCompare(String(a.startDate))
          : String(a.startDate).localeCompare(String(b.startDate));
      });
    active.slice(1).forEach(record => { record.status='已完结'; syncCareerToTerm(data,record); });
    profile.careerRecords.filter(record => ['任教中','计划任教'].includes(record.status) && !active.includes(record)).forEach(record => {
      record.status='已完结'; syncCareerToTerm(data,record);
    });
    profile.activeCareerId = active[0] ? active[0].id : '';
    workspace.selectedSemesterId ||= workspace.activeSemesterId;
    if (!workspace.semesters.some(term => term.id === workspace.selectedSemesterId)) {
      const current = profile.careerRecords.find(record => record.id === profile.activeCareerId);
      workspace.selectedSemesterId = current ? current.semesterId : (workspace.semesters[0] || {}).id || '';
    }
    workspace.activeSemesterId = workspace.selectedSemesterId;
    return profile;
  }

  window.ensureWorkspaceManagementData = function (data) {
    const before = JSON.stringify({classes:data.classes,schoolProfile:data.schoolProfile,scheduleWorkspace:data.scheduleWorkspace});
    ensureSchoolSubjects(data);
    ensureUnifiedClasses(data);
    normalizeCareers(data);
    if (typeof syncProfileTeacherAcrossTerms === 'function' && Auth.getUser()) syncProfileTeacherAcrossTerms(Auth.getUser());
    if (JSON.stringify({classes:data.classes,schoolProfile:data.schoolProfile,scheduleWorkspace:data.scheduleWorkspace}) !== before && Store.data === data) Store.save();
    return data;
  };

  window.getActiveCareer = function (data = Store.data) {
    const profile = normalizeCareers(data);
    return profile.careerRecords.find(record => record.id === profile.activeCareerId) || null;
  };

  window.isSemesterReadOnly = function (term) {
    const profile = schoolData();
    const record = profile.careerRecords.find(item => item.semesterId === term.id);
    return !record || !['任教中','计划任教'].includes(record.status);
  };

  window.selectWorkspaceSemester = function (id) {
    const workspace = ScheduleCore.ensure(Store.data);
    if (!workspace.semesters.some(term => term.id === id)) return;
    workspace.selectedSemesterId = id;
    workspace.activeSemesterId = id;
    ScheduleUI.classId=''; ScheduleUI.masterClassId=''; ScheduleUI.mappingClassId='';
    Store.save(); renderTopbar();
    if (App.currentModule === 'schedule') M.schedule();
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

  function activeClassConfig(classId) {
    const term = scheduleTerm();
    return { term, scheduleClass:term.classes.find(item => (item.linkedClassId || item.id) === classId) };
  }

  function classTeacherSummary(item) {
    const {term,scheduleClass} = activeClassConfig(item.id);
    if (!scheduleClass) return '未配置';
    const homeroom = term.teachers.find(teacher => teacher.id === scheduleClass.homeroomTeacherId);
    const mapped = new Set(Object.values(scheduleClass.subjectTeachers || {}).filter(Boolean));
    return (homeroom ? '班主任：' + homeroom.name : '未设置班主任') + ' · ' + mapped.size + ' 位科任教师';
  }

  window.showClassManager = function () {
    const rows = Store.data.classes.map(item => {
      const count = ((Store.data.students || {})[item.id] || []).length;
      return '<tr><td><strong>' + esc(item.name) + '</strong></td><td><button class="table-link" onclick="promptClassStudents(\'' + item.id + '\')">' + count + ' 名学生</button></td><td><div class="class-teacher-cell"><span>' + esc(classTeacherSummary(item)) + '</span><button class="btn btn-outline btn-sm" onclick="showClassTeacherEditor(\'' + item.id + '\')">编辑</button></div></td><td><button class="btn btn-danger btn-sm" onclick="removeManagedClass(\'' + item.id + '\')">删除</button></td></tr>';
    }).join('');
    UI.modal('班级管理',
      '<div class="schedule-notice muted">' + ICON.info + '<div><strong>班级是工作台的核心</strong><span>在这里统一维护学生、班主任、科任教师与联系方式。</span></div></div>' +
      '<div class="class-create-row"><div class="form-group"><label class="form-label">年级</label><select class="form-select" id="managed-grade">' +
      GRADE_LABELS.map(item => '<option value="' + item + '">' + item + '</option>').join('') +
      '</select></div><div class="form-group"><label class="form-label">班号</label><select class="form-select" id="managed-number">' +
      Array.from({length:20},(_,index)=>'<option value="' + (index+1) + '">' + (index+1) + ' 班</option>').join('') +
      '</select></div><button class="btn btn-primary" onclick="createManagedClass()">' + ICON.plus + ' 添加任课班级</button></div>' +
      (rows ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>班级</th><th>学生</th><th>教师</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : UI.empty(ICON.users,'尚未添加任课班级')),
      '<button class="btn btn-outline" onclick="importTeacherConfiguration()">' + ICON.upload + ' 导入教师配置</button><button class="btn btn-ghost" onclick="downloadTeacherConfigurationTemplate()">下载模板</button><button class="btn btn-primary" onclick="UI.closeModal()">完成</button>');
    document.querySelector('#modal-overlay .modal').classList.add('class-manager-modal');
  };

  window.promptClassStudents = function (classId) {
    const item = Store.data.classes.find(row => row.id === classId);
    if (!item) return;
    UI.confirm('前往学生管理编辑“' + esc(item.name) + '”的学生信息？', () => {
      Store.setCurrentClass(classId); UI.closeModal(); renderTopbar(); App.navigate('students');
    });
  };

  function teacherOptions(term, selected) {
    return '<option value="">未配置</option>' + term.teachers.map(item => '<option value="' + item.id + '" ' + (item.id === selected ? 'selected' : '') + '>' + esc(item.name) + (item.contact ? ' · ' + esc(item.contact) : '') + '</option>').join('');
  }

  window.showClassTeacherEditor = function (classId) {
    const top = Store.data.classes.find(item => item.id === classId);
    const {term,scheduleClass} = activeClassConfig(classId);
    if (!top || !scheduleClass) return;
    const teacherRows = term.teachers.map(item => '<tr><td><strong>' + esc(item.name) + '</strong>' + (item.id === term.selfTeacherId ? ' <span class="status-pill success">本人</span>' : '') + '</td><td>' + esc(item.contact || '未填写') + '</td><td><button class="btn btn-outline btn-sm" onclick="editManagedTeacher(\'' + classId + '\',\'' + item.id + '\')">编辑</button></td></tr>').join('');
    const mappings = term.subjects.map(subject => '<label><span>' + esc(subject.name) + '</span><select class="form-select" onchange="saveManagedSubjectTeacher(\'' + classId + '\',\'' + subject.id + '\',this.value)">' + teacherOptions(term,(scheduleClass.subjectTeachers || {})[subject.id]) + '</select></label>').join('');
    UI.modal(esc(top.name) + ' · 教师配置',
      '<div class="teacher-editor-toolbar"><button class="btn btn-primary btn-sm" onclick="editManagedTeacher(\'' + classId + '\',\'\')">' + ICON.plus + ' 添加教师</button><button class="btn btn-outline btn-sm" onclick="importTeacherConfiguration()">' + ICON.upload + ' 导入表格</button><button class="btn btn-ghost btn-sm" onclick="downloadTeacherConfigurationTemplate()">下载模板</button></div>' +
      '<div class="table-wrap mb-4"><table class="data-table"><thead><tr><th>教师</th><th>联系方式（可选）</th><th></th></tr></thead><tbody>' + teacherRows + '</tbody></table></div>' +
      '<div class="form-group"><label class="form-label">班主任</label><select class="form-select" id="managed-homeroom" onchange="saveManagedHomeroom(\'' + classId + '\',this.value)">' + teacherOptions(term,scheduleClass.homeroomTeacherId) + '</select><p class="form-hint">本人也可以兼任班主任。</p></div>' +
      '<div class="management-title">各科科任教师</div><div class="teacher-mapping-grid">' + mappings + '</div>',
      '<button class="btn btn-ghost" onclick="showClassManager()">返回班级管理</button><button class="btn btn-primary" onclick="UI.closeModal()">完成</button>');
    document.querySelector('#modal-overlay .modal').classList.add('class-teacher-modal');
  };

  window.editManagedTeacher = function (classId, teacherId) {
    const {term} = activeClassConfig(classId), teacher = term.teachers.find(item => item.id === teacherId) || {};
    if (isSemesterReadOnly(term)) return UI.toast('历史学期为只读状态','warning');
    UI.modal(teacherId ? '编辑教师' : '添加教师', '<div class="form-group"><label class="form-label">教师姓名</label><input class="form-input" id="managed-teacher-name" value="' + esc(teacher.name || '') + '" placeholder="如：吴老师"></div><div class="form-group"><label class="form-label">联系方式（可选）</label><input class="form-input" id="managed-teacher-contact" value="' + esc(teacher.contact || '') + '" placeholder="手机号、邮箱或办公电话"></div>', '<button class="btn btn-ghost" onclick="showClassTeacherEditor(\'' + classId + '\')">取消</button><button class="btn btn-primary" onclick="saveManagedTeacher(\'' + classId + '\',\'' + teacherId + '\')">保存</button>');
  };

  window.saveManagedTeacher = function (classId, teacherId) {
    const {term} = activeClassConfig(classId), name = document.getElementById('managed-teacher-name').value.trim(), contact = document.getElementById('managed-teacher-contact').value.trim();
    if (isSemesterReadOnly(term)) return UI.toast('历史学期为只读状态','warning');
    if (!name) return UI.toast('请输入教师姓名','warning');
    let teacher = term.teachers.find(item => item.id === teacherId);
    if (!teacher) { teacher = {id:ScheduleCore.uid('teacher'),name,contact}; term.teachers.push(teacher); }
    else Object.assign(teacher,{name,contact});
    scheduleSave('教师信息已保存'); showClassTeacherEditor(classId);
  };

  window.saveManagedHomeroom = function (classId, teacherId) {
    const top = Store.data.classes.find(item => item.id === classId), config = activeClassConfig(classId), teacher = config.term.teachers.find(item => item.id === teacherId);
    if (isSemesterReadOnly(config.term)) return UI.toast('历史学期为只读状态','warning');
    config.scheduleClass.homeroomTeacherId = teacherId;
    config.scheduleClass.homeroomTeacherName = teacher ? teacher.name : '';
    top.homeroomTeacherName = config.scheduleClass.homeroomTeacherName;
    scheduleSave('班主任已保存');
  };

  window.saveManagedSubjectTeacher = function (classId, subjectId, teacherId) {
    const {term,scheduleClass} = activeClassConfig(classId);
    if (isSemesterReadOnly(term)) return UI.toast('历史学期为只读状态','warning');
    scheduleClass.subjectTeachers[subjectId] = teacherId; scheduleSave();
  };

  function configValue(row, keys) { for (const key of keys) if (row[key] != null && String(row[key]).trim()) return String(row[key]).trim(); return ''; }
  function ensureTeacher(term, name, contact) {
    let teacher = term.teachers.find(item => normalize(item.name) === normalize(name));
    if (!teacher) { teacher = {id:ScheduleCore.uid('teacher'),name,contact:contact || ''}; term.teachers.push(teacher); }
    else if (contact) teacher.contact = contact;
    return teacher;
  }

  window.importTeacherConfiguration = function () {
    if (isSemesterReadOnly(scheduleTerm())) return UI.toast('历史学期为只读状态','warning');
    importFromFile('', rows => {
      const term = scheduleTerm(); let count = 0;
      rows.forEach(row => {
        const classNameValue=configValue(row,['班级','class']), subjectName=configValue(row,['科目','subject']), teacherName=configValue(row,['教师','任课教师','teacher']), homeroomName=configValue(row,['班主任','homeroom']), contact=configValue(row,['联系方式','电话','邮箱','contact']);
        const top=Store.data.classes.find(item=>normalize(item.name)===normalize(classNameValue));
        if(!top)return;
        const scheduleClass=term.classes.find(item=>(item.linkedClassId||item.id)===top.id); if(!scheduleClass)return;
        if(homeroomName){const homeroom=ensureTeacher(term,homeroomName,contact);scheduleClass.homeroomTeacherId=homeroom.id;scheduleClass.homeroomTeacherName=homeroom.name;top.homeroomTeacherName=homeroom.name;count++;}
        if(subjectName&&teacherName){const subject=term.subjects.find(item=>normalize(item.name)===normalize(subjectName));if(subject){const teacher=ensureTeacher(term,teacherName,contact);scheduleClass.subjectTeachers[subject.id]=teacher.id;count++;}}
      });
      scheduleSave(); UI.closeModal(); showClassManager(); return count;
    });
  };

  window.downloadTeacherConfigurationTemplate = function () {
    const csv='班级,班主任,科目,教师,联系方式\n五年级（1）班,吴老师,英语,吴老师,13800000000\n五年级（1）班,,数学,李老师,teacher@example.com';
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='教师配置模板.csv';a.click();URL.revokeObjectURL(url);
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
      '<div class="dropdown-menu class-dropdown-panel" id="class-dropdown"><div class="class-dropdown-head"><strong>切换班级</strong><button class="btn btn-outline btn-sm" onclick="showClassManager()">' + ICON.plus + ' 班级管理</button></div><div class="class-option-grid">' +
      Store.data.classes.map(item => '<button type="button" class="class-option ' + (item.id===Store.data.currentClassId?'active':'') + '" onclick="switchClass(\'' + item.id + '\')">' + ICON.users + '<span>' + esc(item.name) + '</span>' + (item.id===Store.data.currentClassId?ICON.check:'') + '</button>').join('') +
      (!Store.data.classes.length ? '<div class="dropdown-item muted">暂无任课班级</div>' : '') + '</div></div>' +
      '' +
      '<div class="topbar-spacer"></div><div class="topbar-datetime"><div class="topbar-date">' + dateStr + '</div><div class="topbar-time" id="topbar-time">' + now.toTimeString().slice(0,8) + '</div></div>' +
      '<button class="appearance-trigger" type="button" onclick="toggleAppearancePanel(event)" title="外观与语言" aria-label="外观与语言">' + ICON.palette + '</button>' +
      '<div class="topbar-user-wrap" onclick="showUserDropdown(event)"><div class="topbar-user" title="' + esc(displayName) + '">' + esc(Array.from(displayName)[0] || '师') + '</div>' +
      '<div class="dropdown-menu account-menu" id="user-dropdown">' +
      '<div class="dropdown-item" onclick="showProfile()">' + ICON.user + '<span>个人中心</span></div>' +
      '<div class="dropdown-item" onclick="showCareerManagement()">' + ICON.records + '<span>生涯管理</span></div>' +
      '<div class="dropdown-item" onclick="showSettings()">' + ICON.grid + '<span>数据管理</span></div>' +
      '<div class="dropdown-item" onclick="showAbout()">' + ICON.info + '<span>关于</span></div>' +
      '<div class="account-menu-separator"></div><div class="dropdown-item" onclick="Auth.logout()">' + ICON.logout + '<span>退出登录</span></div></div></div>';
  };

  window.renderSidebar = function () {
    const sb = document.getElementById('sidebar'), active = getActiveCareer();
    const subtitle = active ? [active.schoolName || '学校未设置', active.semesterName || active.period, active.status].filter(Boolean).join(' · ') : '请设置任教中或计划任教的生涯';
    let html = '<div class="sidebar-header"><div class="sidebar-logo"><img src="favicon.svg" alt=""></div><div><div class="sidebar-title">A-techer</div><button type="button" class="sidebar-subtitle career-subtitle" onclick="showCareerManagement()">' + esc(subtitle) + '</button></div></div><nav class="sidebar-nav">';
    NAV.forEach(section => {
      html += '<div class="nav-section-label">' + section.section + '</div>';
      section.items.forEach(item => { html += '<div class="nav-item ' + (App.currentModule===item.id?'active':'') + '" data-module="' + item.id + '">' + ICON[item.icon] + '<span>' + item.label + '</span></div>'; });
    });
    sb.innerHTML = html + '</nav><div class="sidebar-footer">Powered by Gene<br><a href="mailto:wjj_gene@163.com">wjj_gene@163.com</a></div>';
    sb.querySelectorAll('.nav-item').forEach(element => {
      element.onclick = () => { App.navigate(element.dataset.module); if (window.innerWidth <= 768) closeSidebar(); };
    });
    if (I18n.locale === 'en-US') I18n.translate(sb);
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
    const profile = normalizeCareers(Store.data), active = getActiveCareer();
    const records = profile.careerRecords.map(item => '<tr><td><strong>' + esc(item.semesterName || item.period) + '</strong><br><span class="text-sm text-muted">' + esc(item.startDate || '—') + ' 至 ' + esc(item.endDate || '—') + '</span><br><span class="text-sm text-muted">' + esc(item.schoolName || '学校未设置') + '</span></td><td>' + esc((item.subjectNames||[]).join('、') || '未设置') + '</td><td><span class="status-pill ' + (item.status==='任教中'?'success':item.status==='计划任教'?'planned':item.status==='中断'?'warning':'muted') + '">' + esc(item.status) + '</span></td><td><button class="btn btn-outline btn-sm" onclick="editCareerRecord(\'' + item.id + '\')">' + (item.status==='中断'?'查看':'编辑') + '</button></td></tr>').join('');
    UI.modal('生涯管理',
      (!active ? '<div class="schedule-notice warning">' + ICON.alert + '<div><strong>请设置任教中或计划任教的生涯</strong><span>工作台仍可使用，但当前学期与侧栏信息将在设置后才能正常联动。</span></div></div>' : '') +
      '<div class="management-section"><div class="management-title">学校信息</div><div class="form-group"><label class="form-label">学校名称</label><input class="form-input" id="career-school-name" value="' + esc(profile.schoolName) + '" placeholder="未设置时左上角显示“学校未设置”"></div>' +
      '<label class="form-label">学校开设科目</label><div class="management-check-grid">' + subjectChecks(profile) + '</div><div class="form-group mt-3"><label class="form-label">其他科目（用顿号分隔）</label><input class="form-input" id="career-custom-subjects" placeholder="如：书法、心理健康"></div></div>' +
      '<div class="management-section"><div class="management-title">我的任教科目</div><p class="text-sm text-muted mb-2">可多选；这些科目会默认把本人设为各任课班级的科任教师。</p><div class="management-check-grid" id="teaching-subject-list">' + teachingChecks(profile) + '</div></div>' +
      '<button class="btn btn-primary mb-4" onclick="saveSchoolCareerSettings()">保存学校与科目</button>' +
      '<div class="management-section"><div class="management-title">教职生涯 <button class="btn btn-outline btn-sm" onclick="editCareerRecord()">' + ICON.plus + ' 添加经历</button></div>' +
      (records?'<div class="table-wrap"><table class="data-table career-table"><thead><tr><th>学期与学校</th><th>任教科目</th><th>状态</th><th>操作</th></tr></thead><tbody>'+records+'</tbody></table></div>':UI.empty(ICON.records,'请添加一段教职生涯')) + '</div>',
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
      const record = profile.careerRecords.find(item => item.semesterId === term.id);
      if (record) syncCareerToTerm(Store.data,record);
    });
    profile.careerRecords.filter(item=>['任教中','计划任教'].includes(item.status)).forEach(item => {
      item.schoolName = profile.schoolName;
      item.subjectNames = profile.subjects.filter(subject=>profile.teachingSubjectIds.includes(subject.id)).map(subject=>subject.name);
    });
    Store.save(); renderSidebar(); UI.closeModal(); showCareerManagement(); UI.toast('学校与任教科目已保存');
  };

  window.editCareerRecord = function (id) {
    const profile = schoolData(), record = profile.careerRecords.find(item=>item.id===id) || {};
    const frozen = record.status === '中断', disabled = frozen ? ' disabled' : '';
    const status = record.status || (profile.activeCareerId ? '已完结' : '任教中');
    if (frozen) {
      UI.modal('中断的教职经历',
        '<div class="schedule-notice warning">' + ICON.alert + '<div><strong>中断记录已冻结</strong><span>该记录仅用于保留生涯异常，不能再次编辑。</span></div></div>' +
        '<dl class="schedule-meta"><div><dt>学期</dt><dd>' + esc(record.semesterName || record.period) + '</dd></div><div><dt>时间段</dt><dd>' + esc(record.startDate) + ' 至 ' + esc(record.endDate) + '</dd></div><div><dt>学校</dt><dd>' + esc(record.schoolName || '未设置') + '</dd></div><div><dt>任教科目</dt><dd>' + esc((record.subjectNames||[]).join('、') || '未设置') + '</dd></div><div><dt>备注</dt><dd>' + esc(record.note || '未填写') + '</dd></div></dl>',
        '<button class="btn btn-ghost" onclick="UI.closeModal();showCareerManagement()">返回</button><button class="btn btn-danger" onclick="deleteCareerRecord(\'' + id + '\')">删除记录</button>');
      return;
    }
    UI.modal(id?'编辑教职经历':'添加教职经历',
      '<div class="form-row"><div class="form-group"><label class="form-label">学期名称</label><input class="form-input" id="career-semester-name" value="' + esc(record.semesterName||record.period||'') + '" placeholder="如：2026—2027学年第一学期"' + disabled + '></div><div class="form-group"><label class="form-label">状态</label><select class="form-select" id="career-status"' + disabled + '><option ' + (status==='计划任教'?'selected':'') + '>计划任教</option><option ' + (status==='任教中'?'selected':'') + '>任教中</option><option ' + (status==='已完结'?'selected':'') + '>已完结</option><option ' + (status==='中断'?'selected':'') + '>中断</option></select></div></div>' +
      '<div class="form-group"><label class="form-label">学校</label><input class="form-input" id="career-record-school" value="' + esc(record.schoolName||profile.schoolName) + '"' + disabled + '></div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">开始日期</label><input class="form-input" type="date" id="career-start" value="' + esc(record.startDate||'') + '"' + disabled + '></div><div class="form-group"><label class="form-label">结束日期</label><input class="form-input" type="date" id="career-end" value="' + esc(record.endDate||'') + '"' + disabled + '></div></div>' +
      '<div class="form-group"><label class="form-label">任教科目</label><input class="form-input" id="career-subjects" value="' + esc((record.subjectNames||[]).join('、')) + '" placeholder="用顿号分隔"' + disabled + '></div><div class="form-group"><label class="form-label">备注</label><textarea class="form-textarea" id="career-note"' + disabled + '>' + esc(record.note||'') + '</textarea></div>' +
      '<p class="form-hint">计划任教用于提前配置未来学期，到达开始日期后自动转为任教中；两种状态合计只能有一条。</p>',
      '<button class="btn btn-ghost" onclick="UI.closeModal();showCareerManagement()">取消</button>' + (id?'<button class="btn btn-danger" onclick="deleteCareerRecord(\'' + id + '\')">删除</button>':'') + '<button class="btn btn-primary" onclick="saveCareerRecord(\'' + (id||'') + '\')">保存</button>');
  };

  window.saveCareerRecord = function (id) {
    const profile=schoolData(), existing=profile.careerRecords.find(item=>item.id===id);
    if (existing && existing.status === '中断') return UI.toast('中断记录已冻结，只能删除', 'warning');
    const semesterName=document.getElementById('career-semester-name').value.trim(), startDate=document.getElementById('career-start').value, endDate=document.getElementById('career-end').value, status=document.getElementById('career-status').value;
    if (!semesterName || !startDate || !endDate || startDate > endDate) return UI.toast('请填写有效的学期名称和时间段','warning');
    const today=todayValue();
    if (status==='计划任教' && startDate<=today) return UI.toast('计划任教的开始日期必须晚于今天','warning');
    if (status==='任教中' && (startDate>today || endDate<today)) return UI.toast('任教中的时间段必须覆盖今天','warning');
    const otherActive=profile.careerRecords.find(item=>item.id!==id && ['任教中','计划任教'].includes(item.status));
    if (['任教中','计划任教'].includes(status) && otherActive) return UI.toast('已有任教中或计划任教的生涯，请先处理原记录','warning');
    const next={id:id||itemId('career'),semesterId:existing&&existing.semesterId,semesterName,period:semesterName,status,schoolName:document.getElementById('career-record-school').value.trim(),startDate,endDate,subjectNames:document.getElementById('career-subjects').value.split(/[、,，]/).map(x=>x.trim()).filter(Boolean),note:document.getElementById('career-note').value.trim()};
    const persist=()=>{
      const index=profile.careerRecords.findIndex(item=>item.id===id);
      if(index>=0)profile.careerRecords[index]={...profile.careerRecords[index],...next};else profile.careerRecords.unshift(next);
      syncCareerToTerm(Store.data,index>=0?profile.careerRecords[index]:next);
      normalizeCareers(Store.data);
      const record=index>=0?profile.careerRecords[index]:next;
      Store.data.scheduleWorkspace.selectedSemesterId=record.semesterId;
      Store.data.scheduleWorkspace.activeSemesterId=record.semesterId;
      Store.save();renderSidebar();renderTopbar();UI.closeModal();showCareerManagement();
    };
    if(status==='中断' && (!existing || existing.status!=='中断')) return UI.confirm('设为中断后，记录将永久冻结，只能删除。确定继续？',persist);
    persist();
  };

  window.deleteCareerRecord = function (id) {
    const profile=schoolData(), record=profile.careerRecords.find(item=>item.id===id);
    if(!record)return;
    UI.confirm('删除后无法恢复，对应学期课表也会永久删除。确定删除“'+esc(record.semesterName||record.period)+'”？',()=>{
      const workspace=ScheduleCore.ensure(Store.data);
      profile.careerRecords=profile.careerRecords.filter(item=>item.id!==id);
      workspace.semesters=workspace.semesters.filter(term=>term.id!==record.semesterId);
      if(!workspace.semesters.length){
        const onboarding=ScheduleCore.newSemester('请设置教职生涯');
        onboarding.onboarding=true;onboarding.archived=true;workspace.semesters=[onboarding];
      }
      const active=profile.careerRecords.find(item=>['任教中','计划任教'].includes(item.status));
      workspace.selectedSemesterId=(active&&active.semesterId)||workspace.semesters[0].id;
      workspace.activeSemesterId=workspace.selectedSemesterId;
      normalizeCareers(Store.data);Store.save();renderSidebar();renderTopbar();UI.closeModal();showCareerManagement();
    });
  };

  window.showSemesterManagement = window.showCareerManagement;

  window.renderScheduleSettings = function (term) {
    const typeNames={class:'上课时间',rest:'休息时间',activity:'活动时间'};
    const slotRows=term.slots.map((item,index)=>'<tr><td>'+(index+1)+'</td><td><span class="slot-color-swatch" style="--slot-color:'+ScheduleCore.slotColor(item)+'"></span><strong>'+esc(item.label)+'</strong></td><td>'+esc(typeNames[item.type]||typeNames.class)+'</td><td>'+esc(ScheduleCore.timeText(item))+'</td><td>'+(item.enabled===false?'停用':'启用')+'</td><td><button class="btn btn-outline btn-sm" onclick="editScheduleSlot(\''+item.id+'\')">编辑</button></td></tr>').join('');
    return '<div class="settings-grid">'+renderScheduleTimeline(term)+'</div><div class="settings-grid"><section class="card schedule-settings-card wide"><div class="card-title">时间段 <button class="btn btn-outline btn-sm" onclick="editScheduleSlot()">'+ICON.plus+' 添加</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>顺序</th><th>名称</th><th>类型</th><th>时间</th><th>状态</th><th></th></tr></thead><tbody>'+slotRows+'</tbody></table></div></section></div>';
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
