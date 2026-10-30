import { getSettings, saveSettings } from './storage.js';

export function applyTheme() {
  const setting = getSettings().theme;
  const theme =
    setting === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : setting;
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#000000' : '#f2f2f7');
}
export function toggleTheme() {
  const settings = getSettings();
  settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  saveSettings(settings);
  applyTheme();
}
