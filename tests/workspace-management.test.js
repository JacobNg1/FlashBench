const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Core = require('../public/schedule-core.js');

function load(data) {
  const context = {
    ScheduleCore:Core,
    Store:{data,save(){this.saveCount=(this.saveCount||0)+1;},getCurrentClass(){return this.data.classes.find(x=>x.id===this.data.currentClassId)||this.data.classes[0];}},
    Auth:{getUser(){return {username:'teacher01',nickname:'周老师'};},logout(){}},
    App:{currentModule:'dashboard',navigate(){}},
    UI:{toast(){},modal(){},confirm(){},empty(icon,text){return text;}},
    ICON:{info:'',users:'',plus:'',records:'',schedule:'',user:'',grid:'',logout:'',lesson:'',menu:'',chevronDown:'',check:''},
    NAV:[], M:{schedule(){}}, ScheduleUI:{}, window:null, document:{}, console,
    esc:value=>String(value||''), renderTopbar(){}, renderSidebar(){}, closeSidebar(){},
    showClassDropdown(){}, showUserDropdown(){}, getSchoolWeek(){return 1;},
    scheduleEntity:(items,id)=>items.find(x=>x.id===id),
    scheduleOption:(items,selected)=>items.map(x=>'<option '+(x.id===selected?'selected':'')+'>'+x.name+'</option>').join(''),
    renderScheduleTimeline:()=>'<section id="horizontal-timeline"></section>',
    addScheduleTeacher(){}, editScheduleSlot(){}, saveSubjectTeacher(){},
    scheduleSave(){}, setScheduleSemester(){}, editScheduleSemester(){},
    syncProfileTeacherAcrossTerms(){}
  };
  context.window=context;
  context.scheduleTerm=()=>Core.activeSemester(context.Store.data);
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../public/workspace-management.js'),'utf8'),context);
  return context;
}

test('旧课表班级自动汇入顶部唯一班级源',()=>{
  const term=Core.newSemester('测试');
  term.classes=[
    {id:'schedule-a',name:'五年级（1）班',linkedClassId:'top-a',subjectTeachers:{}},
    {id:'schedule-b',name:'三年级（2）班',linkedClassId:'',subjectTeachers:{}}
  ];
  term.classSchedules={'schedule-a':{},'schedule-b':{}};
  const data={classes:[{id:'top-a',name:'五年级（1）班'}],currentClassId:'top-a',scheduleWorkspace:{activeSemesterId:term.id,semesters:[term]}};
  const ui=load(data);
  ui.ensureWorkspaceManagementData(data);
  assert.deepEqual(data.classes.map(x=>x.name).sort(),['三年级（2）班','五年级（1）班'].sort());
  assert.equal(term.classes.length,2);
  assert.ok(term.classes.every(item=>data.classes.some(top=>top.id===(item.linkedClassId||item.id))));
});

test('新账号保持空班级并初始化学校科目和半年生涯',()=>{
  const term=Core.newSemester('2026年上半年');
  term.classes=[];
  const data={classes:[],currentClassId:null,scheduleWorkspace:{activeSemesterId:term.id,semesters:[term]}};
  const ui=load(data);
  ui.ensureWorkspaceManagementData(data);
  assert.equal(data.classes.length,0);
  assert.ok(data.schoolProfile.subjects.some(item=>item.name==='英语'));
  assert.equal(data.schoolProfile.careerRecords.length,1);
  assert.equal(data.schoolProfile.careerRecords[0].status,'任教中');
  term.archived=true;
  ui.ensureWorkspaceManagementData(data);
  assert.equal(data.schoolProfile.careerRecords[0].status,'已完结');
});

test('课表管理只保留时间、教师和科任映射',()=>{
  const term=Core.newSemester('测试');
  term.classes=[{id:'a',name:'一年级（1）班',linkedClassId:'a',subjectTeachers:{}}];
  term.classSchedules={a:{}};
  const data={classes:[{id:'a',name:'一年级（1）班'}],currentClassId:'a',scheduleWorkspace:{activeSemesterId:term.id,semesters:[term]}};
  const ui=load(data);
  ui.ensureWorkspaceManagementData(data);
  const html=ui.renderScheduleSettings(term);
  assert.match(html,/horizontal-timeline/);
  assert.match(html,/时间段/);
  assert.match(html,/各班科任教师/);
  assert.doesNotMatch(html,/学期信息/);
  assert.doesNotMatch(html,/添加任课班级/);
  assert.doesNotMatch(html,/class="card-title">科目/);
});
