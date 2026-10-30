// A finished workout: review, correct sets, or delete it.
import { plural, t } from '../i18n.js';
import { exerciseName } from '../library.js';
import { navigate, render } from '../render.js';
import { parseDuration, setType, setTypeMark } from '../sets.js';
import { state } from '../state.js';
import { getHistory } from '../storage.js';
import { toast, undoToast } from '../ui.js';
import { fmtVolume, fromDisplay } from '../units.js';
import { clone, esc, fmtLong, isWorkSet, number } from '../util.js';
import { deleteSession, entryTrackType, restoreSession, saveEditedSession } from '../workout.js';
import * as analytics from './analytics.js';
import { fieldDisplay, setColumns } from './setRow.js';
import { backRow } from './shell.js';

const input = (name, label, attrs, set, ei, si) =>
  `<input type="${name === 'time' ? 'text' : 'number'}" ${attrs} aria-label="${esc(label)}" data-edit="${name}" data-e="${ei}" data-s="${si}" value="${esc(fieldDisplay(name, set))}">`;

const setRow = (set, si, ei, showRir, trackType, workNumber) => {
  const type = setType(set);
  return `<div class="edit-set ${set.done ? 'done' : ''} ${type !== 'normal' ? type : ''}"><span class="set-label"><b>${setTypeMark(set) || workNumber}</b>${set.pr ? `<i class="pr-chip">${t('workout.pr')}</i>` : ''}</span>${setColumns(
    trackType
  )
    .map(([name, label, attrs]) => input(name, label, attrs, set, ei, si))
    .join(
      ''
    )}${showRir ? input('rir', t('workout.rir'), 'inputmode="numeric" min="0" max="10"', set, ei, si) : ''}<label class="edit-done"><input type="checkbox" data-edit="done" data-e="${ei}" data-s="${si}" ${set.done ? 'checked' : ''}><span>${t('session.done')}</span></label></div>`;
};

export function view() {
  const session = getHistory().find((h) => h.id === state.sessionId);
  if (!session) {
    state.view = 'analytics';
    return analytics.view();
  }
  const showRir = session.entries.some((e) => e.sets.some((s) => s.rir !== '' && s.rir !== undefined));
  const markers = [
    session.markers?.deload ? t('marker.deload') : '',
    session.markers?.ill ? t('marker.ill') : '',
    session.markers?.pain ? t('marker.pain') : '',
  ].filter(Boolean);
  const records = session.entries.reduce((n, e) => n + e.sets.filter((s) => s.pr).length, 0);
  return `<main class="shell narrow">${backRow(t('session.title'), 'analytics')}
    <section class="page-head compact"><div><h1>${esc(session.dayName || t('session.title'))}</h1><p>${fmtLong(session.day || session.finishedAt)} · ${esc(session.planName || '')}</p></div></section>
    <div class="stat-row"><div><b>${fmtVolume(session.volume || 0)}</b><span>${t('session.volume')}</span></div><div><b>${number(session.totalSets)}</b><span>${t('session.sets')}</span></div><div><b>${t('session.minutes', { n: Math.round(number(session.duration) / 60) })}</b><span>${t('session.duration')}</span></div></div>
    ${markers.length || records ? `<div class="chip-row">${markers.map((m) => `<span class="chip">${m}</span>`).join('')}${records ? `<span class="chip chip-green">${plural(records, 'records')}</span>` : ''}</div>` : ''}
    <form id="sessionForm" class="session-edit">${session.entries
      .map((e, ei) => {
        const trackType = entryTrackType(e);
        return `<section class="edit-exercise"><h2>${esc(exerciseName(e))}</h2><div class="edit-head"><span>${t('workout.set')}</span>${setColumns(
          trackType
        )
          .map(([, label]) => `<span>${esc(label)}</span>`)
          .join('')}${showRir ? `<span>${t('workout.rir')}</span>` : ''}<span></span></div>${e.sets
          .map((s, si) =>
            setRow(s, si, ei, showRir, trackType, e.sets.slice(0, si).filter(isWorkSet).length + 1)
          )
          .join('')}${e.note ? `<p class="coach-note">${esc(e.note)}</p>` : ''}</section>`;
      })
      .join('')}
    <div class="editor-footer"><button type="button" class="secondary danger" id="deleteSession">${t('common.delete')}</button><button class="primary" type="submit">${t('common.save')}</button></div></form></main>`;
}

export function bind() {
  document.querySelector('#sessionForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const session = clone(getHistory().find((h) => h.id === state.sessionId));
    if (!session) return;
    document.querySelectorAll('[data-edit]').forEach((field) => {
      const set = session.entries[number(field.dataset.e)]?.sets[number(field.dataset.s)];
      if (!set) return;
      const name = field.dataset.edit;
      set[name] =
        field.type === 'checkbox'
          ? field.checked
          : name === 'weight'
            ? fromDisplay(field.value)
            : name === 'time'
              ? parseDuration(field.value)
              : field.value;
    });
    saveEditedSession(session);
    render();
    toast(t('workout.saved'));
  });
  document.querySelector('#deleteSession')?.addEventListener('click', () => {
    const result = deleteSession(state.sessionId);
    if (!result) return;
    navigate('analytics');
    undoToast(t('session.deleted'), () => {
      restoreSession(result.removed, result.index);
      render();
    });
  });
}
