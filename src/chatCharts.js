// Charts the assistant can place in a reply with a line such as ">> chart:strength:ID". The app draws them from the
// person's own data, so a chart can never show numbers Claude made up.
import { lineChart, strengthSeries, weightPoints } from './charts.js';
import { fmtNumber, t } from './i18n.js';
import { exerciseName, groupLabel, libraryOf } from './library.js';
import { frequency, weeklySets, weeklyVolume } from './stats.js';
import { getHistory } from './storage.js';
import { toDisplay, unit } from './units.js';
import { esc } from './util.js';

const WEEKS = 12;
const SET_SCALE = 24;
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const LINES = {
  volume: () => ({
    title: t('analytics.weeklyVolume'),
    points: weeklyVolume(getHistory(), WEEKS).map((p) => ({
      label: p.label,
      value: Math.round(toDisplay(p.value)),
    })),
    options: { suffix: ` ${unit()}` },
    enough: (points) => points.filter((p) => p.value > 0).length >= 2,
  }),
  frequency: () => ({
    title: t('analytics.frequency'),
    points: frequency(getHistory(), WEEKS),
    options: { color: token('--blue'), whole: true },
    enough: (points) => points.filter((p) => p.value > 0).length >= 2,
  }),
  body: () => ({
    title: t('ai.chart.body'),
    points: weightPoints('all'),
    options: { color: token('--blue'), suffix: ` ${unit()}` },
    enough: (points) => points.length >= 2,
  }),
  strength: (id) => {
    const item = libraryOf({ id });
    if (!item) return null;
    const { points, suffix } = strengthSeries(getHistory().slice().reverse(), id);
    return {
      title: t('ai.chart.strength', { name: exerciseName(item) }),
      points: points.slice(-16),
      options: { color: token('--orange'), suffix },
      enough: (list) => list.length >= 2,
    };
  },
};

const lineFor = (spec) => {
  const [kind, id] = spec.split(':');
  return Object.hasOwn(LINES, kind) ? LINES[kind](id) : null;
};

function setsHtml() {
  const rows = weeklySets(getHistory());
  if (!rows.length) return '';
  const scale = Math.max(SET_SCALE, ...rows.map((r) => r.sets));
  return `<section class="chat-chart"><h3>${t('analytics.weeklySets')}</h3><div class="bar-list weekly-sets">${rows
    .map(
      (r) =>
        `<div class="bar-row"><span>${esc(groupLabel(r.group))}</span><div class="bar-track"><i style="width:${Math.max(2, (r.sets / scale) * 100)}%"></i></div><b>${fmtNumber(r.sets, { maximumFractionDigits: 1 })}</b></div>`
    )
    .join('')}</div></section>`;
}

// The markup for a chart line, or '' for one the app does not know. Too little data says so instead of a lonely dot.
export function chatChartHtml(spec) {
  if (spec === 'sets') return setsHtml();
  const line = lineFor(spec);
  if (!line) return '';
  if (!line.enough(line.points))
    return `<section class="chat-chart"><h3>${esc(line.title)}</h3><p class="muted">${t('ai.chart.thin')}</p></section>`;
  return `<section class="chat-chart"><h3>${esc(line.title)}</h3><canvas data-chat-chart="${esc(spec)}" height="170" role="img" aria-label="${esc(line.title)}"></canvas></section>`;
}

// Canvases only have a size once they are in the page, so drawing follows every repaint of the messages.
export function drawChatCharts(root) {
  root?.querySelectorAll('canvas[data-chat-chart]').forEach((canvas) => {
    const line = lineFor(canvas.dataset.chatChart);
    if (line) lineChart(canvas, line.points, line.options);
  });
}
