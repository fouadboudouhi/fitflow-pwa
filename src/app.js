// Entry point: storage migrations, theme, service worker and the first render.
import { navigate, render } from './render.js';
import { nextSession } from './plans.js';
import { state } from './state.js';
import { activePlan, getHistory, getRestUntil, migratePhotos, runMigrations } from './storage.js';
import { applyTheme } from './theme.js';
import { getSettings } from './storage.js';

runMigrations();
applyTheme();
state.restUntil = getRestUntil();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.installPrompt = e;
  render();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (getSettings().theme === 'auto') applyTheme();
});

if ('serviceWorker' in navigator) {
  let refreshing = false;
  let hadController = !!navigator.serviceWorker.controller;
  // A new worker took over: reload to run the new code. Not on the very first install (nothing to update yet)
  // and not while a workout is open; then the reload waits until the user leaves the workout view.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing) return;
    if (state.view === 'workout') {
      state.reloadPending = true;
      return;
    }
    refreshing = true;
    location.reload();
  });
  window.addEventListener('load', () =>
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => reg.update())
      .catch(() => {})
  );
}

// A GIF that cannot be loaded (offline before first use, dead link) keeps its dark box instead of a broken-image icon.
document.addEventListener(
  'error',
  (e) => {
    if (e.target?.classList?.contains('exercise-gif')) e.target.classList.add('missing');
  },
  true
);

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('pageshow', () => window.scrollTo(0, 0));

render();
// Homescreen shortcut: jump straight into the next session.
if (new URLSearchParams(location.search).get('action') === 'start') {
  history.replaceState(null, '', location.pathname);
  const plan = activePlan();
  const { day } = nextSession(plan, getHistory());
  if (day?.exercises.length) navigate('workout', { planId: plan.id, dayId: day.id });
}
migratePhotos().then((migrated) => {
  if (migrated && state.view === 'body') render();
});
