// Session logic: creating, resuming and finishing a workout, progression suggestions, warm-up sets.
import { annotatePrs } from './records.js';
import { newSetFor, setScore, trackTypeOf } from './sets.js';
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
import { dayKey, doneSets, exerciseKey, isWorkSet, number, rangeMax, uid, volumeOf } from './util.js';

// What a new set inherits from the matching set of the last session: weight, time and distance, never reps.
const carry = (set) =>
  set
    ? {
        weight: set.weight ?? '',
        ...(set.time !== undefined ? { time: set.time } : {}),
        ...(set.distance !== undefined ? { distance: set.distance } : {}),
      }
    : {};

// Newest history entry for the same library exercise, in any plan.
export function previousEntry(ex) {
  const key = exerciseKey(ex);
  for (const session of getHistory()) {
    const entry = session.entries?.find((e) => exerciseKey(e) === key);
    if (entry) return entry;
  }
  return null;
}
export const workSets = (entry) => entry.sets.filter(isWorkSet);
export const entryComplete = (entry) => workSets(entry).length > 0 && workSets(entry).every((s) => s.done);
export const entryTrackType = (entry) => entry.trackType || trackTypeOf(entry);

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
      const trackType = trackTypeOf(ex);
      const previous = previousEntry(ex);
      const previousWork = previous ? workSets(previous) : [];
      return {
        exerciseId: ex.id,
        libraryId: ex.libraryId || undefined,
        name: ex.name,
        trackType,
        note: '',
        sets: Array.from({ length: ex.sets }, (_, i) => newSetFor(trackType, carry(previousWork[i]))),
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
      existing.trackType ||= template.entries[i].trackType;
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

// Progressive overload for weight × reps exercises: every working set hit the top of the range (with at least
// one rep in reserve when RIR was logged) -> add the increment; otherwise repeat the weight and add reps.
export function suggestion(ex) {
  if (trackTypeOf(ex) !== 'weight_reps') return { kind: 'start', weight: null };
  const previous = previousEntry(ex);
  if (!previous) return { kind: 'start', weight: null };
  const work = previous.sets.filter((s) => isWorkSet(s) && s.done);
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
    newSetFor('weight_reps', {
      weight: String(Math.round(roundToStep(target * factor) * 1000) / 1000),
      reps,
      warmup: true,
      type: 'warmup',
    })
  );
}
export const newSet = (trackType, overrides) => newSetFor(trackType, overrides);
export { carry as carryFromSet };

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
  // Final record flags against everything stored before this session (the live toast only looked at done sets).
  annotatePrs(session, history);
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
      const type = entryTrackType(entry);
      for (const s of entry.sets) {
        const score = setScore(s, type);
        if (!score) continue;
        weight = Math.max(weight, number(s.weight));
        best = Math.max(best, score);
      }
    }
  }
  return { weight, score: best, e1rm: best };
}

// A set is a personal record when its score (estimated 1RM, reps, time or distance) beats every other
// completed set of the exercise, in the history and in the current session.
export function isRecord(ex, set, entry) {
  const type = entry.trackType || trackTypeOf(ex);
  const value = setScore(set, type);
  if (!value) return false;
  const previous = bestBefore(exerciseKey(ex)).score;
  const inSession = Math.max(0, ...entry.sets.filter((s) => s !== set).map((s) => setScore(s, type)));
  return value > previous && value > inSession;
}

// The last sessions that contained this exercise, newest first.
export function exerciseHistory(key, limit = 5) {
  const rows = [];
  for (const session of getHistory()) {
    const entry = session.entries?.find((e) => exerciseKey(e) === key);
    if (!entry) continue;
    const type = entryTrackType(entry);
    const sets = entry.sets.filter((s) => setScore(s, type) > 0);
    if (!sets.length) continue;
    rows.push({
      day: session.day || dayKey(session.finishedAt),
      dayName: session.dayName,
      trackType: type,
      sets: sets.map((s) => ({
        weight: number(s.weight),
        reps: number(s.reps),
        time: s.time ?? '',
        distance: s.distance ?? '',
        pr: !!s.pr,
      })),
      best: Math.max(...sets.map((s) => setScore(s, type))),
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
  annotatePrs(session, history);
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
