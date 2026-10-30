// Exercise catalogue: dataset records with stable keys, the built-in default plan, and name/label resolution.
// Muscle groups, equipment and target muscles are stored as dataset keys; labels come from the dictionary.
import { EXERCISES } from '../assets/data/exercises.js';
import { t } from './i18n.js';
import { exerciseKey, titleCase } from './util.js';

const DEMOS = {
  chest: 'https://static.exercisedb.dev/media/DOoWcnA.gif',
  incline: 'https://static.exercisedb.dev/media/jHAnWmT.gif',
  pushdown: 'https://static.exercisedb.dev/media/dU605di.gif',
  rotation: 'https://static.exercisedb.dev/media/FWdVhcW.gif',
  scaption: 'https://static.exercisedb.dev/media/c9MnDRp.gif',
  lat: 'https://static.exercisedb.dev/media/rkg41Fb.gif',
  row: 'https://static.exercisedb.dev/media/fUBheHs.gif',
  highrow: 'https://static.exercisedb.dev/media/nZZZy9m.gif',
  curl: 'https://static.exercisedb.dev/media/6TG6x2w.gif',
  hammer: 'https://static.exercisedb.dev/media/slDvUAU.gif',
  squat: 'https://static.exercisedb.dev/media/iYzB0Cz.gif',
  rdl: 'https://static.exercisedb.dev/media/wQ2c4XD.gif',
  legcurl: 'https://static.exercisedb.dev/media/17lJ1kr.gif',
  extension: 'https://static.exercisedb.dev/media/my33uHU.gif',
  calf: 'https://static.exercisedb.dev/media/ykUOVze.gif',
  raise: 'https://static.exercisedb.dev/media/9IxJdtC.gif',
};

export const DEFAULT_PLAN_ID = 'ppl-default';
export const GROUPS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'];
const GROUP_OF_BODY_PART = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  neck: 'shoulders',
  'upper arms': 'arms',
  'lower arms': 'arms',
  'upper legs': 'legs',
  'lower legs': 'legs',
  waist: 'core',
  cardio: 'cardio',
};
export const groupOfBodyPart = (part) => GROUP_OF_BODY_PART[part] || (GROUPS.includes(part) ? part : 'other');
export const groupLabel = (key) => t(`group.${key}`, null, key);
export const equipmentLabel = (key) => (key ? t(`equipment.${key}`, null, titleCase(key)) : '');
export const muscleLabel = (key) => (key ? t(`muscle.${key}`, null, titleCase(key)) : '');

// Labels that versions before schema 5 stored on plan exercises, mapped to the keys used since.
export const LEGACY_GROUPS = {
  Brust: 'chest',
  Rücken: 'back',
  Schulter: 'shoulders',
  Arme: 'arms',
  Beine: 'legs',
  Core: 'core',
  Ausdauer: 'cardio',
  Sonstige: 'other',
  'Eigene Übung': 'other',
};
export const LEGACY_EQUIPMENT = {
  Langhantel: 'barbell',
  Kurzhanteln: 'dumbbell',
  Kabelzug: 'cable',
  Körpergewicht: 'body weight',
  Maschine: 'leverage machine',
  Beinpresse: 'sled machine',
  'SZ-Stange': 'ez barbell',
  Band: 'band',
  Zusatzgewicht: 'weighted',
  'Ab-Roller': 'wheel roller',
};

// The 16 exercises of the built-in plan keep their slug ids forever: history entries point at them.
const builtIn = (id, category, equipment, target, gif) => [
  id,
  {
    id,
    sourceName: id.replaceAll('-', ' '),
    category,
    equipment,
    target,
    gif,
    group: groupOfBodyPart(category),
    builtIn: true,
  },
];
export const BUILT_IN = Object.fromEntries([
  builtIn('chest-press', 'chest', 'leverage machine', 'pectorals', DEMOS.chest),
  builtIn('incline-chest-press', 'chest', 'leverage machine', 'pectorals', DEMOS.incline),
  builtIn('triceps-pushdown', 'upper arms', 'cable', 'triceps', DEMOS.pushdown),
  builtIn('cable-external-rotation', 'shoulders', 'cable', 'delts', DEMOS.rotation),
  builtIn('scaption-raise', 'shoulders', 'dumbbell', 'delts', DEMOS.scaption),
  builtIn('lat-pulldown-neutral', 'back', 'cable', 'lats', DEMOS.lat),
  builtIn('seated-cable-row', 'back', 'cable', 'upper back', DEMOS.row),
  builtIn('high-row-machine', 'back', 'leverage machine', 'upper back', DEMOS.highrow),
  builtIn('ez-bar-curl', 'upper arms', 'ez barbell', 'biceps', DEMOS.curl),
  builtIn('hammer-curl', 'upper arms', 'dumbbell', 'biceps', DEMOS.hammer),
  builtIn('squat', 'upper legs', 'barbell', 'quads', DEMOS.squat),
  builtIn('romanian-deadlift', 'upper legs', 'barbell', 'hamstrings', DEMOS.rdl),
  builtIn('leg-curl', 'upper legs', 'leverage machine', 'hamstrings', DEMOS.legcurl),
  builtIn('leg-extension', 'upper legs', 'leverage machine', 'quads', DEMOS.extension),
  builtIn('calf-raise', 'lower legs', 'leverage machine', 'calves', DEMOS.calf),
  builtIn('leg-raise', 'waist', 'body weight', 'abs', DEMOS.raise),
]);

