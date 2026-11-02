// The voluntary effort rating and the calorie estimate of a finished workout, on its summary and in its details. They
// change in place, so unsaved edits in the session form stay as they are.
import { caloriesOf } from '../calories.js';
import { fmtNumber, t } from '../i18n.js';
import { navigate } from '../render.js';
import { getHistory, saveHistory } from '../storage.js';
import { esc } from '../util.js';

const STEPS = [1, 2, 3, 4, 5];

const inner = (session) => {
  const calories = caloriesOf(session);
  return `<p class="session-calories">${
    calories === null
      ? `<button type="button" class="text-btn" data-nav-body>${t('calories.needWeight')}</button>`
      : calories === 0
        ? `<span class="muted">${t('calories.tiny')}</span>`
        : `<b>${t('calories.value', { n: fmtNumber(calories) })}</b> <span class="muted">${t('calories.hint')}</span>`
  }</p><h2 id="effortTitle">${t('effort.title')}</h2><div class="effort-steps" role="group" aria-labelledby="effortTitle">${STEPS.map(
    (n) =>
      `<button type="button" data-effort="${n}" aria-pressed="${session.effort === n}">${esc(t(`effort.${n}`))}</button>`
  ).join('')}</div>`;
};

export const effortHtml = (session) =>
  `<section class="session-extras" id="sessionExtras">${inner(session)}</section>`;

export function bindEffort(sessionId) {
  const box = document.querySelector('#sessionExtras');
  box?.addEventListener('click', (e) => {
    if (e.target.closest('[data-nav-body]')) return navigate('body');
    const button = e.target.closest('[data-effort]');
    if (!button) return;
    const history = getHistory();
    const session = history.find((h) => h.id === sessionId);
    if (!session) return;
    const value = Number(button.dataset.effort);
    // Tapping the chosen step again takes the rating back.
    if (session.effort === value) delete session.effort;
    else session.effort = value;
    saveHistory(history);
    box.innerHTML = inner(session);
  });
}
