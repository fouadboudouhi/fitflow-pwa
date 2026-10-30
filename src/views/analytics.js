import { drawAnalytics, historyInRange, volumeByMuscle } from '../charts.js';
import { fmtNumber, plural, t } from '../i18n.js';
import { icon } from '../icons.js';
import { exerciseName, groupLabel } from '../library.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { fmtVolume, toDisplay, unit } from '../units.js';
import { esc, exerciseKey, fmtLong, number, volumeOf } from '../util.js';
import { empty } from './shell.js';

const RANGES = ['4w', '3m', '1y', 'all'];
const markerText = (h) =>
  [
    h.markers?.deload ? t('marker.deload') : '',
    h.markers?.ill ? t('marker.ill') : '',
    h.markers?.pain ? t('marker.pain') : '',
  ]
    .filter(Boolean)
    .join(', ');

export function view() {
  const range = state.analyticsRange || '3m';
  const history = historyInRange(range);
  const exercises = new Map();
  history.forEach((h) =>
    h.entries?.forEach((e) => {
      if (!exercises.has(exerciseKey(e))) exercises.set(exerciseKey(e), exerciseName(e));
    })
  );
  if (!exercises.has(state.analyticsExercise))
    state.analyticsExercise = exercises.keys().next().value || null;
  const selected = state.analyticsExercise;
  const totalVolume = history.reduce((s, h) => s + (h.volume || volumeOf(h)), 0);
  const muscles = volumeByMuscle(history);
  const maxMuscle = muscles[0]?.volume || 1;
  const rangeControl = `<div class="segmented" role="group" aria-label="${t('range.aria')}">${RANGES.map((key) => `<button type="button" class="${key === range ? 'active' : ''}" data-range="${key}" aria-pressed="${key === range}">${t(`range.${key}`)}</button>`).join('')}</div>`;
  const rows = history
    .map(
      (h) =>
        `<button type="button" class="row" data-session="${esc(h.id)}"><span class="row-main"><b>${esc(h.dayName || h.day)}</b><small>${fmtLong(h.day || h.finishedAt)}${markerText(h) ? ` · ${markerText(h)}` : ''}</small></span><span class="row-value"><b>${fmtVolume(h.volume || volumeOf(h))}</b><small>${plural(number(h.totalSets), 'sets')}</small></span>${icon('chevron-right')}</button>`
    )
    .join('');
  const head = `<section class="page-head"><h1>${t('history.title')}</h1><div class="page-actions"><button class="text-btn" data-nav="records">${t('history.records')}</button><button class="text-btn" data-nav="calendar">${t('history.calendar')}</button></div></section>`;
  if (!history.length) {
    return `<main class="shell">${head}${rangeControl}${empty(t('history.emptyTitle'), t('history.emptyText'))}</main>`;
  }
  return `<main class="shell">${head}
    ${rangeControl}
    <div class="stat-row"><div><b>${history.length}</b><span>${t('history.sessions')}</span></div><div><b>${fmtNumber(Math.round(toDisplay(totalVolume)))}</b><span>${t('history.volume', { unit: unit() })}</span></div><div><b>${history.reduce((n, h) => n + number(h.totalSets), 0)}</b><span>${t('history.sets')}</span></div></div>
    <section class="chart-section"><h2>${t('history.volumeChart')}</h2><canvas id="volumeChart" height="200" role="img" aria-label="${t('history.volumeChartAria')}"></canvas></section>
    <section class="chart-section"><div class="section-head"><h2>${t('history.strength')}</h2><select id="analyticsExercise" aria-label="${t('history.chooseExercise')}">${[...exercises].map(([key, name]) => `<option value="${esc(key)}" ${key === selected ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></div><canvas id="strengthChart" height="200" role="img" aria-label="${t('history.strengthAria')}"></canvas></section>
    <section class="chart-section"><h2>${t('history.muscles')}</h2><div class="bar-list">${muscles.map((m) => `<div class="bar-row"><span>${esc(groupLabel(m.group))}</span><div class="bar-track"><i style="width:${Math.max(2, (m.volume / maxMuscle) * 100)}%"></i></div><b>${fmtVolume(m.volume)}</b></div>`).join('')}</div></section>
    <section class="list-section"><h2>${t('history.sessions')}</h2><div class="list">${rows}</div></section></main>`;
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
