// Verifies the curated exercise selection of tools/ (data preparation for milestone 8).
// Pure Node, no dependencies; reads the repository files read-only.
//
//   node tools/verify-selection.mjs /path/to/exercises-dataset/data/exercises.json
//
// Checks: all legacy ids (assets/data/exercises.js) are included, ids are unique, sorted and present in the
// dataset, names are non-empty and unique, trackType is valid, every id has 1-6 steps in tools/steps.en.json
// and tools/steps.de.json (same number in both languages). Ends with counters per group and per equipment.
// Exit code 0 = no errors, 1 = errors (warnings never fail the run).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const here = (file) => new URL(file, import.meta.url);
const TRACK_TYPES = ['weight_reps', 'reps', 'time', 'distance_time'];
const MAX_STEPS = 6;
const GROUPS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'];
// Same mapping as GROUP_OF_BODY_PART in src/library.js.
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
// Standard rule for the trackType; the selection only stores deviations from it.
const defaultTrackType = (rec) =>
  rec.category === 'cardio' ? 'distance_time' : rec.equipment === 'body weight' ? 'reps' : 'weight_reps';

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function readJson(url, label) {
  try {
    return JSON.parse(readFileSync(url, 'utf8'));
  } catch (err) {
    fail(`${label}: cannot read (${err.message})`);
    return null;
  }
}

// The repo has no "type": "module", so Node warns once when it re-parses a data file as ES module.
async function importQuietly(url) {
  const emit = process.emitWarning;
  process.emitWarning = (warning, ...rest) => {
    const code = isPlainObject(rest[0]) ? rest[0].code : rest[1];
    if (code !== 'MODULE_TYPELESS_PACKAGE_JSON') emit.call(process, warning, ...rest);
  };
  try {
    return await import(url.href);
  } finally {
    process.emitWarning = emit;
  }
}

const datasetPath = process.argv[2];
if (!datasetPath) {
  console.error('Usage: node tools/verify-selection.mjs <path to exercises.json of the dataset>');
  process.exit(2);
}

let dataset = null;
try {
  dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
} catch (err) {
  console.error(`Cannot read dataset ${datasetPath}: ${err.message}`);
  process.exit(2);
}
if (!Array.isArray(dataset)) {
  console.error('Dataset must be a JSON array.');
  process.exit(2);
}
const record = new Map(dataset.map((rec) => [String(rec.id), rec]));

const selection = readJson(here('./exercise-selection.json'), 'exercise-selection.json');
const stepsEn = readJson(here('./steps.en.json'), 'steps.en.json');
const stepsDe = readJson(here('./steps.de.json'), 'steps.de.json');

// 1. Selection: structure, ids, names, trackType
const ids = [];
if (!Array.isArray(selection)) {
  if (selection !== null) fail('exercise-selection.json: must be an array');
} else {
  const names = { nameDe: new Map(), nameEn: new Map() };
  let previous = '';
  selection.forEach((entry, i) => {
    const where = `exercise-selection.json[${i}]`;
    if (!isPlainObject(entry)) return fail(`${where}: must be an object`);
    for (const key of Object.keys(entry)) {
      if (!['id', 'nameDe', 'nameEn', 'trackType'].includes(key)) fail(`${where}: unknown key "${key}"`);
    }
    const { id, trackType } = entry;
    if (typeof id !== 'string' || !/^\d{4}$/.test(id)) return fail(`${where}: id must be a 4-digit string (${JSON.stringify(id)})`);
    ids.push(id);
    if (id <= previous) fail(`${where}: ids must be unique and sorted ascending (${previous} before ${id})`);
    previous = id;
    const rec = record.get(id);
    if (!rec) fail(`${id}: not in the dataset`);
    for (const field of ['nameDe', 'nameEn']) {
      const value = entry[field];
      if (typeof value !== 'string' || !value.trim()) {
        fail(`${id}: ${field} is empty`);
        continue;
      }
      if (value !== value.trim()) fail(`${id}: ${field} has leading/trailing whitespace`);
      const key = value.trim().toLowerCase();
      if (names[field].has(key)) fail(`${field} "${value}" is not unique (${names[field].get(key)} and ${id})`);
      else names[field].set(key, id);
    }
    if (trackType !== undefined) {
      if (!TRACK_TYPES.includes(trackType)) fail(`${id}: invalid trackType ${JSON.stringify(trackType)}`);
      else if (rec && trackType === defaultTrackType(rec)) warn(`${id}: trackType "${trackType}" equals the standard rule and could be omitted`);
    }
  });
}
const idSet = new Set(ids);

