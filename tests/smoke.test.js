// End-to-end smoke tests against the real app in Chromium. Run with `npm test`.
const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'),
  os = require('os'),
  path = require('path');
const { chromium } = require('playwright');
const { createServer } = require('./serve.js');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

let server, browser, baseURL, context, page, errors;
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseURL = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});
beforeEach(async () => {
  context = await browser.newContext({ acceptDownloads: true });
  page = await context.newPage();
  errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text()))
      errors.push(`console: ${m.text()}`);
  });
  page.on('dialog', (d) => d.accept());
  await page.route(/githubusercontent\.com|exercisedb\.dev/, (r) =>
    r.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.alloc(0) })
  );
  await page.goto(baseURL + '/');
  await page.waitForSelector('.next-card');
});
afterEach(async () => {
  const e = errors;
  await context.close();
  assert.deepEqual(e, [], 'no runtime errors');
});

test('home shows the default plan and the next session', async () => {
  assert.match(await page.textContent('.home-intro p'), /Push · Pull · Legs/);
  assert.match(await page.textContent('.next-card h2'), /Push/);
  assert.equal(
    (await page.getAttribute('html', 'data-theme')) !== null,
    true,
    'theme is set before first paint'
  );
});

test('an unfinished workout survives editing the plan day', async () => {
  await page.click('.next-card [data-start]');
  await page.waitForSelector('.workout-exercise');
  const before = await page.locator('.workout-exercise').count();
  await page.fill('.workout-exercise:nth-child(2) input[data-set-field="weight"][data-index="0"]', '42');
  await page.click('.workout-exercise:nth-child(2) [data-set-done="0"]');
  await page.click('#exitWorkout');
  await page.waitForSelector('.next-card.resume-card');
  assert.match(await page.textContent('.resume-card p'), /1 Satz erledigt/);
  // Edit the plan: remove the first exercise, add one from the library.
  await page.click('[data-nav="plans"]');
  await page.click('[data-edit-plan]');
  await page.click('[data-exercise-menu="0:0"]');
  await page.getByRole('button', { name: 'Entfernen' }).click();
  await page.click('[data-add-exercise="0"]');
  await page.waitForSelector('.exercise-library');
  await page.click('.library-item:not([hidden]) [data-pick-exercise]:not([disabled])');
  await page.click('#closeLibraryBottom');
  await page.click('#savePlan');
  await page.click('[data-nav="home"]');
  await page.click('.next-card [data-start]');
  await page.waitForSelector('.workout-exercise');
  assert.equal(await page.locator('.workout-exercise').count(), before, 'one removed, one added');
  const kept = page.locator('.workout-exercise').first();
  assert.equal(
    await kept.locator('input[data-set-field="weight"][data-index="0"]').inputValue(),
    '42',
    'logged set of the kept exercise is preserved'
  );
  assert.equal(await kept.locator('[data-set-done="0"]').textContent(), '✓');
});

test('plan assistant creates and activates a plan', async () => {
  await page.click('[data-nav="plans"]');
  await page.click('#newPlan');
  await page.getByRole('button', { name: /Mit Assistent/ }).click();
  await page.check('input[name="goal"][value="strength"]');
  await page.selectOption('select[name="days"]', '4');
  await page.click('#assistantForm button[type="submit"]');
  await page.check('input[name="scheduleMode"][value="fixed"]');
  await page.click('#assistantScheduleForm button[type="submit"]');
  assert.match(await page.textContent('.preview-head h1'), /Kraft · 4 Tage/);
  await page.click('#useSuggestedPlan');
  await page.waitForSelector('.next-card');
  assert.match(await page.textContent('.home-intro p'), /Kraft · 4 Tage/);
});

test('body photos are stored in IndexedDB and included in the JSON backup', async () => {
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="body"]');
  await page.fill('input[name="weight"]', '80.5');
  await page.setInputFiles('input[name="photo"]', { name: 'p.png', mimeType: 'image/png', buffer: PNG });
  await page.click('#bodyForm button[type="submit"]');
  await page.waitForFunction(() =>
    document.querySelector('.body-entry img')?.src.startsWith('data:image/jpeg')
  );
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-body-v2')));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].hasPhoto, true);
  assert.equal('photo' in stored[0], false, 'no base64 in localStorage');
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="backup"]');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#exportJson')]);
  const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.equal(backup.version, 3);
  assert.match(backup.body[0].photo, /^data:image\/jpeg;base64,/);
  assert.equal(backup.body[0].weight, 80.5);
  assert.ok(backup.exercisePrefs);
});