export const EXERCISE_LIBRARY = EXERCISES.map((ex) => ({
  ...ex,
  sourceName: ex.name,
  name: titleCase(ex.name),
  group: groupOfBodyPart(ex.category),
  sets: 3,
  range: ex.category === 'waist' || ex.target === 'calves' ? '12–15' : '8–12',
  note: '',
}));
const BY_ID = new Map(EXERCISE_LIBRARY.map((ex) => [ex.id, ex]));
export const libraryExercise = (id) => BY_ID.get(id);
export const libraryBySourceName = (name) => EXERCISE_LIBRARY.find((x) => x.sourceName === name);

// The catalogue record behind a plan exercise, session entry or picker item; null for custom exercises.
export const libraryOf = (item) => {
  const key = exerciseKey(item);
  return BUILT_IN[key] || BY_ID.get(key) || null;
};

// Display name in the active language. Custom exercises keep whatever the user typed.
export const exerciseName = (item) => {
  const lib = libraryOf(item);
  if (!lib) return item?.name || t('exercise.fallback');
  return t(`ex.${lib.id}`, null, lib.name || titleCase(lib.sourceName));
};
// Muscle group key of a plan exercise, a session entry or a catalogue record.
export const groupOf = (item) => {
  const lib = libraryOf(item);
  if (lib) return lib.group;
  const raw = item?.category;
  return LEGACY_GROUPS[raw] || (GROUPS.includes(raw) ? raw : 'other');
};

// Exercises saved by older versions carry German labels and copies of catalogue fields. Labels become keys;
// the copies go away when the catalogue record can be resolved.
export function normalizeLegacyExercise(ex) {
  if (!ex || typeof ex !== 'object') return ex;
  if (ex.libraryId && (BY_ID.has(ex.libraryId) || BUILT_IN[ex.libraryId])) {
    delete ex.category;
    delete ex.equipment;
    delete ex.target;
    delete ex.sourceName;
    return ex;
  }
  if (ex.category) ex.category = LEGACY_GROUPS[ex.category] || ex.category;
  if (ex.equipment) ex.equipment = LEGACY_EQUIPMENT[ex.equipment] || ex.equipment;
  return ex;
}

const planExercise = (id, sets, range) => ({
  id,
  name: t(`ex.${id}`),
  sets,
  range,
  gif: BUILT_IN[id].gif,
  note: t(`exNote.${id}`),
});

// The plan every new installation starts with, built in the active language.
export function defaultPlan() {
  return {
    id: DEFAULT_PLAN_ID,
    name: t('plan.ppl.name'),
    description: t('plan.ppl.description'),
    createdAt: new Date().toISOString(),
    days: [
      {
        id: 'push',
        name: 'Push',
        subtitle: t('plan.ppl.pushSubtitle'),
        exercises: [
          planExercise('chest-press', 3, '10–15'),
          planExercise('incline-chest-press', 3, '10–15'),
          planExercise('triceps-pushdown', 3, '10–15'),
          planExercise('cable-external-rotation', 2, '15–20'),
          planExercise('scaption-raise', 2, '12–15'),
        ],
      },
      {
        id: 'pull',
        name: 'Pull',
        subtitle: t('plan.ppl.pullSubtitle'),
        exercises: [
          planExercise('lat-pulldown-neutral', 3, '8–12'),
          planExercise('seated-cable-row', 3, '8–12'),
          planExercise('high-row-machine', 3, '10–12'),
          planExercise('ez-bar-curl', 3, '8–12'),
          planExercise('hammer-curl', 2, '10–15'),
        ],
      },
      {
        id: 'legs',
        name: 'Legs',
        subtitle: t('plan.ppl.legsSubtitle'),
        exercises: [
          planExercise('squat', 3, '8–12'),
          planExercise('romanian-deadlift', 3, '8–12'),
          planExercise('leg-curl', 3, '10–15'),
          planExercise('leg-extension', 3, '12–15'),
          planExercise('calf-raise', 3, '12–20'),
          planExercise('leg-raise', 3, '10–15'),
        ],
      },
    ],
  };
}
