// Unit tests for the pure modules. They run in Node without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, exerciseKey, fmtDate, parseDate, rangeMax, volumeOf } from '../src/util.js';
import { createSuggestedPlan, nextSession, scheduleLabel } from '../src/plans.js';
import { validateBackup } from '../src/backup.js';
import { platesPerSide } from '../src/plates.js';
import { weekStats } from '../src/plans.js';

test('day keys are local and round-trip without shifting', () => {
  const d = new Date(2026, 0, 31, 23, 30);
  assert.equal(dayKey(d), '2026-01-31');
  assert.equal(dayKey('2026-01-31'), '2026-01-31');
  assert.equal(parseDate('2026-01-31').getHours(), 12, 'day keys are read as local noon');
  assert.equal(dayKey('not a date'), '');
  assert.equal(fmtDate('garbage'), '–');
});

test('exercise identity prefers the library id', () => {
  assert.equal(exerciseKey({ id: 'plan-uid', libraryId: '0025' }), '0025');
  assert.equal(exerciseKey({ exerciseId: 'plan-uid' }), 'plan-uid');
  assert.equal(exerciseKey({ id: 'custom' }), 'custom');
  assert.equal(rangeMax('8–12'), 12);
  assert.equal(rangeMax('AMRAP'), 12);
});

test('volume counts only completed working sets', () => {
  const session = {
    entries: [
      {
        sets: [
          { weight: '100', reps: '5', done: true },
          { weight: '50', reps: '5', done: true, warmup: true },
          { weight: '100', reps: '5', done: false },
        ],
      },
    ],
  };
  assert.equal(volumeOf(session), 500);
});

test('the assistant builds valid plans for every day count', () => {
  for (const days of [2, 3, 4, 5, 6]) {
    const plan = createSuggestedPlan('strength', days, 'fixed');
    assert.equal(plan.days.length, days);
    assert.equal(Object.keys(plan.schedule.assignments).length, days);
    plan.days.forEach((d) => {
      assert.equal(d.exercises.length, 6);
      d.exercises.forEach((ex) => {
        assert.ok(ex.libraryId, 'exercise links to the library');
        assert.notEqual(ex.id, ex.libraryId);
      });
    });
  }
  const strength = createSuggestedPlan('strength', 3);
  assert.equal(strength.days[0].exercises[0].range, '4–6');
  assert.equal(scheduleLabel(strength), 'Flexible Reihenfolge');
});

test('the next session rotates for flexible plans and follows weekdays for fixed plans', () => {
  const plan = {
    id: 'p',
    days: [
      { id: 'a', name: 'A', exercises: [{}] },
      { id: 'b', name: 'B', exercises: [{}] },
    ],
    schedule: { mode: 'flexible', assignments: {} },
  };
  assert.equal(nextSession(plan, []).day.id, 'a');
  assert.equal(
    nextSession(plan, [{ planId: 'p', dayId: 'a', finishedAt: '2026-01-01T10:00:00Z' }]).day.id,
    'b'
  );
  const fixed = { ...plan, schedule: { mode: 'fixed', assignments: { a: 0, b: 3 } } };
  const monday = new Date(2026, 8, 28, 9);
  assert.deepEqual(
    [nextSession(fixed, [], monday).day.id, nextSession(fixed, [], monday).label],
    ['a', 'Heute geplant']
  );
  const doneToday = [{ planId: 'p', dayId: 'a', day: '2026-09-28', finishedAt: monday.toISOString() }];
  assert.equal(nextSession(fixed, doneToday, monday).label, 'Als Nächstes · Do');
});

