const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/appointmentCalendar.ts'), 'utf8');
const mod = { exports: {} };
new Function('exports', 'require', 'module', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(mod.exports, require, mod);
const { buildCalendarCopy, calendarComposeUrl, parseAppointmentTime } = mod.exports;
const visit = { visit_date: '2026-09-25', visit_time: '2:30 PM', provider_name: 'Dr. A & B', location: '12 Main St #2', reason: 'private reason', notes: 'private notes' };

test('parses 12-hour and 24-hour times and rejects malformed times', () => {
  assert.deepEqual(parseAppointmentTime('12:00 AM'), { hour: 0, minute: 0 });
  assert.deepEqual(parseAppointmentTime('12 PM'), { hour: 12, minute: 0 });
  assert.deepEqual(parseAppointmentTime('14:30'), { hour: 14, minute: 30 });
  assert.equal(parseAppointmentTime(''), null);
  for (const time of ['25:00', '0 PM', '12:60', 'tomorrow', '2:5 PM']) assert.throws(() => parseAppointmentTime(time));
});
test('honors the app timezone and chosen duration', () => {
  const event = buildCalendarCopy(visit, 'America/New_York', 30);
  assert.equal(event.start.toISOString(), '2026-09-25T18:30:00.000Z');
  assert.equal(event.end.toISOString(), '2026-09-25T19:00:00.000Z');
  assert.equal(buildCalendarCopy({ ...visit, visit_date: '2026-12-25' }, 'America/New_York').start.toISOString(), '2026-12-25T19:30:00.000Z');
});
test('all-day events use an exclusive next-day end across month/year boundaries', () => {
  const event = buildCalendarCopy({ ...visit, visit_date: '2026-12-31', visit_time: '' }, 'Pacific/Auckland');
  assert.equal(event.allDay, true);
  assert.equal(event.endDate, '2027-01-01');
  assert.equal(new URL(calendarComposeUrl('google', event)).searchParams.get('dates'), '20261231/20270101');
  assert.equal(new URL(calendarComposeUrl('microsoft', event)).searchParams.get('enddt'), '2027-01-01');
});
test('rejects nonexistent dates and daylight-saving gap times', () => {
  assert.throws(() => buildCalendarCopy({ ...visit, visit_date: '2026-02-30' }, 'UTC'));
  assert.throws(() => buildCalendarCopy({ ...visit, visit_date: '2026-03-08', visit_time: '2:30 AM' }, 'America/New_York'), /daylight-saving/);
});
test('provider links preserve encoding, time and exclude clinical notes', () => {
  const event = buildCalendarCopy(visit, 'America/New_York');
  for (const provider of ['google', 'microsoft', 'microsoft-work']) {
    const url = new URL(calendarComposeUrl(provider, event));
    assert.equal(url.searchParams.get(provider === 'google' ? 'text' : 'subject'), 'Doctor appointment · Dr. A & B');
    assert.equal(url.searchParams.get('location'), visit.location);
    assert.ok(!url.toString().includes('private'));
    if (provider !== 'google') assert.equal(url.searchParams.get('startdt'), event.start.toISOString());
  }
  assert.equal(new URL(calendarComposeUrl('microsoft-work', event)).hostname, 'outlook.office.com');
});
