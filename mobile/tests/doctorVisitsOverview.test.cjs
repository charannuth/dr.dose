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
const o = load('../lib/doctorVisitsOverview.ts');
const TODAY = '2026-10-14';
const v = (id, visit_date, extra = {}) => ({ id, user_id: 'u', visit_date, visit_time: null, appointment_type: null, provider_name: null,
  specialty: null, location: null, reason: null, notes: null, follow_up_date: null, created_at: '', updated_at: '', ...extra });

test('next visit is the soonest today or later, by time of day', () => {
  const r = o.buildVisitsOverview([
    v('a', '2026-10-20'), v('b', '2026-10-14', { visit_time: '3:00 PM' }), v('c', '2026-10-14', { visit_time: '9:30 am' }), v('d', '2026-10-01'),
  ], TODAY);
  assert.equal(r.next.id, 'c');
  assert.deepEqual(r.upcoming.map((x) => x.id), ['b', 'a']);
  assert.deepEqual(r.past.map((x) => x.id), ['d']);
  assert.deepEqual(r.needsNotes.map((x) => x.id), ['d']);
});

test('follow-ups are due unless a later visit is booked', () => {
  const due = o.buildVisitsOverview([v('a', '2026-09-01', { follow_up_date: '2026-10-20', notes: 'ok' })], TODAY);
  assert.deepEqual(due.followUps.map((f) => f.visit.id), ['a']);
  const booked = o.buildVisitsOverview([v('a', '2026-09-01', { follow_up_date: '2026-10-20', notes: 'ok' }), v('b', '2026-10-21')], TODAY);
  assert.equal(booked.followUps.length, 0);
});

test('relative labels and time parsing', () => {
  assert.equal(o.relativeVisitDay('2026-10-15', TODAY), 'Tomorrow');
  assert.equal(o.relativeVisitDay('2026-10-24', TODAY), 'In 10 days');
  assert.equal(o.relativeVisitDay('2026-10-10', TODAY), '4 days ago');
  assert.equal(o.visitTimeMinutes('12:15 am'), 15);
  assert.equal(o.visitTimeMinutes('15:00'), 900);
  assert.equal(o.locationAction('https://zoom.us/j/1').kind, 'link');
  assert.equal(o.locationAction(' '), null);
});
