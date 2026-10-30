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
const SCHEMA = 7;
const BACKUP_VERSION = 5;
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
  context = await browser.newContext({ acceptDownloads: true, locale: 'de-DE' });
  // Every test starts as an installation that has already passed the first-run flow.
  await context.addInitScript(() => localStorage.setItem('volumora-onboarded', '1'));
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
  assert.equal(await kept.locator('[data-set-done="0"]').getAttribute('aria-pressed'), 'true');
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
  assert.equal(backup.version, BACKUP_VERSION);
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
  const { DEFAULT_SETTINGS } = await import('../src/storage.js');
  assert.deepEqual(settings, DEFAULT_SETTINGS);
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
  assert.equal(schema, SCHEMA);
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

// WCAG 2.0 A/AA check of the current page; only serious and critical violations fail.
const axeCheck = async (name) => {
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

test('no serious accessibility violations', async () => {
  const check = axeCheck;
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
  await page.evaluate((SCHEMA) => {
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
    // Before the record-flag migration (6), so the seeded sessions get their record flags on reload.
    localStorage.setItem('volumora-schema-version', '5');
  }, SCHEMA);
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
  // The first 50 kg set carries a record chip since the history migration flags it.
  assert.match(await page.textContent('.sheet-body'), /50×8(PR)? · 50×8/);
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

test('touch targets in the workout are at least 44px on a phone', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('.next-card [data-start]');
  await page.waitForSelector('.workout-exercise');
  const targets = [
    ['#exitWorkout', true],
    ['[data-exercise-menu]', true],
    ['[data-set-done="0"]', true],
    ['[data-add-set]', false],
    ['input[data-set-field="weight"][data-index="0"]', false],
  ];
  for (const [selector, checkWidth] of targets) {
    const box = await page.locator(selector).first().boundingBox();
    assert.ok(box && box.height >= 44, `${selector} is ${box?.height}px tall`);
    if (checkWidth) assert.ok(box.width >= 44, `${selector} is ${box.width}px wide`);
  }
});

test('the interface follows the device language and the language setting', async () => {
  await context.close();
  context = await browser.newContext({ locale: 'en-US' });
  await context.addInitScript(() => localStorage.setItem('volumora-onboarded', '1'));
  page = await context.newPage();
  await page.goto(baseURL + '/');
  await page.waitForSelector('.next-card');
  assert.equal(await page.textContent('.home-intro h1'), 'Today');
  assert.equal(await page.getAttribute('html', 'lang'), 'en');
  assert.match(await page.textContent('.bottom-nav'), /History/);
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="settings"]');
  await page.selectOption('select[name="language"]', 'de');
  await page.waitForFunction(() => document.documentElement.lang === 'de');
  await page.click('[data-nav="home"]');
  assert.equal(await page.textContent('.home-intro h1'), 'Heute');
  await page.reload();
  await page.waitForSelector('.next-card');
  assert.equal(await page.textContent('.home-intro h1'), 'Heute', 'the setting survives a reload');
});

test('the browser back button closes overlays first and then steps back through views', async () => {
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="settings"]');
  await page.waitForSelector('#settingsForm');
  await page.goBack();
  await page.waitForSelector('#installRow');
  assert.equal(await page.locator('#settingsForm').count(), 0, 'back leaves the settings view');
  await page.click('[data-nav="plans"]');
  await page.click('#newPlan');
  await page.waitForSelector('.sheet-backdrop.show');
  await page.goBack();
  await page.waitForSelector('.sheet-backdrop', { state: 'detached' });
  assert.equal(await page.locator('#newPlan').count(), 1, 'back only closed the sheet');
  // Closing a sheet with its own control leaves no dead history entry behind.
  await page.click('#newPlan');
  await page.waitForSelector('.sheet-backdrop.show');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.sheet-backdrop', { state: 'detached' });
  await page.waitForTimeout(50);
  await page.goBack();
  await page.waitForSelector('#installRow');
  // The exercise library behaves the same way.
  await page.click('[data-nav="plans"]');
  await page.click('[data-edit-plan]');
  await page.click('[data-add-exercise="0"]');
  await page.waitForSelector('.exercise-library');
  await page.goBack();
  await page.waitForSelector('.exercise-library', { state: 'detached' });
  assert.equal(await page.locator('#savePlan').count(), 1, 'still in the editor');
});

