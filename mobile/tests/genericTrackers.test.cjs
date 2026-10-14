const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Loads TS modules and their relative imports (type-only imports are erased).
const cache = new Map();
function load(file) {
  const full = path.resolve(file.endsWith('.ts') ? file : `${file}.ts`);
  const resolved = fs.existsSync(full) ? full : path.resolve(file, 'index.ts');
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const mod = { exports: {} };
  cache.set(resolved, mod);
  const out = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const req = (id) => (id.startsWith('.') ? load(path.join(path.dirname(resolved), id)) : require(id));
  new Function('exports', 'require', 'module', out)(mod.exports, req, mod);
  return mod.exports;
}

const g = load(path.join(__dirname, '../lib/tracking/genericTracker.ts'));
const { GENERIC_TRACKERS, getTrackerDef } = load(path.join(__dirname, '../lib/tracking/trackerDefs'));
const family = load(path.join(__dirname, '../lib/tracking/trackerDefs/family.ts'));

function ctx(def, { prefs = {}, day = {}, history = [], date = '2026-10-14' } = {}) {
  return { prefs: g.normalizeGenericPrefs(def, prefs), day, history, date, today: '2026-10-14' };
}

test('every tracker has unique ids, valid sections and renders hero/flags on empty data', () => {
  const ids = new Set();
  for (const def of GENERIC_TRACKERS) {
    assert.ok(!ids.has(def.id), `duplicate tracker ${def.id}`);
    ids.add(def.id);
    const fieldIds = new Set();
    for (const s of g.sectionsFor(def, { customFields: [] })) {
      for (const f of s.fields) {
        assert.ok(!fieldIds.has(f.id), `${def.id}: duplicate field ${f.id}`);
        fieldIds.add(f.id);
      }
    }
    for (const id of def.insightFields ?? []) assert.ok(fieldIds.has(id), `${def.id}: unknown insight field ${id}`);
    const c = ctx(def);
    const hero = def.hero ? def.hero(c) : g.defaultHero(def, c);
    assert.equal(typeof hero.center, 'string');
    assert.deepEqual(def.flags ? def.flags(c) : [], [], `${def.id} flags on empty day`);
  }
  assert.equal(GENERIC_TRACKERS.length, 17);
});

test('prefs normalize: unknown goals dropped, sections follow goals, explainers default on', () => {
  const pelvic = getTrackerDef('pelvic');
  const p = g.normalizeGenericPrefs(pelvic, { goals: ['vaginoplasty', 'nope'] });
  assert.deepEqual(p.goals, ['vaginoplasty']);
  assert.equal(p.sections.dilation, true);
  assert.equal(p.sections.floor, false);
  assert.equal(p.explainers, true);
  const off = g.normalizeGenericPrefs(pelvic, { goals: ['vaginoplasty'], sections: { dilation: false }, explainers: false });
  assert.equal(off.sections.dilation, false);
  assert.equal(off.explainers, false);
});

test('compact entry drops empties and false toggles', () => {
  assert.deepEqual(g.compactGenericEntry({ a: '', b: [], c: false, d: 0, e: ' x ', f: null, h: true }), { d: 0, e: 'x', h: true });
});

test('clock maths crosses midnight', () => {
  assert.equal(g.hoursBetweenClock('23:30', '07:00'), 7.5);
  assert.equal(g.hoursBetweenClock('11:00 pm', '6:30 am'), 7.5);
  assert.equal(g.parseClock('25:00'), null);
});

test('insights average, count and streak', () => {
  const mood = getTrackerDef('mood');
  const prefs = g.normalizeGenericPrefs(mood, {});
  const entries = [
    { log_date: '2026-10-12', data: { mood: 2, feelings: ['Anxious'] } },
    { log_date: '2026-10-13', data: { mood: 4, feelings: ['Anxious', 'Calm'] } },
    { log_date: '2026-10-14', data: { mood: 3 } },
  ];
  const r = g.buildFieldInsights(mood, prefs, entries, '2026-10-14');
  assert.equal(r.loggedDays, 3);
  assert.equal(r.streak, 3);
  const avg = r.fields.find((f) => f.id === 'mood');
  assert.equal(avg.avg, 3);
});

test('pregnancy gestational age from due date, LMP or transfer', () => {
  assert.deepEqual(family.gestationalAge({ dueDate: '2027-03-01' }, '2026-10-14'), { weeks: 20, days: 2, total: 142 });
  assert.equal(family.gestationalAge({ lmp: '2026-10-01' }, '2026-10-14').weeks, 1);
  assert.equal(family.gestationalAge({ transferDate: '2026-10-01' }, '2026-10-14').total, 32);
  assert.equal(family.gestationalAge({}, '2026-10-14'), null);
});

test('urgent flags fire for real danger signs', () => {
  const urgent = (id, day, prefs) => {
    const def = getTrackerDef(id);
    return def.flags(ctx(def, { day, prefs })).filter((f) => f.tone === 'urgent').map((f) => f.id);
  };
  assert.ok(urgent('movement', { feel: ['Chest pain / pressure'] }).includes('chest'));
  assert.ok(urgent('nourish', { reaction: ['Throat tight'] }).includes('anaphylaxis'));
  assert.ok(urgent('affirming', { opSigns: ['Short of breath / chest pain'] }).includes('postop'));
  assert.ok(urgent('pelvic', { utiSigns: ['Burning when peeing', 'Fever / chills'] }).includes('kidney'));
  assert.ok(urgent('affirming', { harmThoughts: true }).includes('crisis'));
});

test('binding over the personal limit is a gentle nudge', () => {
  const def = getTrackerDef('affirming');
  const flags = def.flags(ctx(def, { day: { bindHours: 10 }, prefs: { setup: { bindLimit: 8 } } }));
  assert.deepEqual(flags.map((f) => [f.id, f.tone]), [['bind', 'info']]);
});

test('movement hero sums the week against the goal', () => {
  const def = getTrackerDef('movement');
  const history = [
    { log_date: '2026-10-10', data: { minutes: 30 } },
    { log_date: '2026-10-01', data: { minutes: 90 } },
  ];
  const hero = def.hero(ctx(def, { history, day: { minutes: 20 }, prefs: { setup: { weeklyMinutes: '100' } } }));
  assert.equal(hero.center, '50');
  assert.equal(hero.progress, 0.5);
});

test('custom tracker builds a section from user fields', () => {
  const def = getTrackerDef('custom');
  const prefs = g.normalizeGenericPrefs(def, {
    setup: { name: 'Seizures' },
    customFields: [
      { id: 'c_count', label: 'Seizures', type: 'stepper' },
      { id: 'c_bad', label: 'Bad', type: 'weird' },
    ],
  });
  assert.equal(prefs.customFields.length, 1);
  const sections = g.sectionsFor(def, prefs);
  assert.equal(sections[0].label, 'Seizures');
  assert.equal(sections[0].fields[0].type, 'stepper');
  assert.equal(prefs.sections.custom_fields, true);
  assert.equal(g.slugId('Itch level!', ['c_itch_level']), 'c_itch_level_2');
});
