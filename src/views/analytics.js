import { drawAnalytics, historyInRange, volumeByMuscle } from '../charts.js';
import { fmtNumber, plural, t } from '../i18n.js';
import { icon } from '../icons.js';
import { exerciseName, groupLabel } from '../library.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { recordTimeline, weeklySets } from '../stats.js';
import { getBody, getHistory } from '../storage.js';
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

// Sets per muscle group this week or averaged over four weeks, with the 10–20 guideline marked on each bar.
function weeklySetsSection() {
  const avg = state.analyticsWeekMode === 'avg';
  const rows = weeklySets(getHistory(), { weeks: avg ? 4 : 1 });
  const scale = Math.max(24, ...rows.map((r) => r.sets));
  const toggle = `<div class="segmented small" role="group" aria-label="${t('analytics.weeklySets')}"><button type="button" class="${avg ? '' : 'active'}" data-week-mode="week" aria-pressed="${!avg}">${t('analytics.thisWeek')}</button><button type="button" class="${avg ? 'active' : ''}" data-week-mode="avg" aria-pressed="${avg}">${t('analytics.fourWeekAvg')}</button></div>`;
  const list = rows.length
    ? `<div class="bar-list weekly-sets"><div class="bar-scale" aria-hidden="true"><small style="left:${(10 / scale) * 100}%">10</small><small style="left:${(20 / scale) * 100}%">20</small></div>${rows.map((r) => `<div class="bar-row"><span>${esc(groupLabel(r.group))}</span><div class="bar-track target"><i style="width:${Math.max(2, (r.sets / scale) * 100)}%"></i><em style="left:${(10 / scale) * 100}%"></em><em style="left:${(20 / scale) * 100}%"></em></div><b>${fmtNumber(r.sets, { maximumFractionDigits: 1 })}</b></div>`).join('')}</div><p class="muted analytics-hint">${t('analytics.setsTarget')}</p>`
    : `<p class="muted">${t('analytics.noWeeklySets')}</p>`;
  return `<section class="chart-section"><div class="section-head"><h2>${t('analytics.weeklySets')}</h2></div>${toggle}${list}</section>`;
}

function timelineSection(history) {
  const rows = recordTimeline(history, 10);
  if (!rows.length) return '';
  return `<section class="list-section"><h2>${t('analytics.records')}</h2><div class="list">${rows
    .map(
      (r) =>
        `<button type="button" class="row" data-session-record="${esc(r.sessionId)}"><span class="row-main"><b>${esc(r.items.map(exerciseName).join(' · '))}</b><small>${fmtLong(r.day)} · ${esc(r.dayName || '')}</small></span><span class="chip chip-green">${plural(r.count, 'records')}</span>${icon('chevron-right')}</button>`
    )
    .join('')}</div></section>`;
}

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
  const hasBody = getBody().some((b) => number(b.weight));
  const rangeControl = `<div class="segmented" role="group" aria-label="${t('range.aria')}">${RANGES.map((key) => `<button type="button" class="${key === range ? 'active' : ''}" data-range="${key}" aria-pressed="${key === range}">${t(`range.${key}`)}</button>`).join('')}</div>`;
  const rows = history
    .map(
      (h) =>
        `<button type="button" class="row" data-session="${esc(h.id)}"><span class="row-main"><b>${esc(h.dayName || h.day)}</b><small>${fmtLong(h.day || h.finishedAt)}${markerText(h) ? ` · ${markerText(h)}` : ''}</small></span><span class="row-value"><b>${fmtVolume(h.volume || volumeOf(h))}</b><small>${plural(number(h.totalSets), 'sets')}</small></span>${icon('chevron-right')}</button>`
    )
    .join('');
  const head = `<section class="page-head"><h1>${t('history.title')}</h1><div class="page-actions"><button class="text-btn" data-nav="records">${t('history.records')}</button><button class="text-btn" data-nav="calendar">${t('history.calendar')}</button></div></section>`;
  if (!history.length) {
    return `<main class="shell">${head}${rangeControl}${empty(t('history.emptyTitle'), t('history.emptyText'), { label: t('history.emptyAction'), attrs: 'data-nav="home"' })}</main>`;
  }
  return `<main class="shell">${head}
    ${rangeControl}
    <div class="stat-row"><div><b>${history.length}</b><span>${t('history.sessions')}</span></div><div><b>${fmtNumber(Math.round(toDisplay(totalVolume)))}</b><span>${t('history.volume', { unit: unit() })}</span></div><div><b>${history.reduce((n, h) => n + number(h.totalSets), 0)}</b><span>${t('history.sets')}</span></div></div>
    ${weeklySetsSection()}
    <section class="chart-section"><h2>${t('history.volumeChart')}</h2><canvas id="volumeChart" height="200" role="img" aria-label="${t('history.volumeChartAria')}"></canvas></section>
    <section class="chart-section"><div class="section-head"><h2>${t('history.strength')}</h2><select id="analyticsExercise" aria-label="${t('history.chooseExercise')}">${[...exercises].map(([key, name]) => `<option value="${esc(key)}" ${key === selected ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></div><canvas id="strengthChart" height="200" role="img" aria-label="${t('history.strengthAria')}"></canvas></section>
    ${hasBody ? `<section class="chart-section"><h2>${t('analytics.bodyStrength')}</h2><canvas id="bodyStrengthChart" height="200" role="img" aria-label="${t('analytics.bodyStrengthAria')}"></canvas><p class="muted analytics-hint" id="bodyStrengthHint">${t('analytics.bodyStrengthHint')}</p><p class="muted analytics-hint" id="bodyStrengthEmpty" hidden>${t('analytics.bodyStrengthEmpty')}</p></section>` : ''}
    <section class="chart-section"><h2>${t('analytics.weeklyVolume')}</h2><canvas id="weeklyVolumeChart" height="180" role="img" aria-label="${t('analytics.weeklyVolumeAria')}"></canvas></section>
    <section class="chart-section"><h2>${t('analytics.frequency')}</h2><canvas id="frequencyChart" height="160" role="img" aria-label="${t('analytics.frequencyAria')}"></canvas></section>
    <section class="chart-section"><h2>${t('history.muscles')}</h2><div class="bar-list">${muscles.map((m) => `<div class="bar-row"><span>${esc(groupLabel(m.group))}</span><div class="bar-track"><i style="width:${Math.max(2, (m.volume / maxMuscle) * 100)}%"></i></div><b>${fmtVolume(m.volume)}</b></div>`).join('')}</div></section>
    ${timelineSection(history)}
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
  document.querySelectorAll('[data-week-mode]').forEach((b) => {
    b.onclick = () => {
      state.analyticsWeekMode = b.dataset.weekMode;
      render();
    };
  });
  document.querySelectorAll('[data-session], [data-session-record]').forEach((b) => {
    b.onclick = () =>
      navigate('session', {
        sessionFrom: 'analytics',
        sessionId: b.dataset.session || b.dataset.sessionRecord,
      });
  });
}