test('a hostile backup is sanitised on import', async () => {
  const evil = '"><img src=x onerror="window.__pwned=1">';
  const backup = {
    version: 2,
    plans: {
      activePlanId: 'p1',
      items: [
        {
          id: 'p1',
          name: evil,
          days: [
            {
              id: 'd1',
              name: 'Tag',
              exercises: [
                {
                  id: 'e1',
                  name: evil,
                  sets: evil,
                  range: evil,
                  gif: 'javascript:alert(1)',
                  note: evil,
                  rest: 'x',
                },
              ],
            },
          ],
        },
      ],
    },
    history: [
      {
        id: 'h1',
        planId: 'p1',
        dayId: 'd1',
        dayName: evil,
        finishedAt: '2026-01-05T10:00:00Z',
        totalSets: evil,
        duration: 'x',
        entries: [{ exerciseId: 'e1', name: evil, sets: [{ weight: evil, reps: '8', done: true }] }],
      },
      { finishedAt: 'not a date' },
    ],
    body: [{ id: 'b1', date: '2026-01-02', weight: evil, photo: 'https://evil.example/x.png' }],
    settings: { theme: evil, rest: 'x' },
  };
  const file = path.join(os.tmpdir(), 'volumora-evil.json');
  fs.writeFileSync(file, JSON.stringify(backup));
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="backup"]');
  await page.setInputFiles('#importJson', file);
  await page.click('.sheet [data-ok]');
  await page.waitForSelector('.home-intro');
  for (const view of ['plans', 'analytics', 'calendar', 'more', 'body', 'more', 'settings']) {
    await page.click(`[data-nav="${view}"]`);
    await page.waitForTimeout(50);
  }
  await page.click('[data-nav="plans"]');
  await page.click('[data-edit-plan]');
  await page.click('[data-nav="plans"]');
  await page.click('[data-nav="home"]');
  await page.click('.next-card [data-start]');
  await page.waitForSelector('.workout-exercise');
  assert.equal(await page.evaluate(() => window.__pwned), undefined, 'no injected script ran');
  assert.equal(await page.locator('img[src^="x"]').count(), 0);
  const plans = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-plans-v2')));
  assert.equal(plans.items[0].days[0].exercises[0].sets, 3, 'invalid set count falls back');
  assert.equal(plans.items[0].days[0].exercises[0].gif, '', 'non-https media dropped');
  const body = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-body-v2')));
  assert.equal(body[0].hasPhoto, false, 'remote photo URL dropped');
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-settings-v2')));
  assert.deepEqual(settings, {
    theme: 'auto',
    rest: 90,
    increment: 2.5,
    showRir: false,
    restTimer: false,
    restNotify: false,
    unit: 'kg',
    weeklyGoal: 0,
    barWeight: 20,
  });
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-history-v2')));
  assert.equal(history.length, 1, 'session without a valid date dropped');
});

test('calendar can move between months and the library closes on Escape', async () => {
  await page.click('[data-nav="analytics"]');
  await page.click('[data-nav="calendar"]');
  const current = await page.textContent('.calendar-head h1');
  await page.click('[data-calendar-shift="-1"]');
  assert.notEqual(await page.textContent('.calendar-head h1'), current);
  await page.click('[data-calendar-shift="0"]');
  assert.equal(await page.textContent('.calendar-head h1'), current);
  await page.click('[data-nav="plans"]');
  await page.click('[data-edit-plan]');
  await page.click('[data-add-exercise="0"]');
  await page.waitForSelector('.exercise-library');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'librarySearch', 'search gets focus');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.exercise-library').count(), 0);
});

test('offline start page is served by the service worker', async () => {
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 10000 });
  await page.reload();
  await page.waitForSelector('.next-card');
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('.next-card');
  assert.match(await page.textContent('.next-card h2'), /Push/);
});

