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
import { dayKey, doneSets, exerciseKey, number, rangeMax, uid, volumeOf } from './util.js';

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
  if (!previous) return { text: 'Starte konservativ und lasse 2–3 Wiederholungen im Tank.', weight: null };
  const work = previous.sets.filter((s) => !s.warmup && s.done);
  const max = rangeMax(ex.range);
  const best = Math.max(...work.map((s) => number(s.weight)), 0);
  const hasRir = work.some((s) => s.rir !== '' && s.rir !== undefined);
  const averageRir = work.reduce((a, s) => a + number(s.rir), 0) / (work.length || 1);
  const ready = work.length && work.every((s) => number(s.reps) >= max) && (!hasRir || averageRir >= 1);
  const base = number(getSettings().increment) || 2.5;
  const heavy = /squat|deadlift|leg press|kniebeuge|kreuzheben|beinpresse/i.test(
    `${ex.sourceName || ''} ${ex.name || ''}`
  );
  const inc = heavy ? Math.max(5, base) : base;
  return ready
    ? { text: `Progression: ${best + inc} kg versuchen`, weight: best + inc }
    : { text: `Ziel: ${best} kg bestätigen und Wiederholungen steigern`, weight: best };
}

export function warmupSets(target) {
  const round = (v) => Math.max(2.5, Math.round(v / 2.5) * 2.5);
  return [
    [0.4, 8],
    [0.6, 5],
    [0.8, 3],
  ].map(([factor, reps]) => emptySet({ weight: round(target * factor), reps, warmup: true }));
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
