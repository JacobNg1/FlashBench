const assert = require('node:assert/strict');
const values = new Map([
  ['power-workspace-theme', 'glass'],
  ['power-workspace-palette', 'aurora'],
  ['power-workspace-random-palette', '1'],
  ['power-workspace-mode', 'dark']
]);
global.localStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init.detail; } };
const html = { dataset: {}, style: { setProperty() {} } };
const meta = { content: '' };
global.document = { documentElement: html, querySelector: selector => selector === 'meta[name="theme-color"]' ? meta : null, dispatchEvent() {} };
let systemListener; let systemDark = false;
global.matchMedia = () => ({ get matches() { return systemDark; }, addEventListener: (_, listener) => { systemListener = listener; } });
const Appearance = require('../public/ui/appearance.js');
assert.deepEqual(Object.keys(Appearance.themes), ['glass', 'solid']);
assert.equal(Object.keys(Appearance.palettes).length, 9);
assert.equal(html.dataset.theme, 'glass');
assert.equal(html.dataset.mode, 'dark');
Appearance.setTheme('solid');
assert.equal(values.get('power-workspace-theme'), 'solid');
Appearance.setPalette('ocean');
assert.equal(Appearance.randomEnabled, false);
assert.equal(values.get('power-workspace-random-palette'), '0');
Appearance.setRandomEnabled(true, () => 0);
assert.equal(Appearance.randomEnabled, true);
assert.notEqual(Appearance.palette, 'ocean');
const openedWith = Appearance.palette;
Appearance.init(() => 0);
assert.notEqual(Appearance.palette, openedWith);
assert.equal(values.get('power-workspace-palette'), Appearance.palette);
Appearance.setMode('system');
assert.equal(html.dataset.mode, 'light');
systemDark = true; systemListener();
assert.equal(html.dataset.mode, 'dark');
