// End-to-end smoke tests against the real app in Chromium. Run with `npm test`.
const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'),
  os = require('os'),
  path = require('path');
const { chromium } = require('playwright');
const { createServer } = require('./serve.js');

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
  assert.equal(await page.textContent('.home-intro .eyebrow'), 'Push · Pull · Legs');
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
  await page.click('[data-remove-exercise="0:0"]');
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
  await page.click('#planAssistant');
  await page.check('input[name="goal"][value="strength"]');
  await page.selectOption('select[name="days"]', '4');
  await page.click('#assistantForm button[type="submit"]');
  await page.check('input[name="scheduleMode"][value="fixed"]');
  await page.click('#assistantScheduleForm button[type="submit"]');
  assert.match(await page.textContent('.preview-head h1'), /Kraft · 4 Tage/);
  await page.click('#useSuggestedPlan');
  await page.waitForSelector('.next-card');
  assert.equal(await page.textContent('.home-intro .eyebrow'), 'Kraft · 4 Tage');
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
  await page.waitForSelector('.home-intro');
  for (const view of ['plans', 'analytics', 'calendar', 'more', 'body', 'more', 'settings']) {
    await page.click(`[data-nav="${view}"]`);
    await page.waitForTimeout(50);
  }
  await page.click('[data-nav="plans"]');
  await page.click('[data-edit-plan]');
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
  assert.deepEqual(settings, { theme: 'auto', rest: 90, increment: 2.5, showRir: false, restTimer: false });
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
  await page.click('[data-add-exercise="0"]');
  await page.fill('#librarySearch', 'Bankdrücken mit Langhantel');
  await page.click('.library-item:not([hidden]) [data-pick-exercise="0025"]');
  await page.click('#closeLibraryBottom');
  await page.click('#savePlan');
  await page.click('[data-activate-plan]');
  await page.click('[data-nav="home"]');
  await page.click('.next-card [data-start]');
  await page.waitForSelector('.workout-exercise');
  assert.equal(
    await page.inputValue('.workout-exercise input[data-set-field="weight"][data-index="0"]'),
    '60'
  );
  assert.match(await page.textContent('.progression-row b'), /60 kg/);
});
