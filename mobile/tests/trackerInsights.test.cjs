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

const insights = load('../lib/tracking/cycleInsights.ts');
const cycle = load('../lib/tracking/cycleExtras.ts');
const hrt = load('../lib/tracking/hrtExtras.ts');

const periods = [
  { started_on: '2026-09-28', ended_on: '2026-10-02', cycle_length_days: 28 },
  { started_on: '2026-08-31', ended_on: '2026-09-04', cycle_length_days: 30 },
  { started_on: '2026-08-01', ended_on: '2026-08-05', cycle_length_days: 27 },
  { started_on: '2026-07-05', ended_on: '2026-07-09', cycle_length_days: null },
];

test('cycle stats, regularity and oldest-to-newest bars', () => {
  const r = insights.buildCycleInsights(periods, [], {}, { today: '2026-10-14' });
  assert.deepEqual(r.cycleLengths, [27, 30, 28]);
  assert.equal(r.avgCycle, 28);
  assert.equal(r.variation, 3);
  assert.equal(r.regularity, 'regular');
  assert.equal(r.avgPeriodLength, 5);
  assert.deepEqual(r.flags, []);
});

test('gentle flags for long periods, heavy days, pain and missed periods', () => {
  const longPeriods = [{ started_on: '2026-06-01', ended_on: '2026-06-10', cycle_length_days: null }];
  const logs = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04'].map((d) => ({ log_date: d, flow_level: 'heavy' }));
  const pain = { '2026-06-01': { pain: 8 }, '2026-06-02': { pain: 7 }, '2026-06-03': { pain: 9 } };
  const ids = insights.buildCycleInsights(longPeriods, logs, pain, { today: '2026-10-14' }).flags.map((f) => f.id);
  assert.deepEqual(ids.sort(), ['heavy', 'long-period', 'missed', 'pain']);
  const quiet = insights.buildCycleInsights(longPeriods, [], {}, { today: '2026-10-14', expectsMissedPeriods: true });
  assert.ok(!quiet.flags.some((f) => f.id === 'missed'));
});

test('teen cycles up to 45 days are not flagged', () => {
  const teen = [
    { started_on: '2026-09-20', ended_on: null, cycle_length_days: 42 },
    { started_on: '2026-08-09', ended_on: '2026-08-14', cycle_length_days: 40 },
    { started_on: '2026-07-01', ended_on: '2026-07-06', cycle_length_days: null },
  ];
  assert.ok(insights.buildCycleInsights(teen, [], {}, { today: '2026-10-14' }).flags.some((f) => f.id === 'cycle-length'));
  assert.ok(!insights.buildCycleInsights(teen, [], {}, { today: '2026-10-14', youngUser: true }).flags.some((f) => f.id === 'cycle-length'));
});

test('fertile window, prediction range and relative labels', () => {
  assert.deepEqual(insights.fertileWindow('2026-11-01'), { start: '2026-10-13', end: '2026-10-19', ovulation: '2026-10-18' });
  assert.deepEqual(insights.predictionRange('2026-10-01', 26, 34), { earliest: '2026-10-27', latest: '2026-11-04' });
  assert.equal(insights.predictionRange('2026-10-01', 27, 28), null);
  assert.equal(insights.relativeDayLabel('2026-10-14', '2026-10-15'), 'tomorrow');
  assert.equal(insights.relativeDayLabel('2026-10-14', '2026-10-20'), 'in 6 days');
});

test('cycle prefs follow goals but keep explicit choices', () => {
  const learner = cycle.normalizeCyclePrefs({ goals: ['learning'] });
  assert.equal(learner.explainers, true);
  assert.equal(learner.showFertileWindow, false);
  assert.equal(learner.sections.intimacy, false);
  const ttc = cycle.normalizeCyclePrefs({ goals: ['conceive'], sections: { notes: false } });
  assert.equal(ttc.sections.fertility, true);
  assert.equal(ttc.showFertileWindow, true);
  assert.equal(ttc.sections.notes, false);
  assert.equal(cycle.normalizeCyclePrefs({ goals: ['bogus'], periodWord: 'bleed' }).goals.length, 0);
  assert.equal(cycle.periodWord({ periodWord: 'bleed' }, true), 'Bleed');
});

test('cycle extras drop junk and surface support notes', () => {
  assert.deepEqual(cycle.normalizeCycleExtras({ pain: '12', moods: [], discharge: ' ' }), { pain: 10 });
  assert.match(cycle.extrasSupportNote({ moods: ['Very low'] }), /988/);
  assert.equal(cycle.extrasSupportNote({ pain: 3 }), null);
});

test('HRT milestones, next dose and site rotation', () => {
  assert.equal(hrt.daysOnHrt('2026-10-01', '2026-10-14'), 14);
  assert.equal(hrt.daysOnHrt('2026-11-01', '2026-10-14'), null);
  assert.equal(hrt.hrtDurationLabel(400), '1 year 1 month');
  assert.equal(hrt.nextHrtMilestone('2026-10-01', '2026-10-14').label, '1 month');
  const entries = [
    { log_date: '2026-10-01', data: { administered: true, site: 'Left thigh' } },
    { log_date: '2026-10-08', data: { administered: true, site: 'Right thigh' } },
  ];
  assert.deepEqual(hrt.nextDoseDue(entries, 7, '2026-10-14'), { date: '2026-10-15', inDays: 1 });
  assert.equal(hrt.suggestNextSite(entries, 'injection_subq'), 'Left belly');
  const all = hrt.siteOptionsForRoute('patch').map((site, i) => ({ log_date: `2026-09-${String(10 + i).padStart(2, '0')}`, data: { site } }));
  assert.equal(hrt.suggestNextSite(all, 'patch'), 'Left belly');
  assert.equal(hrt.suggestNextSite(entries, 'pill'), null);
});

test('HRT prefs and extras normalize safely', () => {
  const p = hrt.normalizeHrtPrefs({ regimen: 'menopause', everyDays: '200', startDate: 'soon', routes: ['patch', 'x'] });
  assert.equal(p.sections.menopause, true);
  assert.equal(p.everyDays, null);
  assert.equal(p.startDate, null);
  assert.deepEqual(p.routes, ['patch']);
  assert.deepEqual(hrt.normalizeHrtExtras({ labs: { estradiol: ' 150 ', testosterone: '' }, mood: 9 }), { labs: { estradiol: '150' } });
  assert.equal(hrt.labFieldsForRegimen('masculinizing')[2].key, 'hematocrit');
  assert.ok(hrt.bodyChangeOptions('feminizing').includes('Breast growth / tenderness'));
});
