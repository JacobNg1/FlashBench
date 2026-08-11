const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Core = require('../public/schedule-core.js');

function loadUI() {
  const context = {
    ScheduleCore:Core, M:{_tabs:{}}, Store:{data:{}}, UI:{}, ICON:{schedule:'',info:'',upload:'',plus:'',download:'',grid:'',users:'',user:''},
    App:{}, XLSX:{utils:{sheet_to_json:sheet => sheet.rows}}, document:{}, window:{}, console,
    esc:value=>String(value||''), tabBar:()=>'', todayStr:()=> '2026-08-12', setTimeout, clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../public/schedule-ui.js'),'utf8'), context);
  return context;
}

function term() {
  const t=Core.newSemester('测试');
  t.weekdays=['周一','周二'];
  t.slots=[{id:'p1',label:'第一节',start:'08:00',end:'08:40',enabled:true},{id:'p2',label:'第二节',start:'08:50',end:'09:30',enabled:true}];
  return t;
}

test('识别单班节次×星期矩阵', () => {
  const ui=loadUI();
  const sheet={rows:[['五（1）班 · 测试','周一','周二'],['第一节 08:00-08:40','英语','数学'],['第二节 08:50-09:30','','英语']]};
  const cells=ui.parseClassMatrix(sheet,term());
  assert.equal(JSON.stringify(cells.map(x=>[x.day,x.slotId,x.raw])),JSON.stringify([['周一','p1','英语'],['周二','p1','数学'],['周二','p2','英语']]));
});

test('识别带合并星期表头的全校大矩阵', () => {
  const ui=loadUI(); const t=term();
  const sheet={rows:[['节次','时间','周一','','周二',''],['','','A班','B班','A班','B班'],['第一节','08:00-08:40','英语（吴老师）','数学','语文','英语（吴老师）']], '!merges':[
    {s:{r:0,c:2},e:{r:0,c:3}},{s:{r:0,c:4},e:{r:0,c:5}}
  ]};
  const parsed=ui.parseMasterWorkbook({SheetNames:['总表'],Sheets:{总表:sheet}},t);
  assert.equal(parsed.classes.size,2);
  assert.equal(parsed.count,4);
  assert.deepEqual(parsed.classes.get('A班').周一.p1,{subject:'英语',teacher:'吴老师',raw:'英语（吴老师）'});
});

test('无法找到星期表头时拒绝班级导入', () => {
  const ui=loadUI();
  assert.throws(()=>ui.parseClassMatrix({rows:[['课程'],['英语']]},term()),/星期表头/);
});
