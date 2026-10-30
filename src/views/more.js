// "Mehr" menu, backup and settings screens. Settings save on change.
import { exportBackup, exportCsv, importBackup, validateBackup } from '../backup.js';
import { LANGUAGES, languageLabel, plural, setLanguage, t } from '../i18n.js';
import { importParsed, parseImport } from '../importers.js';
import { icon } from '../icons.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { activePlan, getSettings, photos, saveSettings } from '../storage.js';
import { applyTheme } from '../theme.js';
import { confirmDialog, infoDialog, toast } from '../ui.js';
import { fieldValue, fromDisplay, unit } from '../units.js';
import { esc, fmtDate, number } from '../util.js';
import { backRow, mediaCredit } from './shell.js';

const menuRow = (attrs, ic, title, text) =>
  `<button type="button" class="row" ${attrs}><span class="row-icon">${icon(ic)}</span><span class="row-main"><b>${title}</b><small>${text}</small></span>${icon('chevron-right')}</button>`;

const moreView = () =>
  `<main class="shell"><section class="page-head"><h1>${t('more.title')}</h1></section><div class="list">${menuRow('data-nav="body"', 'body', t('more.body'), t('more.bodyHint'))}${menuRow('data-nav="backup"', 'backup', t('more.backup'), t('more.backupHint'))}${menuRow('data-nav="customExercises"', 'plus', t('more.customExercises'), t('more.customExercisesHint'))}${menuRow('data-nav="settings"', 'settings', t('more.settings'), t('more.settingsHint'))}${menuRow('id="installRow"', 'plus', t('more.install'), state.installPrompt ? t('more.installApp') : t('more.installHint'))}${menuRow('data-nav="legal"', 'plan', t('more.legal'), t('more.legalHint'))}</div><p class="about">${t('more.about')}</p>${mediaCredit()}</main>`;

const backupView = () =>
  `<main class="shell narrow">${backRow(t('backup.title'), 'more')}<div class="list">${menuRow('id="exportJson"', 'backup', t('backup.export'), t('backup.exportHint'))}${menuRow('id="exportCsv"', 'chart', t('backup.csv'), t('backup.csvHint'))}<label class="row" for="importJson"><span class="row-icon">${icon('plus')}</span><span class="row-main"><b>${t('backup.import')}</b><small>${t('backup.importHint')}</small></span>${icon('chevron-right')}<input type="file" id="importJson" accept="application/json,.json" hidden></label><label class="row" for="importCsv"><span class="row-icon">${icon('chart')}</span><span class="row-main"><b>${t('backup.csvImport')}</b><small>${t('backup.csvImportHint')}</small></span>${icon('chevron-right')}<input type="file" id="importCsv" accept=".csv,text/csv,text/plain" hidden></label></div></main>`;

