// "Mehr" menu, backup and settings screens.
import { exportBackup, exportCsv, importBackup, validateBackup } from '../backup.js';
import { icon } from '../icons.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { activePlan, getSettings, saveSettings } from '../storage.js';
import { applyTheme } from '../theme.js';
import { confirmDialog, infoDialog, toast } from '../ui.js';
import { fieldValue, fromDisplay, unit } from '../units.js';
import { esc, number } from '../util.js';
import { backRow, mediaCredit } from './shell.js';

const menuItem = (target, ic, title, text) =>
  `<button type="button" class="row" data-nav="${target}"><span class="row-icon">${icon(ic)}</span><span class="row-main"><b>${title}</b><small>${text}</small></span>${icon('chevron-right')}</button>`;

const moreView = () =>
  `<main class="shell"><section class="page-head"><h1>Mehr</h1></section><div class="list">${menuItem('body', 'body', 'Körper', 'Gewicht, Maße, Fotos')}${menuItem('backup', 'backup', 'Backup', 'Exportieren und wiederherstellen')}${menuItem('settings', 'settings', 'Einstellungen', 'Einheiten, Pausen, Darstellung')}</div><p class="about">Volumora speichert alles nur auf diesem Gerät. Kein Konto, kein Server.</p>${mediaCredit()}</main>`;

const backupView = () =>
  `<main class="shell narrow">${backRow('Backup', 'more')}<section class="page-head compact"><div><h1>Sichern und mitnehmen</h1><p>Das JSON-Backup enthält Pläne, Trainings, Einstellungen und Körperdaten mit Fotos.</p></div></section><div class="backup-grid"><button class="action-tile" id="exportJson"><b>Vollständiges Backup</b><small>JSON herunterladen</small></button><button class="action-tile" id="exportCsv"><b>Trainings als Tabelle</b><small>CSV herunterladen</small></button><label class="action-tile"><b>Backup einspielen</b><small>JSON auswählen</small><input type="file" id="importJson" accept="application/json,.json"></label></div><p class="warning">Beim Import werden die aktuellen lokalen Daten ersetzt. Exportiere vorher ein Backup, wenn du sie behalten möchtest.</p></main>`;

function settingsView() {
  const s = getSettings();
  const option = (value, label, current) =>
    `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`;
  const planDays = activePlan()?.days?.filter((d) => d.exercises.length).length || 3;
  const toggle = (name, title, text, checked) =>
    `<label class="toggle-setting"><input name="${name}" type="checkbox" ${checked ? 'checked' : ''}><span><b>${title}</b><small>${text}</small></span></label>`;
  return `<main class="shell narrow">${backRow('Einstellungen', 'more')}<section class="page-head compact"><h1>Einstellungen</h1></section><form class="settings-form" id="settingsForm">
    <h2>Training</h2>
    <label><span>Gewichtseinheit</span><select name="unit">${option('kg', 'Kilogramm', s.unit)}${option('lbs', 'Pfund (lbs)', s.unit)}</select></label>
    <label><span>Standard-Gewichtsschritt</span><div class="unit-input"><input name="increment" type="number" min="0.25" step="0.25" value="${esc(fieldValue(s.increment))}"><i>${unit()}</i></div></label>
    <label><span>Stangengewicht</span><div class="unit-input"><input name="barWeight" type="number" min="0" step="0.5" value="${esc(fieldValue(s.barWeight))}"><i>${unit()}</i></div></label>
    <label><span>Wochenziel</span><select name="weeklyGoal">${option('0', `Wie der Plan (${planDays} Einheiten)`, String(s.weeklyGoal))}${[1, 2, 3, 4, 5, 6, 7].map((n) => option(String(n), `${n} pro Woche`, String(s.weeklyGoal))).join('')}</select></label>
    ${toggle('showRir', 'RIR anzeigen', 'Wiederholungsreserve pro Satz', s.showRir)}
    <h2>Pause</h2>
    ${toggle('restTimer', 'Pausentimer', 'Startet nach jedem erledigten Satz', s.restTimer)}
    <label><span>Pausendauer</span><div class="unit-input"><input name="rest" type="number" min="0" max="600" value="${esc(s.rest)}"><i>Sek.</i></div></label>
    ${'Notification' in window ? toggle('restNotify', 'Benachrichtigung bei Pausenende', 'Nur wenn die App im Hintergrund ist', s.restNotify) : ''}
    <h2>Darstellung</h2>
    <label><span>Design</span><select name="theme">${option('auto', 'Automatisch', s.theme)}${option('light', 'Hell', s.theme)}${option('dark', 'Dunkel', s.theme)}</select></label>
    <button class="primary" type="submit">Speichern</button></form><button class="secondary full install-settings" id="installHelp">Auf dem Homescreen installieren</button></main>`;
}

export function view() {
  if (state.view === 'backup') return backupView();
  if (state.view === 'settings') return settingsView();
  return moreView();
}

export function bind() {
  document.querySelector('#exportJson')?.addEventListener('click', exportBackup);
  document.querySelector('#exportCsv')?.addEventListener('click', exportCsv);
  document.querySelector('#importJson')?.addEventListener('change', async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    let backup;
    try {
      backup = validateBackup(JSON.parse(await file.text()));
    } catch {
      toast('Diese Datei ist kein gültiges Volumora-Backup.');
      input.value = '';
      return;
    }
    const ok = await confirmDialog({
      title: 'Backup einspielen?',
      text: 'Alle aktuellen Pläne, Trainings, Messungen und Einstellungen auf diesem Gerät werden ersetzt.',
      confirmLabel: 'Ersetzen',
      danger: true,
    });
    if (!ok) {
      input.value = '';
      return;
    }
    const failed = await importBackup(backup);
    applyTheme();
    navigate('home');
    toast(
      failed ? `Backup importiert. ${failed} Foto(s) konnten nicht gespeichert werden.` : 'Backup importiert'
    );
  });
  document.querySelector('#settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const restTimer = f.get('restTimer') === 'on';
    let restNotify = f.get('restNotify') === 'on';
    if (restNotify && 'Notification' in window && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission().catch(() => 'denied');
      if (permission !== 'granted') {
        restNotify = false;
        toast('Benachrichtigungen wurden nicht erlaubt.');
      }
    }
    // Weight fields were typed in the unit that was active while the form was open.
    const current = getSettings();
    saveSettings({
      ...current,
      theme: f.get('theme'),
      rest: number(f.get('rest')),
      increment: number(fromDisplay(f.get('increment'))) || 2.5,
      barWeight: number(fromDisplay(f.get('barWeight'))),
      unit: f.get('unit') === 'lbs' ? 'lbs' : 'kg',
      weeklyGoal: number(f.get('weeklyGoal')),
      showRir: f.get('showRir') === 'on',
      restTimer,
      restNotify,
    });
    if (!restTimer) state.restUntil = 0;
    applyTheme();
    render();
    toast('Einstellungen gespeichert');
  });
  document
    .querySelector('#installHelp')
    ?.addEventListener('click', () =>
      infoDialog(
        'Auf dem Homescreen installieren',
        'iPhone und iPad: In Safari „Teilen“ und dann „Zum Home-Bildschirm“ wählen. Android: Im Browser-Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“.'
      )
    );
}