test('legacy data is migrated: day keys, library ids and photos in IndexedDB', async () => {
  const legacy = {
    plans: {
      activePlanId: 'p1',
      items: [
        {
          id: 'p1',
          name: 'Alt',
          days: [
            {
              id: 'd1',
              name: 'Tag',
              exercises: [
                { id: 'ex1', libraryId: '0025', name: 'Bankdrücken', sets: 3, range: '8–12', gif: '' },
              ],
            },
          ],
        },
      ],
    },
    history: [
      {
        id: 'h1',
        planId: 'p1',
        dayId: 'd1',
        dayName: 'Tag',
        startedAt: '2026-03-10T09:00:00.000Z',
        finishedAt: '2026-03-10T10:00:00.000Z',
        entries: [
          { exerciseId: 'ex1', name: 'Bankdrücken', sets: [{ weight: '60', reps: '8', done: true }] },
        ],
      },
    ],
    body: [
      {
        id: 'b1',
        date: '2026-03-09T11:00:00.000Z',
        weight: 80,
        photo: 'data:image/png;base64,' + PNG.toString('base64'),
      },
    ],
  };
  await page.evaluate((data) => {
    localStorage.clear();
    localStorage.setItem('volumora-plans-v2', JSON.stringify(data.plans));
    localStorage.setItem('volumora-history-v2', JSON.stringify(data.history));
    localStorage.setItem('volumora-body-v2', JSON.stringify(data.body));
  }, legacy);
  await page.reload();
  await page.waitForSelector('.next-card');
  await page.waitForFunction(() => !JSON.parse(localStorage.getItem('volumora-body-v2'))[0].photo);
  const { schema, history, body } = await page.evaluate(() => ({
    schema: JSON.parse(localStorage.getItem('volumora-schema-version')),
    history: JSON.parse(localStorage.getItem('volumora-history-v2')),
    body: JSON.parse(localStorage.getItem('volumora-body-v2')),
  }));
  assert.equal(schema, 4);
  assert.equal(history[0].day, '2026-03-10');
  assert.equal(history[0].entries[0].libraryId, '0025', 'history entry now points at the library exercise');
  assert.equal(body[0].day, '2026-03-09');
  assert.equal(body[0].hasPhoto, true);
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="body"]');
  await page.waitForFunction(() =>
    document.querySelector('.body-entry img')?.src.startsWith('data:image/png')
  );
  // Progress follows the library exercise: a new plan with the same library exercise sees the old weight.
  await page.click('[data-nav="plans"]');
  await page.click('#newPlan');
  await page.getByRole('button', { name: /Leeren Plan/ }).click();
  await page.click('[data-add-exercise="0"]');
  await page.fill('#librarySearch', 'Bankdrücken mit Langhantel');
  await page.click('.library-item:not([hidden]) [data-pick-exercise="0025"]');
  await page.click('#closeLibraryBottom');
  await page.click('#savePlan');
  await page.locator('[data-edit-plan]').nth(1).click();
  await page.click('#planMenu');
  await page.getByRole('button', { name: /aktiven Plan/ }).click();
  await page.click('[data-nav="plans"]');
  await page.click('[data-nav="home"]');
  await page.click('.next-card [data-start]');
  await page.waitForSelector('.workout-exercise');
  assert.equal(
    await page.inputValue('.workout-exercise input[data-set-field="weight"][data-index="0"]'),
    '60'
  );
  assert.match(await page.textContent('.suggest-row span'), /60 kg/);
});

test('deleting a set can be undone and open details survive a re-render', async () => {
  await page.click('.next-card [data-start]');
  await page.waitForSelector('.workout-exercise');
  const first = page.locator('.workout-exercise').first();
  await page.click('#session-status summary');
  await first.locator('[data-set-done="1"]').click();
  assert.equal(
    await page.locator('#session-status').getAttribute('open'),
    '',
    'Tagesform stays open after marking a set'
  );
  assert.equal(await first.locator('.set-row').count(), 3);
  await first.locator('[data-delete-set="2"]').dispatchEvent('click'); // revealed by swipe in the real UI
  assert.equal(await first.locator('.set-row').count(), 2);
  await page.waitForSelector('.toast.show');
  await page.click('.toast-action');
  assert.equal(await first.locator('.set-row').count(), 3, 'undo restores the set');
  await page.click('#exitWorkout');
  // Starting another day asks first; cancelling keeps the session.
  await page.click('.list [data-start]');
  await page.waitForSelector('.sheet-backdrop.show');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.resume-card');
  assert.match(await page.textContent('.resume-card p'), /1 Satz erledigt/);
});

test('deleting a plan can be undone', async () => {
  await page.click('[data-nav="plans"]');
  await page.click('#newPlan');
  await page.getByRole('button', { name: /Leeren Plan/ }).click();
  await page.click('#savePlan');
  assert.equal(await page.locator('[data-edit-plan]').count(), 2);
  await page.locator('[data-edit-plan]').nth(1).click();
  await page.click('#planMenu');
  await page.getByRole('button', { name: 'Plan löschen' }).click();
  await page.waitForSelector('.toast.show');
  assert.equal(await page.locator('[data-edit-plan]').count(), 1);
  await page.click('.toast-action');
  assert.equal(await page.locator('[data-edit-plan]').count(), 2);
});

