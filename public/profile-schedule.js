/* 账户资料与横向课表时间轴增强 */
(function () {
  const baseScheduleTerm = window.scheduleTerm;
  const baseSettingsRenderer = window.renderScheduleSettings;

  function profileName(user) {
    return (user && (user.nickname || user.username) || '教师').trim();
  }

  function profileInitial(user) {
    return Array.from(profileName(user))[0] || '师';
  }

  function syncSelfTeacher(term, shouldSave = true) {
    const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    if (!user || !term) return false;
    const name = profileName(user);
    let teacher = term.teachers.find(item => item.id === term.selfTeacherId)
      || term.teachers.find(item => item.isSelf);
    let changed = false;
    if (!teacher) {
      teacher = { id: ScheduleCore.uid('teacher'), name, isSelf: true };
      term.teachers.unshift(teacher);
      term.selfTeacherId = teacher.id;
      changed = true;
    }
    if (teacher.name !== name) { teacher.name = name; changed = true; }
    if (!teacher.isSelf) { teacher.isSelf = true; changed = true; }
    if (term.selfTeacherId !== teacher.id) { term.selfTeacherId = teacher.id; changed = true; }
    term.teachers.forEach(item => {
      if (item.id !== teacher.id && item.isSelf) { delete item.isSelf; changed = true; }
    });
    if (changed && shouldSave) Store.save();
    return changed;
  }

  window.syncProfileTeacherAcrossTerms = function (user) {
    const workspace = Store.data.scheduleWorkspace;
    if (!workspace || !user) return;
    let changed = false;
    workspace.semesters.forEach(term => { changed = syncSelfTeacher(term, false) || changed; });
    if (changed) Store.save();
  };

  window.scheduleTerm = function () {
    const term = baseScheduleTerm();
    syncSelfTeacher(term);
    return term;
  };

  window.setSelfScheduleTeacher = function () {
    UI.toast('本人教师已与当前账号绑定，不能手动更换', 'info');
  };

  window.addScheduleTeacher = function () {
    UI.modal('添加教师', '<div class="form-group"><label class="form-label">教师姓名</label><input class="form-input" id="teacher-name" placeholder="如：吴老师"></div>',
      '<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="saveScheduleTeacher()">添加</button>');
  };

  window.saveScheduleTeacher = function () {
    const term = scheduleTerm(), name = document.getElementById('teacher-name').value.trim();
    if (!name) return UI.toast('请输入教师姓名', 'warning');
    if (term.teachers.some(item => item.name === name)) return UI.toast('该教师已存在', 'warning');
    term.teachers.push({ id: ScheduleCore.uid('teacher'), name });
    scheduleSave('教师已添加'); UI.closeModal(); M.schedule();
  };

  window.renderScheduleSettings = function (term) {
    let html = baseSettingsRenderer(term).replace('教师与本人', '教师');
    html = html.replace(/<button class="btn btn-outline btn-sm" onclick="setSelfScheduleTeacher\('([^']+)'\)">设为本人<\/button>/g,
      (_, id) => id === term.selfTeacherId ? '<span class="text-sm text-muted">账号固定</span>' : '—');
    return html.replace('当某科教师设为“本人”时', '当科任教师选择带“本人”标识的固定教师时');
  };

  ScheduleEnhancements.pixelsPerStep = 8;

  function timelineWidth() {
    return (ScheduleEnhancements.timelineEnd - ScheduleEnhancements.timelineStart)
      / ScheduleEnhancements.stepMinutes * ScheduleEnhancements.pixelsPerStep;
  }

  window.scheduleTimelineLeft = function (value) {
    return (scheduleMinutes(value) - ScheduleEnhancements.timelineStart)
      / ScheduleEnhancements.stepMinutes * ScheduleEnhancements.pixelsPerStep;
  };

  window.renderScheduleTimeline = function (term) {
    const width = timelineWidth(), ticks = [];
    for (let minute = ScheduleEnhancements.timelineStart; minute <= ScheduleEnhancements.timelineEnd; minute += 30) {
      ticks.push('<div class="slot-timeline-tick ' + (minute % 60 ? 'half' : '') + '" style="left:' +
        scheduleTimelineLeft(scheduleTimeFromMinutes(minute)) + 'px"><span>' + scheduleTimeFromMinutes(minute) + '</span></div>');
    }
    const blocks = term.slots.filter(slot => slot.enabled !== false && slot.start && slot.end).map(slot => {
      const range = scheduleSlotRange(term, slot);
      const left = scheduleTimelineLeft(range.start);
      const blockWidth = Math.max(12, scheduleTimelineLeft(range.end) - left);
      const changed = !!ScheduleEnhancements.slotDrafts[slot.id];
      return '<div class="slot-timeline-block ' + (changed ? 'has-draft' : '') + '" data-slot-id="' + slot.id +
        '" style="left:' + left + 'px;width:' + blockWidth + 'px" onpointerdown="startScheduleTimelineDrag(event,\'' + slot.id + '\',\'move\')">' +
        '<button class="slot-resize-handle left" title="调整开始时间" onpointerdown="startScheduleTimelineDrag(event,\'' + slot.id + '\',\'start\')"></button>' +
        '<div class="slot-timeline-content"><strong>' + esc(slot.label) + '</strong><span>' + range.start + '–' + range.end + '</span></div>' +
        '<button class="slot-resize-handle right" title="调整结束时间" onpointerdown="startScheduleTimelineDrag(event,\'' + slot.id + '\',\'end\')"></button></div>';
    }).join('');
    const hasDrafts = Object.keys(ScheduleEnhancements.slotDrafts).length > 0;
    return '<section class="card schedule-settings-card wide slot-timeline-card"><div class="card-title"><div>时间轴 ' +
      '<span class="timeline-help">横向拖动；左右边缘按 5 分钟步幅调整，点击时段可精确编辑</span></div><div class="flex gap-2">' +
      (hasDrafts ? '<button class="btn btn-ghost btn-sm" onclick="discardScheduleTimelineChanges()">撤销</button><button class="btn btn-primary btn-sm" onclick="saveScheduleTimelineChanges()">保存时间轴</button>' : '') +
      '<button class="btn btn-outline btn-sm" onclick="editScheduleSlot()">' + ICON.plus + ' 添加时段</button></div></div>' +
      '<div class="slot-timeline-scroll"><div class="slot-timeline" style="width:' + width + 'px">' + ticks.join('') +
      '<div class="slot-timeline-track">' + blocks + '</div></div></div></section>';
  };

  window.startScheduleTimelineDrag = function (event, slotId, mode) {
    event.preventDefault(); event.stopPropagation();
    const term = scheduleTerm(), slot = scheduleEntity(term.slots, slotId);
    if (!slot || term.archived) return;
    const range = scheduleSlotRange(term, slot);
    const initialStart = scheduleMinutes(range.start), initialEnd = scheduleMinutes(range.end);
    const startX = event.clientX, pointerId = event.pointerId, target = event.currentTarget;
    let moved = false, nextStart = initialStart, nextEnd = initialEnd;
    if (target.setPointerCapture) target.setPointerCapture(pointerId);
    const onMove = moveEvent => {
      const steps = Math.round((moveEvent.clientX - startX) / ScheduleEnhancements.pixelsPerStep);
      const delta = steps * ScheduleEnhancements.stepMinutes;
      moved = moved || Math.abs(moveEvent.clientX - startX) >= 3;
      if (mode === 'move') {
        const duration = initialEnd - initialStart;
        nextStart = Math.max(ScheduleEnhancements.timelineStart, Math.min(ScheduleEnhancements.timelineEnd - duration, initialStart + delta));
        nextEnd = nextStart + duration;
      } else if (mode === 'start') {
        nextStart = Math.max(ScheduleEnhancements.timelineStart, Math.min(initialEnd - 5, initialStart + delta));
        nextEnd = initialEnd;
      } else {
        nextStart = initialStart;
        nextEnd = Math.max(initialStart + 5, Math.min(ScheduleEnhancements.timelineEnd, initialEnd + delta));
      }
      const block = document.querySelector('.slot-timeline-block[data-slot-id="' + slotId + '"]');
      if (block) {
        block.style.left = ((nextStart - ScheduleEnhancements.timelineStart) / 5 * ScheduleEnhancements.pixelsPerStep) + 'px';
        block.style.width = ((nextEnd - nextStart) / 5 * ScheduleEnhancements.pixelsPerStep) + 'px';
        const label = block.querySelector('.slot-timeline-content span');
        if (label) label.textContent = scheduleTimeFromMinutes(nextStart) + '–' + scheduleTimeFromMinutes(nextEnd);
      }
    };
    const onUp = () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
      if (!moved && mode === 'move') return editScheduleSlot(slotId);
      const start = scheduleTimeFromMinutes(nextStart), end = scheduleTimeFromMinutes(nextEnd);
      const conflict = scheduleSlotConflict(term, slotId, start, end);
      if (conflict) { UI.toast(conflict, 'warning'); return M.schedule(); }
      ScheduleEnhancements.slotDrafts[slotId] = { start, end }; M.schedule();
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  window.showProfile = function () {
    const user = Auth.getUser() || {};
    const created = user.created_at ? new Date(String(user.created_at).replace(' ', 'T') + (String(user.created_at).includes('Z') ? '' : 'Z')) : null;
    const createdText = created && !Number.isNaN(created.getTime()) ? created.toLocaleString('zh-CN', { hour12: false }) : (user.created_at || '—');
    UI.modal('个人中心',
      '<div class="profile-avatar" id="profile-avatar">' + profileInitial(user) + '</div>' +
      '<div class="form-group"><label class="form-label">昵称</label><input class="form-input" id="profile-nickname" maxlength="32" value="' + esc(profileName(user)) + '" oninput="document.getElementById(\'profile-avatar\').textContent=Array.from(this.value.trim())[0]||\'师\'"><div class="form-hint">昵称可随时修改，并作为课表中的本人教师名称。</div></div>' +
      '<div class="form-group"><label class="form-label">用户名（不可修改）</label><input class="form-input" value="' + esc(user.username || '') + '" disabled></div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">用户 ID（不可修改）</label><input class="form-input profile-fixed-value" value="' + esc(user.id || '') + '" disabled></div>' +
      '<div class="form-group"><label class="form-label">注册时间（不可修改）</label><input class="form-input" value="' + esc(createdText) + '" disabled></div></div>',
      '<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="profile-save" onclick="saveProfileNickname()">保存昵称</button>');
  };

  window.saveProfileNickname = async function () {
    const input = document.getElementById('profile-nickname');
    const nickname = input.value.trim(), button = document.getElementById('profile-save');
    if (!nickname) return UI.toast('昵称不能为空', 'warning');
    button.disabled = true; button.textContent = '保存中…';
    try {
      const user = await Auth.updateProfile(nickname);
      syncProfileTeacherAcrossTerms(user);
      UI.closeModal(); renderTopbar();
      if (App.currentModule === 'schedule') M.schedule();
      UI.toast('昵称已更新');
    } catch (error) {
      button.disabled = false; button.textContent = '保存昵称';
      UI.toast(error.message || '保存失败', 'error');
    }
  };
})();
