const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(mod.exports, (id) => id === './settings' ? { getTimezone: () => 'UTC' } : load(path.resolve(path.dirname(file), id + '.ts')), mod);
  return mod.exports;
}
const { getCalendarWindow, shiftCalendarAnchor } = load(path.join(__dirname, '../lib/tracking/calendarRange.ts'));

test('multi-month views include the anchor month followed by upcoming months', () => {
  for (const [range, count, end] of [['3month', 3, '2026-12-31'], ['6month', 6, '2027-03-31'], ['12month', 12, '2027-09-30']]) {
    const window = getCalendarWindow('2026-10-15', range);
    assert.equal(window.start, '2026-10-01');
    assert.equal(window.end, end);
    assert.equal(window.months.length, count);
    assert.equal(window.dates[0], window.start);
    assert.equal(window.dates.at(-1), window.end);
    assert.equal(new Set(window.dates).size, window.dates.length);
  }
});
test('previous and next arrows page through adjacent blocks, including past months', () => {
  for (const range of ['3month', '6month', '12month']) {
    const current = getCalendarWindow('2026-10-31', range);
    const previous = getCalendarWindow(shiftCalendarAnchor(current.anchor, range, -1), range);
    const next = getCalendarWindow(shiftCalendarAnchor(current.anchor, range, 1), range);
    assert.equal(previous.end, '2026-09-30');
    assert.equal(shiftCalendarAnchor(previous.anchor, range, 1), current.start);
    const nextDay = new Date(`${current.end}T12:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    assert.equal(next.start, nextDay.toISOString().slice(0, 10));
  }
});
test('upcoming windows preserve leap days across year boundaries', () => {
  const window = getCalendarWindow('2027-12-31', '3month');
  assert.equal(window.end, '2028-02-29');
  assert.equal(window.dates.length, 91);
  assert.equal(getCalendarWindow('2028-02-15', 'month').end, '2028-02-29');
});
