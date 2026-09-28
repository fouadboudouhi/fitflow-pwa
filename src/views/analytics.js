import { bodyInRange, drawAnalytics, historyInRange, volumeByMuscle } from '../charts.js';
import { icon } from '../icons.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { fmtVolume, unit } from '../units.js';
import { esc, exerciseKey, fmtLong, number, plural, volumeOf } from '../util.js';
import { empty } from './shell.js';

const RANGE_LABELS = [
  ['4w', '4 Wochen'],
  ['3m', '3 Monate'],
  ['1y', '1 Jahr'],
  ['all', 'Alles'],
];
const markerText = (h) =>
  [h.markers?.deload ? 'Deload' : '', h.markers?.ill ? 'Krank' : '', h.markers?.pain ? 'Schmerzen' : '']
    .filter(Boolean)
    .join(', ');

export function view() {
  const range = state.analyticsRange || '3m';
  const history = historyInRange(range);
  const body = bodyInRange(range);
  const exercises = new Map();
  history.forEach((h) =>
    h.entries?.forEach((e) => {
      if (!exercises.has(exerciseKey(e))) exercises.set(exerciseKey(e), e.name);
    })
  );
  if (!exercises.has(state.analyticsExercise))
    state.analyticsExercise = exercises.keys().next().value || null;
  const selected = state.analyticsExercise;
  const totalVolume = history.reduce((s, h) => s + (h.volume || volumeOf(h)), 0);
  const muscles = volumeByMuscle(history);
  const maxMuscle = muscles[0]?.volume || 1;
  const rangeControl = `<div class="segmented" role="group" aria-label="Zeitraum">${RANGE_LABELS.map(([key, label]) => `<button type="button" class="${key === range ? 'active' : ''}" data-range="${key}" aria-pressed="${key === range}">${label}</button>`).join('')}</div>`;
  const rows = history
    .map(
      (h) =>
        `<button type="button" class="row" data-session="${esc(h.id)}"><span class="row-main"><b>${esc(h.dayName || h.day)}</b><small>${fmtLong(h.day || h.finishedAt)}${markerText(h) ? ` · ${markerText(h)}` : ''}</small></span><span class="row-value"><b>${fmtVolume(h.volume || volumeOf(h))}</b><small>${plural(number(h.totalSets), 'Satz', 'Sätze')}</small></span>${icon('chevron-right')}</button>`
    )
    .join('');
  return `<main class="shell"><section class="page-head"><h1>Verlauf</h1><button class="text-btn" data-nav="calendar">Kalender</button></section>
    ${rangeControl}
    <div class="stat-row"><div><b>${history.length}</b><span>Trainings</span></div><div><b>${Math.round(fmtVolumeNumber(totalVolume)).toLocaleString('de-DE')}</b><span>${unit()} Volumen</span></div><div><b>${history.reduce((n, h) => n + number(h.totalSets), 0)}</b><span>Sätze</span></div></div>
    <section class="chart-card"><h2>Volumen pro Training</h2>${history.length ? '<canvas id="volumeChart" height="220" role="img" aria-label="Trainingsvolumen pro Einheit"></canvas>' : empty('Noch keine Daten', 'Schließe dein erstes Training ab.')}</section>
    <section class="chart-card"><div class="section-head"><h2>Kraftverlauf</h2><select id="analyticsExercise" aria-label="Übung wählen">${[...exercises].map(([key, name]) => `<option value="${esc(key)}" ${key === selected ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></div>${selected ? '<canvas id="strengthChart" height="220" role="img" aria-label="Geschätztes Maximalgewicht"></canvas><p class="chart-note">Geschätztes 1RM aus dem besten Satz je Training.</p>' : empty('Noch keine Übung', 'Trainingsdaten erscheinen automatisch hier.')}</section>
    <section class="chart-card"><h2>Volumen nach Muskelgruppe</h2>${
      muscles.length
        ? `<div class="bar-list">${muscles.map((m) => `<div class="bar-row"><span>${esc(m.category)}</span><div class="bar-track"><i style="width:${Math.max(2, (m.volume / maxMuscle) * 100)}%"></i></div><b>${fmtVolume(m.volume)}</b></div>`).join('')}</div>`
        : empty('Noch keine Daten', 'Erledigte Sätze zählen hier.')
    }</section>
    <section class="chart-card"><div class="section-head"><h2>Körpergewicht</h2><button class="text-btn" data-nav="body">Eintragen</button></div>${body.some((x) => x.weight) ? '<canvas id="weightChart" height="190" role="img" aria-label="Körpergewicht"></canvas>' : empty('Noch kein Gewicht', 'Erfasse deine erste Messung.')}</section>
    <section class="list-section"><h2>Trainings</h2>${history.length ? `<div class="list">${rows}</div>` : empty('Noch kein Verlauf', 'Deine abgeschlossenen Trainings landen hier.')}</section></main>`;
}
const fmtVolumeNumber = (kg) =>
  Number(
    fmtVolume(kg)
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );

export function bind() {
  document.querySelector('#analyticsExercise')?.addEventListener('change', (e) => {
    state.analyticsExercise = e.target.value;
    drawAnalytics(state.analyticsExercise, state.analyticsRange || '3m');
  });
  document.querySelectorAll('[data-range]').forEach((b) => {
    b.onclick = () => {
      state.analyticsRange = b.dataset.range;
      render();
    };
  });
  document.querySelectorAll('[data-session]').forEach((b) => {
    b.onclick = () => navigate('session', { sessionId: b.dataset.session });
  });
}
