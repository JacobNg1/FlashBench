/* ============================================================
 * 正式课表模块：我的课表 / 班级课表 / 课程总表 / 调课 / 管理
 * ============================================================ */
const ScheduleUI = {
  weekStart: '', classId: '', masterClassId: '', mappingClassId: '', pendingClassImport: null, pendingMasterImport: null
};

function scheduleTerm() { return ScheduleCore.activeSemester(Store.data); }
function scheduleSave(message) { Store.data.schemaVersion = Store.SCHEMA_VERSION; Store.save(); if (message) UI.toast(message); }
function scheduleEntity(list, id) { return (list || []).find(x => x.id === id); }
function scheduleDayFromDate(value) {
  const d = ScheduleCore.parseDate(value).getDay();
  return ScheduleCore.DAY_LABELS[(d + 6) % 7];
}
function scheduleSubjectName(term, id) { return (scheduleEntity(term.subjects, id) || {}).name || '未配置科目'; }
function scheduleTeacherName(term, id) { return (scheduleEntity(term.teachers, id) || {}).name || '未配置教师'; }
function scheduleTeacherLabel(term, id) { const teacher=scheduleEntity(term.teachers,id);return teacher?teacher.name+(teacher.contact?' · '+teacher.contact:''):'未配置教师'; }
function scheduleClassName(term, id) { return (scheduleEntity(term.classes, id) || {}).name || '未配置班级'; }
function scheduleSlotLabel(term, id) {
  const slot = scheduleEntity(term.slots, id) || {};
  return [slot.label, ScheduleCore.timeText(slot)].filter(Boolean).join(' · ');
}
function scheduleCurrentWeek() { return ScheduleUI.weekStart || (ScheduleUI.weekStart = ScheduleCore.mondayOf(todayStr())); }
function scheduleClassHighlighted(cls) {
  const current = Store.getCurrentClass && Store.getCurrentClass();
  return !!current && (cls.linkedClassId === current.id || ScheduleCore.normalizeName(cls.name) === ScheduleCore.normalizeName(current.name));
}
function scheduleStatusLabel(source) {
  return { moved:'调入', swapped:'互换', extra:'补课' }[source] || '';
}
function scheduleOption(items, selected, labelFn) {
  return items.map(x => `<option value="${x.id}" ${x.id === selected ? 'selected' : ''}>${esc(labelFn ? labelFn(x) : x.name)}</option>`).join('');
}

function setScheduleTab(tab) { M._tabs.schedule = tab; M.schedule(); }
function setScheduleSemester(id) {
  Store.data.scheduleWorkspace.activeSemesterId = id;
  ScheduleUI.classId = ''; ScheduleUI.masterClassId = ''; ScheduleUI.mappingClassId = '';
  scheduleSave(); M.schedule();
}
function moveScheduleWeek(delta) { ScheduleUI.weekStart = ScheduleCore.addDays(scheduleCurrentWeek(), delta * 7); M.schedule(); }
function resetScheduleWeek() { ScheduleUI.weekStart = ScheduleCore.mondayOf(todayStr()); M.schedule(); }

M.schedule = function() {
  const ws = ScheduleCore.ensure(Store.data);
  const term = scheduleTerm();
  const tab = M._tabs.schedule || 'mine';
  const renderer = { mine: renderMySchedule, class: renderClassSchedule, master: renderMasterSchedule, swap: renderScheduleAdjustments, settings: renderScheduleSettings }[tab] || renderMySchedule;
  const needsSetup = !term.selfTeacherId || !term.classes.length || !term.slots.length;
  document.getElementById('content').innerHTML = `
    <div class="module-header schedule-module-header">
      <div><div class="module-title">${ICON.schedule} 课表</div><div class="module-subtitle">按学期管理班级课表、个人安排与调课记录</div></div>
      <div class="schedule-term-picker"><label>当前学期</label><select class="form-select" onchange="setScheduleSemester(this.value)">
        ${ws.semesters.map(x => `<option value="${x.id}" ${x.id === term.id ? 'selected' : ''}>${esc(x.name)}${x.archived ? '（已归档）' : ''}</option>`).join('')}
      </select></div>
    </div>
    ${needsSetup && tab !== 'settings' ? `<div class="schedule-notice">${ICON.info}<div><strong>请先完成课表配置</strong><span>设置本人教师、时间段和任课班级后，“我的课表”才能准确汇总。</span></div><button class="btn btn-primary btn-sm" onclick="setScheduleTab('settings')">前往设置</button></div>` : ''}
    ${tabBar([
      {group:'schedule',id:'mine',label:'我的课表'}, {group:'schedule',id:'class',label:'班级课表'},
      {group:'schedule',id:'master',label:'课程总表'}, {group:'schedule',id:'swap',label:'调课管理'},
      {group:'schedule',id:'settings',label:'课表管理'}
    ], tab)}
    <div class="schedule-panel">${renderer(term)}</div>`;
};

M.masterSchedule = function() { M._tabs.schedule = 'master'; App.navigate('schedule'); };

