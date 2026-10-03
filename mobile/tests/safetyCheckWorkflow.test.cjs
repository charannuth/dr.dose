const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', 'require', 'module', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/safetyCheckWorkflow.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports, require, mod);
const { safetyCheckNames, checkRecordWarnings } = mod.exports;
test('comparison replaces trial drugs without changing saved medications or duplicating names', () => {
  const saved = [' Example A ', 'example a', 'Example B'];
  assert.deepEqual(safetyCheckNames(saved, 'Example C'), ['Example A', 'Example B', 'Example C']);
  assert.deepEqual(safetyCheckNames(saved, ' Example D '), ['Example A', 'Example B', 'Example D']);
  assert.deepEqual(safetyCheckNames(saved, 'EXAMPLE B'), ['Example A', 'Example B']);
  assert.equal(saved.length, 3);
});
test('record checks preserve all warnings and cap concurrency at four requests', async () => {
  let inFlight = 0;
  let peak = 0;
  const check = (kind) => async (name) => {
    peak = Math.max(peak, ++inFlight);
    await new Promise((resolve) => setTimeout(resolve, name === 'a' ? 8 : 1));
    inFlight--;
    return [`${kind}:${name}`];
  };
  const result = await checkRecordWarnings(['a', 'b', 'c'], check('allergy'), check('condition'));
  assert.deepEqual(result, { allergyHits: ['allergy:a', 'allergy:b', 'allergy:c'], conditionHits: ['condition:a', 'condition:b', 'condition:c'] });
  assert.equal(peak, 4);
});
test('a failed record check rejects instead of returning a partial all-clear', async () => {
  await assert.rejects(checkRecordWarnings(['a'], async () => [], async () => { throw new Error('Unavailable'); }), /Unavailable/);
});