test('no serious accessibility violations', async () => {
  const check = async (name) => {
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    await page.addScriptTag({ content: AXE });
    const result = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] }));
    const serious = result.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    assert.deepEqual(
      serious.map((v) => `${v.id}: ${v.nodes.length} nodes`),
      [],
      `${name} has accessibility violations`
    );
  };
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.evaluate(() => localStorage.removeItem('volumora-settings-v2'));
    await page.reload();
    await page.waitForSelector('.next-card');
    await check(`home/${scheme}`);
    await page.click('.next-card [data-start]');
    await page.waitForSelector('.workout-exercise');
    await check(`workout/${scheme}`);
    await page.click('#exitWorkout');
    await page.click('[data-nav="plans"]');
    await page.click('[data-edit-plan]');
    await page.click('[data-add-exercise="0"]');
    await page.waitForSelector('.exercise-library');
    await check(`library/${scheme}`);
    await page.keyboard.press('Escape');
    await page.click('[data-nav="plans"]');
    await page.click('[data-nav="analytics"]');
    await check(`analytics/${scheme}`);
    await page.click('[data-nav="more"]');
    await page.click('[data-nav="settings"]');
    await check(`settings/${scheme}`);
  }
});

// Seeds two finished sessions so analytics, records and history have something to show.
async function seedHistory() {
  await page.evaluate(() => {
    const plans = JSON.parse(localStorage.getItem('volumora-plans-v2'));
    const day = plans.items[0].days[0];
    const ex = day.exercises[0];
    const session = (id, dayKey, weight) => ({
      id,
      planId: plans.items[0].id,
      planName: plans.items[0].name,
      dayId: day.id,
      dayName: day.name,
      startedAt: `${dayKey}T09:00:00.000Z`,
      finishedAt: `${dayKey}T10:00:00.000Z`,
      day: dayKey,
      duration: 3600,
      totalSets: 2,
      volume: weight * 8 * 2,
      markers: { deload: false, ill: false, pain: false },
      entries: [
        {
          exerciseId: ex.id,
          name: ex.name,
          note: '',
          sets: [
            { weight: String(weight), reps: '8', rir: '', done: true, warmup: false },
            { weight: String(weight), reps: '8', rir: '', done: true, warmup: false },
          ],
        },
      ],
    });
    const today = new Date();
    const key = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const recent = new Date(today);
    const old = new Date(today);
    old.setDate(today.getDate() - 200);
    localStorage.setItem(
      'volumora-history-v2',
      JSON.stringify([session('s-recent', key(recent), 50), session('s-old', key(old), 40)])
    );
    localStorage.setItem('volumora-schema-version', '4');
  });
  await page.reload();
  await page.waitForSelector('.next-card');
}

test('analytics: time range scopes everything, charts show a tooltip, a session opens and can be edited or deleted', async () => {
  await seedHistory();
  await page.click('[data-nav="analytics"]');
  assert.equal(await page.locator('.row[data-session]').count(), 1, '3 months hides the 200-day-old session');
  await page.click('[data-range="all"]');
  assert.equal(await page.locator('.row[data-session]').count(), 2);
  assert.match(await page.textContent('.bar-list'), /Brust/);
  const canvas = page.locator('#volumeChart');
  const box = await canvas.boundingBox();
  await canvas.hover({ position: { x: box.width - 20, y: 100 } });
  await page.waitForSelector('.chart-tip:not([hidden])');
  assert.match(await page.textContent('.chart-tip strong'), /800 kg/);
  await page.locator('.row[data-session]').first().click();
  await page.waitForSelector('#sessionForm');
  assert.match(await page.textContent('h1'), /Push/);
  await page.fill('[data-edit="weight"][data-e="0"][data-s="0"]', '55');
  await page.click('#sessionForm button[type="submit"]');
  await page.waitForSelector('.toast.show');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-history-v2')));
  assert.equal(stored[0].entries[0].sets[0].weight, '55');
  assert.equal(stored[0].volume, 55 * 8 + 50 * 8, 'volume is recomputed');
  await page.click('#deleteSession');
  await page.waitForSelector('.row[data-session]');
  assert.equal(await page.locator('.row[data-session]').count(), 1);
  await page.click('.toast-action');
  assert.equal(await page.locator('.row[data-session]').count(), 2, 'undo restores the session');
  await page.click('[data-nav="calendar"]');
  await page.click('[data-calendar-shift="-1"]').catch(() => {});
  await page.click('[data-calendar-shift="0"]').catch(() => {});
  if (await page.locator('button.calendar-day[data-session]').count()) {
    await page.locator('button.calendar-day[data-session]').first().click();
    await page.waitForSelector('#sessionForm');
  }
});

