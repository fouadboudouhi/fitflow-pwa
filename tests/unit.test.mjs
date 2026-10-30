// Unit tests for the pure modules. They run in Node without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, exerciseKey, fmtDate, parseDate, rangeMax, volumeOf } from '../src/util.js';
import { createSuggestedPlan, nextSession, scheduleLabel } from '../src/plans.js';
import { validateBackup } from '../src/backup.js';
import { platesPerSide } from '../src/plates.js';
import { plural, setLanguage, t } from '../src/i18n.js';
import { BUILT_IN, exerciseName } from '../src/library.js';
import { DEFAULT_SETTINGS } from '../src/storage.js';
import de from '../src/locales/de.js';
import en from '../src/locales/en.js';

// Node reports the device language as en-US; the assertions below are written against the German texts.
setLanguage('de');
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
    type: 'normal',
  });
  assert.equal(backup.history[0].day, dayKey('2026-02-03T10:00:00Z'));
  assert.equal(backup.body[0].weight, '');
  assert.equal(backup.body[0].photo, '');
  assert.deepEqual(backup.settings, { ...DEFAULT_SETTINGS, rest: 600 });
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

test('translations: fallback chain, interpolation and plural forms', () => {
  setLanguage('de');
  assert.equal(t('nav.home'), 'Heute');
  assert.equal(t('wizard.step', { step: 2 }), 'Schritt 2 von 3');
  assert.equal(t('does.not.exist', null, 'Fallback'), 'Fallback');
  assert.equal(t('does.not.exist'), 'does.not.exist');
  assert.equal(plural(1, 'sets'), '1 Satz');
  assert.equal(plural(3, 'sets'), '3 Sätze');
  setLanguage('en');
  assert.equal(t('nav.home'), 'Today');
  assert.equal(plural(1, 'sets'), '1 set');
  assert.equal(plural(3, 'sets'), '3 sets');
  assert.equal(setLanguage('xx'), 'en', 'unknown languages fall back to English');
  setLanguage('de');
});

test('both dictionaries have the same keys and no empty texts', () => {
  const dk = Object.keys(de);
  const ek = Object.keys(en);
  assert.deepEqual(
    dk.filter((k) => !(k in en)),
    [],
    'missing in en'
  );
  assert.deepEqual(
    ek.filter((k) => !(k in de)),
    [],
    'missing in de'
  );
  for (const k of dk) assert.ok(typeof de[k] === 'string' && de[k].length, `${k} is empty in de`);
  for (const k of ek) assert.ok(typeof en[k] === 'string' && en[k].length, `${k} is empty in en`);
});

test('exercise names resolve per language for library, built-in and custom exercises', () => {
  setLanguage('de');
  assert.equal(exerciseName({ id: 'x', libraryId: '0025', name: 'alt' }), 'Bankdrücken mit Langhantel');
  assert.equal(exerciseName({ exerciseId: 'chest-press', name: 'Brustpresse' }), 'Brustpresse');
  assert.equal(exerciseName({ id: 'custom-1', name: 'Meine Übung', custom: true }), 'Meine Übung');
  setLanguage('en');
  assert.equal(exerciseName({ libraryId: '0025' }), 'Barbell Bench Press');
  assert.equal(exerciseName({ exerciseId: 'chest-press' }), 'Chest Press');
  assert.equal(exerciseName({ id: 'custom-1', name: 'Meine Übung' }), 'Meine Übung');
  setLanguage('de');
  assert.equal(Object.keys(BUILT_IN).length, 16);
});

