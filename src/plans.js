// Plan logic without DOM: schedules, the assistant's suggested plans, plan helpers.
import { t, weekdayShort } from './i18n.js';
import { EXERCISE_LIBRARY, exerciseName, libraryBySourceName } from './library.js';
import { clone, dayKey, uid, weekdayIndex } from './util.js';

export const scheduleSlots = (count) =>
  ({ 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] })[count] ||
  [];
export const planSchedule = (plan) => plan?.schedule || { mode: 'flexible', assignments: {} };
export const scheduleLabel = (plan) => {
  const schedule = planSchedule(plan);
  if (schedule.mode !== 'fixed') return t('schedule.flexible');
  return (
    plan.days
      .map((d) => weekdayShort(schedule.assignments?.[d.id]))
      .filter(Boolean)
      .join(' · ') || t('schedule.fixed')
  );
};
// A plan keeps only what the catalogue cannot provide; name is a readable snapshot for backups and CSV.
export const planExerciseFromLibrary = (source) => ({
  id: uid(),
  libraryId: source.id,
  name: exerciseName(source),
  gif: source.gif,
  sets: source.sets || 3,
  range: source.range || '8–12',
  note: '',
});
export const customExercise = () => ({
  id: uid(),
  name: t('exercise.customName'),
  sets: 3,
  range: '8–12',
  gif: '',
  note: '',
  custom: true,
  category: 'other',
});
export const setCount = (day) => day.exercises.reduce((sum, ex) => sum + Number(ex.sets || 0), 0);

export function createEmptyPlan() {
  const day = { id: uid(), name: t('day.first'), subtitle: '', exercises: [] };
  return {
    id: uid(),
    name: t('plan.defaultName'),
    description: '',
    createdAt: new Date().toISOString(),
    schedule: { mode: 'flexible', assignments: { [day.id]: 0 } },
    days: [day],
  };
}

export function duplicatePlan(plan) {
  const copy = clone(plan);
  const oldAssignments = copy.schedule?.assignments || {};
  const assignments = {};
  copy.id = uid();
  copy.name += t('plan.copySuffix');
  copy.days.forEach((day) => {
    const oldId = day.id;
    day.id = uid();
    assignments[day.id] = oldAssignments[oldId];
    day.exercises.forEach((ex) => {
      ex.id = uid();
    });
  });
  copy.schedule = { mode: copy.schedule?.mode || 'flexible', assignments };
  return copy;
}

export function addDay(
  plan,
  day = { id: uid(), name: t('day.nth', { n: plan.days.length + 1 }), subtitle: '', exercises: [] }
) {
  plan.days.push(day);
  const slots = scheduleSlots(plan.days.length);
  plan.schedule = plan.schedule || { mode: 'flexible', assignments: {} };
  plan.schedule.assignments[day.id] = slots[slots.length - 1] ?? 0;
  return day;
}
// A finished free (or edited) workout as a plan day; exercise ids are kept so custom-exercise history stays linked.
export const dayFromSession = (session) => ({
  id: uid(),
  name: session.dayName || t('day.fallback'),
  subtitle: '',
  exercises: clone(session.exercises || []),
});

// Supersets: consecutive exercises that share a supersetId are trained alternately, with the rest after the round.
export function linkSuperset(list, index) {
  const a = list[index];
  const b = list[index + 1];
  if (!a || !b) return;
  const id = a.supersetId || b.supersetId || uid();
  a.supersetId = id;
  b.supersetId = id;
}
// Dissolves the whole group the exercise belongs to.
export function unlinkSuperset(list, index) {
  const id = list[index]?.supersetId;
  if (!id) return;
  list.forEach((ex) => {
    if (ex.supersetId === id) delete ex.supersetId;
  });
}
// Letters per group in list order: { [supersetId]: 'A' }.
export function supersetLetters(list) {
  const letters = {};
  let n = 0;
  list.forEach((ex) => {
    if (ex.supersetId && !letters[ex.supersetId]) letters[ex.supersetId] = String.fromCharCode(65 + n++);
  });
  return letters;
}
// Where an exercise sits in its group: 'single' | 'first' | 'mid' | 'last'.
export function supersetPosition(list, index) {
  const id = list[index]?.supersetId;
  if (!id) return 'single';
  const prev = list[index - 1]?.supersetId === id;
  const next = list[index + 1]?.supersetId === id;
  return prev && next ? 'mid' : prev ? 'last' : next ? 'first' : 'single';
}

