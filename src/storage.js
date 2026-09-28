// Persistence: localStorage for structured data, IndexedDB for photos, plus versioned migrations.
import { DEFAULT_PLAN } from './library.js';
import { toast } from './ui.js';
import { clone, dayKey, exerciseKey, uid, volumeOf } from './util.js';

export const LS = {
  schema: 'volumora-schema-version',
  plans: 'volumora-plans-v2',
  history: 'volumora-history-v2',
  active: 'volumora-active-v2',
  body: 'volumora-body-v2',
  settings: 'volumora-settings-v2',
  exercisePrefs: 'volumora-exercise-prefs-v1',
  rest: 'volumora-rest-until',
};
export const DEFAULT_SETTINGS = {
  theme: 'auto',
  rest: 90,
  increment: 2.5,
  showRir: false,
  restTimer: false,
  restNotify: false,
  unit: 'kg',
  weeklyGoal: 0,
  barWeight: 20,
};

export const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
export const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('Speichern fehlgeschlagen', err);
    toast(
      'Speichern fehlgeschlagen: Der lokale Speicher ist voll. Exportiere ein Backup und lösche alte Daten.',
      { duration: 9000 }
    );
    return false;
  }
};

export const getSettings = () => ({ ...DEFAULT_SETTINGS, ...read(LS.settings, {}) });
export const saveSettings = (settings) => write(LS.settings, settings);

const defaultPlans = () => ({ activePlanId: DEFAULT_PLAN.id, items: [clone(DEFAULT_PLAN)] });
export const allPlans = () => read(LS.plans, defaultPlans());
export const savePlans = (plans) => write(LS.plans, plans);
export const findPlan = (planId) => allPlans().items.find((p) => p.id === planId);
export const activePlan = () => {
  const data = allPlans();
  return data.items.find((p) => p.id === data.activePlanId) || data.items[0];
};
export const getDay = (planId, dayId) => findPlan(planId)?.days.find((d) => d.id === dayId);
export function persistPlan(plan) {
  const data = allPlans();
  const index = data.items.findIndex((x) => x.id === plan.id);
  if (index < 0) data.items.push(plan);
  else data.items[index] = plan;
  savePlans(data);
}

export const getHistory = () => read(LS.history, []);
export const saveHistory = (history) => write(LS.history, history);
export const getBody = () => read(LS.body, []);
export const saveBody = (entries) => write(LS.body, entries);
export const getPrefs = () => ({ favorites: [], recent: [], ...read(LS.exercisePrefs, {}) });
export const savePrefs = (prefs) => write(LS.exercisePrefs, prefs);
export const getActive = () => read(LS.active, null);
export const saveActive = (session) => write(LS.active, session);
export const clearActive = () => localStorage.removeItem(LS.active);
export const getRestUntil = () => Number(localStorage.getItem(LS.rest)) || 0;
export const saveRestUntil = (until) =>
  until ? localStorage.setItem(LS.rest, String(until)) : localStorage.removeItem(LS.rest);

// Progress photos live in IndexedDB. localStorage is limited to roughly 5 MB, which a handful of base64 photos would exhaust.
const PHOTO_DB = 'volumora-photos';
const PHOTO_STORE = 'photos';
const openPhotoDb = () =>
  new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB nicht verfügbar'));
    const req = indexedDB.open(PHOTO_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(PHOTO_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
const photoTx = (mode, fn) =>
  openPhotoDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, mode);
        const result = fn(tx.objectStore(PHOTO_STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
export const photos = {
  get: (id) =>
    photoTx('readonly', (s) => s.get(id))
      .then((req) => req.result)
      .catch(() => undefined),
  set: (id, dataUrl) => photoTx('readwrite', (s) => s.put(dataUrl, id)),
  remove: (id) => photoTx('readwrite', (s) => s.delete(id)).catch(() => {}),
  clear: () => photoTx('readwrite', (s) => s.clear()),
  entries: () =>
    photoTx('readonly', (s) => ({ keys: s.getAllKeys(), values: s.getAll() })).then(({ keys, values }) =>
      Object.fromEntries(keys.result.map((k, i) => [k, values.result[i]]))
    ),
};

// Each migration runs exactly once, in order, and bumps the stored schema version.
const MIGRATIONS = [
  // 1: history of the first FitFlow release used a different key and shape.
  () => {
    const old = read('ppl-history-v1', []);
    if (!old.length || localStorage.getItem(LS.history)) return;
    saveHistory(
      old.map((s) => ({
        ...s,
        id: uid(),
        planId: DEFAULT_PLAN.id,
        planName: DEFAULT_PLAN.name,
        dayId: s.day,
        dayName: s.day?.[0].toUpperCase() + s.day?.slice(1),
        volume: volumeOf(s),
      }))
    );
  },
  // 2: photos move to IndexedDB (asynchronous, see migratePhotos below).
  () => {},
  // 3: sessions and measurements get a local day key so calendar and week views are time-zone stable.
  () => {
    const history = getHistory();
    history.forEach((s) => {
      if (!s.day) s.day = dayKey(s.finishedAt);
    });
    saveHistory(history);
    const body = getBody();
    body.forEach((e) => {
      if (!e.day) e.day = dayKey(e.date);
    });
    saveBody(body);
  },
  // 4: history entries remember the library exercise so progress survives renames and plan changes.
  () => {
    const byPlanExercise = {};
    allPlans().items.forEach((p) =>
      p.days.forEach((d) =>
        d.exercises.forEach((ex) => {
          byPlanExercise[ex.id] = exerciseKey(ex);
        })
      )
    );
    const history = getHistory();
    history.forEach((s) =>
      s.entries?.forEach((e) => {
        const key = byPlanExercise[e.exerciseId];
        if (!e.libraryId && key && key !== e.exerciseId) e.libraryId = key;
      })
    );
    saveHistory(history);
  },
];
export const SCHEMA_VERSION = MIGRATIONS.length;

export function runMigrations() {
  if (!localStorage.getItem(LS.plans)) savePlans(defaultPlans());
  if (!localStorage.getItem(LS.settings)) saveSettings(DEFAULT_SETTINGS);
  const current = read(LS.schema, 0);
  for (let v = current; v < MIGRATIONS.length; v++) MIGRATIONS[v]();
  if (current !== SCHEMA_VERSION) write(LS.schema, SCHEMA_VERSION);
}

export async function migratePhotos() {
  const entries = getBody();
  const inline = (e) => typeof e.photo === 'string' && e.photo.startsWith('data:');
  if (!entries.some(inline)) return false;
  for (const e of entries) {
    if (!inline(e)) continue;
    try {
      await photos.set(e.id, e.photo);
      e.hasPhoto = true;
      delete e.photo;
    } catch {
      /* keep inline until IndexedDB works */
    }
  }
  saveBody(entries);
  return true;
}