test('backup validation maps legacy German labels to keys and strips catalogue copies', () => {
  const backup = validateBackup({
    plans: {
      activePlanId: 'p1',
      items: [
        {
          id: 'p1',
          name: 'P',
          days: [
            {
              id: 'd1',
              name: 'D',
              exercises: [
                {
                  id: 'a',
                  libraryId: '0025',
                  name: 'Bankdrücken',
                  category: 'Brust',
                  equipment: 'Langhantel',
                  target: 'pectorals',
                  sourceName: 'barbell bench press',
                },
                { id: 'b', name: 'Eigene', custom: true, category: 'Eigene Übung', equipment: 'Kurzhanteln' },
              ],
            },
          ],
        },
      ],
    },
    history: [],
  });
  const [a, b] = backup.plans.items[0].days[0].exercises;
  assert.equal(a.category, undefined);
  assert.equal(a.equipment, undefined);
  assert.equal(a.sourceName, undefined);
  assert.equal(b.category, 'other');
  assert.equal(b.equipment, 'dumbbell');
});

test('set and exercise types: tracking, volume, completeness, scores and durations', async () => {
  const { newSetFor, setComplete, setScore, setSetType, trackTypeOf, parseDuration, fmtDuration, shortSet } =
    await import('../src/sets.js');
  const { isWorkSet, setVolume, volumeOf: volume } = await import('../src/util.js');
  setLanguage('de');
  assert.equal(trackTypeOf({ libraryId: '0025' }), 'weight_reps');
  assert.equal(trackTypeOf({ libraryId: '0662' }), 'reps', 'push-ups count reps');
  assert.equal(trackTypeOf({ libraryId: '0630' }), 'reps', 'mountain climbers count reps, not distance');
  assert.equal(trackTypeOf({ libraryId: '3544' }), 'time', 'planks are timed');
  assert.equal(trackTypeOf({ exerciseId: 'leg-raise' }), 'reps', 'built-in bodyweight exercise');
  assert.equal(
    trackTypeOf({ id: 'c1', name: 'Rudern', custom: true, trackType: 'distance_time' }),
    'distance_time'
  );
  const w = newSetFor('weight_reps', { weight: '60', reps: '8', done: true });
  assert.equal(setVolume(w, 'weight_reps'), 480);
  assert.ok(setScore(w, 'weight_reps') > 60);
  const bw = newSetFor('reps', { reps: '12', done: true });
  assert.equal(setComplete(bw, 'reps'), true);
  assert.equal(setVolume(bw, 'reps'), 0);
  assert.equal(setScore(bw, 'reps'), 12);
  assert.equal(setComplete(newSetFor('weight_reps', { reps: '12', done: true }), 'weight_reps'), false);
  const drop = setSetType(newSetFor('weight_reps', { weight: '40', reps: '10', done: true }), 'drop');
  assert.equal(isWorkSet(drop), true);
  assert.equal(drop.warmup, false);
  const warm = setSetType({ weight: '20', reps: '5', done: true }, 'warmup');
  assert.equal(warm.warmup, true);
  assert.equal(setVolume(warm, 'weight_reps'), 0);
  assert.equal(parseDuration('1:30'), '90');
  assert.equal(parseDuration('90'), '90');
  assert.equal(parseDuration('1:02:03'), '3723');
  assert.equal(parseDuration(''), '');
  assert.equal(fmtDuration(90), '1:30');
  assert.equal(fmtDuration(3723), '1:02:03');
  assert.equal(shortSet({ weight: '50', reps: '8' }, 'weight_reps'), '50×8');
  assert.equal(shortSet({ reps: '12', weight: '' }, 'reps'), '12');
  assert.equal(shortSet({ time: '90' }, 'time'), '1:30');
  assert.equal(volume({ entries: [{ trackType: 'reps', sets: [bw] }, { sets: [w] }] }), 480);
});

test('a version-3 backup from the live site still restores', async () => {
  const { readFileSync } = await import('node:fs');
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/backup-v3.json', import.meta.url), 'utf8'));
  const backup = validateBackup(fixture);
  assert.equal(backup.plans.items.length, 1);
  const [library, builtIn] = backup.plans.items[0].days[0].exercises;
  assert.equal(library.category, undefined, 'German labels are gone');
  assert.equal(library.libraryId, '0025');
  assert.equal(builtIn.name, 'Brustpresse');
  const [warm, work] = backup.history[0].entries[0].sets;
  assert.equal(warm.type, 'warmup');
  assert.equal(work.type, 'normal');
  assert.equal(work.pr, true);
  assert.equal(backup.history[0].volume, 960);
  assert.equal(backup.settings.language, 'auto');
  assert.equal(backup.settings.restTimer, true);
  assert.equal(backup.body[0].weight, 80.5);
});

