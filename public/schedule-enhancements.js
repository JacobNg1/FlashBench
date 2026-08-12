const ScheduleEnhancements = {
  timelineStart: 7 * 60 + 30,
  timelineEnd: 18 * 60,
  pixelsPerStep: 4,
  stepMinutes: 5,
  originalMineRenderer: window.renderMySchedule,
  originalSettingsRenderer: window.renderScheduleSettings,
  slotDrafts: {}
};

const COMMON_SCHEDULE_SLOTS = [
  { label:'早读', start:'07:50', end:'08:10' },
  { label:'课间操', start:'09:55', end:'10:20' },
  { label:'午餐', start:'12:00', end:'12:30' },
  { label:'午休', start:'12:30', end:'14:00' },
  { label:'晚托', start:'16:00', end:'17:00' }
];

function scheduleMinutes(value) {
  const [hour, minute] = String(value || '').split(':').map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : NaN;
}

function scheduleTimeFromMinutes(value) {
  const minutes = Math.max(0, Math.min(24 * 60 - 1, Math.round(value / 5) * 5));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function scheduleRangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function scheduleSlotRange(term, slot) {
  const draft = ScheduleEnhancements.slotDrafts[slot.id];
  return { start: draft ? draft.start : slot.start, end: draft ? draft.end : slot.end };
}

function scheduleSlotConflict(term, slotId, start, end) {
  const startMinutes = scheduleMinutes(start), endMinutes = scheduleMinutes(end);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || startMinutes >= endMinutes) return '结束时间必须晚于开始时间';
  const conflict = term.slots.find(slot => {
    if (slot.id === slotId || slot.enabled === false) return false;
    const range = scheduleSlotRange(term, slot);
    const otherStart = scheduleMinutes(range.start), otherEnd = scheduleMinutes(range.end);
    return Number.isFinite(otherStart) && Number.isFinite(otherEnd) && scheduleRangesOverlap(startMinutes, endMinutes, otherStart, otherEnd);
  });
  return conflict ? `与“${conflict.label}”时间冲突` : '';
}

function ensureCommonScheduleSlots(term) {
  if (term.commonSlotsVersion === 1) return;
  let changed = false;
  COMMON_SCHEDULE_SLOTS.forEach(common => {
    if (term.slots.some(slot => slot.label === common.label)) return;
    const enabled = !scheduleSlotConflict(term, '', common.start, common.end);
    term.slots.push({ id:ScheduleCore.uid('slot'), ...common, enabled });
    changed = true;
  });
  term.commonSlotsVersion = 1;
  term.slots.sort((a, b) => (scheduleMinutes(a.start) || 9999) - (scheduleMinutes(b.start) || 9999));
  if (changed) Store.save();
}

const baseScheduleTerm = window.scheduleTerm;
window.scheduleTerm = function () {
  const term = baseScheduleTerm();
  ensureCommonScheduleSlots(term);
  return term;
};

function scheduleTimelineHeight() {
  return (ScheduleEnhancements.timelineEnd - ScheduleEnhancements.timelineStart) / ScheduleEnhancements.stepMinutes * ScheduleEnhancements.pixelsPerStep;
}

function scheduleTimelineTop(value) {
  return (scheduleMinutes(value) - ScheduleEnhancements.timelineStart) / ScheduleEnhancements.stepMinutes * ScheduleEnhancements.pixelsPerStep;
}

