// Session logic: creating, resuming and finishing a workout, progression suggestions, warm-up sets.
import { t } from './i18n.js';
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
import { clone, dayKey, doneSets, exerciseKey, isWorkSet, number, rangeMax, uid, volumeOf } from './util.js';

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

// The exercises a session trains: its own list once detached (free workouts, edits during the workout),
// otherwise the plan day's.
export const sessionExercises = (session) =>
  session?.exercises || findPlan(session?.planId)?.days.find((d) => d.id === session?.dayId)?.exercises || [];

const entryFor = (ex) => {
  const trackType = trackTypeOf(ex);
  const previous = previousEntry(ex);
  const previousWork = previous ? workSets(previous) : [];
  return {
    exerciseId: ex.id,
    libraryId: ex.libraryId || undefined,
    name: ex.name,
    trackType,
    ...(ex.supersetId ? { supersetId: ex.supersetId } : {}),
    note: '',
    sets: Array.from({ length: ex.sets || 3 }, (_, i) => newSetFor(trackType, carry(previousWork[i]))),
  };
};
const blankSession = () => ({
  id: uid(),
  startedAt: new Date().toISOString(),
  markers: { deload: false, ill: false, pain: false },
});

export function freshSession(planId, dayId) {
  const plan = findPlan(planId);
  const day = plan?.days.find((d) => d.id === dayId);
  if (!plan || !day) return null;
  return {
    ...blankSession(),
    planId,
    planName: plan.name,
    dayId,
    dayName: day.name,
    entries: day.exercises.map(entryFor),
  };
}
// A workout without a plan: exercises are added as you go.
export const freshFreeSession = () => ({
  ...blankSession(),
  planId: null,
  planName: '',
  dayId: null,
  dayName: t('workout.freeName'),
  detached: true,
  exercises: [],
  entries: [],
});

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

// `planId` null means the free workout.
export function activeSession(planId, dayId) {
  const saved = getActive();
  const free = planId == null;
  if (saved && (free ? saved.planId == null : saved.planId === planId && saved.dayId === dayId)) {
    if (!saved.detached) {
      const day = findPlan(planId)?.days.find((d) => d.id === dayId);
      if (day && syncSessionWithDay(saved, day)) saveActive(saved);
    }
    return saved;
  }
  const fresh = free ? freshFreeSession() : freshSession(planId, dayId);
  if (fresh) saveActive(fresh);
  return fresh;
}

// Edits during a workout detach the session from its plan day; the plan itself stays as it is.
export function detachSession(session) {
  if (session.detached) return session;
  session.exercises = clone(sessionExercises(session));
  session.detached = true;
  return session;
}
export function addSessionExercise(session, ex) {
  detachSession(session);
  session.exercises.push(ex);
  session.entries.push(entryFor(ex));
}
export function removeSessionExercise(session, index) {
  detachSession(session);
  const [ex] = session.exercises.splice(index, 1);
  const [entry] = session.entries.splice(index, 1);
  return { ex, entry };
}
export function restoreSessionExercise(session, index, ex, entry) {
  detachSession(session);
  const at = Math.min(index, session.exercises.length);
  session.exercises.splice(at, 0, ex);
  session.entries.splice(at, 0, entry);
}
export function moveSessionExercise(session, from, to) {
  detachSession(session);
  if (to < 0 || to >= session.exercises.length) return;
  for (const list of [session.exercises, session.entries]) [list[from], list[to]] = [list[to], list[from]];
}
// The replacement keeps the slot's targets (sets, range, rest, superset) and starts with fresh sets.
export function replaceSessionExercise(session, index, ex) {
  detachSession(session);
  const old = session.exercises[index];
  const next = { ...ex, sets: old.sets, range: old.range, rest: old.rest };
  if (old.supersetId) next.supersetId = old.supersetId;
  session.exercises[index] = next;
  session.entries[index] = entryFor(next);
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
// The last `limit` history entries of an exercise, newest first.
export function recentEntries(ex, limit = 3, history = getHistory()) {
  const key = exerciseKey(ex);
  const rows = [];
  for (const session of history) {
    const entry = session.entries?.find((e) => exerciseKey(e) === key);
    if (entry) rows.push(entry);
    if (rows.length >= limit) break;
  }
  return rows;
}
const bestScoreOf = (entry) => Math.max(0, ...entry.sets.map((s) => setScore(s, entryTrackType(entry))));

// Three sessions in a row without a better estimated 1RM: time for a lighter week.
export function stalled(ex, history = getHistory()) {
  const recent = recentEntries(ex, 3, history).map(bestScoreOf);
  if (recent.length < 3 || recent.some((v) => !v)) return false;
  const [newest, middle, oldest] = recent;
  return newest <= oldest && middle <= oldest;
}

export function suggestion(ex, history = getHistory()) {
  if (trackTypeOf(ex) !== 'weight_reps') return { kind: 'start', weight: null };
  const previous = recentEntries(ex, 1, history)[0];
  if (!previous) return { kind: 'start', weight: null };
  const work = previous.sets.filter((s) => isWorkSet(s) && s.done);
  const max = rangeMax(ex.range);
  const best = Math.max(...work.map((s) => number(s.weight)), 0);
  const hasRir = work.some((s) => s.rir !== '' && s.rir !== undefined);
  const averageRir = work.reduce((a, s) => a + number(s.rir), 0) / (work.length || 1);
  const ready = work.length && work.every((s) => number(s.reps) >= max) && (!hasRir || averageRir >= 1);
  // The plan exercise may carry its own increment; otherwise the setting, doubled for the heavy lower-body lifts.
  const base = number(ex.increment) || number(getSettings().increment) || 2.5;
  const lib = libraryOf(ex);
  const heavy = lib
    ? /squat|deadlift|leg press/.test(lib.sourceName)
    : /squat|deadlift|leg press|kniebeuge|kreuzheben|beinpresse/i.test(ex.name || '');
  const inc = number(ex.increment) || (heavy ? Math.max(5, base) : base);
  if (ready) return { kind: 'progress', weight: best + inc };
  if (stalled(ex, history)) return { kind: 'stall', weight: roundToStep(best * 0.9) };
  return { kind: 'confirm', weight: best };
}

// Epley: estimated one-rep max, and the reps a given share of it allows.
export const repsAtPercent = (percent) => Math.max(1, Math.round(30 * (100 / percent - 1)));

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