function settingsView() {
  const s = getSettings();
  const option = (value, label, current) =>
    `<option value="${value}" ${current === value ? 'selected' : ''}>${esc(label)}</option>`;
  const planDays = activePlan()?.days?.filter((d) => d.exercises.length).length || 3;
  const toggle = (name, title, text, checked) =>
    `<label class="toggle-setting"><input name="${name}" type="checkbox" ${checked ? 'checked' : ''}><span><b>${title}</b><small>${text}</small></span></label>`;
  return `<main class="shell narrow">${backRow(t('settings.title'), 'more')}<form class="settings-form" id="settingsForm">
    <h2>${t('settings.training')}</h2>
    <label><span>${t('settings.unit')}</span><select name="unit">${option('kg', t('settings.kg'), s.unit)}${option('lbs', t('settings.lbs'), s.unit)}</select></label>
    <label><span>${t('settings.increment')}</span><div class="unit-input"><input name="increment" type="number" min="0.25" step="0.25" value="${esc(fieldValue(s.increment))}"><i>${unit()}</i></div></label>
    <label><span>${t('settings.barWeight')}</span><div class="unit-input"><input name="barWeight" type="number" min="0" step="0.5" value="${esc(fieldValue(s.barWeight))}"><i>${unit()}</i></div></label>
    <label><span>${t('settings.weeklyGoal')}</span><select name="weeklyGoal">${option('0', t('settings.likePlan', { n: planDays }), String(s.weeklyGoal))}${[1, 2, 3, 4, 5, 6, 7].map((n) => option(String(n), t('settings.perWeek', { n }), String(s.weeklyGoal))).join('')}</select></label>
    <label><span>${t('settings.defaultSets')}</span><select name="defaultSets">${[1, 2, 3, 4, 5, 6].map((n) => option(String(n), String(n), String(s.defaultSets))).join('')}</select></label>
    <label><span>${t('settings.defaultRange')}</span><input name="defaultRange" value="${esc(s.defaultRange)}" maxlength="20" placeholder="8–12"></label>
    ${toggle('showRir', t('settings.showRir'), t('settings.showRirHint'), s.showRir)}
    <h2>${t('settings.rest')}</h2>
    ${toggle('restTimer', t('settings.restTimer'), t('settings.restTimerHint'), s.restTimer)}
    <label><span>${t('settings.restDuration')}</span><div class="unit-input"><input name="rest" type="number" min="0" max="600" value="${esc(s.rest)}"><i>${t('settings.seconds')}</i></div></label>
    ${toggle('restSound', t('settings.restSound'), t('settings.restSoundHint'), s.restSound)}
    ${toggle('restVibrate', t('settings.restVibrate'), t('settings.restVibrateHint'), s.restVibrate !== false)}
    ${'Notification' in window ? toggle('restNotify', t('settings.restNotify'), t('settings.restNotifyHint'), s.restNotify) : ''}
    <h2>${t('settings.appearance')}</h2>
    <label><span>${t('settings.language')}</span><select name="language">${option('auto', t('language.auto'), s.language)}${LANGUAGES.map((code) => option(code, languageLabel(code), s.language)).join('')}</select></label>
    <label><span>${t('settings.theme')}</span><select name="theme">${option('auto', t('theme.auto'), s.theme)}${option('light', t('theme.light'), s.theme)}${option('dark', t('theme.dark'), s.theme)}</select></label>
    <h2>${t('settings.data')}</h2>
    <button type="button" class="secondary danger full" id="deleteAll">${t('settings.deleteAll')}</button>
    <p class="muted settings-hint">${t('settings.deleteAllHint')}</p>
    </form></main>`;
}

export function view() {
  if (state.view === 'backup') return backupView();
  if (state.view === 'settings') return settingsView();
  return moreView();
}

async function saveForm(form) {
  const f = new FormData(form);
  const current = getSettings();
  let restNotify = f.get('restNotify') === 'on';
  if (
    restNotify &&
    !current.restNotify &&
    'Notification' in window &&
    Notification.permission !== 'granted'
  ) {
    const permission = await Notification.requestPermission().catch(() => 'denied');
    if (permission !== 'granted') {
      restNotify = false;
      toast(t('settings.notifyDenied'));
    }
  }
  const restTimer = f.get('restTimer') === 'on';
  // Weight fields were typed in the unit that was active while the form was open.
  const next = {
    ...current,
    language: f.get('language') || 'auto',
    theme: f.get('theme'),
    rest: number(f.get('rest')),
    increment: number(fromDisplay(f.get('increment'))) || current.increment,
    barWeight: number(fromDisplay(f.get('barWeight'))),
    showRir: f.get('showRir') === 'on',
    restTimer,
    restNotify,
    restSound: f.get('restSound') === 'on',
    restVibrate: f.get('restVibrate') === 'on',
    weeklyGoal: number(f.get('weeklyGoal')),
    defaultSets: number(f.get('defaultSets')) || 3,
    defaultRange: String(f.get('defaultRange') || '').trim() || '8–12',
  };
  const newUnit = f.get('unit') === 'lbs' ? 'lbs' : 'kg';
  const unitChanged = newUnit !== current.unit;
  next.unit = newUnit;
  saveSettings(next);
  if (!restTimer) state.restUntil = 0;
  applyTheme();
  const languageChanged = next.language !== current.language;
  if (languageChanged) setLanguage(next.language);
  // Re-render when a change affects how the form itself reads (unit suffixes, language, permission result).
  if (unitChanged || languageChanged || restNotify !== (f.get('restNotify') === 'on')) render();
}

