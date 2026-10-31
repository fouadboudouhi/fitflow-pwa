// One set row and its header, per exercise type. The hooks (data-set-field, data-set-done, data-delete-set,
// data-set-type) are part of the test contract.
import { localDecimal, t } from '../i18n.js';
import { icon } from '../icons.js';
import { fmtDuration, setType, setTypeMark } from '../sets.js';
import { fieldValue, toDisplay, unit } from '../units.js';
import { esc, number } from '../util.js';

// [field, column label, input attributes, unit shown after the value] for the two value columns of an exercise type.
export function setColumns(trackType) {
  const u = unit();
  const weight = (label) => ['weight', label, 'inputmode="decimal"', u];
  const reps = ['reps', t('workout.reps'), 'inputmode="numeric" min="0"', ''];
  const time = ['time', t('workout.time'), 'inputmode="numeric"', ''];
  switch (trackType) {
    case 'reps':
      return [weight(`+${u}`), reps];
    case 'time':
      return [time, weight(`+${u}`)];
    case 'distance_time':
      return [['distance', t('workout.distance'), 'inputmode="decimal"', 'km'], time];
    default:
      return [weight(t('workout.weight')), reps];
  }
}
export const setHead = (trackType, showRir) =>
  `<div class="set-head"><span>${t('workout.set')}</span>${setColumns(trackType)
    .map(([, label]) => `<span>${esc(label)}</span>`)
    .join('')}${showRir ? `<span>${t('workout.rir')}</span>` : ''}<span></span></div>`;

// Decimals are text fields, so a value always reads the way the language writes it.
export const inputType = (name) => (name === 'reps' || name === 'rir' ? 'number' : 'text');
export const fieldDisplay = (name, set) =>
  name === 'weight'
    ? localDecimal(fieldValue(set.weight))
    : name === 'distance'
      ? localDecimal(set.distance)
      : name === 'time'
        ? set.time === '' || set.time == null
          ? ''
          : fmtDuration(set.time)
        : (set[name] ?? '');
const lastValue = (name, last) => {
  if (!last) return '';
  if (name === 'weight') return number(last.weight) ? localDecimal(toDisplay(last.weight)) : '';
  if (name === 'distance') return number(last.distance) ? localDecimal(last.distance) : '';
  if (name === 'time') return number(last.time) ? fmtDuration(last.time) : '';
  return number(last[name]) ? String(last[name]) : '';
};
// What an empty field shows in grey: the value a tick would take over.
export const placeholderFor = (name, last) => lastValue(name, last) || (name === 'time' ? '0:00' : '–');
// The input sits on a hidden twin of its text, so the field is exactly as wide as the number and the unit
// follows it like typeset text. The twin is kept in sync while typing (views/workout.js).
const field = (name, label, attrs, set, index, exerciseIndex, workNumber, last, suffix = '') => {
  const value = fieldDisplay(name, set);
  const placeholder = placeholderFor(name, last);
  return `<label><span>${esc(label)}</span><span class="set-value"><span class="set-num"><i class="set-sizer" aria-hidden="true">${esc(value || placeholder)}</i><input aria-label="${esc(t('workout.fieldAria', { field: label, n: workNumber }))}" type="${inputType(name)}" autocomplete="off" ${attrs} data-set-field="${name}" data-exercise="${exerciseIndex}" data-index="${index}" value="${esc(value)}" placeholder="${esc(placeholder)}"></span>${suffix ? `<u>${esc(suffix)}</u>` : ''}</span></label>`;
};

export function setRow({ set, index, exerciseIndex, trackType, workNumber, last, showRir }) {
  const type = setType(set);
  const label = setTypeMark(set) || workNumber;
  // The letter already says what kind of set this is; only a record adds a tag.
  const tag = set.pr ? t('workout.pr') : '';
  return `<div class="set-row"><button class="set-delete" data-delete-set="${index}" data-exercise="${exerciseIndex}" aria-label="${t('workout.deleteSet')}">${t('common.delete')}</button><div class="set-card ${set.done ? 'complete' : ''} ${type !== 'normal' ? type : ''}" data-set="${index}"><button type="button" class="set-label" data-set-type="${index}" data-exercise="${exerciseIndex}" aria-label="${esc(t('workout.setTypeAria', { n: label }))}"><b>${label}</b><span class="${set.pr ? 'pr' : ''}">${tag}</span></button>${setColumns(
    trackType
  )
    .map(([name, columnLabel, attrs, suffix]) =>
      field(name, columnLabel, attrs, set, index, exerciseIndex, workNumber, last, suffix)
    )
    .join(
      ''
    )}${showRir ? field('rir', t('workout.rir'), 'inputmode="numeric" min="0" max="10"', set, index, exerciseIndex, workNumber, null) : ''}<button class="set-check" data-set-done="${index}" data-exercise="${exerciseIndex}" aria-label="${t('workout.setDone')}" aria-pressed="${set.done}">${set.done ? icon('check') : ''}</button></div></div>`;
}
