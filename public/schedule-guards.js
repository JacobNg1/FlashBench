/* 历史学期默认只读；编辑学期信息本身仍可用于取消归档。 */
(function () {
  const guarded = [
    'saveClassScheduleCell', 'confirmClassScheduleImport', 'saveMasterClass', 'saveMasterCell',
    'confirmMasterImport', 'saveScheduleAdjustment', 'deleteScheduleAdjustment', 'saveScheduleTimelineChanges', 'cancelAdjustmentLog',
    'addScheduleSemester', 'toggleScheduleDay', 'moveScheduleSlot', 'saveScheduleSlot', 'saveScheduleTeacher',
    'setSelfScheduleTeacher', 'saveScheduleSubject', 'saveTeachingClass', 'saveSubjectTeacher'
  ];
  guarded.forEach(name => {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (...args) {
      if ((typeof isSemesterReadOnly === 'function' && isSemesterReadOnly(scheduleTerm())) || scheduleTerm().archived) {
        UI.toast('历史学期为只读状态；请在生涯管理中设置任教中的生涯。', 'warning');
        return;
      }
      return original.apply(this, args);
    };
  });
})();
