// "Mehr" menu, backup and settings screens.
import { exportBackup, exportCsv, importBackup, validateBackup } from '../backup.js';
import { icon } from '../icons.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { getSettings, saveSettings } from '../storage.js';
import { applyTheme } from '../theme.js';
import { confirmDialog, infoDialog, toast } from '../ui.js';
import { esc, number } from '../util.js';
import { backRow, mediaCredit } from './shell.js';

const menuItem = (target, ic, title, text) =>
  `<button data-nav="${target}"><span>${icon(ic)}</span><div><b>${title}</b><small>${text}</small></div><i>→</i></button>`;

const moreView = () =>
  `<main class="shell"><section class="page-head"><div><span class="eyebrow">Volumora</span><h1>Mehr</h1><p>Körperdaten, Sicherung und Einstellungen.</p></div></section><div class="menu-list">${menuItem('body', 'body', 'Körper & Fotos', 'Gewicht, Maße und Fortschrittsbilder')}${menuItem('backup', 'backup', 'Export & Backup', 'JSON sichern, CSV exportieren, Backup einspielen')}${menuItem('settings', 'settings', 'Einstellungen', 'Design, Pause und Gewichtsschritte')}</div><section class="about-card"><img src="assets/brand/volumora-mark.png" alt="Volumora Logo"><div><b>Volumora</b><p>Deine Trainingsdaten bleiben ausschließlich lokal auf diesem Gerät, bis du selbst ein Backup exportierst.</p></div></section>${mediaCredit()}</main>`;

const backupView = () =>
  `<main class="shell narrow">${backRow('Export & Backup', 'more')}<section class="page-head compact"><div><span class="eyebrow">Deine Daten</span><h1>Sichern & mitnehmen</h1><p>Ein JSON-Backup enthält Pläne, Trainings, Einstellungen und Körperdaten inklusive Fotos.</p></div></section><div class="backup-grid"><button class="action-tile" id="exportJson"><span>↓</span><b>Vollständiges Backup</b><small>JSON herunterladen</small></button><button class="action-tile" id="exportCsv"><span>↓</span><b>Training als Tabelle</b><small>CSV herunterladen</small></button><label class="action-tile"><span>↑</span><b>Backup einspielen</b><small>JSON auswählen</small><input type="file" id="importJson" accept="application/json,.json"></label></div><div class="warning"><b>Wichtig</b><p>Beim Import werden die aktuellen lokalen Daten überschrieben. Exportiere vorher ein Backup, wenn du sie behalten möchtest.</p></div></main>`;

function settingsView() {
  const s = getSettings();
  const option = (value, label) =>
    `<option value="${value}" ${s.theme === value ? 'selected' : ''}>${label}</option>`;
  return `<main class="shell narrow">${backRow('Einstellungen', 'more')}<section class="page-head compact"><div><span class="eyebrow">App</span><h1>Einstellungen</h1></div></section><form class="settings-form" id="settingsForm"><label><span>Darstellung</span><select name="theme">${option('auto', 'Automatisch')}${option('light', 'Hell')}${option('dark', 'Dunkel')}</select></label><label class="toggle-setting"><input name="restTimer" type="checkbox" ${s.restTimer ? 'checked' : ''}><span><b>Pausentimer</b><small>Nach einem erledigten Satz automatisch starten</small></span></label><label><span>Pausendauer</span><div class="unit-input"><input name="rest" type="number" min="0" max="600" value="${esc(s.rest)}"><i>Sek.</i></div></label><label><span>Standard-Gewichtsschritt</span><div class="unit-input"><input name="increment" type="number" min="0.25" step="0.25" value="${esc(s.increment)}"><i>kg</i></div></label><label class="toggle-setting"><input name="showRir" type="checkbox" ${s.showRir ? 'checked' : ''}><span><b>RIR anzeigen</b><small>Optionale Wiederholungsreserve beim Training</small></span></label><button class="primary" type="submit">Speichern</button></form><button class="secondary full install-settings" id="installHelp">Volumora auf dem Homescreen installieren</button></main>`;
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
  document.querySelector('#settingsForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const restTimer = f.get('restTimer') === 'on';
    saveSettings({
      theme: f.get('theme'),
      rest: number(f.get('rest')),
      increment: number(f.get('increment')),
      showRir: f.get('showRir') === 'on',
      restTimer,
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