test('the exercise catalogue is complete and consistent', async () => {
  const { EXERCISES } = await import('../assets/data/exercises.js');
  const { EXERCISE_LIBRARY, GROUPS } = await import('../src/library.js');
  const stepsEn = (await import('../assets/data/steps.en.js')).default;
  const stepsDe = (await import('../assets/data/steps.de.js')).default;
  assert.ok(EXERCISES.length >= 290, `${EXERCISES.length} exercises`);
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length, 'ids are unique');
  for (const id of ['0025', '0662', '0630', '0199', '0652', '0043', '0032'])
    assert.ok(
      EXERCISES.some((e) => e.id === id),
      `${id} is still in the catalogue`
    );
  for (const ex of EXERCISES) {
    assert.match(ex.file, /^\d{4}-\w+\.gif$/, `${ex.id} file`);
    assert.ok(de[`ex.${ex.id}`] && en[`ex.${ex.id}`], `${ex.id} has names in both languages`);
    assert.ok(stepsEn[ex.id]?.length >= 1 && stepsEn[ex.id].length <= 6, `${ex.id} has 1–6 English steps`);
    assert.equal(stepsDe[ex.id]?.length, stepsEn[ex.id].length, `${ex.id} has matching German steps`);
    assert.ok(de[`equipment.${ex.equipment}`] && en[`equipment.${ex.equipment}`], `${ex.equipment} label`);
    assert.ok(de[`muscle.${ex.target}`] && en[`muscle.${ex.target}`], `${ex.target} label`);
    for (const m of ex.secondary || []) assert.ok(de[`muscle.${m}`] && en[`muscle.${m}`], `${m} label`);
  }
  for (const ex of EXERCISE_LIBRARY) {
    assert.ok(GROUPS.includes(ex.group), `${ex.id} group ${ex.group}`);
    assert.match(ex.gif, /^https:\/\//, `${ex.id} gif`);
  }
});

test('records: bests per kind, record flags in chronological order, session diffs', async () => {
  const { computeRecords, annotateAll, sessionRecords, headlineKind } = await import('../src/records.js');
  const session = (id, day, weight, reps = 8) => ({
    id,
    day,
    finishedAt: `${day}T10:00:00.000Z`,
    entries: [
      {
        exerciseId: 'x',
        libraryId: '0025',
        name: 'Bank',
        trackType: 'weight_reps',
        sets: [
          { weight: '20', reps: '5', done: true, warmup: true, type: 'warmup' },
          { weight: String(weight), reps: String(reps), done: true, type: 'normal' },
          { weight: String(weight), reps: String(reps), done: true, type: 'normal' },
        ],
      },
      {
        exerciseId: 'p',
        libraryId: '0662',
        trackType: 'reps',
        sets: [{ reps: String(reps + 4), done: true }],
      },
    ],
  });
  const history = [
    session('new', '2026-03-10', 60),
    session('old', '2026-01-10', 50),
    session('mid', '2026-02-10', 55, 10),
  ];
  const records = computeRecords(history);
  assert.equal(records['0025'].maxWeight.value, 60);
  assert.equal(records['0025'].maxWeight.day, '2026-03-10');
  assert.ok(records['0025'].e1rm.value > records['0025'].maxWeight.value);
  assert.equal(records['0025'].e1rm.sessionId, 'new', '60×8 estimates higher than 55×10');
  assert.equal(records['0025'].maxVolume.sessionId, 'mid', '55×10 is the biggest set');
  assert.equal(records['0662'].maxReps.value, 14);
  assert.equal(headlineKind('reps'), 'maxReps');
  annotateAll(history);
  const flags = (id) => history.find((h) => h.id === id).entries[0].sets.map((s) => !!s.pr);
  assert.deepEqual(flags('old'), [false, true, false], 'first session: first working set is a record');
  assert.deepEqual(flags('mid'), [false, true, false]);
  assert.deepEqual(flags('new'), [false, true, false], '60×8 beats the 1RM of 55×10');
  const diff = sessionRecords(
    history.find((h) => h.id === 'new'),
    history
  );
  assert.deepEqual(
    diff.map((r) => `${r.key}:${r.kind}`).sort(),
    ['0025:e1rm', '0025:maxWeight'].sort(),
    '1RM and weight improved; set volume (480 < 550) and push-up reps (12 < 14) did not'
  );
});