test('charts follow the viewport width', async () => {
  await seedHistory();
  await page.click('[data-nav="analytics"]');
  await page.waitForSelector('#volumeChart');
  const before = await page.locator('#volumeChart').evaluate((c) => c.width);
  await page.setViewportSize({ width: 520, height: 800 });
  await page.waitForFunction((w) => document.querySelector('#volumeChart').width !== w, before);
});

test('first run: the onboarding builds a plan from language, unit, goal and days', async () => {
  await context.close();
  context = await browser.newContext({ locale: 'de-DE' });
  page = await context.newPage();
  await page.goto(baseURL + '/');
  await page.waitForSelector('#onboardingForm');
  await axeCheck('onboarding');
  await page.check('input[name="language"][value="en"]');
  await page.waitForSelector('input[name="language"][value="en"]:checked');
  assert.match(await page.textContent('.assistant-hero h1'), /Welcome/);
  await page.click('#onboardingForm button[type="submit"]');
  await page.check('input[name="unit"][value="lbs"]');
  await page.click('#onboardingForm button[type="submit"]');
  await page.check('input[name="goal"][value="strength"]');
  await page.check('input[name="level"][value="intermediate"]');
  await page.click('#onboardingForm button[type="submit"]');
  await page.selectOption('select[name="days"]', '4');
  await page.click('#onboardingForm button[type="submit"]');
  assert.match(await page.textContent('.preview-head h1'), /Upper\/lower · 4 days/);
  await page.click('#onboardingUse');
  await page.waitForSelector('.next-card');
  assert.match(await page.textContent('.home-intro p'), /Upper\/lower · 4 days/);
  const stored = await page.evaluate(() => ({
    onboarded: localStorage.getItem('volumora-onboarded'),
    settings: JSON.parse(localStorage.getItem('volumora-settings-v2')),
    plans: JSON.parse(localStorage.getItem('volumora-plans-v2')),
  }));
  assert.equal(stored.onboarded, '1');
  assert.equal(stored.settings.unit, 'lbs');
  assert.equal(stored.settings.language, 'en');
  assert.equal(stored.plans.items.length, 1, 'only the generated plan');
  assert.equal(stored.plans.items[0].days.length, 4);
});

test('first run: skipping the onboarding starts with the default plan', async () => {
  await context.close();
  context = await browser.newContext({ locale: 'de-DE' });
  page = await context.newPage();
  await page.goto(baseURL + '/');
  await page.waitForSelector('#onboardingSkip');
  await page.click('#onboardingSkip');
  await page.waitForSelector('.next-card');
  assert.match(await page.textContent('.home-intro p'), /Push · Pull · Legs/);
  await page.reload();
  await page.waitForSelector('.next-card');
  assert.equal(await page.locator('#onboardingForm').count(), 0, 'the flow shows only once');
});

test('exercise picker: folded multi-word search, equipment and group filters, detail sheet', async () => {
  await page.click('[data-nav="plans"]');
  await page.click('[data-edit-plan]');
  await page.click('[data-add-exercise="0"]');
  await page.waitForSelector('.exercise-library');
  await page.fill('#librarySearch', 'ruecken kabel');
  const visible = page.locator('.library-item:not([hidden])');
  assert.ok((await visible.count()) >= 1, 'umlaut-free query finds Rücken exercises');
  assert.match(await visible.first().textContent(), /Rücken · Kabelzug/);
  await page.fill('#librarySearch', '');
  await page.selectOption('#libraryEquipment', 'body weight');
  const equipment = await page
    .locator('.library-item:not([hidden])')
    .evaluateAll((els) => els.map((e) => e.dataset.equipment));
  assert.ok(equipment.length > 0 && equipment.every((e) => e === 'body weight'));
  await page.click('[data-library-category="legs"]');
  const groups = await page
    .locator('.library-item:not([hidden])')
    .evaluateAll((els) => els.map((e) => e.dataset.group));
  assert.ok(groups.length > 0 && groups.every((g) => g === 'legs'));
  await page.locator('.library-item:not([hidden]) [data-library-info]').first().click();
  await page.waitForSelector('.sheet-backdrop.show');
  assert.match(await page.textContent('.sheet-body'), /Beine · Körpergewicht/);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.sheet-backdrop', { state: 'detached' });
  assert.equal(await page.locator('.exercise-library').count(), 1, 'the picker stays open under the sheet');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.exercise-library').count(), 0);
});