function renderScheduleTimeline(term) {
  const height = scheduleTimelineHeight();
  const ticks = [];
  for (let minute = ScheduleEnhancements.timelineStart; minute <= ScheduleEnhancements.timelineEnd; minute += 30) {
    ticks.push(`<div class="slot-timeline-tick ${minute % 60 ? 'half' : ''}" style="top:${scheduleTimelineTop(scheduleTimeFromMinutes(minute))}px"><span>${scheduleTimeFromMinutes(minute)}</span></div>`);
  }
  const blocks = term.slots.filter(slot => slot.enabled !== false && slot.start && slot.end).map(slot => {
    const range = scheduleSlotRange(term, slot);
    const top = scheduleTimelineTop(range.start);
    const blockHeight = Math.max(8, scheduleTimelineTop(range.end) - top);
    const changed = !!ScheduleEnhancements.slotDrafts[slot.id];
    return `<div class="slot-timeline-block ${changed ? 'has-draft' : ''}" data-slot-id="${slot.id}" style="top:${top}px;height:${blockHeight}px" onpointerdown="startScheduleTimelineDrag(event,'${slot.id}','move')">
      <button class="slot-resize-handle top" title="调整开始时间" onpointerdown="startScheduleTimelineDrag(event,'${slot.id}','start')"></button>
      <div class="slot-timeline-content"><strong>${esc(slot.label)}</strong><span>${range.start}–${range.end}</span></div>
      <button class="slot-resize-handle bottom" title="调整结束时间" onpointerdown="startScheduleTimelineDrag(event,'${slot.id}','end')"></button>
    </div>`;
  }).join('');
  const hasDrafts = Object.keys(ScheduleEnhancements.slotDrafts).length > 0;
  return `<section class="card schedule-settings-card wide slot-timeline-card">
    <div class="card-title"><div>时间轴 <span class="timeline-help">5 分钟步幅；拖动时段或上下边缘调整</span></div>
      <div class="flex gap-2">${hasDrafts ? '<button class="btn btn-ghost btn-sm" onclick="discardScheduleTimelineChanges()">撤销</button><button class="btn btn-primary btn-sm" onclick="saveScheduleTimelineChanges()">保存时间轴</button>' : ''}<button class="btn btn-outline btn-sm" onclick="editScheduleSlot()">${ICON.plus} 添加时段</button></div>
    </div>
    <div class="slot-timeline-scroll"><div class="slot-timeline" style="height:${height}px">${ticks.join('')}<div class="slot-timeline-track">${blocks}</div></div></div>
  </section>`;
}

function startScheduleTimelineDrag(event, slotId, mode) {
  event.preventDefault(); event.stopPropagation();
  const term = scheduleTerm(), slot = scheduleEntity(term.slots, slotId);
  if (!slot || term.archived) return;
  const range = scheduleSlotRange(term, slot);
  const initialStart = scheduleMinutes(range.start), initialEnd = scheduleMinutes(range.end);
  const startY = event.clientY, pointerId = event.pointerId, target = event.currentTarget;
  let moved = false, nextStart = initialStart, nextEnd = initialEnd;
  target.setPointerCapture && target.setPointerCapture(pointerId);
  const onMove = moveEvent => {
    const steps = Math.round((moveEvent.clientY - startY) / ScheduleEnhancements.pixelsPerStep);
    const delta = steps * ScheduleEnhancements.stepMinutes;
    moved ||= Math.abs(moveEvent.clientY - startY) >= 3;
    if (mode === 'move') {
      const duration = initialEnd - initialStart;
      nextStart = Math.max(ScheduleEnhancements.timelineStart, Math.min(ScheduleEnhancements.timelineEnd - duration, initialStart + delta));
      nextEnd = nextStart + duration;
    } else if (mode === 'start') {
      nextStart = Math.max(ScheduleEnhancements.timelineStart, Math.min(initialEnd - 5, initialStart + delta)); nextEnd = initialEnd;
    } else {
      nextStart = initialStart; nextEnd = Math.max(initialStart + 5, Math.min(ScheduleEnhancements.timelineEnd, initialEnd + delta));
    }
    const block = document.querySelector(`.slot-timeline-block[data-slot-id="${slotId}"]`);
    if (block) {
      block.style.top = `${(nextStart - ScheduleEnhancements.timelineStart) / 5 * ScheduleEnhancements.pixelsPerStep}px`;
      block.style.height = `${(nextEnd - nextStart) / 5 * ScheduleEnhancements.pixelsPerStep}px`;
      const label = block.querySelector('.slot-timeline-content span');
      if (label) label.textContent = `${scheduleTimeFromMinutes(nextStart)}–${scheduleTimeFromMinutes(nextEnd)}`;
    }
  };
  const onUp = () => {
    target.removeEventListener('pointermove', onMove); target.removeEventListener('pointerup', onUp); target.removeEventListener('pointercancel', onUp);
    if (!moved && mode === 'move') return editScheduleSlot(slotId);
    const start = scheduleTimeFromMinutes(nextStart), end = scheduleTimeFromMinutes(nextEnd);
    const conflict = scheduleSlotConflict(term, slotId, start, end);
    if (conflict) { UI.toast(conflict, 'warning'); return M.schedule(); }
    ScheduleEnhancements.slotDrafts[slotId] = { start, end }; M.schedule();
  };
  target.addEventListener('pointermove', onMove); target.addEventListener('pointerup', onUp); target.addEventListener('pointercancel', onUp);
}

