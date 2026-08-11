const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Core = require('../public/schedule-core.js');

function loadEnhancements() {
  const context = {
    ScheduleCore:Core, M:{_tabs:{}}, Store:{data:{},save(){}}, UI:{toast(){},empty(){return ''},modal(){},confirm(){}},
    ICON:{schedule:'',info:'',upload:'',plus:'',download:'',grid:'',users:'',user:''}, App:{}, XLSX:{utils:{}}, ExcelJS:undefined,
    document:{}, Blob, URL, console, esc:value=>String(value||''), tabBar:()=>'', todayStr:()=> '2026-08-12', setTimeout, clearTimeout
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../public/schedule-ui.js'),'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../public/schedule-enhancements.js'),'utf8'), context);
  return context;
}

function timelineTerm() {
  const term = Core.newSemester('测试');
  term.slots = [
    {id:'p1',label:'第一节',start:'08:20',end:'09:00',enabled:true},
    {id:'p2',label:'第二节',start:'09:15',end:'09:55',enabled:true}
  ];
  return term;
}

test('相邻时间段允许首尾相接，交叉时间会冲突', () => {
  const ui = loadEnhancements();
  assert.equal(ui.scheduleRangesOverlap(500,540,540,580), false);
  assert.equal(ui.scheduleRangesOverlap(500,545,540,580), true);
  assert.equal(ui.scheduleSlotConflict(timelineTerm(),'','09:00','09:15'), '');
  assert.match(ui.scheduleSlotConflict(timelineTerm(),'','08:55','09:20'), /时间冲突/);
});

test('常用时段只补充一次且不与默认课程冲突', () => {
  const ui = loadEnhancements(), term = timelineTerm();
  ui.ensureCommonScheduleSlots(term); ui.ensureCommonScheduleSlots(term);
  assert.equal(term.slots.filter(slot => slot.label === '早读').length, 1);
  assert.equal(term.slots.filter(slot => slot.label === '课间操').length, 1);
  assert.equal(term.slots.filter(slot => slot.label === '午休').length, 1);
  assert.ok(term.slots.filter(slot => slot.enabled !== false).every((slot,index,slots) => slots.every((other,otherIndex) => index===otherIndex || !ui.scheduleRangesOverlap(ui.scheduleMinutes(slot.start),ui.scheduleMinutes(slot.end),ui.scheduleMinutes(other.start),ui.scheduleMinutes(other.end)))));
});

test('时间转换始终吸附到五分钟刻度', () => {
  const ui = loadEnhancements();
  assert.equal(ui.scheduleTimeFromMinutes(8*60+3), '08:05');
  assert.equal(ui.scheduleTimeFromMinutes(8*60+7), '08:05');
  assert.equal(ui.scheduleTimeFromMinutes(8*60+8), '08:10');
});

test('已取消的调课日志不再改变有效课表', () => {
  const term = Core.newSemester('测试');
  term.weekdays=['周一']; term.slots=[{id:'p1',label:'第一节',start:'08:00',end:'08:40',enabled:true}];
  term.subjects=[{id:'english',name:'英语'}]; term.teachers=[{id:'me',name:'吴老师'}]; term.selfTeacherId='me';
  term.classes=[{id:'a',name:'A班',subjectTeachers:{english:'me'}}]; term.classSchedules={a:{周一:{p1:{subjectId:'english'}}}};
  term.adjustments=[{id:'cancel',action:'cancel',scope:'temporary',sourceDate:'2026-08-10',sourceDay:'周一',sourceClassId:'a',sourceSlotId:'p1',cancelledAt:'2026-08-12T09:00:00.000Z'}];
  assert.equal(Core.getMine(term,'2026-08-10').length,1);
});
