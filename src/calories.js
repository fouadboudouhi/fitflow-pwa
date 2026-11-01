// A rough energy estimate for a workout: MET × body weight × hours. It is computed when shown and never stored, so
// older workouts get a value as well, also once a body weight is entered later. The MET values come from the Compendium
// of Physical Activities: 3.5 for resistance training with multiple exercises, 5 for hard, heavy sets.
import { getBody } from './storage.js';
import { dayKey, number, parseDate } from './util.js';

const MET_BY_EFFORT = { 1: 3, 2: 3.5, 3: 3.5, 4: 4.5, 5: 5 };
const DEFAULT_MET = 3.5;

// The body weight entered closest to the day of the workout, in kilograms.
function bodyWeightNear(day, body) {
  const target = parseDate(day)?.getTime() || 0;
  let best = null;
  body.forEach((entry) => {
    const kg = number(entry.weight);
    if (!kg) return;
    const distance = Math.abs((parseDate(entry.day || dayKey(entry.date))?.getTime() || 0) - target);
    if (!best || distance < best.distance) best = { distance, kg };
  });
  return best?.kg || 0;
}

// Kilocalories rounded to tens, or null without a body weight or a duration.
export function caloriesOf(session, body = getBody()) {
  const kg = bodyWeightNear(session.day || dayKey(session.finishedAt), body);
  const hours = number(session.duration) / 3600;
  if (!kg || !hours) return null;
  const met = MET_BY_EFFORT[session.effort] || DEFAULT_MET;
  return Math.round((met * kg * hours) / 10) * 10;
}
