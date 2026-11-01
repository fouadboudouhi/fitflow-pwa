// Whether a lighter week across the whole training is worth suggesting. A rule of thumb from what the app can see:
// exercises that stopped progressing, how hard the last workouts felt, and how many weeks ran without a break.
import { startOfWeek } from './stats.js';
import { getHistory } from './storage.js';
import { dayKey, exerciseKey, parseDate } from './util.js';
import { suggestion } from './workout.js';

const DAY_MS = 86400000;
const RECENT_DAYS = 28;
const MIN_SESSIONS = 3;
const MIN_STALLED = 3;
const QUIET_DAYS = 28;

export const deloadQuietDate = (now = Date.now()) => now + QUIET_DAYS * DAY_MS;

const sessionTime = (s) => parseDate(s.finishedAt || s.day)?.getTime() || 0;

// Weeks in a row with a workout, counted back from this week, or from last week while this one is still empty.
function weeksInRow(history, today) {
  const weeks = new Set(history.map((s) => dayKey(startOfWeek(new Date(sessionTime(s))))));
  const cursor = startOfWeek(today);
  if (!weeks.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  let count = 0;
  while (weeks.has(dayKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return count;
}

// { reason, count } when a lighter week seems worth a thought, otherwise null.
export function deloadHint(history = getHistory(), today = new Date()) {
  const since = today.getTime() - RECENT_DAYS * DAY_MS;
  const recent = history.filter((s) => sessionTime(s) >= since);
  if (recent.length < MIN_SESSIONS || recent.some((s) => s.markers?.deload)) return null;
  const entries = new Map();
  recent.forEach((s) =>
    s.entries?.forEach((e) => {
      if (!entries.has(exerciseKey(e))) entries.set(exerciseKey(e), e);
    })
  );
  const stalled = [...entries.values()].filter((entry) =>
    ['stall', 'plateau'].includes(suggestion(entry, history, today).kind)
  ).length;
  if (stalled >= MIN_STALLED && stalled >= entries.size / 2) return { reason: 'stall', count: stalled };
  const rated = history
    .slice(0, MIN_SESSIONS)
    .map((s) => s.effort)
    .filter(Boolean);
  const effort = rated.length === MIN_SESSIONS ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
  const weeks = weeksInRow(history, today);
  if (effort >= 4.5 && weeks >= 4) return { reason: 'effort', count: weeks };
  if (weeks >= 8 && (effort >= 4 || stalled >= 2)) return { reason: 'weeks', count: weeks };
  return null;
}
