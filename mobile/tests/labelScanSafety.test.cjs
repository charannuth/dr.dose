const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const mod = { exports: {} };
  const src = fs.readFileSync(path.join(__dirname, '../lib', file), 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('exports', 'require', 'module', out)(mod.exports, require, mod);
  return mod.exports;
}

const quality = load('labelParseQuality.ts');
const verdict = load('scanSafetyVerdict.ts');

test('local parse is confident only with a trusted name, strength and directions', () => {
  assert.deepEqual(
    quality.assessLabelParse({ name: 'Sertraline', nameSource: 'catalog', doseMg: '50 mg', directions: 'Take 1 tablet daily' }),
    { confident: true, missing: [] },
  );
  const guessed = quality.assessLabelParse({ name: 'Walgreens 123', nameSource: 'guess', doseMg: '50 mg' });
  assert.equal(guessed.confident, false);
  assert.deepEqual(guessed.missing, ['name', 'directions']);
  assert.equal(quality.describeMissingFields(guessed.missing), 'the drug name and the directions');
});

test('AI redaction drops patient, prescriber, address and numbers but keeps dosing', () => {
  const raw = [
    'CVS pharmacy',
    'PATIENT: JANE DOE',
    'DOB 04/12/1990',
    '123 Main St',
    'Springfield, IL 62701',
    '(555) 123-4567',
    'Rx# 1234567',
    'PRSCBR: DR SMITH',
    'SERTRALINE 50 MG TABLET',
    'Take 1 tablet by mouth daily. May cause drowsiness. Do not drive',
  ].join('\n');
  const out = quality.redactLabelTextForAI(raw);
  for (const leak of ['JANE', '04/12/1990', 'Main St', '62701', '555', '1234567', 'SMITH']) {
    assert.ok(!out.includes(leak), `leaked ${leak}: ${out}`);
  }
  assert.match(out, /SERTRALINE 50 MG TABLET/);
  assert.match(out, /Do not drive/);
});

const ctx = { drugName: 'Ibuprofen', drugIdentified: true, allergyCount: 2, medicationCount: 3 };

test('verdict: danger beats caution, caution beats clear', () => {
  const danger = { kind: 'allergy', severity: 'danger', title: 'a', detail: '', source: '' };
  const caution = { kind: 'interaction', severity: 'caution', title: 'b', detail: '', source: '' };
  const info = { kind: 'interaction', severity: 'info', title: 'c', detail: '', source: '' };
  assert.equal(verdict.verdictFromFindings([caution, danger], ctx).level, 'danger');
  assert.equal(verdict.verdictFromFindings([caution, info], ctx).level, 'caution');
  const clear = verdict.verdictFromFindings([info], ctx);
  assert.equal(clear.level, 'clear');
  assert.match(clear.summary, /2 allergies and 3 current medications/);
  assert.deepEqual(verdict.sortFindings([info, caution, danger]).map((f) => f.severity), ['danger', 'caution', 'info']);
});

test('verdict: an unidentified drug is never reported as safe', () => {
  const v = verdict.verdictFromFindings([], { ...ctx, drugIdentified: false });
  assert.equal(v.level, 'unknown');
});

test('FDA label mentions match whole words and plurals only', () => {
  const text = 'Do not use with MAOIs or pimozide. Increased bleeding risk with warfarin and NSAIDs.';
  assert.deepEqual(
    verdict.findTermMentions(text, ['Warfarin 5 mg tablet', 'Pimozide', 'Aspirin', 'NSAID', 'war']),
    ['Warfarin 5 mg tablet', 'Pimozide', 'NSAID'],
  );
  assert.deepEqual(verdict.findTermMentions(text, ['none', 'pollen']), []);
});

test('direct allergy and duplicate-ingredient matches', () => {
  assert.deepEqual(
    verdict.directAllergyMatches(['Amoxicillin 500 mg capsule', 'Amoxil'], ['Amoxicillin (hives)', 'Peanuts', 'NKDA']),
    ['Amoxicillin (hives)'],
  );
  assert.deepEqual(verdict.directAllergyMatches(['Sertraline'], ['Penicillin']), []);
  assert.deepEqual(
    verdict.duplicateTherapyMatches('acetaminophen', 'Tylenol', [
      { original: 'Acetaminophen 500 mg', canonical: 'acetaminophen' },
      { original: 'Lisinopril', canonical: 'lisinopril' },
    ]),
    ['Acetaminophen 500 mg'],
  );
});
