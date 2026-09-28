// Exercise catalogue: the 100-entry dataset with German names, plus the built-in Push/Pull/Legs plan.
import { EXERCISES } from '../assets/data/exercises.js';
import { titleCase } from './util.js';

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

export const exercise = (id, name, sets, range, gif, note) => ({
  id,
  name,
  sets,
  range,
  gif,
  note,
  favorite: false,
});

export const DEFAULT_PLAN = {
  id: 'ppl-default',
  name: 'Push · Pull · Legs',
  description: 'Ausgewogener 3-Tage-Plan',
  createdAt: new Date().toISOString(),
  days: [
    {
      id: 'push',
      name: 'Push',
      subtitle: 'Brust · Trizeps · Schulter',
      exercises: [
        exercise(
          'chest-press',
          'Brustpresse',
          3,
          '10–15',
          DEMOS.chest,
          'Neutraler Griff · Ellbogen ca. 30–45°.'
        ),
        exercise(
          'incline-chest-press',
          'Schrägbank-Brustpresse',
          3,
          '10–15',
          DEMOS.incline,
          'Leichte Schräge · schmerzfreier Bewegungsweg.'
        ),
        exercise(
          'triceps-pushdown',
          'Trizeps Pushdown',
          3,
          '10–15',
          DEMOS.pushdown,
          'Seilgriff · Ellbogen ruhig am Körper.'
        ),
        exercise(
          'cable-external-rotation',
          'Außenrotation am Kabel',
          2,
          '15–20',
          DEMOS.rotation,
          'Sehr leicht und kontrolliert.'
        ),
        exercise(
          'scaption-raise',
          'Scaption Raise',
          2,
          '12–15',
          DEMOS.scaption,
          'Arme leicht schräg nach vorne · bis Schulterhöhe.'
        ),
      ],
    },
    {
      id: 'pull',
      name: 'Pull',
      subtitle: 'Rücken · Bizeps',
      exercises: [
        exercise(
          'lat-pulldown-neutral',
          'Latzug neutral',
          3,
          '8–12',
          DEMOS.lat,
          'Zur oberen Brust · nicht hinter den Kopf.'
        ),
        exercise('seated-cable-row', 'Kabelrudern neutral', 3, '8–12', DEMOS.row, 'Oberkörper ruhig halten.'),
        exercise(
          'high-row-machine',
          'High Row Maschine',
          3,
          '10–12',
          DEMOS.highrow,
          'Schultern nicht hochziehen.'
        ),
        exercise('ez-bar-curl', 'SZ-Curls', 3, '8–12', DEMOS.curl, 'Ellbogen ruhig · kein Schwung.'),
        exercise(
          'hammer-curl',
          'Hammer Curls',
          2,
          '10–15',
          DEMOS.hammer,
          'Handflächen zueinander · kontrolliert.'
        ),
      ],
    },
    {
      id: 'legs',
      name: 'Legs',
      subtitle: 'Beine · Waden · Bauch',
      exercises: [
        exercise('squat', 'Kniebeugen', 3, '8–12', DEMOS.squat, 'Nur schmerzfreie Tiefe · Knie stabil.'),
        exercise(
          'romanian-deadlift',
          'Romanian Deadlift',
          3,
          '8–12',
          DEMOS.rdl,
          'Hüfte nach hinten · Rücken neutral.'
        ),
        exercise(
          'leg-curl',
          'Beinbeuger Maschine',
          3,
          '10–15',
          DEMOS.legcurl,
          'Sitzend oder liegend · kontrolliert.'
        ),
        exercise(
          'leg-extension',
          'Beinstrecker Maschine',
          3,
          '12–15',
          DEMOS.extension,
          'Nicht explosiv durchstrecken.'
        ),
        exercise('calf-raise', 'Wadenheben', 3, '12–20', DEMOS.calf, 'Oben kurz halten · langsam absenken.'),
        exercise('leg-raise', 'Beinheben', 3, '10–15', DEMOS.raise, 'Rumpf und Rücken kontrolliert halten.'),
      ],
    },
  ],
};

