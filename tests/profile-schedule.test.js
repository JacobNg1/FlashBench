const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Core = require('../public/schedule-core.js');

function loadProfileSchedule() {
  const user = { id:'AbC_123-xYz9', username:'teacher01', nickname:'周老师', created_at:'2026-08-12 08:00:00' };
  const context = {
    ScheduleCore:Core, ScheduleUI:{}, M:{_tabs:{}},
    Store:{data:{},save(){ this.saved = (this.saved || 0) + 1; }},
    Auth:{getUser(){ return user; }},
    UI:{toast(){},empty(){return ''},modal(){},confirm(){}},
    ICON:{schedule:'',info:'',upload:'',plus:'',download:'',grid:'',users:'',user:''},
    App:{}, XLSX:{utils:{}}, ExcelJS:undefined, document:{}, Blob, URL, console,
    esc:value=>String(value||''), tabBar:()=>'', todayStr:()=> '2026-08-12',
    setTimeout, clearTimeout
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../public/schedule-ui.js'),'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../public/schedule-enhancements.js'),'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../public/profile-schedule.js'),'utf8'), context);
  return context;
}

test('时间轴横向渲染并提供左右拖动手柄', () => {
  const ui = loadProfileSchedule();
  const term = Core.newSemester('测试');
  term.slots = [{id:'p1',label:'第一节',start:'08:00',end:'08:40',enabled:true}];
  const html = ui.renderScheduleTimeline(term);
  assert.match(html, /style="width:\d+px"/);
  assert.match(html, /style="left:\d+px;width:\d+px"/);
  assert.match(html, /slot-resize-handle left/);
  assert.match(html, /slot-resize-handle right/);
  assert.doesNotMatch(html, /slot-resize-handle top/);
});

test('昵称固定同步为所有学期的本人教师', () => {
  const ui = loadProfileSchedule();
  const first = Core.newSemester('第一学期');
  first.teachers = [{id:'old-self',name:'旧昵称'},{id:'other',name:'其他教师'}];
  first.selfTeacherId = 'old-self';
  const second = Core.newSemester('第二学期');
  second.teachers = [];
  second.selfTeacherId = '';
  ui.Store.data.scheduleWorkspace = {semesters:[first,second]};
  ui.syncProfileTeacherAcrossTerms(ui.Auth.getUser());
  assert.equal(first.teachers.find(item=>item.id==='old-self').name, '周老师');
  assert.equal(first.teachers.find(item=>item.id==='old-self').isSelf, true);
  assert.equal(second.teachers.length, 1);
  assert.equal(second.teachers[0].name, '周老师');
  assert.equal(second.selfTeacherId, second.teachers[0].id);
});
