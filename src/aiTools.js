// What the assistant can look up and change in the app. Each tool checks its input itself and answers with plain
// data; a failed check goes back to Claude as an error it can correct, and a change is applied completely or not at
// all. Changes report an `action` for the chat, with an undo that only works while nothing else has changed since.
import { LANGUAGES, setLanguage, t } from './i18n.js';
import { EQUIPMENT_KEYS, GROUPS, allExercises, exerciseName, libraryOf } from './library.js';
import { planExerciseFromLibrary, scheduleSlots } from './plans.js';
import { recordsFor } from './records.js';
import { shortSet, trackTypeOf } from './sets.js';
import { frequency, recordTimeline, weeklySets, weeklyVolume } from './stats.js';
import { allPlans, getBody, getHistory, getSettings, saveSettings, savePlans } from './storage.js';
import { applyTheme } from './theme.js';
import { fromDisplay, inUnit, toDisplay, unit } from './units.js';
import {
  clone,
  dayKey,
  exerciseKey,
  fold,
  isWorkSet,
  normalizeRange,
  number,
  parseDate,
  setsCount,
  uid,
} from './util.js';
import { entryTrackType, stalled, strengthTrend, suggestion } from './workout.js';

const DAY_MS = 86400000;
const MAX_DAYS = 14;
const MAX_EXERCISES_PER_DAY = 16;
const clean = (value, max) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const bounded = (value, fallback, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

// Lookups

function plansData() {
  const data = allPlans();
  return {
    active_plan_id: data.activePlanId,
    weights_in: unit(),
    plans: data.items.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      active: plan.id === data.activePlanId,
      days: plan.days.map((day) => ({
        id: day.id,
        name: day.name,
        exercises: day.exercises.map((ex) => ({
          exercise_id: exerciseKey(ex),
          name: exerciseName(ex),
          sets: setsCount(ex.sets),
          range: ex.range,
          note: ex.note || '',
          ...(ex.rest ? { rest_seconds: number(ex.rest) } : {}),
          ...(ex.supersetId ? { superset: ex.supersetId } : {}),
        })),
      })),
    })),
  };
}

const setText = (set, trackType) =>
  `${shortSet(set, trackType)}${set.type && set.type !== 'normal' ? ` (${set.type})` : ''}${set.rir !== '' && set.rir !== undefined ? ` RIR${set.rir}` : ''}${set.pr ? ' PR' : ''}`;

function historyData({ days, exercise_id, limit }) {
  const since = Date.now() - bounded(days, 56, 1, 3650) * DAY_MS;
  const sessions = getHistory()
    .filter((s) => (parseDate(s.finishedAt || s.day)?.getTime() || 0) >= since)
    .map((s) => ({
      date: dayKey(s.day || s.finishedAt),
      plan: s.planName || '',
      day: s.dayName || '',
      minutes: Math.round(number(s.duration) / 60),
      marked: Object.keys(s.markers || {}).filter((key) => s.markers[key]),
      exercises: (s.entries || [])
        .filter((e) => !exercise_id || exerciseKey(e) === exercise_id)
        .map((e) => ({
          exercise_id: exerciseKey(e),
          name: exerciseName(e),
          sets: e.sets.filter((x) => x.done).map((x) => setText(x, entryTrackType(e))),
        }))
        .filter((e) => e.sets.length),
    }))
    .filter((s) => s.exercises.length)
    .slice(0, bounded(limit, 20, 1, 60));
  return { weights_in: unit(), sessions };
}

function exerciseData({ exercise_id }) {
  const item = { id: String(exercise_id ?? '') };
  const lib = libraryOf(item);
  if (!lib) return { error: `Unknown exercise_id ${item.id}. Use search_exercises.` };
  const trackType = trackTypeOf(item);
  const history = getHistory();
  const planLike = { ...item, libraryId: lib.id, range: lib.range };
  const entries = history
    .flatMap((s) =>
      (s.entries || [])
        .filter((e) => exerciseKey(e) === lib.id)
        .map((e) => ({
          date: dayKey(s.day || s.finishedAt),
          sets: e.sets.filter((x) => x.done && isWorkSet(x)).map((x) => setText(x, entryTrackType(e))),
        }))
    )
    .filter((row) => row.sets.length)
    .slice(0, 8);
  const trend = strengthTrend(planLike, history);
  const next = suggestion(planLike, history);
  return {
    weights_in: unit(),
    exercise_id: lib.id,
    name: exerciseName(lib),
    group: lib.group,
    equipment: lib.equipment,
    target: lib.target,
    also_works: lib.secondary || [],
    records: recordsFor(lib.id),
    trend_percent: trend ? Math.round(trend.percent) : null,
    trend_weeks: trend?.weeks ?? null,
    stalled: stalled(planLike, history),
    app_suggestion: next.weight ? { kind: next.kind, weight: toDisplay(next.weight) } : null,
    last_sessions: entries,
  };
}