test('bodyweight and timed exercises: reps-only sets count, set types can be changed', async () => {
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('volumora-plans-v2'));
    const day = data.items[0].days[0];
    day.exercises.unshift({
      id: 'bw-test',
      libraryId: '0662',
      name: 'Push-up',
      sets: 2,
      range: '8–12',
      gif: '',
      note: '',
    });
    day.exercises.unshift({
      id: 'time-test',
      name: 'Plank',
      sets: 1,
      range: '30–60',
      gif: '',
      note: '',
      custom: true,
      trackType: 'time',
    });
    localStorage.setItem('volumora-plans-v2', JSON.stringify(data));
  });
  await page.reload();
  await page.waitForSelector('.next-card');
  await page.click('[data-start="push"]');
  await page.waitForSelector('.workout-exercise');
  const plank = page.locator('.workout-exercise').nth(0);
  assert.equal(await plank.locator('.set-head span').nth(1).textContent(), 'Zeit');
  await plank.locator('input[data-set-field="time"][data-index="0"]').fill('1:30');
  await plank.locator('[data-set-done="0"]').click();
  const pushup = page.locator('.workout-exercise').nth(1);
  assert.equal(await pushup.locator('.set-head span').nth(1).textContent(), '+kg');
  await pushup.locator('input[data-set-field="reps"][data-index="0"]').fill('12');
  await pushup.locator('[data-set-done="0"]').click();
  // The plank's record toast may still be showing; wait for the push-up's.
  await page.waitForFunction(() => document.querySelector('.toast')?.textContent.includes('12 Wdh.'));
  assert.match(await page.textContent('.toast'), /Neuer Bestwert: 12 Wdh\./);
  await pushup.locator('[data-set-type="1"]').click();
  await page.getByRole('button', { name: 'Dropsatz' }).click();
  assert.equal(await pushup.locator('[data-set-type="1"] b').textContent(), 'D');
  const active = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-active-v2')));
  assert.equal(active.entries[0].trackType, 'time');
  assert.equal(active.entries[0].sets[0].time, '90');
  assert.equal(active.entries[0].sets[0].done, true);
  assert.equal(active.entries[1].trackType, 'reps');
  assert.equal(active.entries[1].sets[1].type, 'drop');
  await page.click('#finishWorkout');
  await page.waitForSelector('.summary');
  await page.click('#summaryDone');
  await page.waitForSelector('.next-card');
  await page.click('[data-nav="analytics"]');
  await page.waitForSelector('.row[data-session]');
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-history-v2')));
  assert.equal(history[0].entries[0].sets[0].time, '90');
  assert.equal(history[0].volume, 0, 'bodyweight and timed sets add no weight volume');
  await page.locator('.row[data-session]').first().click();
  await page.waitForSelector('#sessionForm');
  assert.equal(await page.inputValue('[data-edit="time"][data-e="0"][data-s="0"]'), '1:30');
});

test('finishing a workout shows the summary with records and sharing; the records screen lists bests', async () => {
  await context.addInitScript(() => {
    window.__shared = [];
    navigator.share = (data) => {
      window.__shared.push(data);
      return Promise.resolve();
    };
  });
  await seedHistory();
  const seeded = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-history-v2')));
  assert.equal(seeded[0].entries[0].sets[0].pr, true, 'migration flags the 50 kg set as a record');
  assert.equal(seeded[0].entries[0].sets[1].pr, false);
  await page.click('[data-start="push"]');
  await page.waitForSelector('.workout-exercise');
  const first = page.locator('.workout-exercise').first();
  await first.locator('input[data-set-field="weight"][data-index="0"]').fill('60');
  await first.locator('input[data-set-field="reps"][data-index="0"]').fill('8');
  await first.locator('[data-set-done="0"]').click();
  await page.click('#finishWorkout');
  await page.waitForSelector('.summary');
  assert.match(await page.textContent('.summary .list'), /Brustpresse/);
  assert.match(await page.textContent('.summary .list'), /60 kg × 8/);
  assert.match(await page.textContent('.summary .bar-list'), /Brust/);
  await page.click('#summaryShare');
  await page.waitForFunction(() => window.__shared.length === 1);
  const shared = await page.evaluate(() => window.__shared[0].text);
  assert.match(shared, /Volumora · Push/);
  assert.match(shared, /Brustpresse 60 kg × 8/);
  await page.click('#summaryDone');
  await page.waitForSelector('.next-card');
  await page.click('[data-nav="analytics"]');
  await page.click('[data-nav="records"]');
  await page.waitForSelector('[data-record]');
  assert.match(await page.textContent('[data-record]'), /Brustpresse/);
  assert.match(await page.textContent('[data-record]'), /Max\. Gewicht 60 kg/);
  await page.click('[data-record]');
  await page.waitForSelector('.sheet-backdrop.show');
  assert.match(await page.textContent('.exercise-records'), /1RM ≈/);
});