function saveScheduleTimelineChanges() {
  const term = scheduleTerm();
  Object.entries(ScheduleEnhancements.slotDrafts).forEach(([id, range]) => { const slot = scheduleEntity(term.slots, id); if (slot) Object.assign(slot, range); });
  term.slots.sort((a, b) => (scheduleMinutes(a.start) || 9999) - (scheduleMinutes(b.start) || 9999));
  ScheduleEnhancements.slotDrafts = {}; scheduleSave('时间轴已保存'); M.schedule();
}

function discardScheduleTimelineChanges() { ScheduleEnhancements.slotDrafts = {}; M.schedule(); UI.toast('已撤销时间轴修改', 'info'); }

window.editScheduleSlot = function (id) {
  const term = scheduleTerm(), slot = scheduleEntity(term.slots, id) || {};
  const range = id ? scheduleSlotRange(term, slot) : { start:'', end:'' };
  UI.modal(id ? '编辑时间段' : '添加时间段', `<div class="form-group"><label class="form-label">名称</label><input class="form-input" id="slot-name" value="${esc(slot.label || '')}" placeholder="如：早读、第一节、午休"></div>
    <div class="form-row"><div class="form-group"><label class="form-label">开始时间</label><input class="form-input" type="time" step="300" id="slot-start" value="${range.start || ''}"></div><div class="form-group"><label class="form-label">结束时间</label><input class="form-input" type="time" step="300" id="slot-end" value="${range.end || ''}"></div></div>
    <label class="checkbox-label"><input type="checkbox" id="slot-enabled" ${slot.enabled === false ? '' : 'checked'}> 启用该时间段</label>`, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveScheduleSlot('${id || ''}')">保存</button>`);
};

window.saveScheduleSlot = function (id) {
  const term = scheduleTerm(), label = document.getElementById('slot-name').value.trim();
  const start = scheduleTimeFromMinutes(scheduleMinutes(document.getElementById('slot-start').value));
  const end = scheduleTimeFromMinutes(scheduleMinutes(document.getElementById('slot-end').value));
  const enabled = document.getElementById('slot-enabled').checked;
  if (!label || !document.getElementById('slot-start').value || !document.getElementById('slot-end').value) return UI.toast('请填写名称和完整时间', 'warning');
  if (scheduleMinutes(start) >= scheduleMinutes(end)) return UI.toast('结束时间必须晚于开始时间', 'warning');
  if (enabled) { const conflict = scheduleSlotConflict(term, id, start, end); if (conflict) return UI.toast(conflict, 'warning'); }
  const next = { id:id || ScheduleCore.uid('slot'), label, start, end, enabled };
  const index = term.slots.findIndex(slot => slot.id === id);
  if (index >= 0) term.slots[index] = next; else term.slots.push(next);
  delete ScheduleEnhancements.slotDrafts[id];
  term.slots.sort((a, b) => (scheduleMinutes(a.start) || 9999) - (scheduleMinutes(b.start) || 9999));
  scheduleSave('时间段已保存'); UI.closeModal(); M.schedule();
};

window.renderScheduleSettings = function (term) {
  return `<div class="settings-grid">${renderScheduleTimeline(term)}</div>${ScheduleEnhancements.originalSettingsRenderer(term)}`;
};

window.downloadClassScheduleTemplate = async function () {
  const term = scheduleTerm(), cls = scheduleEntity(term.classes, ScheduleUI.classId);
  if (!cls) return UI.toast('请先选择班级', 'warning');
  if (typeof ExcelJS === 'undefined') {
    UI.toast('Excel 模板组件未加载，将生成无下拉选项的兼容模板', 'warning');
    const rows = [[`${cls.name} · ${term.name}`, ...term.weekdays], ...term.slots.filter(slot => slot.enabled !== false).map(slot => [`${slot.label} ${ScheduleCore.timeText(slot)}`, ...term.weekdays.map(() => '')])];
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), '班级课表'); return workbookDownload(book, `${safeFileName(cls.name)}_班级课表模板.xlsx`);
  }
  const book = new ExcelJS.Workbook(); book.creator = 'FlashBench'; book.created = new Date();
  const sheet = book.addWorksheet('班级课表', { views:[{state:'frozen',xSplit:1,ySplit:1}] });
  const options = book.addWorksheet('科目选项', { state:'veryHidden' });
  options.addRow(['可选科目']); term.subjects.forEach(subject => options.addRow([subject.name]));
  sheet.addRow([`${cls.name} · ${term.name}`, ...term.weekdays]);
  term.slots.filter(slot => slot.enabled !== false).forEach(slot => sheet.addRow([`${slot.label} ${ScheduleCore.timeText(slot)}`, ...term.weekdays.map(() => '')]));
  sheet.getColumn(1).width = 24; term.weekdays.forEach((_, index) => { sheet.getColumn(index + 2).width = 18; });
  sheet.getRow(1).font = { bold:true, color:{argb:'FFFFFFFF'} }; sheet.getRow(1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF047857'} }; sheet.getRow(1).alignment = { horizontal:'center', vertical:'middle' };
  for (let row = 2; row <= sheet.rowCount; row++) for (let col = 2; col <= term.weekdays.length + 1; col++) {
    const cell = sheet.getCell(row, col); cell.alignment = { horizontal:'center', vertical:'middle' };
    if (term.subjects.length) cell.dataValidation = { type:'list', allowBlank:true, showErrorMessage:true, errorTitle:'无效科目', error:'请从下拉列表选择科目', formulae:[`'科目选项'!$A$2:$A$${term.subjects.length + 1}`] };
  }
  const buffer = await book.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `${safeFileName(cls.name)}_班级课表模板.xlsx`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); UI.toast('带科目下拉选项的模板已生成');
};

