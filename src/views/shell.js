// Top bar, bottom navigation and shared snippets.
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';

const NAV = [
  ['home', 'nav.home', 'home'],
  ['plans', 'nav.plans', 'plan'],
  ['analytics', 'nav.history', 'chart'],
  ['more', 'nav.more', 'more'],
];

export const topbar = () => '';

export const nav = (active) =>
  `<nav class="bottom-nav" aria-label="${t('nav.aria')}"><div class="bottom-nav-inner">${NAV.map(
    ([view, label, ic]) =>
      `<button class="nav-btn ${active === view ? 'active' : ''}" data-nav="${view}" ${active === view ? 'aria-current="page"' : ''}><span>${icon(ic)}</span>${t(label)}</button>`
  ).join('')}</div></nav>`;

export const mediaCredit = () =>
  `<footer class="media-credit">${t('credit.media')} <a href="https://github.com/YaKohen/exercises-dataset" target="_blank" rel="noopener">Exercises Dataset</a> · <a href="https://exercisedb.dev" target="_blank" rel="noopener">ExerciseDB</a></footer>`;
export const empty = (title, text) => `<div class="empty"><strong>${title}</strong><p>${text}</p></div>`;
export const backRow = (label, target) =>
  `<div class="backrow"><button class="back" data-nav="${target}" aria-label="${t('common.back')}">←</button><span>${label}</span></div>`;

export function bindShell() {
  document.onkeydown = null;
  document.querySelectorAll('[data-nav]').forEach((b) => {
    b.onclick = () => {
      if (b.dataset.nav === 'calendar' && state.view !== 'calendar') state.calendarOffset = 0;
      navigate(b.dataset.nav);
    };
  });
}