test('free workout: add, reorder, remove and undo exercises, then save it as a plan day', async () => {
  await page.click('#startFree');
  await page.waitForSelector('#addSessionExercise');
  assert.equal(await page.locator('.workout-exercise').count(), 0);
  await page.click('#addSessionExercise');
  await page.waitForSelector('.exercise-library');
  await page.click('[data-pick-exercise="0025"]');
  await page.click('[data-pick-exercise="0662"]');
  await page.click('#closeLibraryBottom');
  await page.waitForSelector('.exercise-library', { state: 'detached' });
  assert.equal(await page.locator('.workout-exercise').count(), 2);
  await page.click('[data-exercise-menu="1"]');
  await page.getByRole('button', { name: 'Nach oben' }).click();
  const first = page.locator('.workout-exercise').first();
  assert.equal(await first.locator('.set-head span').nth(1).textContent(), '+kg', 'the push-up moved up');
  await page.click('[data-exercise-menu="0"]');
  await page.getByRole('button', { name: 'Aus Training entfernen' }).click();
  assert.equal(await page.locator('.workout-exercise').count(), 1);
  await page.click('.toast-action');
  assert.equal(await page.locator('.workout-exercise').count(), 2, 'undo restores the exercise');
  await first.locator('input[data-set-field="reps"][data-index="0"]').fill('10');
  await first.locator('[data-set-done="0"]').click();
  await page.click('#exitWorkout');
  await page.waitForSelector('.resume-card');
  assert.match(await page.textContent('.resume-card h2'), /Freies Training/);
  await page.click('#startFree');
  await page.waitForSelector('.workout-exercise');
  await page.click('#finishWorkout');
  await page.waitForSelector('#summarySaveDay');
  await page.click('#summarySaveDay');
  await page.waitForSelector('.toast.show');
  const plans = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-plans-v2')));
  assert.equal(plans.items[0].days.length, 4);
  assert.equal(plans.items[0].days[3].exercises.length, 2);
  assert.equal(plans.items[0].days[3].name, 'Freies Training');
});

test('supersets: linked exercises rest after the round, not in between', async () => {
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('volumora-settings-v2')) || {};
    s.restTimer = true;
    localStorage.setItem('volumora-settings-v2', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForSelector('.next-card');
  await page.click('[data-nav="plans"]');
  await page.click('[data-edit-plan]');
  await page.click('[data-exercise-menu="0:0"]');
  await page.getByRole('button', { name: /Mit nächster Übung verbinden/ }).click();
  assert.equal(await page.locator('.plan-exercise-row .superset-tag').count(), 2);
  await page.click('#savePlan');
  await page.click('[data-nav="home"]');
  await page.click('[data-start="push"]');
  await page.waitForSelector('.workout-exercise.superset-first');
  const first = page.locator('.workout-exercise').nth(0);
  const second = page.locator('.workout-exercise').nth(1);
  await first.locator('input[data-set-field="weight"][data-index="0"]').fill('40');
  await first.locator('input[data-set-field="reps"][data-index="0"]').fill('8');
  await first.locator('[data-set-done="0"]').click();
  assert.equal(await page.locator('#restTimer.show').count(), 0, 'no rest inside the superset');
  await second.locator('input[data-set-field="weight"][data-index="0"]').fill('40');
  await second.locator('input[data-set-field="reps"][data-index="0"]').fill('8');
  await second.locator('[data-set-done="0"]').click();
  await page.waitForSelector('#restTimer.show');
});

test('a plan can be created from a template', async () => {
  await page.click('[data-nav="plans"]');
  await page.click('#newPlan');
  await page.getByRole('button', { name: /Vorlage wählen/ }).click();
  await page.waitForSelector('[data-template="full3"]');
  await page.click('[data-template="full3"]');
  await page.waitForSelector('#useTemplate');
  assert.match(await page.textContent('.preview-head h1'), /Ganzkörper · 3 Tage/);
  assert.equal(await page.locator('.plan-preview article').count(), 3);
  await page.click('#useTemplate');
  await page.waitForSelector('.next-card');
  assert.match(await page.textContent('.home-intro p'), /Ganzkörper · 3 Tage/);
  await page.click('[data-nav="plans"]');
  assert.equal(await page.locator('[data-edit-plan]').count(), 2);
});