test('workout: exercise history sheet and personal record toast', async () => {
  await seedHistory();
  await page.click('[data-start="push"]');
  await page.waitForSelector('.workout-exercise');
  await page.click('[data-exercise-history="0"]');
  await page.waitForSelector('.sheet-backdrop.show');
  assert.match(await page.textContent('.sheet-body'), /50×8 · 50×8/);
  await page.keyboard.press('Escape');
  const first = page.locator('.workout-exercise').first();
  await first.locator('input[data-set-field="weight"][data-index="0"]').fill('60');
  await first.locator('input[data-set-field="reps"][data-index="0"]').fill('8');
  await first.locator('[data-set-done="0"]').click();
  await page.waitForSelector('.toast.show');
  assert.match(await page.textContent('.toast'), /Neuer Bestwert: 60 kg × 8/);
  assert.equal(await first.locator('.set-label span.pr').count(), 1);
  await first.locator('input[data-set-field="weight"][data-index="1"]').fill('40');
  await first.locator('input[data-set-field="reps"][data-index="1"]').fill('8');
  await first.locator('[data-set-done="1"]').click();
  assert.equal(await first.locator('.set-label span.pr').count(), 1, 'a lighter set is not a record');
});

test('the homescreen shortcut opens the next workout', async () => {
  await page.goto(baseURL + '/?action=start');
  await page.waitForSelector('.workout-exercise');
  assert.equal(await page.evaluate(() => location.search), '', 'query is cleaned up');
});

test('units: pounds are shown everywhere and stored as kilograms; the plate calculator works', async () => {
  await seedHistory();
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="settings"]');
  await page.selectOption('select[name="unit"]', 'lbs');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('volumora-settings-v2')).unit === 'lbs');
  await page.click('[data-nav="home"]');
  await page.click('[data-start="push"]');
  await page.waitForSelector('.workout-exercise');
  const first = page.locator('.workout-exercise').first();
  assert.equal(await first.locator('.set-head span').nth(1).textContent(), 'lbs');
  assert.equal(
    await first.locator('input[data-set-field="weight"][data-index="0"]').inputValue(),
    '110.2',
    '50 kg shown as pounds'
  );
  await first.locator('input[data-set-field="weight"][data-index="0"]').fill('135');
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('volumora-active-v2')).entries[0].sets[0].weight
  );
  assert.equal(Math.round(Number(saved) * 10) / 10, 61.2, 'stored in kilograms');
  // The plate calculator appears on barbell exercises only.
  await first.locator('[data-exercise-menu="0"]').click();
  await page.waitForSelector('.sheet-backdrop.show');
  assert.equal(
    await page.getByRole('button', { name: 'Scheibenrechner' }).count(),
    0,
    'chest press machine has no plate calculator'
  );
  await page.keyboard.press('Escape');
  await page.waitForSelector('.sheet-backdrop', { state: 'detached' });
  await page.click('#exitWorkout');
  await page.click('[data-start="legs"]');
  await page.waitForSelector('.workout-exercise');
  const squat = page.locator('.workout-exercise').first();
  await squat.locator('input[data-set-field="weight"][data-index="0"]').fill('135');
  await squat.locator('[data-exercise-menu="0"]').click();
  await page.getByRole('button', { name: 'Scheibenrechner' }).click();
  await page.waitForSelector('#plateResult');
  assert.match(await page.textContent('#plateResult'), /45 lbs pro Seite/);
  assert.match(await page.textContent('#plateResult'), /1 × 45/);
  await page.keyboard.press('Escape');
});

test('home shows the weekly goal and streak', async () => {
  await seedHistory();
  assert.match(await page.textContent('.week-line'), /1 von 3/);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('volumora-settings-v2')) || {};
    s.weeklyGoal = 1;
    localStorage.setItem('volumora-settings-v2', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForSelector('.week-line');
  assert.match(await page.textContent('.week-line'), /1 von 1/);
  assert.match(await page.textContent('.week-line em'), /1 Woche in Folge/);
});