function searchData({ query, group, equipment, limit }) {
  const tokens = fold(query || '')
    .split(/\s+/)
    .filter(Boolean);
  const matches = allExercises()
    .filter((x) => !group || x.group === group)
    .filter((x) => !equipment || x.equipment === equipment)
    .filter((x) => {
      const text = fold(`${exerciseName(x)} ${x.sourceName} ${x.target} ${(x.secondary || []).join(' ')}`);
      return tokens.every((token) => text.includes(token));
    })
    .slice(0, bounded(limit, 15, 1, 40));
  return {
    exercises: matches.map((x) => ({
      exercise_id: x.id,
      name: exerciseName(x),
      group: x.group,
      equipment: x.equipment,
      target: x.target,
    })),
  };
}

function statsData({ weeks }) {
  const history = getHistory();
  const span = bounded(weeks, 12, 1, 52);
  return {
    weights_in: unit(),
    sets_per_group_this_week: weeklySets(history),
    sets_per_group_per_week_over_4_weeks: weeklySets(history, { weeks: 4 }),
    volume_per_week: weeklyVolume(history, span).map((w) => Math.round(toDisplay(w.value))),
    sessions_per_week: frequency(history, span).map((w) => w.value),
    recent_records: recordTimeline(history, 5).map((r) => ({
      date: r.day,
      count: r.count,
      exercises: r.items.map(exerciseName),
    })),
    total_sessions: history.length,
  };
}

