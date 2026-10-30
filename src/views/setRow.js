// One set row and its header, per exercise type. The hooks (data-set-field, data-set-done, data-delete-set,
// data-set-type) are part of the test contract.
import { t } from '../i18n.js';
import { fmtDuration, setType, setTypeMark } from '../sets.js';
import { fieldValue, toDisplay, unit } from '../units.js';
import { esc } from '../util.js';

// [field, column label, input attributes] for the two value columns of an exercise type.
export function setColumns(trackType) {
  const u = unit();
  const weight = (label) => ['weight', label, 'inputmode="decimal" step="0.5" min="0"'];
  const reps = ['reps', t('workout.reps'), 'inputmode="numeric" min="0"'];
  const time = ['time', t('workout.time'), 'inputmode="numeric" placeholder="0:00"'];
  switch (trackType) {
    case 'reps':
      return [weight(`+${u}`), reps];
    case 'time':
      return [time, weight(`+${u}`)];
    case 'distance_time':
      return [['distance', 'km', 'inputmode="decimal" step="0.01" min="0"'], time];
    default:
      return [weight(u), reps];
  }
}
export const setHead = (trackType, showRir) =>
  `<div class="set-head"><span>${t('workout.set')}</span>${setColumns(trackType)
    .map(([, label]) => `<span>${esc(label)}</span>`)
    .join('')}${showRir ? `<span>${t('workout.rir')}</span>` : ''}<span></span></div>`;

export const fieldDisplay = (name, set) =>
  name === 'weight'
    ? fieldValue(set.weight)
    : name === 'time'
      ? set.time === '' || set.time == null
        ? ''
        : fmtDuration(set.time)
      : (set[name] ?? '');
const placeholderFor = (name, last) => {
  if (!last) return '';
  if (name === 'weight') return last.weight ? String(toDisplay(last.weight)) : '';
  if (name === 'time') return last.time ? fmtDuration(last.time) : '';
  return last[name] ? String(last[name]) : '';
};
const field = (name, label, attrs, set, index, exerciseIndex, workNumber, last) =>
  `<label><span>${esc(label)}</span><input aria-label="${esc(t('workout.fieldAria', { field: label, n: workNumber }))}" type="${name === 'time' ? 'text' : 'number'}" ${attrs} data-set-field="${name}" data-exercise="${exerciseIndex}" data-index="${index}" value="${esc(fieldDisplay(name, set))}" placeholder="${esc(placeholderFor(name, last))}"></label>`;

export function setRow({ set, index, exerciseIndex, trackType, workNumber, last, showRir }) {
  const type = setType(set);
  const label = setTypeMark(set) || workNumber;
  const tag = type !== 'normal' ? t(`setType.${type}Short`) : set.pr ? t('workout.pr') : '';
  return `<div class="set-row"><button class="set-delete" data-delete-set="${index}" data-exercise="${exerciseIndex}" aria-label="${t('workout.deleteSet')}">${t('common.delete')}</button><div class="set-card ${set.done ? 'complete' : ''} ${type !== 'normal' ? type : ''}" data-set="${index}"><button type="button" class="set-label" data-set-type="${index}" data-exercise="${exerciseIndex}" aria-label="${esc(t('workout.setTypeAria', { n: label }))}"><b>${label}</b><span class="${set.pr ? 'pr' : ''}">${tag}</span></button>${setColumns(
    trackType
  )
    .map(([name, columnLabel, attrs]) =>
      field(name, columnLabel, attrs, set, index, exerciseIndex, workNumber, last)
    )
    .join(
      ''
    )}${showRir ? field('rir', t('workout.rir'), 'inputmode="numeric" min="0" max="10"', set, index, exerciseIndex, workNumber, null) : ''}<button class="set-check" data-set-done="${index}" data-exercise="${exerciseIndex}" aria-label="${t('workout.setDone')}" aria-pressed="${set.done}">${set.done ? '✓' : ''}</button></div></div>`;
}
