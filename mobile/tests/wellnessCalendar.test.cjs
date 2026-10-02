const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(name) {
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib', name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(mod.exports, (id) => load(id.replace('./', '')), mod);
  return mod.exports;
}
const { buildWellnessCalendarData } = load('wellnessCalendar');
const { validateWellnessLog } = load('wellnessForm');
const base = { log_date: '2026-10-01', sleep_hours: null, sleep_quality: null, energy_level: null, appetite: null, exercised: false, exercise_minutes: null, symptoms: [], notes: '' };
test('calendar supports notes-only entries without putting private note text in event labels', () => {
  const data = buildWellnessCalendarData([{ ...base, notes: 'Private clinician note' }]);
  const cell = data.cells.get(base.log_date);
  assert.deepEqual(cell.events.map((event) => event.label), ['Notes saved']);
  assert.equal(cell.events[0].tone, 'wellness');
});
test('calendar keeps all recorded metrics, including zero hours and custom symptoms', () => {
  const data = buildWellnessCalendarData([{ ...base, sleep_hours: 0, sleep_quality: 1, energy_level: 2, appetite: 'same', exercised: true, exercise_minutes: 0, symptoms: ['Custom symptom'] }]);
  const events = data.cells.get(base.log_date).events;
  assert.equal(events.length, 6);
  assert.equal(events[0].label, '0h sleep');
  assert.equal(events.at(-1).label, 'Custom symptom');
});
test('daily validation accepts fractional sleep and rejects invalid ratings, dates and minutes', () => {
  assert.doesNotThrow(() => validateWellnessLog({ ...base, sleep_hours: 7.5, energy_level: 5 }, '2026-10-01'));
  for (const patch of [{ log_date: '2026-10-02' }, { log_date: '2026-02-30' }, { sleep_hours: 25 }, { sleep_hours: NaN }, { energy_level: 6 }, { sleep_quality: 2.5 }, { exercise_minutes: -1 }]) {
    assert.throws(() => validateWellnessLog({ ...base, ...patch }, '2026-10-01'));
  }
});
