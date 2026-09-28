// A finished workout: review, correct sets, or delete it.
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { getHistory } from '../storage.js';
import { toast, undoToast } from '../ui.js';
import { fieldValue, fmtVolume, fromDisplay, unit } from '../units.js';
import { clone, esc, fmtLong, number, plural } from '../util.js';
import { deleteSession, restoreSession, saveEditedSession } from '../workout.js';
import * as analytics from './analytics.js';
import { backRow } from './shell.js';

const setRow = (set, si, ei, showRir) =>
  `<div class="edit-set ${set.done ? 'done' : ''} ${set.warmup ? 'warmup' : ''}"><span class="set-label"><b>${set.warmup ? 'W' : si + 1}</b>${set.pr ? '<i class="pr-chip">PR</i>' : ''}</span><input type="number" inputmode="decimal" step="0.5" min="0" aria-label="Gewicht" data-edit="weight" data-e="${ei}" data-s="${si}" value="${esc(fieldValue(set.weight))}"><input type="number" inputmode="numeric" min="0" aria-label="Wiederholungen" data-edit="reps" data-e="${ei}" data-s="${si}" value="${esc(set.reps)}">${showRir ? `<input type="number" inputmode="numeric" min="0" max="10" aria-label="RIR" data-edit="rir" data-e="${ei}" data-s="${si}" value="${esc(set.rir)}">` : ''}<label class="edit-done"><input type="checkbox" data-edit="done" data-e="${ei}" data-s="${si}" ${set.done ? 'checked' : ''}><span>erledigt</span></label></div>`;

export function view() {
  const session = getHistory().find((h) => h.id === state.sessionId);
  if (!session) {
    state.view = 'analytics';
    return analytics.view();
  }
  const showRir = session.entries.some((e) => e.sets.some((s) => s.rir !== '' && s.rir !== undefined));
  const markers = [
    session.markers?.deload ? 'Deload' : '',
    session.markers?.ill ? 'Krank' : '',
    session.markers?.pain ? 'Schmerzen' : '',
  ].filter(Boolean);
  const records = session.entries.reduce((n, e) => n + e.sets.filter((s) => s.pr).length, 0);
  return `<main class="shell narrow">${backRow('Training', 'analytics')}
    <section class="page-head compact"><div><h1>${esc(session.dayName || 'Training')}</h1><p>${fmtLong(session.day || session.finishedAt)} · ${esc(session.planName || '')}</p></div></section>
    <div class="stat-row"><div><b>${fmtVolume(session.volume || 0)}</b><span>Volumen</span></div><div><b>${number(session.totalSets)}</b><span>Sätze</span></div><div><b>${Math.round(number(session.duration) / 60)} min</b><span>Dauer</span></div></div>
    ${markers.length || records ? `<div class="chip-row">${markers.map((m) => `<span class="chip">${m}</span>`).join('')}${records ? `<span class="chip chip-green">${plural(records, 'Bestwert', 'Bestwerte')}</span>` : ''}</div>` : ''}
    <form id="sessionForm" class="session-edit">${session.entries
      .map(
        (e, ei) =>
          `<section class="edit-exercise"><h2>${esc(e.name)}</h2><div class="edit-head"><span>Satz</span><span>${unit()}</span><span>Wdh.</span>${showRir ? '<span>RIR</span>' : ''}<span></span></div>${e.sets.map((s, si) => setRow(s, si, ei, showRir)).join('')}${e.note ? `<p class="coach-note">${esc(e.note)}</p>` : ''}</section>`
      )
      .join('')}
    <div class="editor-footer"><button type="button" class="secondary danger" id="deleteSession">Löschen</button><button class="primary" type="submit">Speichern</button></div></form></main>`;
}

export function bind() {
  document.querySelector('#sessionForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const session = clone(getHistory().find((h) => h.id === state.sessionId));
    if (!session) return;
    document.querySelectorAll('[data-edit]').forEach((input) => {
      const set = session.entries[number(input.dataset.e)]?.sets[number(input.dataset.s)];
      if (!set) return;
      set[input.dataset.edit] =
        input.type === 'checkbox'
          ? input.checked
          : input.dataset.edit === 'weight'
            ? fromDisplay(input.value)
            : input.value;
    });
    saveEditedSession(session);
    render();
    toast('Training gespeichert');
  });
  document.querySelector('#deleteSession')?.addEventListener('click', () => {
    const result = deleteSession(state.sessionId);
    if (!result) return;
    navigate('analytics');
    undoToast('Training gelöscht', () => {
      restoreSession(result.removed, result.index);
      render();
    });
  });
}
