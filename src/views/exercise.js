// Exercise detail sheet: animation, muscle group, equipment and target muscle, the plan note, and the last sessions.
import { t } from '../i18n.js';
import { equipmentLabel, exerciseName, groupLabel, libraryOf, muscleLabel } from '../library.js';
import { sheet } from '../ui.js';
import { fmtWeight, toDisplay } from '../units.js';
import { esc, exerciseKey, fmtLong } from '../util.js';
import { exerciseHistory } from '../workout.js';

const historyRows = (rows) =>
  rows.length
    ? `<div class="history-rows">${rows
        .map(
          (r) =>
            `<div class="history-row"><span>${fmtLong(r.day)}</span><b>${r.sets.map((s) => `${esc(toDisplay(s.weight))}×${esc(s.reps)}${s.pr ? `<i class="pr-chip">${t('workout.pr')}</i>` : ''}`).join(' · ')}</b><small>${esc(t('workout.e1rm', { weight: fmtWeight(r.best, 0) }))}</small></div>`
        )
        .join('')}</div>`
    : `<p class="muted">${t('workout.noHistory')}</p>`;

// `item` is a plan exercise, a session entry or a catalogue record.
export function openExerciseSheet(item) {
  if (!item) return;
  const lib = libraryOf(item);
  const name = exerciseName(item);
  const gif = item.gif || lib?.gif;
  // Group, equipment and target muscle; the muscle is dropped when it only repeats the group ("Brust · Brust").
  const meta = lib
    ? [...new Set([groupLabel(lib.group), equipmentLabel(lib.equipment), muscleLabel(lib.target)])].filter(
        Boolean
      )
    : [];
  const box = document.createElement('div');
  box.className = 'exercise-sheet';
  box.innerHTML = `${gif ? `<img class="exercise-gif" src="${esc(gif)}" alt="${esc(t('workout.techniqueAlt', { name }))}">` : ''}${meta.length ? `<p class="exercise-meta">${meta.map(esc).join(' · ')}</p>` : ''}${item.note ? `<p class="coach-note">${esc(item.note)}</p>` : ''}<h3>${t('exercise.lastSessions')}</h3>${historyRows(exerciseHistory(exerciseKey(item), 5))}`;
  sheet({ title: name, content: box });
}