test('custom exercises: promoted from old plans, created in the picker, managed in More, kept in backups', async () => {
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('volumora-plans-v2'));
    data.items[0].days[0].exercises.push({
      id: 'legacy-custom',
      name: 'Seilspringen',
      sets: 2,
      range: '8–12',
      gif: '',
      note: '',
      custom: true,
      category: 'other',
    });
    localStorage.setItem('volumora-plans-v2', JSON.stringify(data));
    localStorage.setItem('volumora-schema-version', '6');
  });
  await page.reload();
  await page.waitForSelector('.next-card');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-custom-exercises-v1')));
  assert.equal(store.length, 1, 'the plan-level custom exercise moved into the store');
  assert.equal(store[0].name, 'Seilspringen');
  const migrated = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('volumora-plans-v2')).items[0].days[0].exercises.at(-1)
  );
  assert.equal(migrated.libraryId, 'legacy-custom');
  assert.equal(migrated.custom, undefined);
  await page.click('[data-nav="plans"]');
  await page.click('[data-edit-plan]');
  assert.match(await page.textContent('.plan-exercise-row:last-child h3'), /Seilspringen/);
  await page.click('[data-add-exercise="0"]');
  await page.waitForSelector('.exercise-library');
  await page.click('#addCustomExercise');
  await page.waitForSelector('#customForm');
  await page.fill('#customForm [name="name"]', 'Farmer Walk');
  await page.selectOption('#customForm [name="category"]', 'legs');
  await page.selectOption('#customForm [name="trackType"]', 'distance_time');
  await page.click('#customForm button[type="submit"]');
  await page.waitForSelector('.sheet-backdrop', { state: 'detached' });
  assert.equal(await page.locator('.library-item[data-custom]').count(), 2);
  await page.click('#closeLibraryBottom');
  await page.click('#savePlan');
  const plans = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-plans-v2')));
  const added = plans.items[0].days[0].exercises.at(-1);
  assert.equal(added.name, 'Farmer Walk');
  assert.ok(added.libraryId, 'linked to the stored custom exercise');
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="backup"]');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#exportJson')]);
  const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.equal(backup.customExercises.length, 2);
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="customExercises"]');
  await page.waitForSelector('[data-custom-exercise]');
  assert.equal(await page.locator('[data-custom-exercise]').count(), 2);
  await page.locator('[data-custom-exercise]').first().click();
  await page.getByRole('button', { name: 'Löschen' }).click();
  assert.equal(await page.locator('[data-custom-exercise]').count(), 1);
  await page.click('.toast-action');
  assert.equal(await page.locator('[data-custom-exercise]').count(), 2, 'undo restores it');
});

test('editor: drag to reorder, duplicate a day, move an exercise to another day', async () => {
  await page.click('[data-nav="plans"]');
  await page.click('[data-edit-plan]');
  await page.waitForSelector('.plan-exercise-row');
  const names = () => page.locator('.plan-exercise-row h3').allTextContents();
  const before = await names();
  await page.locator('[data-drag="0"]').dragTo(page.locator('.plan-exercise-row[data-ex-index="2"]'), {
    targetPosition: { x: 10, y: 50 },
  });
  await page.waitForFunction(
    (first) => document.querySelector('.plan-exercise-row h3')?.textContent !== first,
    before[0]
  );
  const after = await names();
  assert.equal(after[0], before[1], 'the first exercise moved down');
  assert.ok(after.includes(before[0]));
  await page.click('[data-day-menu="0"]');
  await page.getByRole('button', { name: 'Tag duplizieren' }).click();
  await page.waitForSelector('[data-editor-day="3"].active');
  assert.match(await page.inputValue('.day-name'), /Push – Kopie/);
  await page.click('[data-exercise-menu="3:0"]');
  await page.getByRole('button', { name: 'In anderen Tag verschieben' }).click();
  await page.waitForSelector('.sheet-backdrop.show');
  await page.locator('.sheet .action-item', { hasText: /^Pull$/ }).click();
  await page.waitForSelector('.toast.show');
  const plans = await page.evaluate(() => JSON.parse(localStorage.getItem('volumora-plans-v2')));
  assert.equal(plans.items[0].days.length, 4);
  assert.equal(plans.items[0].days[3].exercises.length, 4);
  assert.equal(plans.items[0].days[1].exercises.length, 6);
});

