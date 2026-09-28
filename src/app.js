// Entry point: storage migrations, theme, service worker and the first render.
import { render } from './render.js';
import { state } from './state.js';
import { migratePhotos, runMigrations } from './storage.js';
import { applyTheme } from './theme.js';
import { getSettings } from './storage.js';

runMigrations();
applyTheme();

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

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('pageshow', () => window.scrollTo(0, 0));

render();
migratePhotos().then((migrated) => {
  if (migrated && state.view === 'body') render();
});
