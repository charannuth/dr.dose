const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const cache = new Map();
function load(file) {
  const abs = path.resolve(file);
  if (cache.has(abs)) return cache.get(abs).exports;
  const mod = { exports: {} };
  cache.set(abs, mod);
  const out = ts.transpileModule(fs.readFileSync(abs, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const req = (spec) => (spec.startsWith('.') ? load(path.join(path.dirname(abs), spec + '.ts')) : require(spec));
  new Function('exports', 'require', 'module', out)(mod.exports, req, mod);
  return mod.exports;
}
const d = load(path.join(__dirname, '../lib/medicalRecordDetails.ts'));
const m = load(path.join(__dirname, '../lib/medicalSummary.ts'));
const TODAY = '2026-10-14';

test('parseDetails tolerates junk and keeps valid fields', () => {
  const r = d.parseDetails(JSON.stringify({
    allergies: { Penicillin: { reaction: ' hives ', severity: 'anaphylaxis' }, Pollen: { severity: 'bogus' } },
    conditions: { Asthma: { status: 'managed', since: '2010' } },
    surgeries: [{ name: 'Appendectomy', year: '2015' }, { year: '2020' }],
    vaccines: 'nope',
    emergencyContact: { name: 'Mom', phone: '555' },
    noKnownAllergies: 'yes',
  }));
  assert.deepEqual(r.allergies.Penicillin, { reaction: 'hives', severity: 'anaphylaxis' });
  assert.equal(r.allergies.Pollen.severity, undefined);
  assert.equal(r.surgeries.length, 1);
  assert.deepEqual(r.vaccines, []);
  assert.equal(r.noKnownAllergies, undefined);
  assert.deepEqual(d.parseDetails(null).careTeam, []);
});

test('cleanDetails drops details for removed allergies and conditions', () => {
  const det = { ...d.emptyDetails(), allergies: { A: { severity: 'mild' }, B: { severity: 'severe' } }, conditions: { X: { status: 'active' } } };
  const r = d.cleanDetails(det, ['B'], []);
  assert.deepEqual(Object.keys(r.allergies), ['B']);
  assert.deepEqual(r.conditions, {});
});

test('completeness counts no-known-allergies and needs reactions', () => {
  const base = { date_of_birth: '2000-01-01', blood_type: 'O+', known_allergies: [], known_conditions: [], past_surgeries: '', family_history: '' };
  const none = d.recordCompleteness(base, d.emptyDetails());
  assert.equal(none.find((c) => c.key === 'allergies').done, false);
  const nkda = d.recordCompleteness(base, { ...d.emptyDetails(), noKnownAllergies: true });
  assert.equal(nkda.find((c) => c.key === 'allergies').done, true);
  const noReaction = d.recordCompleteness({ ...base, known_allergies: ['Latex'] }, d.emptyDetails());
  assert.equal(noReaction.find((c) => c.key === 'allergies').done, false);
  assert.equal(none.find((c) => c.key === 'basics').done, true);
});

test('review status goes stale after six months', () => {
  assert.equal(d.reviewStatus('2026-10-14', TODAY).label, 'Reviewed today');
  assert.equal(d.reviewStatus('2026-08-14', TODAY).stale, false);
  assert.equal(d.reviewStatus('2026-03-01', TODAY).stale, true);
  assert.equal(d.reviewStatus(undefined, TODAY).stale, true);
});

test('care team merges entered people with providers from past visits', () => {
  const visits = [
    { provider_name: 'Dr. Lee', specialty: 'Cardiology', visit_date: '2026-09-01' },
    { provider_name: 'dr. lee', specialty: null, visit_date: '2026-05-01' },
    { provider_name: 'Dr. Patel', specialty: null, visit_date: '2026-12-01' },
    { provider_name: 'Peach Clinic', specialty: null, visit_date: '2026-01-01' },
  ];
  const team = m.buildCareTeam([{ name: 'Peach Clinic', role: 'Primary care' }], visits, TODAY);
  assert.deepEqual(team.map((t) => t.name), ['Peach Clinic', 'Dr. Lee']);
  assert.equal(team[1].lastSeen, '2026-09-01');
});

test('history HTML puts severe allergies first, escapes text, and shows NKDA', () => {
  const details = { ...d.emptyDetails(), allergies: { Pollen: { severity: 'mild' }, Peanuts: { reaction: '<b>swelling</b>', severity: 'anaphylaxis' } } };
  const html = m.buildMedicalHistoryHtml({
    ageYears: 26, dateOfBirth: '2000-01-01', sex: 'Male', heightLabel: null, weightLabel: null, bloodType: 'O+',
    allergies: ['Pollen', 'Peanuts'], conditions: ['Asthma'], pastSurgeriesText: '', familyHistoryText: 'Diabetes (parent)',
    emergencyNotes: '', otherNotes: '', details, medications: [{ name: 'Albuterol', dose: '2 puffs', schedule: 'as needed' }], visits: [], today: TODAY,
  });
  assert.ok(html.indexOf('Peanuts') < html.indexOf('Pollen'));
  assert.ok(html.includes('&lt;b&gt;swelling&lt;/b&gt;'));
  assert.ok(html.includes('Albuterol — 2 puffs'));
  assert.ok(html.includes('Diabetes (parent)'));
  const nkda = m.buildMedicalHistoryHtml({
    ageYears: null, dateOfBirth: '', sex: null, heightLabel: null, weightLabel: null, bloodType: '', allergies: [], conditions: [],
    pastSurgeriesText: '', familyHistoryText: '', emergencyNotes: '', otherNotes: '', details: { ...d.emptyDetails(), noKnownAllergies: true },
    medications: [], visits: [], today: TODAY,
  });
  assert.ok(nkda.includes('No known allergies'));
});