function bodyData({ limit }) {
  return {
    weights_in: unit(),
    entries: getBody()
      .map((b) => ({
        date: dayKey(b.day || b.date),
        weight: number(b.weight) ? toDisplay(b.weight) : null,
        waist_cm: number(b.waist) || null,
        chest_cm: number(b.chest) || null,
        arm_cm: number(b.arm) || null,
        thigh_cm: number(b.thigh) || null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, bounded(limit, 20, 1, 100)),
  };
}

function settingsData() {
  const s = getSettings();
  return {
    language: s.language,
    theme: s.theme,
    unit: s.unit,
    rest_seconds: s.rest,
    increment: toDisplay(s.increment),
    bar_weight: toDisplay(s.barWeight),
    weekly_goal: s.weeklyGoal,
    default_sets: s.defaultSets,
    default_range: s.defaultRange,
    show_rir: s.showRir,
    rest_timer: s.restTimer,
    rest_sound: s.restSound,
    rest_vibrate: s.restVibrate,
  };
}

// Changes

// An undo restores the state from before the change, unless something has changed it since.
function undoable(read, write) {
  const before = JSON.stringify(read());
  return (label, rerender = false) => {
    const after = JSON.stringify(read());
    return {
      label,
      rerender,
      undo: () => {
        if (JSON.stringify(read()) !== after) return false;
        write(JSON.parse(before));
        return true;
      },
    };
  };
}
const plansUndo = () => undoable(allPlans, savePlans);

// The exercises of a day from Claude's input, reusing what the old day knew about the same exercise. Unknown ids stop
// the whole change, so Claude can look them up instead of a plan quietly losing exercises.
function buildExercises(list, previous = []) {
  const seen = new Set();
  const unknown = [];
  const exercises = (Array.isArray(list) ? list : []).flatMap((x) => {
    const source = libraryOf({ id: String(x?.exercise_id ?? '') });
    if (!source) {
      unknown.push(String(x?.exercise_id));
      return [];
    }
    if (seen.has(source.id)) return [];
    seen.add(source.id);
    const old = previous.find((ex) => exerciseKey(ex) === source.id);
    const base = old ? clone(old) : planExerciseFromLibrary(source);
    if (x.sets !== undefined) base.sets = setsCount(x.sets);
    if (x.range !== undefined) base.range = normalizeRange(x.range, base.range);
    if (x.note !== undefined) base.note = clean(x.note, 200);
    if (x.rest_seconds !== undefined) base.rest = bounded(x.rest_seconds, 0, 0, 600) || undefined;
    return [base];
  });
  return { exercises, unknown };
}

function buildDays(input, previousDays = []) {
  if (!Array.isArray(input) || !input.length) return { error: 'A plan needs at least one day.' };
  if (input.length > MAX_DAYS) return { error: `A plan has at most ${MAX_DAYS} days.` };
  const unknown = [];
  const days = input.map((day, i) => {
    const old = previousDays.find((d) => d.id === day?.id);
    const { exercises, unknown: missing } = buildExercises(day?.exercises, old?.exercises);
    unknown.push(...missing);
    return {
      ...(old || { subtitle: '' }),
      id: old?.id || uid(),
      name: clean(day?.name, 40) || old?.name || t('day.nth', { n: i + 1 }),
      exercises: exercises.slice(0, MAX_EXERCISES_PER_DAY),
    };
  });
  if (unknown.length)
    return { error: `Unknown exercise_id: ${unknown.join(', ')}. Use search_exercises for valid ids.` };
  if (days.some((day) => !day.exercises.length)) return { error: 'Every day needs at least one exercise.' };
  return { days };
}

const scheduleFor = (days, previous) => {
  const slots = scheduleSlots(days.length);
  const assignments = {};
  days.forEach((day, i) => {
    assignments[day.id] = previous?.assignments?.[day.id] ?? slots[i] ?? i % 7;
  });
  return { mode: previous?.mode || 'flexible', assignments };
};

function createPlan({ name, description, days, activate }) {
  const built = buildDays(days);
  if (built.error) return built;
  const undo = plansUndo();
  const data = allPlans();
  const plan = {
    id: uid(),
    name: clean(name, 60) || t('plan.defaultName'),
    description: clean(description, 400),
    createdAt: new Date().toISOString(),
    schedule: scheduleFor(built.days),
    days: built.days,
  };
  data.items.push(plan);
  if (activate !== false) data.activePlanId = plan.id;
  savePlans(data);
  return {
    result: { created: true, plan_id: plan.id, active: activate !== false },
    action: undo(t('ai.action.planCreated', { name: plan.name })),
  };
}

function updatePlan({ plan_id, name, description, days }) {
  const data = allPlans();
  const plan = data.items.find((p) => p.id === plan_id);
  if (!plan) return { error: `Unknown plan_id ${plan_id}. Use list_plans.` };
  const built = days === undefined ? { days: plan.days } : buildDays(days, plan.days);
  if (built.error) return built;
  const undo = plansUndo();
  if (name !== undefined) plan.name = clean(name, 60) || plan.name;
  if (description !== undefined) plan.description = clean(description, 400);
  plan.days = built.days;
  plan.schedule = scheduleFor(built.days, plan.schedule);
  savePlans(data);
  return {
    result: { updated: true, plan_id },
    action: undo(t('ai.action.planUpdated', { name: plan.name })),
  };
}

function activatePlan({ plan_id }) {
  const data = allPlans();
  const plan = data.items.find((p) => p.id === plan_id);
  if (!plan) return { error: `Unknown plan_id ${plan_id}. Use list_plans.` };
  const undo = plansUndo();
  data.activePlanId = plan.id;
  savePlans(data);
  return {
    result: { active_plan_id: plan.id },
    action: undo(t('ai.action.planActivated', { name: plan.name })),
  };
}

async function deletePlan({ plan_id }, confirm) {
  const data = allPlans();
  const plan = data.items.find((p) => p.id === plan_id);
  if (!plan) return { error: `Unknown plan_id ${plan_id}. Use list_plans.` };
  if (data.items.length < 2) return { error: 'The only plan cannot be deleted. Create another one first.' };
  const agreed = await confirm({
    title: t('ai.confirm.deletePlan', { name: plan.name }),
    text: t('ai.confirm.deletePlanText'),
    confirmLabel: t('ai.confirm.delete'),
    danger: true,
  });
  if (!agreed) return { result: { deleted: false, reason: 'The person declined. Do not try again.' } };
  const undo = plansUndo();
  const current = allPlans();
  current.items = current.items.filter((p) => p.id !== plan_id);
  if (current.activePlanId === plan_id) current.activePlanId = current.items[0].id;
  savePlans(current);
  return {
    result: { deleted: true, active_plan_id: current.activePlanId },
    action: undo(t('ai.action.planDeleted', { name: plan.name })),
  };
}

const SETTING_NAMES = {
  language: 'settings.language',
  theme: 'settings.theme',
  unit: 'settings.unit',
  rest_seconds: 'settings.restDuration',
  increment: 'settings.increment',
  bar_weight: 'settings.barWeight',
  weekly_goal: 'settings.weeklyGoal',
  default_sets: 'settings.defaultSets',
  default_range: 'settings.defaultRange',
  show_rir: 'settings.showRir',
  rest_timer: 'settings.restTimer',
  rest_sound: 'settings.restSound',
  rest_vibrate: 'settings.restVibrate',
};
const applySettings = (settings) => {
  saveSettings(settings);
  setLanguage(settings.language);
  applyTheme();
};

function updateSettings(input) {
  const names = Object.keys(input || {}).filter((key) => SETTING_NAMES[key]);
  if (!names.length)
    return { error: `Nothing to change. Possible: ${Object.keys(SETTING_NAMES).join(', ')}.` };
  if (input.language !== undefined && !['auto', ...LANGUAGES].includes(input.language))
    return { error: `language must be one of auto, ${LANGUAGES.join(', ')}.` };
  if (input.theme !== undefined && !['auto', 'light', 'dark'].includes(input.theme))
    return { error: 'theme must be auto, light or dark.' };
  if (input.unit !== undefined && !['kg', 'lbs'].includes(input.unit))
    return { error: 'unit must be kg or lbs.' };
  const undo = undoable(getSettings, applySettings);
  const current = getSettings();
  const next = { ...current };
  // Weights are given in the unit active before this change.
  if (input.increment !== undefined)
    next.increment = Math.max(0.25, number(fromDisplay(input.increment))) || current.increment;
  if (input.bar_weight !== undefined) next.barWeight = Math.max(0, number(fromDisplay(input.bar_weight)));
  if (input.language !== undefined) next.language = input.language;
  if (input.theme !== undefined) next.theme = input.theme;
  if (input.rest_seconds !== undefined) next.rest = bounded(input.rest_seconds, current.rest, 0, 600);
  if (input.weekly_goal !== undefined)
    next.weeklyGoal = bounded(input.weekly_goal, current.weeklyGoal, 0, 14);
  if (input.default_sets !== undefined) next.defaultSets = setsCount(input.default_sets);
  if (input.default_range !== undefined) next.defaultRange = normalizeRange(input.default_range);
  if (input.show_rir !== undefined) next.showRir = !!input.show_rir;
  if (input.rest_timer !== undefined) next.restTimer = !!input.rest_timer;
  if (input.rest_sound !== undefined) next.restSound = !!input.rest_sound;
  if (input.rest_vibrate !== undefined) next.restVibrate = !!input.rest_vibrate;
  if (input.unit !== undefined && input.unit !== current.unit) {
    next.unit = input.unit;
    next.increment = inUnit(next.increment, input.unit, 2.5, 5);
    next.barWeight = inUnit(next.barWeight, input.unit, 20, 45);
  }
  applySettings(next);
  return {
    result: { updated: names, settings: settingsData() },
    action: undo(
      t('ai.action.settings', { names: names.map((key) => t(SETTING_NAMES[key])).join(', ') }),
      next.language !== current.language
    ),
  };
}

// Tool definitions

const object = (properties = {}, required = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const planDays = (description) => ({
  type: 'array',
  description,
  items: object(
    {
      id: { type: 'string', description: 'Id of an existing day to keep it; leave out for a new day.' },
      name: { type: 'string', description: 'Short day name, under 40 characters.' },
      exercises: {
        type: 'array',
        items: object(
          {
            exercise_id: { type: 'string', description: 'Id from search_exercises or list_plans.' },
            sets: { type: 'integer', description: 'Working sets, usually 1 to 6.' },
            range: { type: 'string', description: 'Rep target such as "8–12", or a time such as "30 s".' },
            note: { type: 'string', description: 'Short hint for this person, or empty.' },
            rest_seconds: {
              type: 'integer',
              description: 'Rest for this exercise, if it differs from the default.',
            },
          },
          ['exercise_id']
        ),
      },
    },
    ['name', 'exercises']
  ),
});

const DEFINITIONS = [
  [
    'list_plans',
    'All training plans with their days and exercises, and which one is active. Use before analysing or changing a plan.',
    object(),
  ],
  [
    'get_training_history',
    'Finished workouts, newest first, with every set as weight×reps, marked sets, RIR and records. Optionally for one exercise.',
    object({
      days: { type: 'integer', description: 'How far back, default 56.' },
      exercise_id: { type: 'string', description: 'Only this exercise.' },
      limit: { type: 'integer', description: 'Most sessions to return, default 20.' },
    }),
  ],
  [
    'get_exercise_stats',
    'One exercise in depth: muscles, personal records, strength trend, whether it has stalled, the weight the app suggests next, and the latest sessions.',
    object({ exercise_id: { type: 'string' } }, ['exercise_id']),
  ],
  [
    'search_exercises',
    'Search the exercise catalogue. Every exercise in a plan must come from here. Words match name and muscles, in German or English; group and equipment narrow it down.',
    object({
      query: { type: 'string' },
      group: { type: 'string', enum: GROUPS },
      equipment: { type: 'string', enum: EQUIPMENT_KEYS },
      limit: { type: 'integer', description: 'Default 15.' },
    }),
  ],
  [
    'get_stats',
    'Totals over the weeks: sets per muscle group, volume and sessions per week (oldest first), recent records.',
    object({ weeks: { type: 'integer', description: 'Default 12.' } }),
  ],
  ['get_body_data', 'Body weight and measurements, newest first.', object({ limit: { type: 'integer' } })],
  ['get_settings', 'The current app settings.', object()],
  [
    'create_plan',
    'Create a new training plan. It becomes the active plan unless activate is false. The person can undo this in the chat.',
    object(
      {
        name: { type: 'string' },
        description: { type: 'string', description: 'One sentence on why the plan fits this person.' },
        days: planDays('The training days in order.'),
        activate: { type: 'boolean' },
      },
      ['name', 'days']
    ),
  ],
  [
    'update_plan',
    'Change an existing plan. Fields left out stay as they are. If days is given it replaces all days, so include every day and exercise that should remain; existing ones keep their settings when you pass the day id and exercise_id, and sets, range and note only change where you pass them. The person can undo this in the chat.',
    object(
      {
        plan_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        days: planDays('All days of the plan after the change.'),
      },
      ['plan_id']
    ),
  ],
  [
    'delete_plan',
    'Delete a plan. The app itself asks the person to confirm, so call this once they want it deleted. Finished workouts stay in the history.',
    object({ plan_id: { type: 'string' } }, ['plan_id']),
  ],
  [
    'set_active_plan',
    'Make a plan the active one, which decides the next workout on the home screen.',
    object({ plan_id: { type: 'string' } }, ['plan_id']),
  ],
  [
    'update_settings',
    'Change app settings. Pass only what should change. Weights are in the currently set unit.',
    object({
      language: { type: 'string', enum: ['auto', ...LANGUAGES] },
      theme: { type: 'string', enum: ['auto', 'light', 'dark'] },
      unit: { type: 'string', enum: ['kg', 'lbs'] },
      rest_seconds: { type: 'integer', description: 'Default rest between sets, 0 to 600.' },
      increment: { type: 'number', description: 'Weight step for suggestions.' },
      bar_weight: { type: 'number' },
      weekly_goal: { type: 'integer', description: 'Sessions per week; 0 follows the plan.' },
      default_sets: { type: 'integer', description: 'Sets for newly added exercises.' },
      default_range: { type: 'string', description: 'Rep range for newly added exercises.' },
      show_rir: { type: 'boolean', description: 'Show the RIR column while training.' },
      rest_timer: { type: 'boolean' },
      rest_sound: { type: 'boolean' },
      rest_vibrate: { type: 'boolean' },
    }),
  ],
];

// Streaming tool input keeps long plans moving; each tool above checks what arrives.
export const aiTools = () =>
  DEFINITIONS.map(([name, description, input_schema]) => ({
    name,
    description,
    input_schema,
    eager_input_streaming: true,
  }));

const LOOKUPS = {
  list_plans: plansData,
  get_training_history: historyData,
  get_exercise_stats: exerciseData,
  search_exercises: searchData,
  get_stats: statsData,
  get_body_data: bodyData,
  get_settings: settingsData,
};
const CHANGES = {
  create_plan: createPlan,
  update_plan: updatePlan,
  delete_plan: deletePlan,
  set_active_plan: activatePlan,
  update_settings: updateSettings,
};

// `confirm` asks the person and resolves to true or false. Returns { result } or { error }, plus an `action` for a change.
export async function runTool(name, input, { confirm }) {
  const values = input && typeof input === 'object' ? input : {};
  if (LOOKUPS[name]) {
    const result = LOOKUPS[name](values);
    return result?.error ? result : { result };
  }
  if (CHANGES[name]) return CHANGES[name](values, confirm);
  return { error: `Unknown tool ${name}.` };
}