function renderAdjustmentLog(term) {
  const adjustments = term.adjustments || [];
  if (!adjustments.length) return `<section class="card adjustment-log-card"><div class="card-title">调课日志</div>${UI.empty(ICON.schedule, '暂无调课记录；点击课表中的课程即可调课')}</section>`;
  const actionNames = {swap:'互换',move:'移课',cancel:'停课',extra:'补课'};
  return `<section class="card adjustment-log-card"><div class="card-title">调课日志 <span>${adjustments.filter(item => !item.cancelledAt).length} 条生效中</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>状态</th><th>类型</th><th>生效时间</th><th>原课程</th><th>目标安排</th><th>原因</th></tr></thead><tbody>${adjustments.map(item => `<tr class="adjustment-log-row ${item.cancelledAt ? 'is-cancelled' : ''}" onclick="viewAdjustmentLog('${item.id}')"><td>${item.cancelledAt ? '<span class="status-pill muted">已取消</span>' : '<span class="status-pill success">生效中</span>'}</td><td>${actionNames[item.action] || ''}</td><td>${item.scope === 'temporary' ? esc(item.sourceDate || item.targetDate) : `自 ${esc(item.effectiveDate)} 起`}</td><td>${item.action === 'extra' ? '—' : `${esc(scheduleClassName(term,item.sourceClassId))}<br>${esc(item.sourceDay)} · ${esc(scheduleSlotLabel(term,item.sourceSlotId))}`}</td><td>${item.action === 'cancel' ? '停课' : `${esc(scheduleClassName(term,item.targetClassId))}<br>${esc(item.targetDay)} · ${esc(scheduleSlotLabel(term,item.targetSlotId))}`}</td><td>${esc(item.reason || '')}</td></tr>`).join('')}</tbody></table></div></section>`;
}

window.renderMySchedule = function (term) {
  const html = ScheduleEnhancements.originalMineRenderer(term);
  return `${html}${renderAdjustmentLog(term)}`;
};

function scheduleTeacherDetail(term, teacherId) {
  const teacher = (term.teachers || []).find(item => item.id === teacherId);
  return teacher ? teacher.name + (teacher.contact ? ' · ' + teacher.contact : '') : '未配置教师';
}

