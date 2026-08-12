const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workspace = fs.readFileSync('public/workspace-management.js','utf8');
const styles = fs.readFileSync('public/workspace-management.css','utf8');
const controls = fs.readFileSync('public/ui/controls.js','utf8');
const i18n = fs.readFileSync('public/ui/i18n.js','utf8');

test('顶栏班级选择使用全宽矩阵并使用网页图标', () => {
  assert.match(workspace,/class-dropdown-panel/);
  assert.match(workspace,/class-option-grid/);
  assert.match(styles,/width:100%!important/);
  assert.match(workspace,/sidebar-logo"><img src="favicon\.svg"/);
});

test('班级教师配置复用课表数据并支持联系方式和班主任', () => {
  assert.match(workspace,/scheduleClass\.subjectTeachers\[subjectId\]/);
  assert.match(workspace,/homeroomTeacherId/);
  assert.match(workspace,/managed-teacher-contact/);
  assert.match(workspace,/importTeacherConfiguration/);
  assert.match(workspace,/教师配置模板\.csv/);
});

test('语言切换重建面板并提供移动滑块与扩展翻译', () => {
  assert.match(controls,/setTimeout\(\(\) => open\(\), 0\)/);
  assert.match(controls,/language-segmented/);
  assert.match(i18n,/Switch class/);
  assert.match(i18n,/Homeroom teacher/);
});