test('supersets link consecutive exercises; a free workout becomes a plan day', async () => {
  const { linkSuperset, unlinkSuperset, supersetLetters, supersetPosition, dayFromSession } =
    await import('../src/plans.js');
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  linkSuperset(list, 0);
  linkSuperset(list, 1);
  assert.equal(list[0].supersetId, list[2].supersetId);
  assert.equal(list[3].supersetId, undefined);
  assert.deepEqual(
    [0, 1, 2, 3].map((i) => supersetPosition(list, i)),
    ['first', 'mid', 'last', 'single']
  );
  assert.deepEqual(Object.values(supersetLetters(list)), ['A']);
  unlinkSuperset(list, 1);
  assert.ok(
    list.every((ex) => !ex.supersetId),
    'dissolving removes the whole group'
  );
  const day = dayFromSession({
    dayName: 'Frei',
    exercises: [{ id: 'x', libraryId: '0025', name: 'Bank', sets: 3, range: '8–12' }],
  });
  assert.equal(day.name, 'Frei');
  assert.equal(day.exercises.length, 1);
  assert.equal(day.exercises[0].id, 'x', 'exercise ids are kept');
  assert.ok(day.id);
});

test('every template resolves to catalogue exercises and the first-run picker fits the answers', async () => {
  const { TEMPLATES, planFromTemplate, pickTemplate } = await import('../src/templates.js');
  setLanguage('de');
  assert.ok(TEMPLATES.length >= 10);
  for (const template of TEMPLATES) {
    const plan = planFromTemplate(template.id);
    assert.equal(plan.days.length, template.days, template.id);
    assert.ok(plan.days.length >= 2 && plan.days.length <= 6, template.id);
    plan.days.forEach((d) => {
      assert.ok(d.exercises.length >= 3, `${template.id}: ${d.name}`);
      d.exercises.forEach((ex) =>
        assert.ok(ex.libraryId && ex.sets >= 1 && ex.range, `${template.id}: ${ex.name}`)
      );
    });
    assert.ok(
      de[`template.${template.id}.name`] && en[`template.${template.id}.name`],
      `${template.id} names`
    );
  }
  assert.equal(planFromTemplate('upperLower4', { level: 'beginner' }).days[0].exercises[0].sets, 3);
  assert.equal(pickTemplate({ days: 4, equipment: 'gym' }).id, 'upperLower4');
  assert.equal(pickTemplate({ days: 3, equipment: 'home' }).id, 'home3');
  assert.equal(pickTemplate({ days: 5, equipment: 'dumbbell' }).id, 'dumbbell3', 'nearest day count');
  assert.equal(
    pickTemplate({ days: 3, equipment: 'gym', goal: 'strength', level: 'beginner' }).id,
    'linear2'
  );
  assert.equal(pickTemplate({ days: 6, equipment: 'gym' }).id, 'ppl6');
});

