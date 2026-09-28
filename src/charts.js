// Canvas line charts for volume, estimated 1RM and body weight.
import { getBody, getHistory } from './storage.js';
import { exerciseKey, fmtDate, number, volumeOf } from './util.js';

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name);

export function lineChart(canvas, points, { color = '#007d48', suffix = '', fill = true } = {}) {
  if (!canvas || !points.length) return;
  const dpr = devicePixelRatio || 1;
  const w = canvas.clientWidth || 600;
  const h = Number(canvas.getAttribute('height')) || 220;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  c.scale(dpr, dpr);
  const pad = { l: 46, r: 16, t: 24, b: 34 };
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => pad.l + (i / Math.max(1, points.length - 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - min) / span) * (h - pad.t - pad.b);
  c.clearRect(0, 0, w, h);
  c.font = '12px system-ui';
  c.strokeStyle = token('--line');
  c.fillStyle = token('--muted');
  c.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const yy = pad.t + (i * (h - pad.t - pad.b)) / 2;
    c.beginPath();
    c.moveTo(pad.l, yy);
    c.lineTo(w - pad.r, yy);
    c.stroke();
    c.fillText(`${Math.round(max - (i * span) / 2)}${suffix}`, 4, yy + 4);
  }
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(x(i), y(p.value)) : c.moveTo(x(i), y(p.value))));
  c.lineWidth = 3;
  c.strokeStyle = color;
  c.stroke();
  if (fill) {
    c.lineTo(x(points.length - 1), h - pad.b);
    c.lineTo(x(0), h - pad.b);
    c.closePath();
    c.globalAlpha = 0.1;
    c.fillStyle = color;
    c.fill();
    c.globalAlpha = 1;
  }
  points.forEach((p, i) => {
    c.beginPath();
    c.arc(x(i), y(p.value), 4, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
  });
  c.fillStyle = token('--muted');
  const indexes =
    points.length > 4 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);
  indexes.forEach((i) =>
    c.fillText(points[i].label, Math.max(pad.l - 4, Math.min(x(i) - 16, w - 50)), h - 10)
  );
}

const weightPoints = () =>
  getBody()
    .filter((x) => x.weight)
    .slice()
    .reverse()
    .map((x) => ({ label: fmtDate(x.day || x.date), value: number(x.weight) }));

export function drawAnalytics(selectedKey) {
  const history = getHistory().slice().reverse();
  lineChart(
    document.querySelector('#volumeChart'),
    history
      .slice(-12)
      .map((h) => ({ label: fmtDate(h.finishedAt), value: Math.round(h.volume || volumeOf(h)) })),
    { suffix: ' kg' }
  );
  const strength = history
    .map((h) => {
      const e = h.entries?.find((x) => exerciseKey(x) === selectedKey);
      const best = Math.max(
        ...(e?.sets || [])
          .filter((s) => s.done && !s.warmup)
          .map((s) => number(s.weight) * (1 + number(s.reps) / 30)),
        0
      );
      return best ? { label: fmtDate(h.finishedAt), value: Math.round(best) } : null;
    })
    .filter(Boolean);
  lineChart(document.querySelector('#strengthChart'), strength.slice(-12), {
    color: '#f08a3c',
    suffix: ' kg',
  });
  lineChart(document.querySelector('#weightChart'), weightPoints(), { color: '#5b6ee1', suffix: ' kg' });
}
export function drawBodyChart() {
  lineChart(document.querySelector('#bodyChart'), weightPoints(), { color: '#5b6ee1', suffix: ' kg' });
}
