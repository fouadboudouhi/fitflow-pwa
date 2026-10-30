// Set and exercise types. A set is a working, warm-up, drop or failure set; an exercise tracks weight × reps,
// reps only (bodyweight, with optional added weight), time, or distance and time.
import { fmtNumber, plural, t } from './i18n.js';
import { libraryOf } from './library.js';
import { fmtWeight, toDisplay } from './units.js';
import { e1rm, isWorkSet, number, setVolume } from './util.js';

export const SET_TYPES = ['normal', 'warmup', 'drop', 'failure'];
export const TRACK_TYPES = ['weight_reps', 'reps', 'time', 'distance_time'];
export { isWorkSet, setVolume };

export const setType = (set) =>
  SET_TYPES.includes(set?.type) ? set.type : set?.warmup ? 'warmup' : 'normal';
// `warmup` stays as a mirror of the type so older code paths and backups keep working.
export function setSetType(set, type) {
  set.type = SET_TYPES.includes(type) ? type : 'normal';
  set.warmup = set.type === 'warmup';
  return set;
}
export const setTypeLabel = (type) => t(`setType.${type}`);
// Letter shown in the set column instead of the number for non-working sets.
export const setTypeMark = (set) => ({ warmup: 'W', drop: 'D', failure: 'F' })[setType(set)] || '';

const derivedTrackType = (lib) =>
  lib?.trackType ||
  (lib?.category === 'cardio' ? 'distance_time' : lib?.equipment === 'body weight' ? 'reps' : 'weight_reps');
// A plan exercise or session entry may override the type; otherwise it follows the catalogue record.
export const trackTypeOf = (item) =>
  TRACK_TYPES.includes(item?.trackType) ? item.trackType : derivedTrackType(libraryOf(item));
export const trackTypeLabel = (type) => t(`track.${type}`);

export const newSetFor = (trackType, overrides = {}) => ({
  weight: '',
  reps: '',
  rir: '',
  done: false,
  warmup: false,
  type: 'normal',
  ...(trackType === 'time' || trackType === 'distance_time' ? { time: '' } : {}),
  ...(trackType === 'distance_time' ? { distance: '' } : {}),
  ...overrides,
});

// A completed working set counts (volume, records, history) once it holds what its type needs.
export function setComplete(set, trackType) {
  if (!set?.done || !isWorkSet(set)) return false;
  switch (trackType) {
    case 'reps':
      return number(set.reps) > 0;
    case 'time':
      return number(set.time) > 0;
    case 'distance_time':
      return number(set.distance) > 0 || number(set.time) > 0;
    default:
      return number(set.weight) > 0 && number(set.reps) > 0;
  }
}
// Comparable score for records: estimated 1RM, reps (added weight breaks ties), seconds, or kilometres.
export function setScore(set, trackType) {
  if (!setComplete(set, trackType)) return 0;
  switch (trackType) {
    case 'reps':
      return number(set.reps) + number(set.weight) / 1000;
    case 'time':
      return number(set.time);
    case 'distance_time':
      return number(set.distance) || number(set.time) / 3600;
    default:
      return e1rm(set.weight, set.reps);
  }
}

// "1:30" or "90" -> seconds as a string; '' stays ''.
export function parseDuration(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const parts = text.split(':').map((p) => number(p));
  const seconds =
    parts.length === 1
      ? parts[0]
      : parts.length === 2
        ? parts[0] * 60 + parts[1]
        : parts[0] * 3600 + parts[1] * 60 + parts[2];
  return String(Math.max(0, Math.round(seconds)));
}
export function fmtDuration(seconds) {
  const total = Math.max(0, Math.round(number(seconds)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
export const fmtDistance = (km) => `${fmtNumber(number(km), { maximumFractionDigits: 2 })} km`;

// Compact form for history rows: "50×8", "+10×12", "12", "1:30", "5 km · 25:00".
export function shortSet(set, trackType) {
  switch (trackType) {
    case 'reps':
      return number(set.weight) ? `+${toDisplay(set.weight)}×${number(set.reps)}` : String(number(set.reps));
    case 'time':
      return fmtDuration(set.time);
    case 'distance_time':
      return [
        number(set.distance) ? fmtDistance(set.distance) : '',
        number(set.time) ? fmtDuration(set.time) : '',
      ]
        .filter(Boolean)
        .join(' · ');
    default:
      return `${toDisplay(set.weight)}×${number(set.reps)}`;
  }
}
// Readable form for toasts and summaries: "60 kg × 8", "+10 kg × 12 Wdh.", "12 Wdh.", "1:30".
export function describeSet(set, trackType) {
  switch (trackType) {
    case 'reps':
      return `${number(set.weight) ? `+${fmtWeight(set.weight)} × ` : ''}${plural(number(set.reps), 'reps')}`;
    case 'time':
      return fmtDuration(set.time);
    case 'distance_time':
      return shortSet(set, trackType);
    default:
      return `${fmtWeight(set.weight)} × ${number(set.reps)}`;
  }
}
// Best value of a history row in words: estimated 1RM, reps, time or distance.
export function describeBest(score, trackType) {
  switch (trackType) {
    case 'reps':
      return t('exercise.best', { value: plural(Math.floor(score), 'reps') });
    case 'time':
      return t('exercise.best', { value: fmtDuration(score) });
    case 'distance_time':
      return t('exercise.best', { value: fmtDistance(score) });
    default:
      return t('workout.e1rm', { weight: fmtWeight(score, 0) });
  }
}
