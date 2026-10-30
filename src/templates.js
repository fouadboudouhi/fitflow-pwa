// Ready-made training programmes. Exercises are referenced by their catalogue name (sourceName); a unit test
// checks that every reference resolves. Names and descriptions live in the dictionaries (`template.<id>.*`).
import { t } from './i18n.js';
import { libraryBySourceName } from './library.js';
import { planExerciseFromLibrary, scheduleSlots } from './plans.js';
import { uid } from './util.js';

// [sourceName, sets, range, rest in seconds]
const compound = (name, sets = 3, range = '6–10') => [name, sets, range, 150];
const main = (name, sets = 3, range = '8–12') => [name, sets, range, 90];
const accessory = (name, sets = 3, range = '10–15') => [name, sets, range, 60];
const core = (name, sets = 3, range = '12–15') => [name, sets, range, 60];

export const TEMPLATES = [
  {
    id: 'full2',
    days: 2,
    equipment: 'gym',
    level: 'beginner',
    plan: [
      [
        'day.fullA',
        [
          compound('barbell full squat', 3, '5–8'),
          compound('barbell bench press'),
          main('cable seated row'),
          main('dumbbell seated shoulder press'),
          core('cable kneeling crunch'),
        ],
      ],
      [
        'day.fullB',
        [
          compound('barbell romanian deadlift'),
          main('cable pulldown'),
          main('dumbbell incline bench press'),
          main('dumbbell lunge', 3, '10–12'),
          core('hanging leg raise', 3, '10–15'),
        ],
      ],
    ],
  },
  {
    id: 'full3',
    days: 3,
    equipment: 'gym',
    level: 'beginner',
    plan: [
      [
        'day.fullA',
        [
          compound('barbell full squat'),
          main('dumbbell bench press'),
          main('cable seated row'),
          accessory('dumbbell lateral raise', 3, '12–15'),
          core('cable kneeling crunch'),
        ],
      ],
      [
        'day.fullB',
        [
          compound('barbell romanian deadlift', 3, '8–10'),
          main('dumbbell seated shoulder press'),
          main('cable pulldown'),
          accessory('dumbbell biceps curl', 2, '10–12'),
          accessory('cable pushdown (with rope attachment)', 2, '10–12'),
        ],
      ],
      [
        'day.fullC',
        [
          main('lever alternate leg press', 3, '10–12'),
          main('barbell incline bench press'),
          main('barbell bent over row'),
          accessory('lever leg extension', 2, '12–15'),
          accessory('lever lying leg curl', 2, '12–15'),
        ],
      ],
    ],
  },
  {
    id: 'upperLower4',
    days: 4,
    equipment: 'gym',
    level: 'intermediate',
    plan: [
      [
        'day.upperA',
        [
          compound('barbell bench press', 4),
          main('pull-up', 3, '6–10'),
          main('dumbbell seated shoulder press'),
          main('cable seated row'),
          accessory('dumbbell biceps curl', 2, '10–12'),
          accessory('cable pushdown (with rope attachment)', 2, '10–12'),
        ],
      ],
      [
        'day.lowerA',
        [
          compound('barbell full squat', 4),
          compound('barbell romanian deadlift'),
          main('dumbbell lunge', 3, '10–12'),
          accessory('lever leg extension', 2, '12–15'),
          accessory('lever seated leg curl', 2, '12–15'),
          accessory('lever seated calf raise', 3, '12–15'),
        ],
      ],
      [
        'day.upperB',
        [
          compound('dumbbell incline bench press', 4),
          compound('barbell bent over row', 4),
          accessory('dumbbell lateral raise', 3, '12–15'),
          main('cable pulldown'),
          accessory('dumbbell hammer curl', 2, '10–12'),
          main('barbell close-grip bench press', 2, '8–12'),
        ],
      ],
      [
        'day.lowerB',
        [
          compound('barbell deadlift', 3, '4–6'),
          main('dumbbell goblet squat', 3, '10–12'),
          main('dumbbell single leg split squat', 3, '8–12'),
          main('barbell glute bridge', 3, '8–12'),
          accessory('lever lying leg curl', 2, '12–15'),
          accessory('bodyweight standing calf raise', 3, '15–20'),
        ],
      ],
    ],
  },
  {
    id: 'ppl3',
    days: 3,
    equipment: 'gym',
    level: 'intermediate',
    plan: [
      [
        'day.push',
        [
          compound('barbell bench press', 4),
          main('dumbbell incline bench press'),
          main('dumbbell seated shoulder press'),
          accessory('dumbbell lateral raise', 3, '12–15'),
          accessory('cable pushdown (with rope attachment)'),
          accessory('dumbbell lying triceps extension', 2, '10–12'),
        ],
      ],
      [
        'day.pull',
        [
          compound('pull-up', 4, '5–10'),
          main('cable seated row'),
          compound('barbell bent over row', 3, '8–10'),
          accessory('cable standing rear delt row (with rope)', 3, '12–15'),
          accessory('barbell curl', 3, '8–12'),
          accessory('dumbbell hammer curl', 2, '10–12'),
        ],
      ],
      [
        'day.legs',
        [
          compound('barbell full squat', 4),
          compound('barbell romanian deadlift'),
          main('lever alternate leg press', 3, '10–12'),
          accessory('lever lying leg curl', 3, '10–15'),
          accessory('lever leg extension', 3, '12–15'),
          accessory('barbell standing calf raise', 4, '10–15'),
        ],
      ],
    ],
  },
  {
    id: 'split5',
    days: 5,
    equipment: 'gym',
    level: 'advanced',
    plan: [
      [
        'day.push',
        [
          compound('barbell bench press', 4),
          main('dumbbell incline bench press'),
          main('dumbbell seated shoulder press'),
          accessory('dumbbell lateral raise', 3, '12–15'),
          accessory('cable pushdown (with rope attachment)'),
          accessory('dumbbell lying triceps extension', 2, '10–12'),
        ],
      ],
      [
        'day.pull',
        [
          compound('pull-up', 4, '5–10'),
          main('cable seated row'),
          compound('barbell bent over row', 3, '8–10'),
          accessory('cable standing rear delt row (with rope)', 3, '12–15'),
          accessory('barbell curl', 3, '8–12'),
          accessory('dumbbell hammer curl', 2, '10–12'),
        ],
      ],
      [
        'day.legs',
        [
          compound('barbell full squat', 4),
          compound('barbell romanian deadlift'),
          main('lever alternate leg press', 3, '10–12'),
          accessory('lever lying leg curl', 3, '10–15'),
          accessory('lever leg extension', 3, '12–15'),
          accessory('barbell standing calf raise', 4, '10–15'),
        ],
      ],
      [
        'day.upper',
        [
          compound('dumbbell incline bench press', 4),
          compound('barbell bent over row', 4),
          accessory('dumbbell lateral raise', 3, '12–15'),
          main('cable pulldown'),
          accessory('dumbbell hammer curl', 2, '10–12'),
          main('barbell close-grip bench press', 2, '8–12'),
        ],
      ],
      [
        'day.lower',
        [
          compound('barbell deadlift', 3, '4–6'),
          main('dumbbell goblet squat', 3, '10–12'),
          main('dumbbell single leg split squat', 3, '8–12'),
          main('barbell glute bridge', 3, '8–12'),
          accessory('lever lying leg curl', 2, '12–15'),
          accessory('bodyweight standing calf raise', 3, '15–20'),
        ],
      ],
    ],
  },
  {
    id: 'ppl6',
    days: 6,
    equipment: 'gym',
    level: 'advanced',
    plan: [
      [
        'day.pushA',
        [
          compound('barbell bench press', 4),
          main('dumbbell seated shoulder press'),
          main('dumbbell incline bench press'),
          accessory('dumbbell lateral raise', 3, '12–15'),
          accessory('cable pushdown (with rope attachment)'),
        ],
      ],
      [
        'day.pullA',
        [
          compound('barbell deadlift', 3, '4–6'),
          main('pull-up', 3, '6–10'),
          main('cable seated row'),
          accessory('cable standing rear delt row (with rope)', 3, '12–15'),
          accessory('barbell curl', 3, '8–12'),
        ],
      ],
      [
        'day.legsA',
        [
          compound('barbell full squat', 4),
          compound('barbell romanian deadlift'),
          accessory('lever leg extension', 3, '12–15'),
          accessory('lever lying leg curl', 3, '10–15'),
          accessory('barbell standing calf raise', 4, '10–15'),
        ],
      ],
      [
        'day.pushB',
        [
          compound('barbell standing wide military press', 4, '6–10'),
          main('dumbbell bench press'),
          accessory('cable middle fly', 3, '12–15'),
          accessory('dumbbell lateral raise', 3, '12–15'),
          accessory('dumbbell lying triceps extension'),
        ],
      ],
      [
        'day.pullB',
        [
          compound('barbell bent over row', 4, '6–10'),
          main('cable pulldown'),
          main('dumbbell one arm bent-over row'),
          accessory('dumbbell rear delt raise', 3, '12–15'),
          accessory('dumbbell hammer curl', 3, '10–12'),
        ],
      ],
      [
        'day.legsB',
        [
          compound('barbell front squat', 4, '6–10'),
          main('lever alternate leg press', 3, '10–12'),
          main('dumbbell lunge', 3, '10–12'),
          accessory('lever seated leg curl', 3, '10–15'),
          accessory('lever seated calf raise', 4, '12–15'),
        ],
      ],
    ],
  },
  {
    id: 'home3',
    days: 3,
    equipment: 'home',
    level: 'beginner',
    plan: [
      [
        'day.fullA',
        [
          main('push-up', 3, '8–15'),
          main('inverted row', 3, '8–12'),
          main('quads', 3, '12–20'),
          main('low glute bridge on floor', 3, '12–15'),
          core('crunch floor', 3, '12–20'),
        ],
      ],
      [
        'day.fullB',
        [
          main('pull-up', 3, '5–10'),
          main('diamond push-up', 3, '8–12'),
          main('walking lunge', 3, '10–12'),
          main('jump squat', 3, '8–12'),
          core('mountain climber', 3, '20–30'),
          core('dead bug', 3, '10–12'),
        ],
      ],
      [
        'day.fullC',
        [
          main('incline push-up', 3, '10–15'),
          main('split squats', 3, '10–12'),
          main('single leg bridge with outstretched leg', 3, '10–12'),
          main('burpee', 3, '8–12'),
          core('russian twist', 3, '15–20'),
          core('lower back curl', 3, '12–15'),
        ],
      ],
    ],
  },
  {
    id: 'dumbbell3',
    days: 3,
    equipment: 'dumbbell',
    level: 'beginner',
    plan: [
      [
        'day.fullA',
        [
          main('dumbbell squat', 3, '10–12'),
          main('dumbbell bench press'),
          main('dumbbell bent over row'),
          accessory('dumbbell lateral raise', 3, '12–15'),
          accessory('dumbbell biceps curl', 2, '10–12'),
          accessory('dumbbell lying triceps extension', 2, '10–12'),
        ],
      ],
      [
        'day.fullB',
        [
          main('dumbbell romanian deadlift'),
          main('dumbbell incline bench press'),
          main('dumbbell one arm bent-over row'),
          main('dumbbell seated shoulder press'),
          accessory('dumbbell hammer curl', 2, '10–12'),
          accessory('dumbbell kickback', 2, '10–12'),
        ],
      ],
      [
        'day.fullC',
        [
          main('dumbbell lunge', 3, '10–12'),
          main('dumbbell goblet squat', 3, '10–15'),
          main('dumbbell fly', 3, '10–12'),
          accessory('dumbbell rear delt raise', 3, '12–15'),
          main('dumbbell shrug', 3, '10–12'),
          accessory('dumbbell standing calf raise', 3, '12–15'),
        ],
      ],
    ],
  },
  {
    id: 'linear2',
    days: 2,
    equipment: 'gym',
    level: 'beginner',
    plan: [
      [
        'day.workoutA',
        [
          ['barbell full squat', 5, '5', 180],
          ['barbell bench press', 5, '5', 180],
          ['barbell bent over row', 5, '5', 180],
        ],
      ],
      [
        'day.workoutB',
        [
          ['barbell full squat', 5, '5', 180],
          ['barbell standing wide military press', 5, '5', 180],
          ['barbell deadlift', 3, '5', 240],
        ],
      ],
    ],
  },
  {
    id: 'minimal2',
    days: 2,
    equipment: 'gym',
    level: 'intermediate',
    plan: [
      [
        'day.workoutA',
        [
          compound('barbell full squat', 3, '5–8'),
          compound('barbell bench press'),
          main('cable pulldown'),
          core('cable kneeling crunch', 2),
        ],
      ],
      [
        'day.workoutB',
        [
          compound('trap bar deadlift', 3, '5–8'),
          main('dumbbell seated shoulder press'),
          main('cable seated row'),
          main('dumbbell lunge', 2, '10–12'),
        ],
      ],
    ],
  },
];
export const EQUIPMENT_CHOICES = ['gym', 'dumbbell', 'home'];
export const templateById = (id) => TEMPLATES.find((x) => x.id === id);
export const templateName = (template) => t(`template.${template.id}.name`);
export const templateDescription = (template) => t(`template.${template.id}.description`);

