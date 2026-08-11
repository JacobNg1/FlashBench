/* ============================================================
 * 课表核心：数据迁移、日期计算、调课覆盖与冲突检测
 * 不依赖 DOM，页面与仪表盘共享同一套结果。
 * ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ScheduleCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const DEFAULT_SUBJECTS = ['语文', '数学', '英语', '科学', '道德与法治', '体育', '音乐', '美术', '信息科技', '劳动', '综合实践', '班会'];
  const DEFAULT_SLOTS = [
    ['第一节', '08:20', '09:00'], ['第二节', '09:15', '09:55'],
    ['第三节', '10:25', '11:05'], ['第四节', '11:20', '12:00'],
    ['第五节', '14:15', '14:55'], ['第六节', '15:10', '15:50']
  ];

  const uid = (prefix) => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = n => String(n).padStart(2, '0');
  const localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = value => {
    const parts = String(value || '').split('-').map(Number);
    return parts.length === 3 && parts.every(Number.isFinite) ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
  };
  const mondayOf = value => {
    const d = value ? parseDate(value) : new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return localDate(d);
  };
  const addDays = (value, count) => {
    const d = parseDate(value);
    d.setDate(d.getDate() + count);
    return localDate(d);
  };
  const normalizeName = value => String(value || '').replace(/年级|班|[（）()\s]/g, '').toLowerCase();
  const normalizeDay = value => {
    const v = String(value || '').trim().replace('星期', '周');
    const aliases = { '周1':'周一','周2':'周二','周3':'周三','周4':'周四','周5':'周五','周6':'周六','周7':'周日','周天':'周日' };
    return aliases[v] || v;
  };
  const timeText = slot => slot.start && slot.end ? `${slot.start}-${slot.end}` : (slot.start || slot.label);

  function newSemester(name) {
    const year = new Date().getFullYear();
    return {
      id: uid('term'), name: name || `${year}-${year + 1}学年 第一学期`,
      startDate: `${year}-09-01`, endDate: `${year + 1}-01-31`, archived: false,
      weekdays: DAY_LABELS.slice(0, 5),
      slots: DEFAULT_SLOTS.map((s, i) => ({ id: `slot_${i + 1}`, label: s[0], start: s[1], end: s[2], enabled: true })),
      subjects: DEFAULT_SUBJECTS.map((name, i) => ({ id: `subject_${i + 1}`, name })),
      teachers: [], selfTeacherId: '', classes: [], classSchedules: {},
      masterSchedule: { classes: [], cells: {} }, adjustments: [], legacyAdjustments: []
    };
  }

  function ensure(data) {
    if (!data.scheduleWorkspace) {
      const term = newSemester();
      data.scheduleWorkspace = { version: 1, activeSemesterId: term.id, semesters: [term] };
      migrateLegacy(data, term);
    }
    const ws = data.scheduleWorkspace;
    if (!Array.isArray(ws.semesters) || !ws.semesters.length) {
      const term = newSemester();
      ws.semesters = [term];
      ws.activeSemesterId = term.id;
    }
    ws.semesters.forEach(term => {
      term.weekdays ||= DAY_LABELS.slice(0, 5);
      term.slots ||= [];
      term.subjects ||= [];
      term.teachers ||= [];
      term.classes ||= [];
      term.classSchedules ||= {};
      term.masterSchedule ||= { classes: [], cells: {} };
      term.masterSchedule.classes ||= [];
      term.masterSchedule.cells ||= {};
      term.adjustments ||= [];
      term.legacyAdjustments ||= [];
    });
    if (!ws.semesters.some(x => x.id === ws.activeSemesterId)) ws.activeSemesterId = ws.semesters[0].id;
    return ws;
  }

  function migrateLegacy(data, term) {
    const subjectByName = new Map(term.subjects.map(x => [x.name, x]));
    const teacherByName = new Map();
    const classByName = new Map();
    const slotFor = entry => {
      const time = String(entry.time || '');
      const period = String(entry.period || '');
      let slot = term.slots.find(x => timeText(x) === time || x.label === period);
      if (!slot) {
        const parts = time.split('-');
        slot = { id: uid('slot'), label: period || time || `时段${term.slots.length + 1}`, start: parts[0] || '', end: parts[1] || '', enabled: true };
        term.slots.push(slot);
      }
      return slot;
    };
    const getSubject = name => {
      name = String(name || '').trim();
      if (!name) return null;
      if (!subjectByName.has(name)) {
        const subject = { id: uid('subject'), name };
        term.subjects.push(subject); subjectByName.set(name, subject);
      }
      return subjectByName.get(name);
    };
    const getTeacher = name => {
      name = String(name || '').trim();
      if (!name) return null;
      if (!teacherByName.has(name)) {
        const teacher = { id: uid('teacher'), name, isSelf: false };
        term.teachers.push(teacher); teacherByName.set(name, teacher);
      }
      return teacherByName.get(name);
    };
    const getClass = (name, linkedClassId) => {
      name = String(name || '').trim() || '未命名班级';
      const key = normalizeName(name);
      if (!classByName.has(key)) {
        const cls = { id: uid('class'), name, linkedClassId: linkedClassId || '', subjectTeachers: {} };
        term.classes.push(cls); classByName.set(key, cls); term.classSchedules[cls.id] = {};
      } else if (linkedClassId && !classByName.get(key).linkedClassId) classByName.get(key).linkedClassId = linkedClassId;
      return classByName.get(key);
    };
    Object.entries(data.schedule || {}).forEach(([legacyClassId, entries]) => {
      const linked = (data.classes || []).find(x => x.id === legacyClassId);
      (Array.isArray(entries) ? entries : []).forEach(entry => {
        const cls = getClass(entry.class || (linked && linked.name), linked && linked.id);
        const subject = getSubject(entry.subject);
        const teacher = getTeacher(entry.teacher);
        const day = normalizeDay(entry.day);
        const slot = slotFor(entry);
        if (!subject || !DAY_LABELS.includes(day)) return;
        term.classSchedules[cls.id][day] ||= {};
        term.classSchedules[cls.id][day][slot.id] = { subjectId: subject.id, note: entry.note || '', type: entry.type || 'lesson' };
        if (teacher) cls.subjectTeachers[subject.id] = teacher.id;
      });
    });
    const oldMaster = data.masterSchedule || ((data.schemaVersion || 0) < 6 && typeof window !== 'undefined' ? window.MASTER_SCHEDULE : null);
    if (oldMaster && oldMaster.schedule) {
      Object.keys(oldMaster.schedule).forEach(name => {
        const cls = { id: uid('masterClass'), name };
        term.masterSchedule.classes.push(cls); term.masterSchedule.cells[cls.id] = {};
        Object.entries(oldMaster.schedule[name] || {}).forEach(([rawDay, cells]) => {
          const day = normalizeDay(rawDay); term.masterSchedule.cells[cls.id][day] = {};
          Object.entries(cells || {}).forEach(([periodId, raw]) => {
            if (!raw) return;
            let slot = term.slots.find(x => x.id === periodId || x.label === periodId);
            if (!slot && oldMaster.periods) {
              const p = oldMaster.periods.find(x => x.id === periodId);
              if (p) slot = term.slots.find(x => x.label === p.label || timeText(x) === p.time);
            }
            if (!slot) return;
            const parsed = parseCourseText(raw);
            term.masterSchedule.cells[cls.id][day][slot.id] = parsed;
          });
        });
      });
    }
    (data.classSwaps || []).forEach(x => term.legacyAdjustments.push({ ...x, legacy: true }));
  }

  function parseCourseText(raw) {
    const text = String(raw || '').trim();
    const m = text.match(/^(.+?)[（(]\s*([^）)]+)\s*[）)]\s*$/);
    return m ? { subject: m[1].trim(), teacher: m[2].trim(), raw: text } : { subject: text, teacher: '', raw: text };
  }

  function activeSemester(data) {
    const ws = ensure(data);
    return ws.semesters.find(x => x.id === ws.activeSemesterId) || ws.semesters[0];
  }
  const subject = (term, id) => term.subjects.find(x => x.id === id);
  const teacher = (term, id) => term.teachers.find(x => x.id === id);
  const classItem = (term, id) => term.classes.find(x => x.id === id);
  const slotItem = (term, id) => term.slots.find(x => x.id === id);

  function dateForDay(weekStart, label) {
    const i = DAY_LABELS.indexOf(label);
    return i < 0 ? weekStart : addDays(weekStart, i);
  }

  function baseOccurrences(term, weekStart) {
    const items = [];
    term.classes.forEach(cls => {
      term.weekdays.forEach(day => {
        const date = dateForDay(weekStart, day);
        Object.entries((term.classSchedules[cls.id] || {})[day] || {}).forEach(([slotId, cell]) => {
          const teacherId = cls.subjectTeachers[cell.subjectId] || '';
          items.push({ id: `${cls.id}:${date}:${slotId}`, classId: cls.id, day, date, slotId, subjectId: cell.subjectId, teacherId, note: cell.note || '', source: 'base' });
        });
      });
    });
    return items;
  }

  function adjustmentApplies(a, weekStart, weekEnd) {
    if (a.scope === 'temporary') {
      const dates = [a.sourceDate, a.targetDate, a.effectiveDate].filter(Boolean);
      return dates.some(date => date >= weekStart && date <= weekEnd);
    }
    return !a.effectiveDate || weekEnd >= a.effectiveDate;
  }

  function getEffectiveSchedule(term, weekValue) {
    const weekStart = mondayOf(weekValue);
    const weekEnd = addDays(weekStart, 6);
    const items = baseOccurrences(term, weekStart);
    const findIndex = (classId, date, slotId) => items.findIndex(x => x.classId === classId && x.date === date && x.slotId === slotId);
    const resolveDate = (a, side) => {
      const direct = a[`${side}Date`];
      if (a.scope === 'temporary' && direct) return direct;
      const day = a[`${side}Day`];
      return dateForDay(weekStart, day);
    };
    (term.adjustments || []).filter(a => !a.cancelledAt && adjustmentApplies(a, weekStart, weekEnd)).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))).forEach(a => {
      const sourceDate = resolveDate(a, 'source');
      const targetDate = resolveDate(a, 'target');
      if ((a.scope === 'permanent') && a.effectiveDate) {
        if (sourceDate < a.effectiveDate && targetDate < a.effectiveDate) return;
      }
      const sourceIndex = findIndex(a.sourceClassId, sourceDate, a.sourceSlotId);
      const targetIndex = findIndex(a.targetClassId, targetDate, a.targetSlotId);
      if (a.action === 'cancel') {
        if (sourceIndex >= 0) items.splice(sourceIndex, 1);
        return;
      }
      if (a.action === 'extra') {
        items.push({ id: `adjust:${a.id}`, classId: a.targetClassId, day: a.targetDay, date: targetDate, slotId: a.targetSlotId, subjectId: a.subjectId, teacherId: a.teacherId || '', note: a.reason || '', source: 'extra', adjustmentId: a.id });
        return;
      }
      const source = sourceIndex >= 0 ? items[sourceIndex] : null;
      if (a.action === 'move') {
        if (sourceIndex >= 0) items.splice(sourceIndex, 1);
        if (targetDate >= weekStart && targetDate <= weekEnd && (source || a.subjectId)) {
          items.push({ ...(source || {}), id: `adjust:${a.id}`, classId: a.targetClassId, day: a.targetDay, date: targetDate, slotId: a.targetSlotId, subjectId: (source && source.subjectId) || a.subjectId, teacherId: (source && source.teacherId) || a.teacherId || '', source: 'moved', adjustmentId: a.id, note: a.reason || (source && source.note) || '' });
        }
        return;
      }
      if (!source) return;
      if (a.action === 'swap' && targetIndex >= 0) {
        const target = items[targetIndex];
        const sourcePos = { classId: source.classId, day: source.day, date: source.date, slotId: source.slotId };
        Object.assign(source, { classId: target.classId, day: target.day, date: target.date, slotId: target.slotId, source: 'swapped', adjustmentId: a.id });
        Object.assign(target, { ...sourcePos, source: 'swapped', adjustmentId: a.id });
      }
    });
    const order = new Map(term.slots.map((x, i) => [x.id, i]));
    items.sort((a, b) => a.date.localeCompare(b.date) || (order.get(a.slotId) ?? 999) - (order.get(b.slotId) ?? 999));
    return items;
  }

  function getMine(term, weekValue) {
    const mine = getEffectiveSchedule(term, weekValue).filter(x => x.teacherId && x.teacherId === term.selfTeacherId);
    const groups = new Map();
    mine.forEach(x => {
      const key = `${x.date}:${x.slotId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(x);
    });
    mine.forEach(x => { x.conflict = groups.get(`${x.date}:${x.slotId}`).length > 1; });
    return mine;
  }

  function legacyMineRows(term, weekValue) {
    return getMine(term, weekValue).map(x => {
      const sl = slotItem(term, x.slotId) || {};
      return { ...x, period: sl.label || '', time: timeText(sl), subject: (subject(term, x.subjectId) || {}).name || '', class: (classItem(term, x.classId) || {}).name || '', teacher: (teacher(term, x.teacherId) || {}).name || '', type: 'lesson' };
    });
  }

  return {
    DAY_LABELS, DEFAULT_SUBJECTS, DEFAULT_SLOTS, uid, localDate, parseDate, mondayOf, addDays,
    normalizeName, normalizeDay, timeText, newSemester, ensure, activeSemester, parseCourseText,
    subject, teacher, classItem, slotItem, dateForDay, getEffectiveSchedule, getMine, legacyMineRows
  };
});
