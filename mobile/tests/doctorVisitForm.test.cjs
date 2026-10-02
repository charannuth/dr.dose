const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(name) {
  const mod = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../lib', name + '.ts'), 'utf8');
  new Function('exports', 'require', 'module', ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(mod.exports, (id) => load(id.replace('./', '')), mod);
  return mod.exports;
}
const { prepareDoctorVisitInput } = load('doctorVisitForm');
const base = { visit_date: '2026-10-01', visit_time: '', appointment_type: '', provider_name: ' Clinic ', specialty: '', location: '', reason: '', notes: '', follow_up_date: '' };

test('new appointment keeps the selected date and permits an unconfirmed time', () => {
  const result = prepareDoctorVisitInput(base);
  assert.equal(result.visit_date, '2026-10-01');
  assert.equal(result.visit_time, '');
  assert.equal(result.provider_name, 'Clinic');
  assert.equal(base.provider_name, ' Clinic ');
});
test('editing retains notes, type and follow-up details in the same save', () => {
  const draft = { ...base, visit_time: '2:30 PM', appointment_type: 'follow_up', notes: ' Next steps ', follow_up_date: '2026-11-4', location: ' Room 2 ' };
  assert.deepEqual(prepareDoctorVisitInput(draft), { ...draft, provider_name: 'Clinic', notes: 'Next steps', follow_up_date: '2026-11-04', location: 'Room 2' });
});
test('invalid appointment and follow-up dates or times do not reach persistence', () => {
  for (const invalid of [{ visit_date: '' }, { visit_date: '2026-02-30' }, { visit_time: '25:70' }, { follow_up_date: '2026-02-30' }, { follow_up_date: '2026-1' }]) {
    assert.throws(() => prepareDoctorVisitInput({ ...base, ...invalid }));
  }
});
test('a reason can identify an appointment, but an empty form cannot be saved', () => {
  assert.equal(prepareDoctorVisitInput({ ...base, provider_name: '', reason: ' Annual checkup ' }).reason, 'Annual checkup');
  assert.throws(() => prepareDoctorVisitInput({ ...base, provider_name: ' ', reason: ' ' }), /doctor or clinic/);
});
