// Canvas line charts with crosshair tooltips, plus the aggregations the analytics screen shows.
import { fmtNumber } from './i18n.js';
import { groupOf } from './library.js';
import { getBody, getHistory } from './storage.js';
import { toDisplay, unit } from './units.js';
import { dayKey, e1rm, exerciseKey, fmtDate, number, rangeCutoff, volumeOf } from './util.js';

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const fmt = (value, suffix) => `${fmtNumber(Math.round(value))}${suffix}`;

// Single-series line chart. Hover, touch and arrow keys move a crosshair; the tooltip shows value and date.
export function lineChart(canvas, points, { color = token('--green'), suffix = '', fill = true } = {}) {
  if (!canvas || !points.length) return;
  const card = canvas.parentElement;
  const dpr = devicePixelRatio || 1;
  const w = canvas.clientWidth || 600;
  const h = Number(canvas.getAttribute('height')) || 220;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  const pad = { l: 46, r: 14, t: 18, b: 28 };
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || Math.max(1, max * 0.1);
  const x = (i) => pad.l + (i / Math.max(1, points.length - 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - min) / span) * (h - pad.t - pad.b);
  const surface = token('--surface') || '#fff';

  const draw = (highlight) => {
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.font = '11px system-ui';
    c.lineWidth = 1;
    c.strokeStyle = token('--line');
    c.fillStyle = token('--muted');
    for (let i = 0; i < 3; i++) {
      const yy = pad.t + (i * (h - pad.t - pad.b)) / 2;
      c.beginPath();
      c.moveTo(pad.l, yy);
      c.lineTo(w - pad.r, yy);
      c.stroke();
      c.fillText(fmt(max - (i * span) / 2, suffix), 4, yy + 4);
    }
    if (fill) {
      c.beginPath();
      points.forEach((p, i) => (i ? c.lineTo(x(i), y(p.value)) : c.moveTo(x(i), y(p.value))));
      c.lineTo(x(points.length - 1), h - pad.b);
      c.lineTo(x(0), h - pad.b);
      c.closePath();
      c.globalAlpha = 0.08;
      c.fillStyle = color;
      c.fill();
      c.globalAlpha = 1;
    }
    if (highlight >= 0) {
      c.strokeStyle = token('--muted');
      c.setLineDash([3, 3]);
      c.beginPath();
      c.moveTo(x(highlight), pad.t);
      c.lineTo(x(highlight), h - pad.b);
      c.stroke();
      c.setLineDash([]);
    }
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(x(i), y(p.value)) : c.moveTo(x(i), y(p.value))));
    c.lineWidth = 2;
    c.strokeStyle = color;
    c.lineJoin = 'round';
    c.stroke();
    points.forEach((p, i) => {
      const r = i === highlight ? 5 : 4;
      c.beginPath();
      c.arc(x(i), y(p.value), r + 2, 0, Math.PI * 2);
      c.fillStyle = surface;
      c.fill();
      c.beginPath();
      c.arc(x(i), y(p.value), r, 0, Math.PI * 2);
      c.fillStyle = color;
      c.fill();
    });
    c.fillStyle = token('--muted');
    const labels =
      points.length > 4
        ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
        : points.map((_, i) => i);
    labels.forEach((i) => {
      const text = points[i].label;
      const width = c.measureText(text).width;
      c.fillText(text, Math.max(pad.l - 4, Math.min(x(i) - width / 2, w - width - 4)), h - 9);
    });
  };
  draw(-1);

  let tip = card.querySelector('.chart-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    card.append(tip);
  }
  let current = -1;
  const show = (i) => {
    current = i;
    draw(i);
    tip.textContent = '';
    const value = document.createElement('strong');
    value.textContent = fmt(points[i].value, suffix);
    const label = document.createElement('span');
    label.textContent = points[i].label;
    tip.append(value, label);
    tip.hidden = false;
    const left = canvas.offsetLeft + x(i);
    tip.style.left = `${Math.max(canvas.offsetLeft + 40, Math.min(left, canvas.offsetLeft + w - 40))}px`;
    tip.style.top = `${canvas.offsetTop + y(points[i].value) - 12}px`;
  };
  const hide = () => {
    current = -1;
    draw(-1);
    tip.hidden = true;
  };
  const nearest = (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    return best;
  };
  canvas.onpointermove = (e) => show(nearest(e));
  canvas.onpointerdown = (e) => show(nearest(e));
  canvas.onpointerleave = hide;
  canvas.tabIndex = 0;
  canvas.onfocus = () => show(current < 0 ? points.length - 1 : current);
  canvas.onblur = hide;
  canvas.onkeydown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      show(
        Math.max(
          0,
          Math.min(
            points.length - 1,
            (current < 0 ? points.length - 1 : current) + (e.key === 'ArrowLeft' ? -1 : 1)
          )
        )
      );
    }
  };
}

const inRange = (cutoff) => (item) => !cutoff || (item.day || dayKey(item.finishedAt || item.date)) >= cutoff;
export const historyInRange = (range) => getHistory().filter(inRange(rangeCutoff(range)));
export const bodyInRange = (range) => getBody().filter(inRange(rangeCutoff(range)));

// Completed working-set volume per muscle group, largest first.
export function volumeByMuscle(history) {
  const totals = new Map();
  history.forEach((h) =>
    h.entries?.forEach((e) => {
      const volume = e.sets.reduce(
        (s, set) => s + (set.warmup || !set.done ? 0 : number(set.weight) * number(set.reps)),
        0
      );
      if (!volume) return;
      const group = groupOf(e);
      totals.set(group, (totals.get(group) || 0) + volume);
    })
  );
  return [...totals].map(([group, volume]) => ({ group, volume })).sort((a, b) => b.volume - a.volume);
}

const weightPoints = (range) =>
  bodyInRange(range)
    .filter((x) => x.weight)
    .slice()
    .reverse()
    .map((x) => ({ label: fmtDate(x.day || x.date), value: toDisplay(x.weight) }));

export function drawAnalytics(selectedKey, range) {
  const history = historyInRange(range).slice().reverse();
  lineChart(
    document.querySelector('#volumeChart'),
    history.slice(-16).map((h) => ({
      label: fmtDate(h.day || h.finishedAt),
      value: Math.round(toDisplay(h.volume || volumeOf(h))),
    })),
    { suffix: ` ${unit()}` }
  );
  const strength = history
    .map((h) => {
      const e = h.entries?.find((x) => exerciseKey(x) === selectedKey);
      const best = Math.max(
        0,
        ...(e?.sets || []).filter((s) => s.done && !s.warmup).map((s) => e1rm(s.weight, s.reps))
      );
      return best ? { label: fmtDate(h.day || h.finishedAt), value: Math.round(toDisplay(best)) } : null;
    })
    .filter(Boolean);
  lineChart(document.querySelector('#strengthChart'), strength.slice(-16), {
    color: token('--orange'),
    suffix: ` ${unit()}`,
  });
  lineChart(document.querySelector('#weightChart'), weightPoints(range), {
    color: token('--blue'),
    suffix: ` ${unit()}`,
  });
}
export function drawBodyChart() {
  lineChart(document.querySelector('#bodyChart'), weightPoints('all'), {
    color: token('--blue'),
    suffix: ` ${unit()}`,
  });
}
