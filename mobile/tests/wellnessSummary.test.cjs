const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(rel) {
  const source = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(mod.exports, require, mod);
  return mod.exports;
}

const w = load('../lib/wellnessSummary.ts');
const TODAY = '2026-10-14';

function log(date, fields) {
  return { id: date, user_id: 'u', log_date: date, sleep_hours: null, sleep_quality: null, energy_level: null, appetite: null,
    exercised: false, exercise_minutes: null, symptoms: [], notes: null, created_at: '', updated_at: '', ...fields };
}

test('week stats average this week, compare with last week and count logged days', () => {
  const logs = [
    log('2026-10-14', { sleep_hours: 8, energy_level: 4 }),
    log('2026-10-12', { sleep_hours: 6, energy_level: 2 }),
    log('2026-10-05', { sleep_hours: 5, energy_level: 2 }),
  ];
  const [sleep, energy, logged] = w.buildWeekStats(logs, TODAY);
  assert.equal(sleep.value, '7h');
  assert.equal(sleep.delta, 2);
  assert.equal(sleep.series.length, 7);
  assert.equal(sleep.series[6], 8);
  assert.equal(sleep.series[5], null);
  assert.equal(energy.value, '3/5');
  assert.equal(logged.value, '2/7');
  assert.equal(logged.delta, 1);
});

test('empty week shows dashes and a nudge', () => {
  const [sleep] = w.buildWeekStats([], TODAY);
  assert.equal(sleep.value, '—');
  const insights = w.buildWellnessInsights([], null, TODAY);
  assert.deepEqual(insights.map((i) => i.id), ['nudge']);
});

test('as-needed limit beats everything, then exercise vs energy', () => {
  const logs = [
    log('2026-10-14', { exercised: true, energy_level: 5 }),
    log('2026-10-13', { exercised: true, energy_level: 4 }),
    log('2026-10-12', { energy_level: 2 }),
    log('2026-10-11', { energy_level: 2 }),
  ];
  const prn = { periodDays: 14, periodLabel: '', hasData: true, meds: [
    { medicationId: 'm', medicationName: 'Ibuprofen', daysAtMax: 2, totalDoses14d: 6, daysWithDoses: 4, overlappingSymptoms: [] },
  ] };
  const ids = w.buildWellnessInsights(logs, prn, TODAY).map((i) => i.id);
  assert.deepEqual(ids.slice(0, 2), ['prn-max-m', 'exercise-energy']);
});

test('recurring symptom and short nights are surfaced', () => {
  const logs = ['10', '11', '12', '13'].map((d) => log(`2026-10-${d}`, { sleep_hours: 5, symptoms: ['Headache'] }));
  const ids = w.buildWellnessInsights(logs, null, TODAY).map((i) => i.id);
  assert.ok(ids.includes('symptom'));
  assert.ok(ids.includes('short-sleep'));
});
