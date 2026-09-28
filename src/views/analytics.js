import { drawAnalytics } from '../charts.js';
import { state } from '../state.js';
import { getBody, getHistory } from '../storage.js';
import { esc, exerciseKey, fmtLong, number, plural, volumeOf } from '../util.js';
import { empty } from './shell.js';

const markerText = (h) =>
  [h.markers?.deload ? 'Deload' : '', h.markers?.ill ? 'Krank' : '', h.markers?.pain ? 'Schmerzen' : '']
    .filter(Boolean)
    .join(' · ');

export function view() {
  const history = getHistory();
  const body = getBody();
  // One option per library exercise; the newest session decides the display name.
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
  const cards = history
    .map(
      (h) =>
        `<article class="history-card"><div><span class="eyebrow">${fmtLong(h.finishedAt)}</span><h3>${esc(h.dayName || h.day)}</h3><p>${markerText(h) || esc(h.planName || '')}</p></div><div class="history-metrics"><b>${Math.round(h.volume || volumeOf(h)).toLocaleString('de-DE')} kg</b><span>${plural(number(h.totalSets), 'Satz', 'Sätze')} · ${Math.round(number(h.duration) / 60)} min</span></div></article>`
    )
    .join('');
  return `<main class="shell"><section class="page-head"><div><span class="eyebrow">Trainingstagebuch</span><h1>Verlauf</h1><p>Abgeschlossene Trainings und deine Entwicklung an einem Ort.</p></div><button class="secondary" data-nav="calendar">Kalender öffnen</button></section>
    <section class="metric-grid"><div><b>${history.length}</b><span>Trainings</span></div><div><b>${Math.round(totalVolume).toLocaleString('de-DE')}</b><span>kg Gesamtvolumen</span></div><div><b>${history.reduce((n, h) => n + number(h.totalSets), 0)}</b><span>Sätze</span></div></section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Pro Training</span><h2>Trainingsvolumen</h2></div></div>${history.length ? '<canvas id="volumeChart" height="220" role="img" aria-label="Trainingsvolumen pro Einheit"></canvas>' : empty('Noch keine Daten', 'Schließe dein erstes Training ab.')}</section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Geschätztes 1RM</span><h2>Kraftverlauf</h2></div><select id="analyticsExercise" aria-label="Übung wählen">${[...exercises].map(([key, name]) => `<option value="${esc(key)}" ${key === selected ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></div>${selected ? '<canvas id="strengthChart" height="220" role="img" aria-label="Geschätztes Maximalgewicht"></canvas>' : empty('Noch keine Übung', 'Trainingsdaten erscheinen automatisch hier.')}</section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Körper</span><h2>Gewicht</h2></div><button class="text-btn" data-nav="body">Eintragen</button></div>${body.some((x) => x.weight) ? '<canvas id="weightChart" height="190" role="img" aria-label="Körpergewicht"></canvas>' : empty('Noch kein Gewicht', 'Erfasse deine erste Messung.')}</section>
    <section class="section"><div class="section-head"><h2>Verlauf</h2></div>${history.length ? `<div class="history-list">${cards}</div>` : empty('Noch kein Verlauf', 'Deine abgeschlossenen Trainings landen hier.')}</section></main>`;
}

export function bind() {
  document.querySelector('#analyticsExercise')?.addEventListener('change', (e) => {
    state.analyticsExercise = e.target.value;
    drawAnalytics(state.analyticsExercise);
  });
}
