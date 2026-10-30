// Shown right after a workout was saved: numbers, new records, muscle split, sharing.
import { plural, t } from '../i18n.js';
import { exerciseName, groupLabel } from '../library.js';
import { headlineKind, sessionRecords } from '../records.js';
import { navigate } from '../render.js';
import { describeSet } from '../sets.js';
import { shareText, summaryText } from '../share.js';
import { state } from '../state.js';
import { setsByGroup } from '../stats.js';
import { getHistory } from '../storage.js';
import { fmtVolume } from '../units.js';
import { esc, number } from '../util.js';
import * as home from './home.js';

// Headline records of the session with the set that achieved them.
function newRecords(session) {
  return sessionRecords(session)
    .filter((r) => r.kind === headlineKind(r.trackType))
    .map((r) => {
      const entry = session.entries.find((e) => (e.libraryId || e.exerciseId) === r.key);
      const best = entry?.sets.find((s) => s.pr) || entry?.sets[entry.sets.length - 1] || {};
      return { ...r, set: best, headline: true };
    });
}

export function view() {
  const session = getHistory().find((h) => h.id === state.sessionId);
  if (!session) {
    state.view = 'home';
    return home.view();
  }
  const records = newRecords(session);
  const groups = setsByGroup(session);
  const max = groups[0]?.sets || 1;
  return `<main class="shell narrow summary"><section class="page-head compact"><div><span class="next-label">${t('summary.title')}</span><h1>${esc(session.dayName)}</h1></div></section>
    <div class="stat-row"><div><b>${t('session.minutes', { n: Math.round(number(session.duration) / 60) })}</b><span>${t('session.duration')}</span></div><div><b>${fmtVolume(session.volume || 0)}</b><span>${t('session.volume')}</span></div><div><b>${number(session.totalSets)}</b><span>${t('session.sets')}</span></div></div>
    <section class="list-section"><h2>${t('summary.newRecords')}</h2>${
      records.length
        ? `<div class="list">${records.map((r) => `<div class="row"><span class="row-main"><b>${esc(exerciseName(r.item))}</b><small>${esc(describeSet(r.set, r.trackType))}</small></span><span class="chip chip-green">${t('workout.pr')}</span></div>`).join('')}</div>`
        : `<p class="muted">${t('summary.noRecords')}</p>`
    }</section>
    ${groups.length ? `<section class="chart-section"><h2>${t('summary.muscles')}</h2><div class="bar-list">${groups.map((g) => `<div class="bar-row"><span>${esc(groupLabel(g.group))}</span><div class="bar-track"><i style="width:${Math.max(4, (g.sets / max) * 100)}%"></i></div><b>${plural(g.sets, 'sets')}</b></div>`).join('')}</div></section>` : ''}
    <div class="preview-actions"><button class="primary" id="summaryDone">${t('summary.done')}</button><button class="secondary" id="summaryShare">${t('summary.share')}</button></div></main>`;
}

export function bind() {
  document
    .querySelector('#summaryDone')
    ?.addEventListener('click', () => navigate('home', {}, { replace: true }));
  document.querySelector('#summaryShare')?.addEventListener('click', () => {
    const session = getHistory().find((h) => h.id === state.sessionId);
    if (session) shareText(summaryText(session, newRecords(session)));
  });
}