// 2. Legacy ids from assets/data/exercises.js (read-only dynamic import)
let legacy = [];
try {
  legacy = (await importQuietly(here('../assets/data/exercises.js'))).EXERCISES.map((ex) => String(ex.id));
} catch (err) {
  fail(`assets/data/exercises.js: cannot import (${err.message})`);
}
const missingLegacy = legacy.filter((id) => !idSet.has(id));
if (missingLegacy.length) fail(`legacy ids missing in the selection: ${missingLegacy.join(', ')}`);

// 3. Steps
function checkSteps(label, steps) {
  if (steps === null) return;
  if (!isPlainObject(steps)) return fail(`${label}: must be an object { id: [steps] }`);
  for (const id of idSet) if (!(id in steps)) fail(`${label}: no steps for ${id}`);
  for (const [id, list] of Object.entries(steps)) {
    if (!idSet.has(id)) {
      fail(`${label}: ${id} is not part of the selection`);
      continue;
    }
    if (!Array.isArray(list) || list.length < 1 || list.length > MAX_STEPS) {
      fail(`${label}: ${id} needs 1-${MAX_STEPS} steps (has ${Array.isArray(list) ? list.length : typeof list})`);
      continue;
    }
    list.forEach((step, n) => {
      if (typeof step !== 'string' || !step.trim()) return fail(`${label}: ${id} step ${n + 1} is empty`);
      if (step !== step.trim() || /[\r\n]/.test(step)) fail(`${label}: ${id} step ${n + 1} is not trimmed / has line breaks`);
      if (/^\s*(\d+\s*[.):]|step\s*\d+)/i.test(step)) fail(`${label}: ${id} step ${n + 1} starts with a number`);
    });
  }
}
checkSteps('steps.en.json', stepsEn);
checkSteps('steps.de.json', stepsDe);
if (isPlainObject(stepsEn) && isPlainObject(stepsDe)) {
  for (const id of idSet) {
    const a = stepsEn[id];
    const b = stepsDe[id];
    if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) {
      fail(`${id}: ${a.length} English but ${b.length} German steps`);
    }
    if (Array.isArray(a) && Array.isArray(b) && a.some((s, n) => s === b[n])) warn(`${id}: a German step is identical to the English one`);
  }
}

// 4. Informational: legacy names that differ from the dictionaries (corrections, see tools/dataset-notes.md)
const changed = [];
if (Array.isArray(selection)) {
  try {
    const en = (await importQuietly(here('../src/locales/en.js'))).default;
    const de = (await importQuietly(here('../src/locales/de.js'))).default;
    for (const entry of selection.filter((e) => legacy.includes(e?.id))) {
      if (en[`ex.${entry.id}`] !== entry.nameEn) changed.push(`${entry.id} en: "${en[`ex.${entry.id}`]}" -> "${entry.nameEn}"`);
      if (de[`ex.${entry.id}`] !== entry.nameDe) changed.push(`${entry.id} de: "${de[`ex.${entry.id}`]}" -> "${entry.nameDe}"`);
    }
  } catch (err) {
    warn(`src/locales: cannot compare legacy names (${err.message})`);
  }
}

// 5. Counters
const count = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
const perGroup = new Map(GROUPS.map((g) => [g, 0]));
const perEquipment = new Map();
const perTrackType = new Map(TRACK_TYPES.map((t) => [t, 0]));
for (const entry of Array.isArray(selection) ? selection : []) {
  const rec = record.get(entry?.id);
  if (!rec) continue;
  count(perGroup, GROUP_OF_BODY_PART[rec.category] ?? GROUP_OF_BODY_PART[rec.body_part] ?? 'other');
  count(perEquipment, rec.equipment);
  count(perTrackType, entry.trackType ?? defaultTrackType(rec));
}
const line = (map, sort = false) =>
  [...(sort ? [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) : map)].map(([k, v]) => `${k} ${v}`).join(', ');

console.log(`Dataset:   ${dataset.length} exercises (${datasetPath})`);
console.log(`Selection: ${ids.length} exercises, ${legacy.length - missingLegacy.length}/${legacy.length} legacy ids included, ${ids.length - (legacy.length - missingLegacy.length)} new`);
console.log(`Steps:     ${isPlainObject(stepsEn) ? Object.keys(stepsEn).length : '-'} English, ${isPlainObject(stepsDe) ? Object.keys(stepsDe).length : '-'} German`);
console.log(`Per group:     ${line(perGroup)}`);
console.log(`Per equipment: ${line(perEquipment, true)}`);
console.log(`Per trackType: ${line(perTrackType)} (explicit overrides: ${(Array.isArray(selection) ? selection : []).filter((e) => e?.trackType).length})`);
if (changed.length) {
  console.log(`Legacy names that differ from src/locales (${changed.length}):`);
  for (const c of changed) console.log(`  ${c}`);
}
for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(errors.length ? `FAILED: ${errors.length} error(s), ${warnings.length} warning(s)` : `OK: no errors, ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