test('backup validation coerces hostile input', () => {
  const evil = '"><img src=x onerror=alert(1)>';
  const backup = validateBackup({
    plans: {
      activePlanId: 'nope',
      items: [
        {
          id: 'p1',
          name: evil,
          days: [{ id: 'd1', exercises: [{ sets: 99, rest: 'x', gif: 'http://insecure' }] }],
        },
      ],
    },
    history: [
      {
        finishedAt: '2026-02-03T10:00:00Z',
        totalSets: '3',
        entries: [{ exerciseId: 'e', sets: [{ weight: '1,5', reps: 'x', done: 1 }] }],
      },
      { finishedAt: 'never' },
    ],
    body: [{ date: '2026-02-01', weight: '-5', photo: 'https://x' }],
    settings: { theme: 'neon', rest: 9999 },
  });
  assert.equal(backup.plans.activePlanId, 'p1');
  assert.equal(backup.plans.items[0].name, evil, 'strings are kept, escaping happens at render time');
  const ex = backup.plans.items[0].days[0].exercises[0];
  assert.equal(ex.sets, 12);
  assert.equal(ex.rest, undefined);
  assert.equal(ex.gif, '');
  assert.equal(backup.history.length, 1);
  assert.deepEqual(backup.history[0].entries[0].sets[0], {
    weight: '1,5',
    reps: '',
    rir: '',
    rpe: '',
    done: true,
    warmup: false,
  });
  assert.equal(backup.history[0].day, dayKey('2026-02-03T10:00:00Z'));
  assert.equal(backup.body[0].weight, '');
  assert.equal(backup.body[0].photo, '');
  assert.deepEqual(backup.settings, {
    theme: 'auto',
    rest: 600,
    increment: 2.5,
    showRir: false,
    restTimer: false,
    restNotify: false,
    unit: 'kg',
    weeklyGoal: 0,
    barWeight: 20,
  });
  assert.throws(() => validateBackup({ plans: {} }));
});

test('plate calculator loads the heaviest plates first', () => {
  assert.deepEqual(platesPerSide(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]).plates, [25, 15]);
  assert.deepEqual(platesPerSide(62.5, 20, [25, 20, 15, 10, 5, 2.5, 1.25]).plates, [20, 1.25]);
  assert.equal(platesPerSide(61, 20, [25, 20, 15, 10, 5, 2.5, 1.25]).remainder, 0.5);
  assert.deepEqual(platesPerSide(15, 20).plates, []);
});

test('weekly goal counts sessions per week and streaks of met weeks', () => {
  const monday = new Date(2026, 8, 28);
  const history = [
    { day: '2026-09-28' },
    { day: '2026-09-22' },
    { day: '2026-09-24' },
    { day: '2026-09-15' },
    { day: '2026-09-17' },
    { day: '2026-09-01' },
  ];
  assert.deepEqual(weekStats(history, 2, monday), { thisWeek: 1, streak: 2, goal: 2 });
  assert.deepEqual(weekStats(history, 1, monday), { thisWeek: 1, streak: 3, goal: 1 });
  assert.equal(weekStats([], 3, monday).streak, 0);
});

test('sw.js precaches every module under src/', async () => {
  const { readdirSync, readFileSync, statSync, existsSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const file = join(dir, name);
      return statSync(file).isDirectory() ? walk(file) : file.endsWith('.js') ? [file] : [];
    });
  const modules = walk(join(root, 'src')).map((f) => relative(root, f).split('\\').join('/'));
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  const listed = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]);
  for (const file of modules) assert.ok(listed.includes(file), `${file} is missing from the precache list`);
  for (const file of listed.filter((f) => f.endsWith('.js')))
    assert.ok(existsSync(join(root, file)), `${file} is precached but does not exist`);
});

test('backup validation keeps personal-record flags on sets', () => {
  const backup = validateBackup({
    plans: {
      activePlanId: 'p1',
      items: [{ id: 'p1', name: 'P', days: [{ id: 'd1', name: 'D', exercises: [{ id: 'e', name: 'E' }] }] }],
    },
    history: [
      {
        finishedAt: '2026-02-03T10:00:00Z',
        entries: [
          {
            exerciseId: 'e',
            sets: [
              { weight: '50', reps: '8', done: true, pr: true },
              { weight: '40', reps: '8', done: true },
            ],
          },
        ],
      },
    ],
    body: [],
    settings: {},
  });
  const [first, second] = backup.history[0].entries[0].sets;
  assert.equal(first.pr, true);
  assert.equal('pr' in second, false);
});
