// Session logic: creating, resuming and finishing a workout, progression suggestions, warm-up sets.
import {
  clearActive,
  findPlan,
  getActive,
  getHistory,
  getSettings,
  saveActive,
  saveHistory,
} from './storage.js';
import { libraryOf } from './library.js';
import { roundToStep } from './units.js';
import { dayKey, doneSets, e1rm, exerciseKey, number, rangeMax, uid, volumeOf } from './util.js';

const emptySet = (overrides = {}) => ({
  weight: '',
  reps: '',
  rir: '',
  done: false,
  warmup: false,
  ...overrides,
});

// Newest history entry for the same library exercise, in any plan.
export function previousEntry(ex) {
  const key = exerciseKey(ex);
  for (const session of getHistory()) {
    const entry = session.entries?.find((e) => exerciseKey(e) === key);
    if (entry) return entry;
  }
  return null;
}
export const workSets = (entry) => entry.sets.filter((s) => !s.warmup);
export const entryComplete = (entry) => workSets(entry).length > 0 && workSets(entry).every((s) => s.done);

export function freshSession(planId, dayId) {
  const plan = findPlan(planId);
  const day = plan?.days.find((d) => d.id === dayId);
  if (!plan || !day) return null;
  return {
    id: uid(),
    planId,
    planName: plan.name,
    dayId,
    dayName: day.name,
    startedAt: new Date().toISOString(),
    markers: { deload: false, ill: false, pain: false },
    entries: day.exercises.map((ex) => {
      const previous = previousEntry(ex);
      const previousWork = previous ? workSets(previous) : [];
      return {
        exerciseId: ex.id,
        libraryId: ex.libraryId || undefined,
        name: ex.name,
        note: '',
        sets: Array.from({ length: ex.sets }, (_, i) => emptySet({ weight: previousWork[i]?.weight ?? '' })),
      };
    }),
  };
}

// The plan day may have been edited while this session was open: entries follow the current exercise list,
// new exercises get fresh sets, removed ones are dropped. Returns true when something changed.
export function syncSessionWithDay(session, day) {
  const before = (session.entries || []).map((e) => e.exerciseId).join('|');
  const template = freshSession(session.planId, session.dayId);
  session.entries = day.exercises.map((ex, i) => {
    const existing = session.entries?.find((e) => e.exerciseId === ex.id);
    if (existing) {
      existing.name = ex.name;
      existing.libraryId = ex.libraryId || undefined;
      return existing;
    }
    return template.entries[i];
  });
  session.dayName = day.name;
  return session.entries.map((e) => e.exerciseId).join('|') !== before;
}

export function activeSession(planId, dayId) {
  const saved = getActive();
  if (saved?.planId === planId && saved?.dayId === dayId) {
    const day = findPlan(planId)?.days.find((d) => d.id === dayId);
    if (day && syncSessionWithDay(saved, day)) saveActive(saved);
    return saved;
  }
  const fresh = freshSession(planId, dayId);
  if (fresh) saveActive(fresh);
  return fresh;
}
export function mutateSession(planId, dayId, fn) {
  const session = activeSession(planId, dayId);
  fn(session);
  saveActive(session);
  return session;
}
export const sessionStarted = (session) => doneSets(session) > 0;

export function suggestion(ex) {
  const previous = previousEntry(ex);
  if (!previous) return { kind: 'start', weight: null };
  const work = previous.sets.filter((s) => !s.warmup && s.done);
  const max = rangeMax(ex.range);
  const best = Math.max(...work.map((s) => number(s.weight)), 0);
  const hasRir = work.some((s) => s.rir !== '' && s.rir !== undefined);
  const averageRir = work.reduce((a, s) => a + number(s.rir), 0) / (work.length || 1);
  const ready = work.length && work.every((s) => number(s.reps) >= max) && (!hasRir || averageRir >= 1);
  const base = number(getSettings().increment) || 2.5;
  const lib = libraryOf(ex);
  const heavy = lib
    ? /squat|deadlift|leg press/.test(lib.sourceName)
    : /squat|deadlift|leg press|kniebeuge|kreuzheben|beinpresse/i.test(ex.name || '');
  const inc = heavy ? Math.max(5, base) : base;
  return ready ? { kind: 'progress', weight: best + inc } : { kind: 'confirm', weight: best };
}

