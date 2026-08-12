const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../public/schedule-core.js');

function fixture() {
  const term = Core.newSemester('测试学期');
  term.weekdays = ['周一', '周二', '周三', '周四', '周五'];
  term.slots = [
    { id:'p1', label:'第一节', start:'08:00', end:'08:40', enabled:true },
    { id:'p2', label:'第二节', start:'08:50', end:'09:30', enabled:true }
  ];
  term.subjects = [{id:'english',name:'英语'},{id:'math',name:'数学'}];
  term.teachers = [{id:'me',name:'吴老师'},{id:'other',name:'李老师'}];
  term.selfTeacherId = 'me';
  term.classes = [
    {id:'a',name:'A班',linkedClassId:'',subjectTeachers:{english:'me',math:'other'}},
    {id:'b',name:'B班',linkedClassId:'',subjectTeachers:{english:'me',math:'other'}}
  ];
  term.classSchedules = {
    a: { 周一:{p1:{subjectId:'english'}}, 周二:{p1:{subjectId:'math'},p2:{subjectId:'english'}} },
    b: { 周一:{p2:{subjectId:'english'}}, 周三:{p1:{subjectId:'english'}} }
  };
  term.adjustments = [];
  return term;
}

test('我的课表只汇总所有班级中属于本人的课程', () => {
  const term = fixture();
  const mine = Core.getMine(term, '2026-08-10');
  assert.equal(mine.length, 4);
  assert.deepEqual([...new Set(mine.map(x => x.classId))].sort(), ['a','b']);
  assert.ok(mine.every(x => x.subjectId === 'english'));
});

test('临时停课仅影响指定周', () => {
  const term = fixture();
  term.adjustments.push({id:'cancel1',action:'cancel',scope:'temporary',sourceDate:'2026-08-10',sourceDay:'周一',sourceClassId:'a',sourceSlotId:'p1'});
  assert.equal(Core.getMine(term, '2026-08-10').length, 3);
  assert.equal(Core.getMine(term, '2026-08-17').length, 4);
});

test('跨周移课在原周移除并在目标周补入', () => {
  const term = fixture();
  term.adjustments.push({id:'move1',action:'move',scope:'temporary',sourceDate:'2026-08-10',targetDate:'2026-08-18',sourceDay:'周一',targetDay:'周二',sourceClassId:'a',targetClassId:'a',sourceSlotId:'p1',targetSlotId:'p1',subjectId:'english',teacherId:'me'});
  assert.equal(Core.getMine(term, '2026-08-10').some(x => x.classId==='a' && x.date==='2026-08-10' && x.slotId==='p1'), false);
  assert.equal(Core.getMine(term, '2026-08-17').some(x => x.classId==='a' && x.date==='2026-08-18' && x.slotId==='p1' && x.source==='moved'), true);
});

test('长期停课从生效周开始且不改变历史周', () => {
  const term = fixture();
  term.adjustments.push({id:'long1',action:'cancel',scope:'permanent',effectiveDate:'2026-08-17',sourceDay:'周一',sourceClassId:'a',sourceSlotId:'p1'});
  assert.equal(Core.getMine(term, '2026-08-10').length, 4);
  assert.equal(Core.getMine(term, '2026-08-17').length, 3);
});

test('同一教师同一时段的多班课程会标记冲突', () => {
  const term = fixture();
  term.classSchedules.b.周一.p1 = {subjectId:'english'};
  const conflicted = Core.getMine(term, '2026-08-10').filter(x => x.date==='2026-08-10' && x.slotId==='p1');
  assert.equal(conflicted.length, 2);
  assert.ok(conflicted.every(x => x.conflict));
});

test('旧数据迁移保留班级课表、总表和旧调课备注', () => {
  const data = { classes:[{id:'legacy',name:'五（1）班'}], schedule:{legacy:[{day:'周一',time:'8:20-9:00',period:'第一节',subject:'英语',class:'五（1）班',teacher:'吴老师'}]}, classSwaps:[{id:'old',from:'周一第一节',to:'周二第二节'}] };
  const ws = Core.ensure(data); const term = ws.semesters[0];
  assert.equal(term.classes.length, 1);
  assert.equal(term.legacyAdjustments.length, 1);
  assert.equal(Object.keys(term.classSchedules[term.classes[0].id].周一).length, 1);
});

test('旧时间段自动归类并迁移全局学期选择',()=>{
  const term=Core.newSemester('配色测试');
  term.slots=[{id:'a',label:'午休',start:'12:00',end:'13:00',enabled:true},{id:'b',label:'第一节',start:'08:00',end:'08:40',enabled:true}];
  const data={scheduleWorkspace:{activeSemesterId:term.id,semesters:[term]}};
  const workspace=Core.ensure(data);
  assert.equal(workspace.selectedSemesterId,term.id);
  assert.equal(term.slots[0].type,'rest');
  assert.equal(term.slots[1].type,'class');
  assert.equal(Core.slotColor(term.slots[0]),Core.SLOT_COLORS.rest);
});
