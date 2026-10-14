const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const src = fs.readFileSync(path.join(__dirname, '../lib/safetySummary.ts'), 'utf8');
const mod = { exports: {} };
new Function('exports', 'require', 'module', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(mod.exports, require, mod);
const s = mod.exports;

const inter = (a, b, severity) => ({ drugA: a, drugB: b, displayA: a, displayB: b, severity, description: 'd', management: 'm' });
const result = (names, extra = {}) => ({ checkedAt: '', inputNames: names, resolved: names.map((n) => ({ original: n, canonical: n })), interactions: [], pairCount: 1, mappedCount: names.length, unmappedCount: 0, ...extra });

test('items rank by severity, allergies before interactions', () => {
  const items = s.buildSafetyItems(
    [inter('a', 'b', 'moderate'), inter('c', 'd', 'major')],
    [{ category: 'nsaid', allergyLabel: 'NSAIDs', userAllergyText: 'Ibuprofen', drugName: 'Aleve', severity: 'major', description: 'x', management: 'y' }],
    [],
  );
  assert.deepEqual(items.map((i) => i.kind), ['allergy', 'interaction', 'interaction']);
  assert.equal(items[1].severity, 'major');
});

test('verdict reflects the worst finding and incomplete coverage', () => {
  const counts = { allergies: 1, conditions: 0 };
  assert.equal(s.safetyVerdict(result([]), [], counts).tone, 'empty');
  assert.equal(s.safetyVerdict(result(['a', 'b']), [], counts).tone, 'clear');
  assert.equal(s.safetyVerdict(result(['a', 'b'], { unmappedCount: 1 }), [], counts).tone, 'incomplete');
  const items = s.buildSafetyItems([inter('a', 'b', 'major')], [], []);
  const v = s.safetyVerdict(result(['a', 'b']), items, counts);
  assert.equal(v.tone, 'danger');
  assert.match(v.detail, /2 medications, 1 allergy/);
});

test('candidate split finds items by typed or canonical name', () => {
  const items = s.buildSafetyItems([inter('ibuprofen', 'warfarin', 'major'), inter('a', 'b', 'minor')], [], []);
  const r = s.splitByCandidate(items, 'Advil', 'ibuprofen');
  assert.equal(r.candidate.length, 1);
  assert.equal(r.rest.length, 1);
  assert.equal(s.splitByCandidate(items, null, null).rest.length, 2);
});