test('analytics: sets per week with a four-week toggle, weekly charts and the record timeline', async () => {
  await seedHistory();
  await page.click('[data-nav="analytics"]');
  await page.waitForSelector('.weekly-sets');
  assert.match(await page.textContent('.weekly-sets'), /Brust/);
  assert.match(await page.textContent('.weekly-sets .bar-row b'), /^2$/);
  await page.click('[data-week-mode="avg"]');
  await page.waitForSelector('[data-week-mode="avg"].active');
  assert.match(await page.textContent('.weekly-sets .bar-row b'), /0,5/);
  assert.ok(await page.locator('#weeklyVolumeChart').evaluate((c) => c.width > 0));
  assert.ok(await page.locator('#frequencyChart').evaluate((c) => c.width > 0));
  await page.click('[data-range="all"]');
  await page.waitForSelector('[data-session-record] .chip-green');
  assert.match(await page.textContent('[data-session-record] .chip-green'), /Bestwert/);
});

test('the 1RM calculator estimates from a set and lists percentages', async () => {
  await page.click('[data-start="push"]');
  await page.waitForSelector('.workout-exercise');
  await page.locator('.workout-exercise').first().locator('[data-exercise-menu="0"]').click();
  await page.getByRole('button', { name: '1RM-Rechner' }).click();
  await page.waitForSelector('#oneRmResult');
  await page.fill('#oneRmWeight', '100');
  await page.fill('#oneRmReps', '5');
  assert.match(await page.textContent('#oneRmResult'), /117 kg/);
  assert.equal(await page.locator('.onerm-table > div').count(), 9);
  assert.match(await page.textContent('.onerm-table > div:nth-child(5)'), /80 %/);
});

test('legal page in both languages, then deleting all data returns to the first-run flow', async () => {
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="legal"]');
  await page.waitForSelector('.legal');
  assert.match(await page.textContent('.legal'), /GitHub Pages/);
  assert.match(await page.textContent('.legal'), /Impressum/);
  await axeCheck('legal');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('volumora-settings-v2')) || {};
    s.language = 'en';
    localStorage.setItem('volumora-settings-v2', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForSelector('.next-card');
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="legal"]');
  assert.match(await page.textContent('.legal'), /Privacy/);
  // A context without the onboarding seed, so the wipe really lands on the first-run flow.
  await context.close();
  context = await browser.newContext({ locale: 'de-DE' });
  page = await context.newPage();
  await page.goto(baseURL + '/');
  await page.waitForSelector('#onboardingForm');
  await page.click('#onboardingSkip');
  await page.waitForSelector('.next-card');
  await seedHistory();
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="settings"]');
  await page.click('#deleteAll');
  await page.click('.sheet [data-ok]');
  await page.waitForSelector('#onboardingForm');
  const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('volumora')));
  assert.deepEqual(
    left.filter((k) => !['volumora-settings-v2', 'volumora-schema-version'].includes(k)),
    [],
    'only the fresh defaults remain'
  );
});

test('a Hevy export merges into the history and unknown exercises become custom ones', async () => {
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="backup"]');
  const file = path.join(__dirname, 'fixtures', 'hevy.csv');
  await page.setInputFiles('#importCsv', file);
  await page.waitForSelector('.sheet-backdrop.show');
  assert.match(await page.textContent('.sheet'), /2 Trainings importieren\?/);
  assert.match(await page.textContent('.sheet'), /Quelle: Hevy/);
  await page.click('.sheet [data-ok]');
  await page.waitForSelector('.sheet-backdrop.show', { state: 'detached' });
  await page.waitForFunction(() =>
    /2 Trainings importiert/.test(document.querySelector('.toast')?.textContent || '')
  );
  // The same file again adds nothing.
  await page.setInputFiles('#importCsv', file);
  await page.waitForSelector('.sheet-backdrop.show');
  await page.click('.sheet [data-ok]');
  await page.waitForFunction(() =>
    /schon vorhanden/.test(document.querySelector('.toast')?.textContent || '')
  );
  await page.click('[data-nav="analytics"]');
  // The fixture is from 2024: widen the range to everything.
  await page.click('[data-range="all"]');
  await page.waitForSelector('[data-session]');
  assert.equal(await page.locator('[data-session]').count(), 2);
  assert.match(await page.textContent('main'), /Push Day/);
  await page.click('[data-nav="more"]');
  await page.click('[data-nav="customExercises"]');
  await page.waitForSelector('[data-custom-exercise]');
  assert.match(await page.textContent('[data-custom-exercise]'), /Banded Face Pull Special/);
});