export function warmupSets(target) {
  return [
    [0.4, 8],
    [0.6, 5],
    [0.8, 3],
  ].map(([factor, reps]) =>
    emptySet({ weight: String(Math.round(roundToStep(target * factor) * 1000) / 1000), reps, warmup: true })
  );
}
export const newSet = (overrides) => emptySet(overrides);

export function finishSession(session) {
  session.finishedAt = new Date().toISOString();
  session.day = dayKey(session.finishedAt);
  session.duration = Math.max(
    60,
    Math.round((new Date(session.finishedAt) - new Date(session.startedAt)) / 1000)
  );
  session.totalSets = doneSets(session);
  session.volume = volumeOf(session);
  session.entries.forEach((e) =>
    e.sets.forEach((x) => {
      x.rpe = x.rir === '' ? '' : 10 - number(x.rir);
    })
  );
  const history = getHistory();
  history.unshift(session);
  saveHistory(history);
  clearActive();
  return session;
}

// Best completed working set of an exercise across the whole history (optionally ignoring one session).
export function bestBefore(key, { excludeSessionId } = {}) {
  let weight = 0;
  let best = 0;
  for (const session of getHistory()) {
    if (session.id === excludeSessionId) continue;
    for (const entry of session.entries || []) {
      if (exerciseKey(entry) !== key) continue;
      for (const s of entry.sets) {
        if (s.warmup || !s.done) continue;
        const w = number(s.weight);
        const r = number(s.reps);
        if (!w || !r) continue;
        weight = Math.max(weight, w);
        best = Math.max(best, e1rm(w, r));
      }
    }
  }
  return { weight, e1rm: best };
}

// A set is a personal record when its estimated 1RM beats every other completed set of the exercise,
// in the history and in the current session.
export function isRecord(ex, set, entry) {
  const w = number(set.weight);
  const r = number(set.reps);
  if (!w || !r || set.warmup) return false;
  const value = e1rm(w, r);
  const previous = bestBefore(exerciseKey(ex)).e1rm;
  const inSession = Math.max(
    0,
    ...entry.sets.filter((s) => s !== set && s.done && !s.warmup).map((s) => e1rm(s.weight, s.reps))
  );
  return value > previous && value > inSession;
}

// The last sessions that contained this exercise, newest first.
export function exerciseHistory(key, limit = 5) {
  const rows = [];
  for (const session of getHistory()) {
    const entry = session.entries?.find((e) => exerciseKey(e) === key);
    if (!entry) continue;
    const sets = entry.sets.filter((s) => !s.warmup && s.done && number(s.weight));
    if (!sets.length) continue;
    rows.push({
      day: session.day || dayKey(session.finishedAt),
      dayName: session.dayName,
      sets: sets.map((s) => ({ weight: number(s.weight), reps: number(s.reps), pr: !!s.pr })),
      best: Math.max(...sets.map((s) => e1rm(s.weight, s.reps))),
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

// Recomputes the derived fields of a finished session after editing and stores it.
export function saveEditedSession(session) {
  session.totalSets = doneSets(session);
  session.volume = volumeOf(session);
  session.entries.forEach((e) =>
    e.sets.forEach((x) => {
      x.rpe = x.rir === '' || x.rir === undefined ? '' : 10 - number(x.rir);
    })
  );
  const history = getHistory();
  const index = history.findIndex((h) => h.id === session.id);
  if (index < 0) return false;
  history[index] = session;
  saveHistory(history);
  return true;
}
export function deleteSession(id) {
  const history = getHistory();
  const index = history.findIndex((h) => h.id === id);
  if (index < 0) return null;
  const [removed] = history.splice(index, 1);
  saveHistory(history);
  return { removed, index };
}
export function restoreSession(session, index) {
  const history = getHistory();
  history.splice(Math.min(index, history.length), 0, session);
  saveHistory(history);
}