const GROUPS = {
  push: [
    'barbell bench press',
    'dumbbell incline bench press',
    'dumbbell seated shoulder press',
    'dumbbell lateral raise',
    'cable pushdown (with rope attachment)',
    'dumbbell lying triceps extension',
  ],
  pull: [
    'pull-up',
    'cable seated row',
    'barbell bent over row',
    'cable standing rear delt row (with rope)',
    'barbell curl',
    'dumbbell hammer curl',
  ],
  legs: [
    'barbell full squat',
    'barbell romanian deadlift',
    'lever alternate leg press',
    'lever lying leg curl',
    'lever leg extension',
    'barbell standing calf raise',
  ],
  upperA: [
    'barbell bench press',
    'pull-up',
    'dumbbell seated shoulder press',
    'cable seated row',
    'dumbbell biceps curl',
    'cable pushdown (with rope attachment)',
  ],
  upperB: [
    'dumbbell incline bench press',
    'barbell bent over row',
    'dumbbell lateral raise',
    'cable pulldown',
    'dumbbell hammer curl',
    'barbell close-grip bench press',
  ],
  lowerA: [
    'barbell full squat',
    'barbell romanian deadlift',
    'dumbbell lunge',
    'lever leg extension',
    'lever seated leg curl',
    'lever seated calf raise',
  ],
  lowerB: [
    'barbell deadlift',
    'dumbbell goblet squat',
    'dumbbell single leg split squat',
    'barbell glute bridge',
    'lever lying leg curl',
    'bodyweight standing calf raise',
  ],
  fullA: [
    'barbell full squat',
    'barbell bench press',
    'cable seated row',
    'dumbbell lateral raise',
    'dumbbell biceps curl',
    'cable kneeling crunch',
  ],
  fullB: [
    'barbell romanian deadlift',
    'dumbbell incline bench press',
    'pull-up',
    'dumbbell lunge',
    'cable pushdown (with rope attachment)',
    'hanging leg raise',
  ],
};
// Day name keys (see the dictionary) and the exercise group each layout uses.
const LAYOUTS = {
  2: [
    ['day.fullA', 'fullA'],
    ['day.fullB', 'fullB'],
  ],
  3: [
    ['day.push', 'push'],
    ['day.pull', 'pull'],
    ['day.legs', 'legs'],
  ],
  4: [
    ['day.upperA', 'upperA'],
    ['day.lowerA', 'lowerA'],
    ['day.upperB', 'upperB'],
    ['day.lowerB', 'lowerB'],
  ],
  5: [
    ['day.push', 'push'],
    ['day.pull', 'pull'],
    ['day.legs', 'legs'],
    ['day.upper', 'upperB'],
    ['day.lower', 'lowerB'],
  ],
  6: [
    ['day.pushA', 'push'],
    ['day.pullA', 'pull'],
    ['day.legsA', 'legs'],
    ['day.pushB', 'push'],
    ['day.pullB', 'pull'],
    ['day.legsB', 'lowerB'],
  ],
};
const goalName = (goal) =>
  ({ strength: t('goal.strength'), fitness: t('goal.fitnessShort'), muscle: t('goal.muscle') })[goal] ||
  t('goal.muscle');
const isCompound = (sourceName) => /press|squat|deadlift|row|pull-up/.test(sourceName);