function renderMySchedule(term) {
  const week = scheduleCurrentWeek();
  const items = ScheduleCore.getMine(term, week);
  ScheduleUI.currentMineItems = items;
  const self = scheduleEntity(term.teachers, term.selfTeacherId);
  const byCell = new Map();
  items.forEach(x => { const key = `${x.date}:${x.slotId}`; if (!byCell.has(key)) byCell.set(key, []); byCell.get(key).push(x); });
  const enabledSlots = term.slots.filter(x => x.enabled !== false);
  const conflictCount = items.filter(x => x.conflict).length;
  let table = `<div class="schedule-table-scroll"><table class="formal-schedule-table"><thead><tr><th class="slot-column">时间段</th>`;
  term.weekdays.forEach(day => {
    const date = ScheduleCore.dateForDay(week, day);
    table += `<th>${day}<span>${date.slice(5)}</span></th>`;
  });
  table += '</tr></thead><tbody>';
  enabledSlots.forEach(slot => {
    table += `<tr><th class="slot-column"><strong>${esc(slot.label)}</strong><span>${esc(ScheduleCore.timeText(slot))}</span></th>`;
    term.weekdays.forEach(day => {
      const date = ScheduleCore.dateForDay(week, day);
      const cellItems = byCell.get(`${date}:${slot.id}`) || [];
      table += `<td class="${cellItems.some(x => x.conflict) ? 'schedule-conflict-cell' : ''}">`;
      if (!cellItems.length) table += '<span class="schedule-free">空闲</span>';
      cellItems.forEach(item => {
        const cls = scheduleEntity(term.classes, item.classId) || {};
        const status = scheduleStatusLabel(item.source);
        table += `<div class="my-course ${scheduleClassHighlighted(cls) ? 'is-current-class' : ''}" onclick="openCourseAdjustment('${item.id}')" title="点击调课">
          <div class="my-course-subject">${esc(scheduleSubjectName(term, item.subjectId))}${status ? `<span class="schedule-state">${status}</span>` : ''}</div>
          <div class="my-course-class">${esc(cls.name || '')}</div>
          ${item.conflict ? '<div class="schedule-conflict">时间冲突</div>' : ''}
        </div>`;
      });
      table += '</td>';
    });
    table += '</tr>';
  });
  table += '</tbody></table></div>';
  return `<div class="schedule-toolbar">
      <div class="schedule-week-nav"><button class="btn btn-outline btn-sm" onclick="moveScheduleWeek(-1)">上一周</button><button class="btn btn-ghost btn-sm" onclick="resetScheduleWeek()">本周</button><button class="btn btn-outline btn-sm" onclick="moveScheduleWeek(1)">下一周</button><strong>${week.slice(5)} — ${ScheduleCore.addDays(week, 6).slice(5)}</strong></div>
      <div class="flex gap-2"><button class="btn btn-outline" onclick="exportMySchedule('xlsx')">${ICON.download} Excel</button><button class="btn btn-outline" onclick="exportMySchedule('doc')">${ICON.download} Word</button></div>
    </div>
    <div class="schedule-summary-row"><span>教师：<strong>${esc(self ? self.name : '未设置')}</strong></span><span>本周课程：<strong>${items.length}</strong></span>${conflictCount ? `<span class="danger-text">冲突课程：<strong>${conflictCount}</strong></span>` : ''}<span class="schedule-highlight-key">高亮为顶部当前班级</span></div>
    ${table}`;
}

function renderClassSchedule(term) {
  if (!term.classes.length) return UI.empty(ICON.users, '尚未添加任课班级，请先到“课表管理”添加');
  if (!ScheduleUI.classId || !scheduleEntity(term.classes, ScheduleUI.classId)) ScheduleUI.classId = term.classes[0].id;
  const cls = scheduleEntity(term.classes, ScheduleUI.classId);
  const data = term.classSchedules[cls.id] || {};
  let table = `<div class="schedule-table-scroll"><table class="formal-schedule-table editable-schedule"><thead><tr><th class="slot-column">时间段</th>${term.weekdays.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>`;
  term.slots.filter(x => x.enabled !== false).forEach(slot => {
    table += `<tr><th class="slot-column"><strong>${esc(slot.label)}</strong><span>${esc(ScheduleCore.timeText(slot))}</span></th>`;
    term.weekdays.forEach(day => {
      const cell = (data[day] || {})[slot.id];
      const teacherId = cell ? cls.subjectTeachers[cell.subjectId] : '';
      table += `<td class="editable-cell" onclick="editClassScheduleCell('${cls.id}','${day}','${slot.id}')">${cell ? `<strong>${esc(scheduleSubjectName(term, cell.subjectId))}</strong><span>${esc(scheduleTeacherName(term, teacherId))}</span>` : '<span class="schedule-free">点击选择课程</span>'}</td>`;
    });
    table += '</tr>';
  });
  table += '</tbody></table></div>';
  return `<div class="schedule-toolbar"><div class="schedule-filter"><label>任课班级</label><select class="form-select" onchange="ScheduleUI.classId=this.value;M.schedule()">${scheduleOption(term.classes, cls.id)}</select></div>
    <div class="flex gap-2 flex-wrap"><button class="btn btn-outline" onclick="downloadClassScheduleTemplate()">模板</button><button class="btn btn-primary" onclick="importClassSchedule()">${ICON.upload} 导入班级课表</button></div></div>
    <div class="schedule-summary-row"><span>导入会先预览，确认后替换 <strong>${esc(cls.name)}</strong> 本学期的基础课表。</span><span>科任教师由课表管理自动带出。</span></div>${table}`;
}

function editClassScheduleCell(classId, day, slotId) {
  const term = scheduleTerm(); const cls = scheduleEntity(term.classes, classId);
  const cell = (((term.classSchedules[classId] || {})[day] || {})[slotId]) || {};
  UI.modal(`编辑课程 · ${cls.name} · ${day}`, `<div class="form-group"><label class="form-label">${esc(scheduleSlotLabel(term, slotId))}</label>
    <select class="form-select" id="class-cell-subject"><option value="">空闲</option>${scheduleOption(term.subjects, cell.subjectId)}</select></div>
    <div class="form-group"><label class="form-label">备注</label><input class="form-input" id="class-cell-note" value="${esc(cell.note || '')}" placeholder="选填"></div>`,
    `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveClassScheduleCell('${classId}','${day}','${slotId}')">保存</button>`);
}
function saveClassScheduleCell(classId, day, slotId) {
  const term = scheduleTerm(); const subjectId = document.getElementById('class-cell-subject').value;
  term.classSchedules[classId] ||= {}; term.classSchedules[classId][day] ||= {};
  if (subjectId) term.classSchedules[classId][day][slotId] = { subjectId, note: document.getElementById('class-cell-note').value.trim(), type: 'lesson' };
  else delete term.classSchedules[classId][day][slotId];
  scheduleSave('班级课表已更新'); UI.closeModal(); M.schedule();
}

