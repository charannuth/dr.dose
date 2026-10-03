const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', 'require', 'module', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/refillForm.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports, require, mod);
const { parseRefillCount, refillFields } = mod.exports;
const draft = { trackSupply: true, remaining: '37', name: ' Medication ', strength: ' 10 mg ', notes: ' With food ' };
test('refill saves only supply and permitted medication details', () => {
  assert.deepEqual(refillFields(draft), { name: 'Medication', dose_mg: '10 mg', notes: 'With food', pills_remaining: 37 });
  assert.equal(draft.name, ' Medication ');
});
test('zero supply remains tracked; disabling tracking stores null', () => {
  assert.equal(refillFields({ ...draft, remaining: '0' }).pills_remaining, 0);
  assert.equal(refillFields({ ...draft, trackSupply: false, remaining: '' }).pills_remaining, null);
});
test('invalid inventory and empty medication names are rejected', () => {
  for (const value of ['', '-1', '1.5', '1e3', 'Infinity', '2147483648']) assert.throws(() => parseRefillCount(value));
  assert.equal(parseRefillCount(' 90 '), 90);
  assert.throws(() => refillFields({ ...draft, name: ' ' }));
});