// `level` 'beginner' keeps every exercise at three sets; the other levels add a fourth set to compounds.
export function createSuggestedPlan(
  goal,
  dayCount,
  scheduleMode = 'flexible',
  { level = 'intermediate' } = {}
) {
  const layout = LAYOUTS[dayCount] || LAYOUTS[3];
  const days = layout.map(([nameKey, key]) => ({
    id: uid(),
    name: t(nameKey),
    subtitle: t('wizard.autoSubtitle'),
    exercises: GROUPS[key]
      .map((sourceName) => libraryBySourceName(sourceName) || EXERCISE_LIBRARY[0])
      .map((source) => {
        const compound = isCompound(source.sourceName);
        return {
          ...planExerciseFromLibrary(source),
          sets: goal === 'fitness' || level === 'beginner' ? 3 : compound ? 4 : 3,
          range: goal === 'strength' && compound ? '4–6' : goal === 'fitness' ? '10–15' : '8–12',
          rest: goal === 'strength' ? 150 : goal === 'fitness' ? 60 : 90,
        };
      }),
  }));
  const assignments = {};
  scheduleSlots(days.length).forEach((weekday, i) => {
    assignments[days[i].id] = weekday;
  });
  return {
    id: uid(),
    name: t('wizard.planName', { goal: goalName(goal), days: days.length }),
    description: t('wizard.description'),
    createdAt: new Date().toISOString(),
    schedule: { mode: scheduleMode, assignments },
    days,
  };
}

// Which day comes next? Flexible plans rotate after the last completed day of this plan; fixed plans look at the weekday.
export function nextSession(plan, history, today = new Date()) {
  if (!plan?.days?.length) return { day: null, label: t('home.next') };
  const lastOfPlan = history.find((h) => h.planId === plan.id);
  const lastIndex = plan.days.findIndex((d) => d.id === lastOfPlan?.dayId);
  let day = plan.days[lastIndex >= 0 ? (lastIndex + 1) % plan.days.length : 0];
  let label = t('home.next');
  const schedule = planSchedule(plan);
  if (schedule.mode === 'fixed') {
    const todayIndex = weekdayIndex(today);
    const todayKey = dayKey(today);
    const doneToday = history.some(
      (h) => h.planId === plan.id && (h.day || dayKey(h.finishedAt)) === todayKey
    );
    const scheduledToday = plan.days.find((d) => schedule.assignments?.[d.id] === todayIndex);
    if (scheduledToday && !doneToday) {
      day = scheduledToday;
      label = t('home.plannedToday');
    } else {
      for (let offset = 1; offset <= 7; offset++) {
        const target = (todayIndex + offset) % 7;
        const found = plan.days.find((d) => schedule.assignments?.[d.id] === target);
        if (found) {
          day = found;
          label = t('home.nextOn', { day: weekdayShort(target) });
          break;
        }
      }
    }
  }
  const ready = plan.days.filter((d) => d.exercises.length);
  if (day && !day.exercises.length && ready.length) day = ready[0];
  return { day, label };
}

// Weekly goal: sessions per calendar week (Monday start). Streak counts consecutive weeks that met the goal,
// the current week included once it is met.
export function weekStats(history, goal, today = new Date()) {
  const monday = new Date(today);
  monday.setDate(today.getDate() - weekdayIndex(today));
  monday.setHours(0, 0, 0, 0);
  const weekKey = (key) => {
    const d = new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10));
    d.setDate(d.getDate() - weekdayIndex(d));
    return dayKey(d);
  };
  const perWeek = new Map();
  history.forEach((h) => {
    const key = h.day || dayKey(h.finishedAt);
    if (!key) return;
    const wk = weekKey(key);
    perWeek.set(wk, (perWeek.get(wk) || 0) + 1);
  });
  const thisWeek = perWeek.get(dayKey(monday)) || 0;
  let streak = 0;
  const cursor = new Date(monday);
  if (thisWeek >= goal) {
    streak = 1;
  }
  cursor.setDate(cursor.getDate() - 7);
  while ((perWeek.get(dayKey(cursor)) || 0) >= goal && goal > 0) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return { thisWeek, streak, goal };
}