function workbookDownload(workbook, filename) {
  XLSX.writeFile(workbook, filename); UI.toast('文件已生成');
}
function safeFileName(value) { return String(value || '课表').replace(/[\\/:*?"<>|]/g, '_'); }
async function downloadClassScheduleTemplate() {
  const term = scheduleTerm(); const cls = scheduleEntity(term.classes, ScheduleUI.classId);
  if (!cls) return UI.toast('请先选择班级', 'warning');
  const rows = [[`${cls.name} · ${term.name}`, ...term.weekdays], ...term.slots.filter(x => x.enabled !== false).map(slot => [`${slot.label} ${ScheduleCore.timeText(slot)}`, ...term.weekdays.map(() => '')])];
  const sheet = XLSX.utils.aoa_to_sheet(rows); sheet['!freeze'] = { xSplit: 1, ySplit: 1 }; sheet['!cols'] = [{wch:24}, ...term.weekdays.map(() => ({wch:18}))];
  const options = XLSX.utils.aoa_to_sheet([['可选科目'], ...term.subjects.map(x => [x.name])]);
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, '班级课表'); XLSX.utils.book_append_sheet(book, options, '科目选项');
  book.Workbook = { Sheets: [{ name:'班级课表', Hidden:0 }, { name:'科目选项', Hidden:1 }] };
  workbookDownload(book, `${safeFileName(cls.name)}_班级课表模板.xlsx`);
}

function chooseExcelFile(handler) {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
  input.onchange = async () => { if (input.files[0]) { try { await handler(input.files[0]); } catch (e) { console.error(e); UI.toast('读取失败：' + e.message, 'error'); } } };
  input.click();
}
function sheetRowsWithMerges(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header:1, defval:'', raw:false });
  (sheet['!merges'] || []).forEach(m => {
    const value = rows[m.s.r] && rows[m.s.r][m.s.c];
    for (let r=m.s.r; r<=m.e.r; r++) for (let c=m.s.c; c<=m.e.c; c++) { rows[r] ||= []; if (!rows[r][c]) rows[r][c] = value; }
  });
  return rows.map(r => r.map(x => String(x || '').trim()));
}
function matchScheduleSlot(term, raw) {
  const text = String(raw || '').replace(/\s/g, '');
  return term.slots.find(x => text.includes(String(x.label).replace(/\s/g,'')) || text.includes(ScheduleCore.timeText(x).replace(/\s/g,'')) || String(x.label).replace('第','').replace('节','') === text);
}
function parseClassMatrix(sheet, term) {
  const rows = sheetRowsWithMerges(sheet); if (rows.length < 2) throw new Error('表格内容为空');
  const headerIndex = rows.findIndex(r => r.some(x => term.weekdays.includes(ScheduleCore.normalizeDay(x))));
  if (headerIndex < 0) throw new Error('未找到星期表头');
  const header = rows[headerIndex]; const dayColumns = [];
  header.forEach((x, i) => { const day = ScheduleCore.normalizeDay(x); if (term.weekdays.includes(day)) dayColumns.push({ day, index:i }); });
  const cells = []; rows.slice(headerIndex + 1).forEach(row => {
    const slot = matchScheduleSlot(term, row[0]); if (!slot) return;
    dayColumns.forEach(col => { const raw = String(row[col.index] || '').trim(); if (raw) cells.push({ day:col.day, slotId:slot.id, raw }); });
  });
  return cells;
}
function importClassSchedule() {
  const term = scheduleTerm(); const cls = scheduleEntity(term.classes, ScheduleUI.classId); if (!cls) return;
  chooseExcelFile(async file => {
    const book = XLSX.read(await file.arrayBuffer(), { type:'array' });
    const cells = parseClassMatrix(book.Sheets[book.SheetNames[0]], term);
    if (!cells.length) throw new Error('没有识别到课程，请使用本页模板');
    const unknown = [...new Set(cells.map(x => ScheduleCore.parseCourseText(x.raw).subject).filter(name => !term.subjects.some(s => s.name === name)))];
    ScheduleUI.pendingClassImport = { classId:cls.id, cells };
    UI.modal('确认导入班级课表', `<div class="import-summary"><strong>已识别 ${cells.length} 节课程</strong><span>${esc(cls.name)} · ${esc(term.name)}</span></div>
      ${unknown.length ? `<div class="schedule-import-warning">以下内容未匹配现有科目，请选择对应科目：</div>${unknown.map((name,i) => `<div class="form-row"><div class="form-group"><label class="form-label">${esc(name)}</label><select class="form-select import-subject-map" data-raw="${esc(name)}"><option value="">请选择</option>${scheduleOption(term.subjects,'')}</select></div></div>`).join('')}` : '<div class="schedule-import-success">所有科目均已匹配，可以安全替换。</div>'}`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="confirmClassScheduleImport()">确认替换</button>`);
  });
}
function confirmClassScheduleImport() {
  const pending = ScheduleUI.pendingClassImport; if (!pending) return;
  const term = scheduleTerm(); const mapping = {};
  document.querySelectorAll('.import-subject-map').forEach(el => mapping[el.dataset.raw] = el.value);
  if (Object.values(mapping).some(x => !x)) return UI.toast('请先完成所有科目映射', 'warning');
  const next = {}; let count = 0;
  pending.cells.forEach(cell => {
    const name = ScheduleCore.parseCourseText(cell.raw).subject;
    const subject = term.subjects.find(x => x.name === name); const subjectId = subject ? subject.id : mapping[name];
    if (!subjectId) return; next[cell.day] ||= {}; next[cell.day][cell.slotId] = { subjectId, note:'', type:'lesson' }; count++;
  });
  term.classSchedules[pending.classId] = next; ScheduleUI.pendingClassImport = null;
  scheduleSave(`已替换班级课表，共 ${count} 节课程`); UI.closeModal(); M.schedule();
}

function renderMasterSchedule(term) {
  const master = term.masterSchedule;
  if (!master.classes.length) return `<div class="schedule-toolbar"><div></div><div class="flex gap-2"><button class="btn btn-outline" onclick="downloadMasterMatrixTemplate()">模板</button><button class="btn btn-primary" onclick="importMasterMatrix()">${ICON.upload} 导入全校总表</button><button class="btn btn-outline" onclick="addMasterClass()">${ICON.plus} 添加班级</button></div></div>${UI.empty(ICON.grid, '尚未导入全校课程总表')}`;
  if (!ScheduleUI.masterClassId || !scheduleEntity(master.classes, ScheduleUI.masterClassId)) ScheduleUI.masterClassId = master.classes[0].id;
  const cls = scheduleEntity(master.classes, ScheduleUI.masterClassId); const data = master.cells[cls.id] || {};
  const self = scheduleEntity(term.teachers, term.selfTeacherId);
  let table = `<div class="schedule-table-scroll"><table class="formal-schedule-table editable-schedule"><thead><tr><th class="slot-column">时间段</th>${term.weekdays.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>`;
  term.slots.filter(x => x.enabled !== false).forEach(slot => {
    table += `<tr><th class="slot-column"><strong>${esc(slot.label)}</strong><span>${esc(ScheduleCore.timeText(slot))}</span></th>`;
    term.weekdays.forEach(day => {
      const cell = (data[day] || {})[slot.id]; const isMine = cell && self && cell.teacher && ScheduleCore.normalizeName(cell.teacher) === ScheduleCore.normalizeName(self.name);
      table += `<td class="editable-cell ${isMine ? 'master-self-course' : ''}" onclick="editMasterCell('${cls.id}','${day}','${slot.id}')">${cell && cell.subject ? `<strong>${esc(cell.subject)}</strong><span>${esc(cell.teacher || '')}</span>` : '<span class="schedule-free">点击编辑</span>'}</td>`;
    });
    table += '</tr>';
  }); table += '</tbody></table></div>';
  return `<div class="schedule-toolbar"><div class="schedule-filter"><label>查看班级</label><select class="form-select" onchange="ScheduleUI.masterClassId=this.value;M.schedule()">${scheduleOption(master.classes, cls.id)}</select></div>
    <div class="flex gap-2 flex-wrap"><button class="btn btn-outline" onclick="downloadMasterMatrixTemplate()">模板</button><button class="btn btn-primary" onclick="importMasterMatrix()">${ICON.upload} 导入全校总表</button><button class="btn btn-outline" onclick="addMasterClass()">${ICON.plus} 添加班级</button></div></div>
    <div class="schedule-summary-row"><span>全校总表仅用于查询和调课参考，不参与“我的课表”计算。</span>${self ? `<span class="schedule-highlight-key">高亮：${esc(self.name)}</span>` : ''}</div>${table}`;
}

function addMasterClass() {
  UI.modal('添加全校班级', `<div class="form-group"><label class="form-label">班级名称</label><input class="form-input" id="master-class-name" placeholder="如：五（1）班"></div>`, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveMasterClass()">添加</button>`);
}
function saveMasterClass() {
  const name = document.getElementById('master-class-name').value.trim(); if (!name) return UI.toast('请输入班级名称','warning');
  const term = scheduleTerm(); const id = ScheduleCore.uid('masterClass'); term.masterSchedule.classes.push({id,name}); term.masterSchedule.cells[id] = {}; ScheduleUI.masterClassId = id;
  scheduleSave('班级已添加'); UI.closeModal(); M.schedule();
}
function editMasterCell(classId, day, slotId) {
  const term = scheduleTerm(); const cell = (((term.masterSchedule.cells[classId] || {})[day] || {})[slotId]) || {};
  UI.modal(`编辑课程总表 · ${day}`, `<div class="form-row"><div class="form-group"><label class="form-label">科目</label><select class="form-select" id="master-cell-subject"><option value="">空闲</option>${term.subjects.map(x => `<option value="${esc(x.name)}" ${x.name===cell.subject?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">教师</label><select class="form-select" id="master-cell-teacher"><option value="">未填写</option>${term.teachers.map(x => `<option value="${esc(x.name)}" ${x.name===cell.teacher?'selected':''}>${esc(x.name+(x.contact?' · '+x.contact:''))}</option>`).join('')}</select></div></div>`, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveMasterCell('${classId}','${day}','${slotId}')">保存</button>`);
}
function saveMasterCell(classId, day, slotId) {
  const term = scheduleTerm(); const subject = document.getElementById('master-cell-subject').value; const teacher = document.getElementById('master-cell-teacher').value;
  term.masterSchedule.cells[classId] ||= {}; term.masterSchedule.cells[classId][day] ||= {};
  if (subject) term.masterSchedule.cells[classId][day][slotId] = { subject, teacher, raw: teacher ? `${subject}（${teacher}）` : subject };
  else delete term.masterSchedule.cells[classId][day][slotId];
  scheduleSave('课程总表已更新'); UI.closeModal(); M.schedule();
}

function downloadMasterMatrixTemplate() {
  const term = scheduleTerm(); const names = term.masterSchedule.classes.length ? term.masterSchedule.classes.map(x => x.name) : (term.classes.length ? term.classes.map(x => x.name) : ['一（1）班','一（2）班']);
  const row1 = ['节次','时间']; const row2 = ['',''];
  term.weekdays.forEach(day => names.forEach(name => { row1.push(day); row2.push(name); }));
  const rows = [row1,row2,...term.slots.filter(x => x.enabled!==false).map(slot => [slot.label,ScheduleCore.timeText(slot),...term.weekdays.flatMap(() => names.map(() => ''))])];
  const sheet = XLSX.utils.aoa_to_sheet(rows); sheet['!merges'] = []; let col = 2;
  term.weekdays.forEach(() => { if (names.length > 1) sheet['!merges'].push({s:{r:0,c:col},e:{r:0,c:col+names.length-1}}); col += names.length; });
  sheet['!cols'] = [{wch:12},{wch:14},...row1.slice(2).map(() => ({wch:18}))];
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book,sheet,'全校课程总表'); workbookDownload(book,`${safeFileName(term.name)}_全校课程总表模板.xlsx`);
}
function parseMasterWorkbook(book, term) {
  const sheet = book.Sheets[book.SheetNames[0]]; const rows = sheetRowsWithMerges(sheet);
  const longHeader = rows.findIndex(r => r.some(x => /班级/.test(x)) && r.some(x => /星期|周几|日期/.test(x)) && r.some(x => /节次|时间段/.test(x)));
  if (longHeader >= 0) {
    const headers = rows[longHeader]; const idx = pattern => headers.findIndex(x => pattern.test(x));
    const ci=idx(/班级/), di=idx(/星期|周几|日期/), pi=idx(/节次|时间段/), si=idx(/科目|课程/), ti=idx(/教师|老师/);
    const result = { classes:new Map(), count:0 };
    rows.slice(longHeader+1).forEach(r => { const name=r[ci], day=ScheduleCore.normalizeDay(r[di]), slot=matchScheduleSlot(term,r[pi]); if(!name||!term.weekdays.includes(day)||!slot||!r[si])return; if(!result.classes.has(name))result.classes.set(name,{}); const obj=result.classes.get(name); obj[day]||={}; obj[day][slot.id]={subject:r[si],teacher:ti>=0?r[ti]:'',raw:r[si]}; result.count++; });
    return result;
  }
  const dayRow = rows.findIndex(r => r.filter(x => term.weekdays.includes(ScheduleCore.normalizeDay(x))).length >= 1);
  if (dayRow < 0 || !rows[dayRow + 1]) throw new Error('无法识别星期和班级表头');
  const columns=[]; rows[dayRow].forEach((raw,i)=>{ const day=ScheduleCore.normalizeDay(raw); const name=rows[dayRow+1][i]; if(i>0&&term.weekdays.includes(day)&&name)columns.push({i,day,name}); });
  if (!columns.length) throw new Error('无法识别全校矩阵，请下载标准模板');
  const result={classes:new Map(),count:0}; columns.forEach(x=>result.classes.set(x.name,{}));
  rows.slice(dayRow+2).forEach(r=>{ const slot=matchScheduleSlot(term,`${r[0]||''} ${r[1]||''}`); if(!slot)return; columns.forEach(c=>{ const raw=r[c.i]; if(!raw)return; const obj=result.classes.get(c.name); obj[c.day]||={}; obj[c.day][slot.id]=ScheduleCore.parseCourseText(raw); result.count++; }); });
  return result;
}
function importMasterMatrix() {
  const term=scheduleTerm(); chooseExcelFile(async file=>{ try { const book=XLSX.read(await file.arrayBuffer(),{type:'array'}); const parsed=parseMasterWorkbook(book,term); if(!parsed.count)throw new Error('未识别到课程内容'); ScheduleUI.pendingMasterImport=parsed; UI.modal('确认导入全校课程总表',`<div class="import-summary"><strong>已识别 ${parsed.classes.size} 个班级、${parsed.count} 节课程</strong><span>确认后将替换本学期现有课程总表，不影响班级课表和我的课表。</span></div>`,`<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="confirmMasterImport()">确认替换</button>`); } catch(e) { UI.modal('无法识别该课程总表',`<div class="schedule-import-warning">${esc(e.message)}</div><p class="text-sm text-muted">请下载标准全校矩阵模板，将课程复制到对应单元格后重新导入。</p>`,`<button class="btn btn-outline" onclick="downloadMasterMatrixTemplate()">下载模板</button><button class="btn btn-primary" onclick="UI.closeModal()">知道了</button>`); } });
}
function confirmMasterImport() {
  const p=ScheduleUI.pendingMasterImport;if(!p)return;const term=scheduleTerm();const master={classes:[],cells:{}};
  p.classes.forEach((cells,name)=>{const id=ScheduleCore.uid('masterClass');master.classes.push({id,name});master.cells[id]=cells;});term.masterSchedule=master;ScheduleUI.pendingMasterImport=null;ScheduleUI.masterClassId='';scheduleSave('全校课程总表已导入');UI.closeModal();M.schedule();
}

function renderScheduleAdjustments(term) {
  const action={swap:'互换',move:'移课',cancel:'停课',extra:'补课'},scope={temporary:'临时',permanent:'长期'};
  const rows=(term.adjustments||[]).map(a=>`<tr><td>${scope[a.scope]||''}</td><td><span class="status-pill">${action[a.action]||''}</span></td><td>${esc(a.scope==='temporary'?(a.sourceDate||a.targetDate):`自 ${a.effectiveDate} 起`)}</td><td>${esc(a.action==='extra'?`${scheduleClassName(term,a.targetClassId)} ${a.targetDay} ${scheduleSlotLabel(term,a.targetSlotId)}`:`${scheduleClassName(term,a.sourceClassId)} ${a.sourceDay} ${scheduleSlotLabel(term,a.sourceSlotId)}`)}</td><td>${esc(a.reason||'')}</td><td><button class="btn btn-outline btn-sm" onclick="openScheduleAdjustment('${a.id}')">编辑</button><button class="btn btn-danger btn-sm" onclick="deleteScheduleAdjustment('${a.id}')">删除</button></td></tr>`).join('');
  const legacy=(term.legacyAdjustments||[]).length?`<div class="schedule-notice muted">${ICON.info}<div><strong>历史调课备注 ${term.legacyAdjustments.length} 条</strong><span>旧记录缺少结构化课程信息，已保留但不会自动改变课表。</span></div></div>`:'';
  return `<div class="schedule-toolbar"><div class="schedule-summary-row compact"><span>调课作为覆盖记录保存，不会破坏原始班级课表。</span></div><button class="btn btn-primary" onclick="openScheduleAdjustment()">${ICON.plus} 记录调课</button></div>${legacy}${rows?`<div class="table-wrap"><table class="data-table"><thead><tr><th>范围</th><th>类型</th><th>生效时间</th><th>课程/时段</th><th>原因</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`:UI.empty(ICON.schedule,'暂无调课记录')}`;
}
function adjustmentSelects(term,a) {
  const classes=scheduleOption(term.classes,a.sourceClassId);const targetClasses=scheduleOption(term.classes,a.targetClassId);const slots=scheduleOption(term.slots.filter(x=>x.enabled!==false),a.sourceSlotId,x=>scheduleSlotLabel(term,x.id));const targetSlots=scheduleOption(term.slots.filter(x=>x.enabled!==false),a.targetSlotId,x=>scheduleSlotLabel(term,x.id));
  return `<div class="form-row"><div class="form-group"><label class="form-label">调整类型</label><select class="form-select" id="adj-action"><option value="swap" ${a.action==='swap'?'selected':''}>两节互换</option><option value="move" ${a.action==='move'?'selected':''}>移到空时段</option><option value="cancel" ${a.action==='cancel'?'selected':''}>停课</option><option value="extra" ${a.action==='extra'?'selected':''}>补课</option></select></div><div class="form-group"><label class="form-label">生效范围</label><select class="form-select" id="adj-scope"><option value="temporary" ${a.scope!=='permanent'?'selected':''}>仅具体日期</option><option value="permanent" ${a.scope==='permanent'?'selected':''}>自指定日期至学期末</option></select></div></div>
  <div class="form-row"><div class="form-group"><label class="form-label">生效/原课程日期</label><input class="form-input" type="date" id="adj-source-date" value="${a.sourceDate||a.effectiveDate||todayStr()}"></div><div class="form-group"><label class="form-label">目标日期</label><input class="form-input" type="date" id="adj-target-date" value="${a.targetDate||a.sourceDate||a.effectiveDate||todayStr()}"></div></div>
  <div class="form-section-label">原课程（补课时可忽略）</div><div class="form-row"><div class="form-group"><label class="form-label">班级</label><select class="form-select" id="adj-source-class">${classes}</select></div><div class="form-group"><label class="form-label">节次</label><select class="form-select" id="adj-source-slot">${slots}</select></div></div>
  <div class="form-section-label">目标安排（停课时可忽略）</div><div class="form-row"><div class="form-group"><label class="form-label">班级</label><select class="form-select" id="adj-target-class">${targetClasses}</select></div><div class="form-group"><label class="form-label">节次</label><select class="form-select" id="adj-target-slot">${targetSlots}</select></div></div>
  <div class="form-row"><div class="form-group"><label class="form-label">补课科目</label><select class="form-select" id="adj-subject"><option value="">从原课程带出</option>${scheduleOption(term.subjects,a.subjectId)}</select></div><div class="form-group"><label class="form-label">补课教师</label><select class="form-select" id="adj-teacher"><option value="">从科任配置带出</option>${scheduleOption(term.teachers,a.teacherId,x=>x.name+(x.contact?' · '+x.contact:''))}</select></div></div>
  <div class="form-group"><label class="form-label">原因/备注</label><input class="form-input" id="adj-reason" value="${esc(a.reason||'')}" placeholder="如：教研活动、临时补课"></div>`;
}
function openScheduleAdjustment(id) {
  const term=scheduleTerm();if(!term.classes.length)return UI.toast('请先添加任课班级','warning');
  const a=(term.adjustments||[]).find(x=>x.id===id)||{action:'swap',scope:'temporary',sourceClassId:term.classes[0].id,targetClassId:term.classes[0].id,sourceSlotId:(term.slots[0]||{}).id,targetSlotId:(term.slots[1]||term.slots[0]||{}).id};
  UI.modal(id?'编辑调课':'记录调课',adjustmentSelects(term,a),`<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveScheduleAdjustment('${id||''}')">保存</button>`);
}
function saveScheduleAdjustment(id) {
  const term=scheduleTerm();const get=x=>document.getElementById(x).value;const action=get('adj-action'),scope=get('adj-scope'),sourceDate=get('adj-source-date'),targetDate=get('adj-target-date');
  const a={id:id||ScheduleCore.uid('adjust'),action,scope,sourceDate:scope==='temporary'?sourceDate:'',targetDate:scope==='temporary'?targetDate:'',effectiveDate:scope==='permanent'?sourceDate:'',sourceDay:scheduleDayFromDate(sourceDate),targetDay:scheduleDayFromDate(targetDate),sourceClassId:get('adj-source-class'),sourceSlotId:get('adj-source-slot'),targetClassId:get('adj-target-class'),targetSlotId:get('adj-target-slot'),subjectId:get('adj-subject'),teacherId:get('adj-teacher'),reason:get('adj-reason').trim(),createdAt:new Date().toISOString()};
  const base=term.classSchedules;const source=(((base[a.sourceClassId]||{})[a.sourceDay]||{})[a.sourceSlotId]);const target=(((base[a.targetClassId]||{})[a.targetDay]||{})[a.targetSlotId]);
  if(action!=='extra'&&!source)return UI.toast('所选原时段没有课程，请重新选择','warning');
  if(action==='swap' && scope==='temporary' && ScheduleCore.mondayOf(sourceDate)!==ScheduleCore.mondayOf(targetDate))return UI.toast('临时互换必须在同一周内；跨周请使用移课','warning');
  if(action==='swap'&&!target)return UI.toast('互换要求目标时段已有课程','warning');
  if((action==='move'||action==='extra')&&target)return UI.toast('目标时段已有课程，请改用“互换”或选择空时段','warning');
  if(action!=='extra' && source){a.subjectId=source.subjectId;const sourceClass=scheduleEntity(term.classes,a.sourceClassId);a.teacherId=sourceClass&&sourceClass.subjectTeachers[source.subjectId]||'';}
  if(action==='extra'&&!a.subjectId)return UI.toast('补课需要选择科目','warning');
  if(action==='extra'&&!a.teacherId){const cls=scheduleEntity(term.classes,a.targetClassId);a.teacherId=cls&&cls.subjectTeachers[a.subjectId]||'';} if(action==='extra'&&!a.teacherId)return UI.toast('请为补课选择教师','warning');
  const idx=term.adjustments.findIndex(x=>x.id===id);if(idx>=0)term.adjustments[idx]=a;else term.adjustments.unshift(a);scheduleSave(id?'调课记录已更新':'调课已记录');UI.closeModal();M.schedule();
}
function deleteScheduleAdjustment(id){UI.confirm('确定删除这条调课记录？删除后课表将恢复到未应用该记录的状态。',()=>{const term=scheduleTerm();term.adjustments=term.adjustments.filter(x=>x.id!==id);scheduleSave('调课记录已删除');M.schedule();});}

function renderScheduleSettings(term) {
  if(!ScheduleUI.mappingClassId||!scheduleEntity(term.classes,ScheduleUI.mappingClassId))ScheduleUI.mappingClassId=(term.classes[0]||{}).id||'';
  const mapClass=scheduleEntity(term.classes,ScheduleUI.mappingClassId);
  const days=ScheduleCore.DAY_LABELS.map(day=>`<label class="check-chip ${term.weekdays.includes(day)?'active':''}"><input type="checkbox" ${term.weekdays.includes(day)?'checked':''} onchange="toggleScheduleDay('${day}',this.checked)">${day}</label>`).join('');
  const slotRows=term.slots.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.label)}</strong></td><td>${esc(ScheduleCore.timeText(x))}</td><td>${x.enabled===false?'停用':'启用'}</td><td><button class="btn btn-ghost btn-sm" onclick="moveScheduleSlot('${x.id}',-1)">↑</button><button class="btn btn-ghost btn-sm" onclick="moveScheduleSlot('${x.id}',1)">↓</button><button class="btn btn-outline btn-sm" onclick="editScheduleSlot('${x.id}')">编辑</button></td></tr>`).join('');
  const teacherRows=term.teachers.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.id===term.selfTeacherId?'<span class="status-pill success">本人</span>':'—'}</td><td><button class="btn btn-outline btn-sm" onclick="setSelfScheduleTeacher('${x.id}')">设为本人</button></td></tr>`).join('');
  const classRows=term.classes.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${x.linkedClassId?'已关联':'按名称自动高亮'}</td><td><button class="btn btn-outline btn-sm" onclick="ScheduleUI.mappingClassId='${x.id}';M.schedule()">配置科任</button></td></tr>`).join('');
  const mapping=mapClass?`<div class="schedule-filter mb-3"><label>配置班级</label><select class="form-select" onchange="ScheduleUI.mappingClassId=this.value;M.schedule()">${scheduleOption(term.classes,mapClass.id)}</select></div><div class="teacher-mapping-grid">${term.subjects.map(s=>`<label><span>${esc(s.name)}</span><select class="form-select" onchange="saveSubjectTeacher('${mapClass.id}','${s.id}',this.value)"><option value="">未配置</option>${scheduleOption(term.teachers,mapClass.subjectTeachers[s.id])}</select></label>`).join('')}</div>`:'<p class="text-sm text-muted">添加任课班级后可配置科任教师。</p>';
  return `<div class="settings-grid">
    <section class="card schedule-settings-card"><div class="card-title">学期信息 <button class="btn btn-outline btn-sm" onclick="editScheduleSemester()">编辑</button></div><dl class="schedule-meta"><div><dt>名称</dt><dd>${esc(term.name)}</dd></div><div><dt>日期</dt><dd>${term.startDate} 至 ${term.endDate}</dd></div><div><dt>状态</dt><dd>${term.archived?'已归档':'使用中'}</dd></div></dl><div class="weekday-chips">${days}</div><button class="btn btn-outline btn-sm mt-3" onclick="addScheduleSemester()">${ICON.plus} 新建学期</button></section>
    <section class="card schedule-settings-card"><div class="card-title">时间段 <button class="btn btn-outline btn-sm" onclick="editScheduleSlot()">${ICON.plus} 添加</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>顺序</th><th>名称</th><th>时间</th><th>状态</th><th></th></tr></thead><tbody>${slotRows}</tbody></table></div></section>
    <section class="card schedule-settings-card"><div class="card-title">教师与本人 <button class="btn btn-outline btn-sm" onclick="addScheduleTeacher()">${ICON.plus} 添加教师</button></div>${teacherRows?`<div class="table-wrap"><table class="data-table"><thead><tr><th>教师</th><th>身份</th><th></th></tr></thead><tbody>${teacherRows}</tbody></table></div>`:UI.empty(ICON.user,'尚未添加教师')}</section>
    <section class="card schedule-settings-card"><div class="card-title">科目 <button class="btn btn-outline btn-sm" onclick="addScheduleSubject()">${ICON.plus} 添加科目</button></div><div class="subject-chip-list">${term.subjects.map(x=>`<span>${esc(x.name)}</span>`).join('')}</div></section>
    <section class="card schedule-settings-card"><div class="card-title">任课班级 <button class="btn btn-outline btn-sm" onclick="addTeachingClass()">${ICON.plus} 添加班级</button></div>${classRows?`<div class="table-wrap"><table class="data-table"><thead><tr><th>班级</th><th>顶部班级关联</th><th></th></tr></thead><tbody>${classRows}</tbody></table></div>`:UI.empty(ICON.users,'尚未添加任课班级')}</section>
    <section class="card schedule-settings-card wide"><div class="card-title">各科科任教师</div><p class="text-sm text-muted mb-3">当某科教师设为“本人”时，该班该科课程会自动汇总到我的课表。</p>${mapping}</section>
  </div>`;
}

function editScheduleSemester(){const t=scheduleTerm();UI.modal('编辑学期',`<div class="form-group"><label class="form-label">学期名称</label><input class="form-input" id="term-name" value="${esc(t.name)}"></div><div class="form-row"><div class="form-group"><label class="form-label">开始日期</label><input class="form-input" type="date" id="term-start" value="${t.startDate}"></div><div class="form-group"><label class="form-label">结束日期</label><input class="form-input" type="date" id="term-end" value="${t.endDate}"></div></div><label class="checkbox-label"><input type="checkbox" id="term-archived" ${t.archived?'checked':''}> 归档为历史学期</label>`,`<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveScheduleSemester()">保存</button>`);}
function saveScheduleSemester(){const t=scheduleTerm();const name=document.getElementById('term-name').value.trim(),start=document.getElementById('term-start').value,end=document.getElementById('term-end').value;if(!name||!start||!end||start>end)return UI.toast('请填写有效的学期名称和日期','warning');Object.assign(t,{name,startDate:start,endDate:end,archived:document.getElementById('term-archived').checked});scheduleSave('学期信息已保存');UI.closeModal();M.schedule();}
function addScheduleSemester(){const ws=Store.data.scheduleWorkspace;const t=ScheduleCore.newSemester();ws.semesters.push(t);ws.activeSemesterId=t.id;ScheduleUI.classId='';ScheduleUI.masterClassId='';scheduleSave('新学期已创建');M.schedule();}
function toggleScheduleDay(day,checked){const t=scheduleTerm();if(checked&&!t.weekdays.includes(day))t.weekdays.push(day);if(!checked)t.weekdays=t.weekdays.filter(x=>x!==day);t.weekdays.sort((a,b)=>ScheduleCore.DAY_LABELS.indexOf(a)-ScheduleCore.DAY_LABELS.indexOf(b));scheduleSave();M.schedule();}
function moveScheduleSlot(id,delta){const t=scheduleTerm(),i=t.slots.findIndex(x=>x.id===id),j=i+delta;if(i<0||j<0||j>=t.slots.length)return;[t.slots[i],t.slots[j]]=[t.slots[j],t.slots[i]];scheduleSave('时间段顺序已调整');M.schedule();}
function editScheduleSlot(id){const t=scheduleTerm(),s=scheduleEntity(t.slots,id)||{};UI.modal(id?'编辑时间段':'添加时间段',`<div class="form-group"><label class="form-label">名称</label><input class="form-input" id="slot-name" value="${esc(s.label||'')}" placeholder="如：早读、第一节、午休"></div><div class="form-row"><div class="form-group"><label class="form-label">开始时间</label><input class="form-input" type="time" id="slot-start" value="${s.start||''}"></div><div class="form-group"><label class="form-label">结束时间</label><input class="form-input" type="time" id="slot-end" value="${s.end||''}"></div></div><label class="checkbox-label"><input type="checkbox" id="slot-enabled" ${s.enabled===false?'':'checked'}> 启用该时间段</label>`,`<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveScheduleSlot('${id||''}')">保存</button>`);}
function saveScheduleSlot(id){const t=scheduleTerm(),label=document.getElementById('slot-name').value.trim(),start=document.getElementById('slot-start').value,end=document.getElementById('slot-end').value;if(!label)return UI.toast('请输入时间段名称','warning');const obj={id:id||ScheduleCore.uid('slot'),label,start,end,enabled:document.getElementById('slot-enabled').checked};const i=t.slots.findIndex(x=>x.id===id);if(i>=0)t.slots[i]=obj;else t.slots.push(obj);scheduleSave('时间段已保存');UI.closeModal();M.schedule();}
function addScheduleTeacher(){UI.modal('添加教师',`<div class="form-group"><label class="form-label">教师姓名</label><input class="form-input" id="teacher-name" placeholder="如：吴老师"></div><label class="checkbox-label"><input type="checkbox" id="teacher-self"> 这是我本人</label>`,`<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveScheduleTeacher()">添加</button>`);}
function saveScheduleTeacher(){const t=scheduleTerm(),name=document.getElementById('teacher-name').value.trim();if(!name)return UI.toast('请输入教师姓名','warning');if(t.teachers.some(x=>x.name===name))return UI.toast('该教师已存在','warning');const x={id:ScheduleCore.uid('teacher'),name};t.teachers.push(x);if(document.getElementById('teacher-self').checked)t.selfTeacherId=x.id;scheduleSave('教师已添加');UI.closeModal();M.schedule();}
function setSelfScheduleTeacher(id){const t=scheduleTerm();t.selfTeacherId=id;scheduleSave(`已将 ${scheduleTeacherName(t,id)} 设为本人`);M.schedule();}
function addScheduleSubject(){UI.modal('添加科目',`<div class="form-group"><label class="form-label">科目名称</label><input class="form-input" id="subject-name" placeholder="如：英语口语"></div>`,`<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveScheduleSubject()">添加</button>`);}
function saveScheduleSubject(){const t=scheduleTerm(),name=document.getElementById('subject-name').value.trim();if(!name)return UI.toast('请输入科目名称','warning');if(t.subjects.some(x=>x.name===name))return UI.toast('该科目已存在','warning');t.subjects.push({id:ScheduleCore.uid('subject'),name});scheduleSave('科目已添加');UI.closeModal();M.schedule();}
function addTeachingClass(){const existing=Store.data.classes||[];UI.modal('添加任课班级',`<div class="form-group"><label class="form-label">班级名称</label><input class="form-input" id="teaching-class-name" placeholder="如：五（1）班"></div><div class="form-group"><label class="form-label">关联顶部班级（选填）</label><select class="form-select" id="teaching-linked-class"><option value="">按名称自动匹配</option>${existing.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div>`,`<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveTeachingClass()">添加</button>`);}
function saveTeachingClass(){const t=scheduleTerm(),name=document.getElementById('teaching-class-name').value.trim();if(!name)return UI.toast('请输入班级名称','warning');if(t.classes.some(x=>ScheduleCore.normalizeName(x.name)===ScheduleCore.normalizeName(name)))return UI.toast('该班级已存在','warning');const id=ScheduleCore.uid('class');t.classes.push({id,name,linkedClassId:document.getElementById('teaching-linked-class').value,subjectTeachers:{}});t.classSchedules[id]={};ScheduleUI.mappingClassId=id;ScheduleUI.classId=id;scheduleSave('任课班级已添加');UI.closeModal();M.schedule();}
function saveSubjectTeacher(classId,subjectId,teacherId){const t=scheduleTerm(),cls=scheduleEntity(t.classes,classId);if(!cls)return;cls.subjectTeachers[subjectId]=teacherId;scheduleSave();}

function exportMySchedule(format) {
  const term=scheduleTerm(),week=scheduleCurrentWeek(),items=ScheduleCore.getMine(term,week),self=scheduleEntity(term.teachers,term.selfTeacherId);const by=new Map();items.forEach(x=>{const k=`${x.date}:${x.slotId}`;if(!by.has(k))by.set(k,[]);by.get(k).push(x);});
  const cellText=x=>`${scheduleSubjectName(term,x.subjectId)}\n${scheduleClassName(term,x.classId)}${x.source!=='base'?` [${scheduleStatusLabel(x.source)}]`:''}${x.conflict?' [冲突]':''}`;
  const rows=[['时间段',...term.weekdays.map(d=>`${d}\n${ScheduleCore.dateForDay(week,d).slice(5)}`)],...term.slots.filter(x=>x.enabled!==false).map(slot=>[`${slot.label}\n${ScheduleCore.timeText(slot)}`,...term.weekdays.map(day=>(by.get(`${ScheduleCore.dateForDay(week,day)}:${slot.id}`)||[]).map(cellText).join('\n'))])];
  const title=`${self?self.name:'我的'}_${term.name}_${week.slice(5)}课表`;
  if(format==='xlsx'){const sheet=XLSX.utils.aoa_to_sheet(rows);sheet['!cols']=[{wch:18},...term.weekdays.map(()=>({wch:22}))];const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'我的课表');workbookDownload(book,`${safeFileName(title)}.xlsx`);return;}
  let html=`<h1>${esc(self?self.name:'我的')}课表</h1><p style="text-align:center">${esc(term.name)}　${week} 至 ${ScheduleCore.addDays(week,6)}</p><table><tr>${rows[0].map(x=>`<th>${esc(x).replace(/\n/g,'<br>')}</th>`).join('')}</tr>${rows.slice(1).map(r=>`<tr>${r.map((x,i)=>`<${i?'td':'th'}>${esc(x).replace(/\n/g,'<br>')}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</table>`;UI.exportWord(safeFileName(title),html);
}