// Builds a plan from a template. Beginners get at most three sets per exercise.
export function planFromTemplate(id, { scheduleMode = 'flexible', level = 'intermediate' } = {}) {
  const template = templateById(id);
  if (!template) return null;
  const days = template.plan.map(([nameKey, exercises]) => ({
    id: uid(),
    name: t(nameKey),
    subtitle: '',
    exercises: exercises.map(([sourceName, sets, range, rest]) => {
      const source = libraryBySourceName(sourceName);
      if (!source) throw new Error(`template ${id}: unknown exercise ${sourceName}`);
      return {
        ...planExerciseFromLibrary(source),
        sets: level === 'beginner' ? Math.min(3, sets) : sets,
        range,
        rest,
      };
    }),
  }));
  const assignments = {};
  scheduleSlots(days.length).forEach((weekday, i) => {
    assignments[days[i].id] = weekday;
  });
  return {
    id: uid(),
    name: templateName(template),
    description: templateDescription(template),
    createdAt: new Date().toISOString(),
    schedule: { mode: scheduleMode, assignments },
    days,
  };
}

// The template that fits a first-run answer best: equipment first, then the day count, then the goal.
export function pickTemplate({ days = 3, equipment = 'gym', goal = 'muscle', level = 'intermediate' } = {}) {
  const pool = TEMPLATES.filter((x) => x.equipment === equipment);
  if (!pool.length) return TEMPLATES[0];
  if (equipment === 'gym' && goal === 'strength' && days <= 3 && level !== 'advanced')
    return templateById('linear2');
  const exact = pool.filter((x) => x.days === days);
  const candidates = exact.length
    ? exact
    : pool.sort((a, b) => Math.abs(a.days - days) - Math.abs(b.days - days));
  return candidates.find((x) => x.level === level) || candidates[0];
}
