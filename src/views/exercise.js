// Exercise detail sheet: animation, muscles and equipment, the plan note, step-by-step instructions (loaded on
// demand) and the last sessions.
import { currentLanguage, fmtNumber, t } from '../i18n.js';
import { equipmentLabel, exerciseName, groupLabel, libraryOf, muscleLabel } from '../library.js';
import { KINDS, recordsFor } from '../records.js';
import { describeBest, shortSet, trackTypeLabel, trackTypeOf } from '../sets.js';
import { recordLine } from './records.js';
import { sheet } from '../ui.js';
import { esc, exerciseKey, fmtLong } from '../util.js';
import { exerciseHistory, strengthTrend } from '../workout.js';

const historyRows = (rows) =>
  rows.length
    ? `<div class="history-rows">${rows
        .map(
          (r) =>
            `<div class="history-row"><span>${fmtLong(r.day)}</span><b>${r.sets.map((s) => `${esc(shortSet(s, r.trackType))}${s.pr ? `<i class="pr-chip">${t('workout.pr')}</i>` : ''}`).join(' · ')}</b><small>${esc(describeBest(r.best, r.trackType, r.bestSet))}</small></div>`
        )
        .join('')}</div>`
    : `<p class="muted">${t('workout.noHistory')}</p>`;

// Instructions live in one module per language and are only fetched when a sheet needs them.
const stepModules = {};
async function loadSteps(id) {
  const lang = currentLanguage();
  stepModules[lang] ||= import(`../../assets/data/steps.${lang}.js`).then((m) => m.default);
  const steps = await stepModules[lang].catch(() => ({}));
  return steps[id] || [];
}

// `item` is a plan exercise, a session entry or a catalogue record.
export function openExerciseSheet(item) {
  if (!item) return;
  const lib = libraryOf(item);
  const name = exerciseName(item);
  const gif = item.gif || lib?.gif;
  const trackType = trackTypeOf(item);
  // Group, equipment and target muscle; the muscle is dropped when it only repeats the group ("Brust · Brust").
  const meta = [
    ...new Set(lib ? [groupLabel(lib.group), equipmentLabel(lib.equipment), muscleLabel(lib.target)] : []),
    trackType === 'weight_reps' ? '' : trackTypeLabel(trackType),
  ].filter(Boolean);
  const also = (lib?.secondary || []).map(muscleLabel).filter(Boolean);
  const record = recordsFor(exerciseKey(item));
  const bests = record
    ? (KINDS[record.trackType] || [])
        .map((kind) => recordLine(record, kind))
        .filter(Boolean)
        .join(' · ')
    : '';
  const trend = trackType === 'weight_reps' ? strengthTrend(item) : null;
  const trendLine = trend
    ? `<p class="exercise-meta">${esc(t('exercise.trend', { weeks: trend.weeks, percent: `${trend.percent > 0 ? '+' : ''}${fmtNumber(Math.round(trend.percent))}` }))}</p>`
    : '';
  const box = document.createElement('div');
  box.className = 'exercise-sheet';
  box.innerHTML = `${gif ? `<img class="exercise-gif" src="${esc(gif)}" alt="${esc(t('workout.techniqueAlt', { name }))}">` : ''}${meta.length ? `<p class="exercise-meta">${meta.map(esc).join(' · ')}</p>` : ''}${also.length ? `<p class="exercise-meta">${esc(t('exercise.also', { muscles: also.join(', ') }))}</p>` : ''}${bests ? `<p class="exercise-meta exercise-records">${t('exercise.records')}: ${esc(bests)}</p>` : ''}${trendLine}${item.note ? `<p class="coach-note">${esc(item.note)}</p>` : ''}<div class="exercise-steps-slot"></div><h3>${t('exercise.lastSessions')}</h3>${historyRows(exerciseHistory(exerciseKey(item), 5))}`;
  sheet({ title: name, content: box });
  if (lib && !lib.builtIn)
    loadSteps(lib.id).then((steps) => {
      const slot = box.querySelector('.exercise-steps-slot');
      if (!steps.length || !slot?.isConnected) return;
      slot.innerHTML = `<h3>${t('exercise.steps')}</h3><ol class="exercise-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
    });
}