// Validates the chosen file, asks once, replaces everything and goes home. Resolves true when data was imported.
export async function importBackupFile(input, { replace = false } = {}) {
  const file = input.files?.[0];
  if (!file) return false;
  let backup;
  try {
    backup = validateBackup(JSON.parse(await file.text()));
  } catch {
    toast(t('backup.invalid'));
    input.value = '';
    return false;
  }
  const ok = await confirmDialog({
    title: t('backup.importTitle'),
    text: t('backup.importText'),
    confirmLabel: t('backup.replace'),
    danger: true,
  });
  if (!ok) {
    input.value = '';
    return false;
  }
  const failed = await importBackup(backup);
  setLanguage(getSettings().language);
  applyTheme();
  navigate('home', {}, { replace });
  toast(failed ? t('backup.importedPhotosFailed', { n: failed }) : t('backup.imported'));
  return true;
}

// A Hevy or Strong CSV export: shown as a count with the date range before it is merged into the history.
export async function importCsvFile(input) {
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const parsed = parseImport(await file.text(), { unit: getSettings().unit });
  if (!parsed.source) return toast(t('backup.csvUnknown'));
  if (!parsed.sessions.length) return toast(t('backup.csvEmpty'));
  const days = parsed.sessions.map((s) => s.day).sort();
  const names = new Set(parsed.sessions.flatMap((s) => s.entries.map((e) => e.name)));
  const text = [
    t('backup.csvText', {
      source: parsed.source === 'hevy' ? 'Hevy' : 'Strong',
      from: fmtDate(days[0]),
      to: fmtDate(days[days.length - 1]),
      known: names.size - parsed.unknown.length,
      unknown: parsed.unknown.length,
    }),
    parsed.unitAssumed ? t('backup.csvUnit', { unit: getSettings().unit }) : '',
  ]
    .filter(Boolean)
    .join(' ');
  const ok = await confirmDialog({
    title: plural(parsed.sessions.length, 'backup.csvTitle'),
    text,
    confirmLabel: t('backup.csvConfirm'),
  });
  if (!ok) return;
  const result = importParsed(parsed);
  toast(
    [
      plural(result.added, 'backup.csvImported'),
      result.skipped ? t('backup.csvSkipped', { n: result.skipped }) : '',
    ]
      .filter(Boolean)
      .join(' ')
  );
}

export function bind() {
  document.querySelector('#exportJson')?.addEventListener('click', exportBackup);
  document.querySelector('#exportCsv')?.addEventListener('click', exportCsv);
  document.querySelector('#importJson')?.addEventListener('change', (e) => importBackupFile(e.target));
  document.querySelector('#importCsv')?.addEventListener('change', (e) => importCsvFile(e.target));
  const form = document.querySelector('#settingsForm');
  if (form) {
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('change', () => saveForm(form));
  }
  document.querySelector('#deleteAll')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: t('settings.deleteAllTitle'),
      text: t('settings.deleteAllText'),
      confirmLabel: t('settings.deleteAllConfirm'),
      danger: true,
    });
    if (!ok) return;
    localStorage.clear();
    await photos.clear().catch(() => {});
    if ('caches' in window)
      await caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
    location.reload();
  });
  document.querySelector('#installRow')?.addEventListener('click', async () => {
    if (state.installPrompt) {
      await state.installPrompt.prompt();
      state.installPrompt = null;
      render();
      return;
    }
    infoDialog(t('more.install'), t('more.installText'));
  });
}