test('backup validation keeps custom exercises within limits', () => {
  const backup = validateBackup({
    plans: { activePlanId: 'p1', items: [{ id: 'p1', name: 'P', days: [] }] },
    history: [],
    customExercises: [
      {
        id: 'c1',
        name: 'Farmer Walk',
        category: 'legs',
        equipment: 'dumbbell',
        trackType: 'distance_time',
        note: 'x',
      },
      { id: 'c2', name: '', category: 'legs' },
      { id: 'c3', name: 'Odd', category: 'nope', equipment: '', trackType: 'nope' },
    ],
  });
  assert.equal(backup.customExercises.length, 2, 'a nameless entry is dropped');
  assert.deepEqual(
    backup.customExercises.map((c) => [c.category, c.equipment, c.trackType]),
    [
      ['legs', 'dumbbell', 'distance_time'],
      ['other', 'other', 'weight_reps'],
    ]
  );
});

test('editor helpers: duplicate a day, move an exercise to another day, reorder', async () => {
  const { duplicateDay, moveExerciseToDay, reorderExercises } = await import('../src/plans.js');
  setLanguage('de');
  const plan = {
    days: [
      {
        id: 'a',
        name: 'A',
        exercises: [{ id: 'x', supersetId: 's' }, { id: 'y', supersetId: 's' }, { id: 'z' }],
      },
      { id: 'b', name: 'B', exercises: [] },
    ],
    schedule: { mode: 'flexible', assignments: {} },
  };
  const copy = duplicateDay(plan, 0);
  assert.equal(plan.days.length, 3);
  assert.equal(copy.name, 'A – Kopie');
  assert.notEqual(copy.exercises[0].id, 'x', 'copied exercises get fresh ids');
  const moved = moveExerciseToDay(plan, 0, 0, 1);
  assert.equal(moved.id, 'x');
  assert.equal(moved.supersetId, undefined, 'a moved exercise leaves its superset');
  assert.deepEqual(
    plan.days[1].exercises.map((e) => e.id),
    ['x']
  );
  reorderExercises(plan.days[0], [1, 0]);
  assert.deepEqual(
    plan.days[0].exercises.map((e) => e.id),
    ['z', 'y']
  );
  reorderExercises(plan.days[0], [0]);
  assert.equal(plan.days[0].exercises.length, 2, 'a wrong-sized order is ignored');
});

test('weekly stats: sets per group, weekly volume, frequency, record timeline, body vs strength', async () => {
  const { weeklySets, weeklyVolume, frequency, recordTimeline, strengthVsBodyweight, startOfWeek } =
    await import('../src/stats.js');
  const today = new Date(2026, 9, 29, 12); // Thursday
  const key = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const monday = startOfWeek(today);
  const thisWeek = key(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1));
  const lastWeek = key(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 6));
  const session = (id, day, weight, pr = false) => ({
    id,
    day,
    finishedAt: `${day}T10:00:00.000Z`,
    dayName: 'Push',
    volume: weight * 8 * 2,
    entries: [
      {
        exerciseId: 'x',
        libraryId: '0025',
        name: 'Bank',
        trackType: 'weight_reps',
        sets: [
          { weight: String(weight), reps: '8', done: true, type: 'normal', pr },
          { weight: String(weight), reps: '8', done: true, type: 'normal' },
        ],
      },
    ],
  });
  const history = [session('a', thisWeek, 60, true), session('b', lastWeek, 50), session('c', lastWeek, 50)];
  assert.deepEqual(weeklySets(history, { weeks: 1, today }), [{ group: 'chest', sets: 2 }]);
  assert.deepEqual(weeklySets(history, { weeks: 4, today }), [{ group: 'chest', sets: 1.5 }]);
  const volume = weeklyVolume(history, 3, today);
  assert.equal(volume.length, 3);
  assert.deepEqual(
    volume.map((p) => p.value),
    [0, 1600, 960]
  );
  assert.deepEqual(
    frequency(history, 3, today).map((p) => p.value),
    [0, 2, 1]
  );
  const timeline = recordTimeline(history);
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].count, 1);
  const combo = strengthVsBodyweight(history, [{ day: thisWeek, weight: 80 }], '0025');
  assert.equal(combo.points.length, 3);
  assert.equal(combo.weight[2].value, 80, 'the measurement two days earlier counts');
  assert.equal(combo.weight[0].value, 80, 'a measurement within ten days counts for earlier sessions too');
});
