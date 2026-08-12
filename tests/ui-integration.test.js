const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index=fs.readFileSync('public/index.html','utf8');
const header=fs.readFileSync('public/ui/workspace-header.js','utf8');
const workspace=fs.readFileSync('public/workspace-management.js','utf8');
const styles=fs.readFileSync('public/workspace-management.css','utf8');
const controls=fs.readFileSync('public/ui/controls.js','utf8');
const i18n=fs.readFileSync('public/ui/i18n.js','utf8');

test('班级矩阵使用结构化顶栏抽屉并推动顶栏',()=>{
  assert.match(index,/id="topbar-drawer"/);
  assert.match(header,/mode: 'closed'/);
  assert.match(header,/state\.mode === 'classes'/);
  assert.match(styles,/#topbar-drawer\.is-open \{ display:block/);
  assert.doesNotMatch(header,/class-dropdown-panel/);
});

test('班级管理占满右侧并使用内联教师编辑',()=>{
  assert.match(styles,/data-drawer-mode="manager"/);
  assert.match(styles,/#content \{ display:none/);
  assert.match(header,/inline-teacher-editor/);
  assert.match(header,/homeroomTeacherId/);
  assert.doesNotMatch(header,/UI\.modal/);
});

test('语言开关原地更新并使用独立受控滑块',()=>{
  assert.match(controls,/language-slider/);
  assert.match(controls,/I18n\.setLocale\(button\.dataset\.locale\);render\(panel\)/);
  assert.doesNotMatch(controls,/setTimeout\(\(\) => open/);
  assert.match(i18n,/formatNumber/);
  assert.match(i18n,/formatTime/);
});

test('移动端和课表标签只有局部横向滚动',()=>{
  assert.match(styles,/height:100dvh/);
  assert.match(styles,/\.tabs::\-webkit-scrollbar \{ display:none/);
  assert.match(styles,/\.slot-timeline-scroll \{ overflow-x:auto; overflow-y:hidden!important/);
  assert.match(styles,/@media \(max-width:360px\)/);
});

test('工作台继续使用网页图标并保留教师导入',()=>{
  assert.match(workspace,/sidebar-logo"><img src="favicon\.svg"/);
  assert.match(workspace,/importTeacherConfiguration/);
  assert.match(workspace,/教师配置模板\.csv/);
});