export const CATEGORY_BY_ID = {
  'chest-press': 'Brust',
  'incline-chest-press': 'Brust',
  'triceps-pushdown': 'Arme',
  'cable-external-rotation': 'Schulter',
  'scaption-raise': 'Schulter',
  'lat-pulldown-neutral': 'Rücken',
  'seated-cable-row': 'Rücken',
  'high-row-machine': 'Rücken',
  'ez-bar-curl': 'Arme',
  'hammer-curl': 'Arme',
  squat: 'Beine',
  'romanian-deadlift': 'Beine',
  'leg-curl': 'Beine',
  'leg-extension': 'Beine',
  'calf-raise': 'Beine',
  'leg-raise': 'Core',
};
export const CATEGORIES = ['Alle', 'Brust', 'Rücken', 'Schulter', 'Arme', 'Beine', 'Core', 'Ausdauer'];
const CATEGORY_LABELS = {
  chest: 'Brust',
  back: 'Rücken',
  shoulders: 'Schulter',
  'upper arms': 'Arme',
  'upper legs': 'Beine',
  'lower legs': 'Beine',
  waist: 'Core',
  cardio: 'Ausdauer',
};
const EQUIPMENT_LABELS = {
  barbell: 'Langhantel',
  dumbbell: 'Kurzhanteln',
  cable: 'Kabelzug',
  'body weight': 'Körpergewicht',
  'leverage machine': 'Maschine',
  'sled machine': 'Beinpresse',
  'ez barbell': 'SZ-Stange',
  band: 'Band',
  weighted: 'Zusatzgewicht',
  'wheel roller': 'Ab-Roller',
};
const GERMAN_EXERCISE_NAMES =
  `Bankdrücken mit Langhantel|Schrägbankdrücken mit Langhantel|Negativbankdrücken mit Langhantel|Bankdrücken mit Kurzhanteln|Schrägbankdrücken mit Kurzhanteln|Negativbankdrücken mit Kurzhanteln|Kurzhantel-Flys|Schrägbank-Flys|Kabel-Flys stehend|Kabel-Flys auf Brusthöhe|Brust-Dips|Liegestütze|Erhöhte Liegestütze|Negative Liegestütze|Brustpresse|Klimmzüge|Klimmzüge im Untergriff|Latzug|Latzug im Untergriff|Überzüge am Kabel|Kabelrudern sitzend|Kabelrudern breit|Langhantelrudern vorgebeugt|Pendlay Rows|Kurzhantelrudern vorgebeugt|Einarmiges Kurzhantelrudern|Rudermaschine sitzend|T-Bar Rudern an der Maschine|Face Pulls am Kabel|Shrugs mit Langhantel|Shrugs mit Kurzhanteln|Schulterdrücken mit Langhantel sitzend|Military Press breit|Schulterdrücken mit Kurzhanteln|Arnold Press|Seitheben mit Kurzhanteln|Seitheben am Kabel|Frontheben mit Kurzhanteln|Frontheben am Kabel|Reverse Flys vorgebeugt|Reverse Flys mit Kurzhanteln|Aufrechtes Rudern mit Langhantel|Aufrechtes Rudern am Kabel|Bizepscurls mit Langhantel|Bizepscurls mit SZ-Stange|Bizepscurls mit Kurzhanteln|Hammercurls|Schrägbank-Curls|Konzentrationscurls|Preacher Curls mit Kurzhantel|Bizepscurls am Kabel|Hammercurls am Kabel|Enges Bankdrücken|Bank-Dips|Diamant-Liegestütze|Trizepsdrücken mit V-Griff|Trizepsdrücken mit geradem Griff|Trizepsdrücken mit Seil|Skull Crusher mit Langhantel|Trizepsstrecken liegend mit Kurzhanteln|Trizeps-Kickbacks|Kniebeugen mit Langhantel|Frontkniebeugen|Rumänisches Kreuzheben mit Langhantel|Kreuzheben mit Langhantel|Sumo-Kreuzheben|Ausfallschritte mit Langhantel|Rückwärts-Ausfallschritte mit Langhantel|Goblet Squats|Ausfallschritte mit Kurzhanteln|Rückwärts-Ausfallschritte mit Kurzhanteln|Rumänisches Kreuzheben mit Kurzhanteln|Kreuzheben mit Kurzhanteln|Einbeiniges Kreuzheben mit Kurzhantel|Einbeinige Beinpresse|Beinpresse 45°|Beinstrecker|Beinbeuger liegend|Beinbeuger sitzend|Hip Thrust mit Langhantel|Glute Bridge mit Langhantel|Glute Bridge am Boden|Sprungkniebeugen|Gehende Ausfallschritte|Bulgarian Split Squats|Step-ups mit Kurzhanteln|Wadenheben mit Langhantel|Wadenheben sitzend|Wadenheben stehend|Plank mit Zusatzgewicht|Seitstütz erhöht|Crunches am Boden|Negativ-Crunches|Bicycle Crunches mit Band|Russian Twists|Beinheben hängend|Beinheben am Captain's Chair|Kabel-Crunches kniend|Ab-Wheel Rollout|Mountain Climbers`.split(
    '|'
  );

const source = EXERCISES?.length
  ? EXERCISES
  : DEFAULT_PLAN.days.flatMap((day) =>
      day.exercises.map((ex) => ({ ...ex, category: CATEGORY_BY_ID[ex.id] || 'Sonstige' }))
    );

export const EXERCISE_LIBRARY = source.map((ex, index) => {
  const category = CATEGORY_LABELS[ex.category] || ex.category;
  const equipment = EQUIPMENT_LABELS[ex.equipment] || ex.equipment || '';
  return {
    ...ex,
    name: EXERCISES?.length ? GERMAN_EXERCISE_NAMES[index] || titleCase(ex.name) : titleCase(ex.name),
    sourceName: ex.name,
    category,
    equipment,
    sets: ex.sets || 3,
    range: ex.range || (category === 'Core' || ex.target === 'calves' ? '12–15' : '8–12'),
    note: ex.note || equipment,
    favorite: false,
  };
});
export const libraryExercise = (id) => EXERCISE_LIBRARY.find((x) => x.id === id);
export const libraryBySourceName = (name) => EXERCISE_LIBRARY.find((x) => x.sourceName === name);
