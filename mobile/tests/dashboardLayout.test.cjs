const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', 'require', 'module', ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../lib/dashboardLayout.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText)(mod.exports, require, mod);
const { parseDashboardLayout, defaultDashboardLayout, moveWidget, moveWidgetTo, dashboardColumns, widgetDropTarget, dashboardStorageKey } = mod.exports;
const widget = (id, size = 'small') => ({ id, kind: 'streak', size });

test('a saved empty layout stays empty, while corrupt or unsupported storage recovers', () => {
  assert.deepEqual(parseDashboardLayout('{"version":1,"mode":"list","widgets":[]}'), { version: 1, mode: 'list', widgets: [] });
  for (const raw of [null, 'bad json', '{}', '{"version":2,"widgets":[]}']) assert.deepEqual(parseDashboardLayout(raw), defaultDashboardLayout());
});
test('roundtrips many widget instances without an arbitrary count limit', () => {
  const value = { version: 1, mode: 'adaptive', widgets: Array.from({ length: 100 }, (_, i) => widget(String(i), i % 2 ? 'wide' : 'small')) };
  assert.deepEqual(parseDashboardLayout(JSON.stringify(value)), value);
});
test('filters malformed and duplicate IDs while retaining multiple instances of a feature', () => {
  const result = parseDashboardLayout(JSON.stringify({ version: 1, widgets: [widget('a'), widget('a'), widget('b', 'wide'), null, { id: 'c', kind: 'retired', size: 'wide' }, { id: 'd', kind: 'week', size: 'gigantic' }] }));
  assert.deepEqual(result.widgets, [widget('a'), widget('b', 'wide')]);
});
test('moving a widget preserves its size and instance identity without modifying saved layout', () => {
  const original = [widget('a'), widget('b', 'wide'), widget('c')];
  assert.deepEqual(moveWidgetTo(original, 'a', 'c').map((w) => w.id), ['b', 'c', 'a']);
  assert.deepEqual(moveWidgetTo(original, 'c', 'a').map((w) => w.id), ['c', 'a', 'b']);
  assert.equal(moveWidget(original, 'b', -1)[0].size, 'wide');
  assert.deepEqual(original.map((w) => w.id), ['a', 'b', 'c']);
  assert.equal(moveWidget(original, 'a', -1), original);
  assert.equal(moveWidgetTo(original, 'a', 'removed'), original);
});
test('drag hit testing excludes the active card, stale removed cards, and row gaps', () => {
  const widgets = [widget('a'), widget('b', 'wide')];
  const rects = new Map([
    ['removed', { x: 0, y: 0, width: 400, height: 800 }],
    ['a', { x: 0, y: 0, width: 180, height: 180 }],
    ['b', { x: 0, y: 192, width: 372, height: 220 }],
  ]);
  assert.equal(widgetDropTarget(widgets, rects, 'a', 100, 100), null);
  assert.equal(widgetDropTarget(widgets, rects, 'a', 100, 185), null);
  // Brushing any edge must not shuffle the surrounding cards.
  for (const [x, y] of [[10, 250], [362, 250], [100, 202], [100, 402]]) {
    assert.equal(widgetDropTarget(widgets, rects, 'a', x, y), null);
  }
  assert.equal(widgetDropTarget(widgets, rects, 'a', 300, 250), 'b');
});
test('layout adapts to phones, tablets, large text and explicit single-column preference', () => {
  assert.equal(dashboardColumns(300, 1, 'adaptive'), 1);
  assert.equal(dashboardColumns(370, 1, 'adaptive'), 2);
  assert.equal(dashboardColumns(600, 1, 'adaptive'), 3);
  assert.equal(dashboardColumns(850, 1, 'adaptive'), 4);
  assert.equal(dashboardColumns(850, 1.8, 'adaptive'), 1);
  assert.equal(dashboardColumns(850, 1, 'list'), 1);
});
test('different signed-in accounts use separate layout preferences', () => {
  assert.notEqual(dashboardStorageKey('alice'), dashboardStorageKey('bob'));
});
