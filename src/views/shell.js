// Top bar, bottom navigation and shared snippets.
import { icon } from '../icons.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';

const NAV = [
  ['home', 'Heute', 'home'],
  ['plans', 'Plan', 'plan'],
  ['analytics', 'Verlauf', 'chart'],
  ['more', 'Mehr', 'more'],
];

export const topbar = () => '';

export const nav = (active) =>
  `<nav class="bottom-nav" aria-label="Hauptnavigation"><div class="bottom-nav-inner">${NAV.map(
    ([view, label, ic]) =>
      `<button class="nav-btn ${active === view ? 'active' : ''}" data-nav="${view}" ${active === view ? 'aria-current="page"' : ''}><span>${icon(ic)}</span>${label}</button>`
  ).join('')}</div></nav>`;

export const mediaCredit = () =>
  `<footer class="media-credit">Übungsmedien: <a href="https://github.com/YaKohen/exercises-dataset" target="_blank" rel="noopener">Exercises Dataset</a></footer>`;
export const empty = (title, text) => `<div class="empty"><strong>${title}</strong><p>${text}</p></div>`;
export const backRow = (label, target) =>
  `<div class="backrow"><button class="back" data-nav="${target}" aria-label="Zurück">←</button><span>${label}</span></div>`;

export function bindShell() {
  document.onkeydown = null;
  document.querySelectorAll('[data-nav]').forEach((b) => {
    b.onclick = () => {
      if (b.dataset.nav === 'calendar' && state.view !== 'calendar') state.calendarOffset = 0;
      navigate(b.dataset.nav);
    };
  });
}
