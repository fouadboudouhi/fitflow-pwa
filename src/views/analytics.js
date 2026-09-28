import { drawAnalytics, historyInRange, volumeByMuscle, bodyInRange } from '../charts.js';
import { icon } from '../icons.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
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
    .join(' · ');
const kg = (v) => `${Math.round(v).toLocaleString('de-DE')} kg`;

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
  const cards = history
    .map(
      (h) =>
        `<button type="button" class="history-card" data-session="${esc(h.id)}"><div><span class="eyebrow">${fmtLong(h.day || h.finishedAt)}</span><h3>${esc(h.dayName || h.day)}</h3><p>${markerText(h) || esc(h.planName || '')}</p></div><div class="history-metrics"><b>${kg(h.volume || volumeOf(h))}</b><span>${plural(number(h.totalSets), 'Satz', 'Sätze')} · ${Math.round(number(h.duration) / 60)} min</span></div><i>${icon('chevron-right')}</i></button>`
    )
    .join('');
  return `<main class="shell"><section class="page-head"><div><span class="eyebrow">Trainingstagebuch</span><h1>Verlauf</h1></div><button class="secondary" data-nav="calendar">Kalender</button></section>
    ${rangeControl}
    <section class="metric-grid"><div><b>${history.length}</b><span>Trainings</span></div><div><b>${Math.round(totalVolume).toLocaleString('de-DE')}</b><span>kg Volumen</span></div><div><b>${history.reduce((n, h) => n + number(h.totalSets), 0)}</b><span>Sätze</span></div></section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Pro Training</span><h2>Trainingsvolumen</h2></div></div>${history.length ? '<canvas id="volumeChart" height="220" role="img" aria-label="Trainingsvolumen pro Einheit"></canvas>' : empty('Noch keine Daten', 'Schließe dein erstes Training ab.')}</section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Geschätztes 1RM</span><h2>Kraftverlauf</h2></div><select id="analyticsExercise" aria-label="Übung wählen">${[...exercises].map(([key, name]) => `<option value="${esc(key)}" ${key === selected ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></div>${selected ? '<canvas id="strengthChart" height="220" role="img" aria-label="Geschätztes Maximalgewicht"></canvas>' : empty('Noch keine Übung', 'Trainingsdaten erscheinen automatisch hier.')}</section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Verteilung</span><h2>Volumen nach Muskelgruppe</h2></div></div>${
      muscles.length
        ? `<div class="bar-list">${muscles.map((m) => `<div class="bar-row"><span>${esc(m.category)}</span><div class="bar-track"><i style="width:${Math.max(2, (m.volume / maxMuscle) * 100)}%"></i></div><b>${kg(m.volume)}</b></div>`).join('')}</div>`
        : empty('Noch keine Daten', 'Erledigte Sätze zählen hier.')
    }</section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Körper</span><h2>Gewicht</h2></div><button class="text-btn" data-nav="body">Eintragen</button></div>${body.some((x) => x.weight) ? '<canvas id="weightChart" height="190" role="img" aria-label="Körpergewicht"></canvas>' : empty('Noch kein Gewicht', 'Erfasse deine erste Messung.')}</section>
    <section class="section"><div class="section-head"><h2>Trainings</h2></div>${history.length ? `<div class="history-list">${cards}</div>` : empty('Noch kein Verlauf', 'Deine abgeschlossenen Trainings landen hier.')}</section></main>`;
}

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