function openCourseAdjustment(itemId) {
  const item = (ScheduleUI.currentMineItems || []).find(row => row.id === itemId);
  if (!item) return UI.toast('未找到该课程，请刷新后重试', 'warning');
  if (item.adjustmentId) return viewAdjustmentLog(item.adjustmentId);
  const term = scheduleTerm();
  const slots = term.slots.filter(slot => slot.enabled !== false), currentIndex = slots.findIndex(slot => slot.id === item.slotId), nextSlot = slots[currentIndex + 1] || slots[currentIndex] || {};
  const preset = { action:'move', scope:'temporary', sourceDate:item.date, targetDate:item.date, sourceDay:item.day, targetDay:item.day, sourceClassId:item.classId, targetClassId:item.classId, sourceSlotId:item.slotId, targetSlotId:nextSlot.id, subjectId:item.subjectId, teacherId:item.teacherId };
  UI.modal(`调课 · ${scheduleSubjectName(term,item.subjectId)} · ${scheduleClassName(term,item.classId)}`, `${adjustmentSelects(term,preset)}<div class="schedule-notice muted">${ICON.info}<div><strong>当前课程</strong><span>${item.date} ${item.day} · ${scheduleSlotLabel(term,item.slotId)} · ${esc(scheduleTeacherDetail(term,item.teacherId))}</span></div></div>`, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveScheduleAdjustment('')">保存调课</button>`);
}

function viewAdjustmentLog(id) {
  const term = scheduleTerm(), item = (term.adjustments || []).find(row => row.id === id);
  if (!item) return;
  const actionNames = {swap:'互换',move:'移课',cancel:'停课',extra:'补课'};
  UI.modal('调课日志详情', `<dl class="schedule-meta"><div><dt>状态</dt><dd>${item.cancelledAt ? '已取消' : '生效中'}</dd></div><div><dt>类型</dt><dd>${actionNames[item.action] || ''}</dd></div><div><dt>范围</dt><dd>${item.scope === 'temporary' ? '临时调课' : '长期调课'}</dd></div></dl><div class="adjustment-detail"><p><strong>原课程：</strong>${item.action === 'extra' ? '无' : `${esc(scheduleClassName(term,item.sourceClassId))} · ${esc(item.sourceDay)} · ${esc(scheduleSlotLabel(term,item.sourceSlotId))}`}</p><p><strong>目标安排：</strong>${item.action === 'cancel' ? '停课' : `${esc(scheduleClassName(term,item.targetClassId))} · ${esc(item.targetDay)} · ${esc(scheduleSlotLabel(term,item.targetSlotId))}`}</p><p><strong>教师：</strong>${esc(scheduleTeacherDetail(term,item.teacherId))}</p><p><strong>原因：</strong>${esc(item.reason || '未填写')}</p>${item.cancelledAt ? `<p><strong>取消时间：</strong>${esc(item.cancelledAt.replace('T',' ').slice(0,16))}</p>` : ''}</div>`, item.cancelledAt ? '<button class="btn btn-primary" onclick="UI.closeModal()">关闭</button>' : `<button class="btn btn-ghost" onclick="UI.closeModal()">关闭</button><button class="btn btn-danger" onclick="cancelAdjustmentLog('${item.id}')">取消调课</button>`);
}

function cancelAdjustmentLog(id) {
  UI.confirm('确定取消这次调课？课表会立即恢复，但日志仍会保留。', () => {
    const term = scheduleTerm(), item = (term.adjustments || []).find(row => row.id === id);
    if (!item) return; item.cancelledAt = new Date().toISOString(); scheduleSave('调课已取消，原课表已恢复'); UI.closeModal(); M.schedule();
  });
}

M.schedule = function () {
  const ws = ScheduleCore.ensure(Store.data), term = scheduleTerm(), tab = M._tabs.schedule || 'mine';
  const renderer = { mine:renderMySchedule, class:renderClassSchedule, master:renderMasterSchedule, settings:renderScheduleSettings }[tab] || renderMySchedule;
  const needsSetup = !term.selfTeacherId || !term.classes.length || !term.slots.length;
  document.getElementById('content').innerHTML = `<div class="module-header schedule-module-header"><div><div class="module-title">${ICON.schedule} 课表</div><div class="module-subtitle">按学期管理班级课表、个人安排与调课记录</div></div><div class="schedule-term-picker"><label>当前学期</label><select class="form-select" onchange="setScheduleSemester(this.value)">${ws.semesters.map(item => `<option value="${item.id}" ${item.id === term.id ? 'selected' : ''}>${esc(item.name)}${item.archived ? '（已归档）' : ''}</option>`).join('')}</select></div></div>
    ${needsSetup && tab !== 'settings' ? `<div class="schedule-notice">${ICON.info}<div><strong>请先完成课表配置</strong><span>设置本人教师、时间段和任课班级后，“我的课表”才能准确汇总。</span></div><button class="btn btn-primary btn-sm" onclick="setScheduleTab('settings')">前往设置</button></div>` : ''}
    ${tabBar([{group:'schedule',id:'mine',label:'我的课表'},{group:'schedule',id:'class',label:'班级课表'},{group:'schedule',id:'master',label:'课程总表'},{group:'schedule',id:'settings',label:'课表管理'}],tab)}<div class="schedule-panel">${renderer(term)}</div>`;
};
