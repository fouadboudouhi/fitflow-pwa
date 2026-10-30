// Pure helpers without DOM or storage access.
import { intlLocale } from './i18n.js';

export const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>'"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]
  );
export const number = (value) => Number(String(value ?? '').replace(',', '.')) || 0;
export const rangeMax = (range) => Math.max(...(String(range).match(/\d+/g)?.map(Number) || [12]));
export const titleCase = (value) =>
  String(value)
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bEz\b/g, 'EZ');

// Exercises are matched across plans and sessions by their library id; custom exercises fall back to their own id.
export const exerciseKey = (item) => item?.libraryId || item?.exerciseId || item?.id || '';

export const weekdayIndex = (date) => (date.getDay() + 6) % 7;

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n) => String(n).padStart(2, '0');
// Accepts a Date, an ISO timestamp or a local day key (YYYY-MM-DD). A day key is read as local noon so it never
// shifts to the previous or next day in another time zone.
export const parseDate = (value) => {
  if (value instanceof Date) return isNaN(value) ? null : value;
  const m = DAY_KEY.exec(String(value ?? ''));
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12);
  const d = new Date(value);
  return isNaN(d) ? null : d;
};
export const dayKey = (value = new Date()) => {
  const d = parseDate(value);
  return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';
};
const format = (options) => (value) => {
  const d = parseDate(value);
  return d ? new Intl.DateTimeFormat(intlLocale(), options).format(d) : '–';
};
export const fmtDate = format({ day: '2-digit', month: '2-digit', year: '2-digit' });
export const fmtLong = format({ weekday: 'short', day: '2-digit', month: 'short' });
export const fmtMonth = format({ month: 'long', year: 'numeric' });

export const volumeOf = (session) =>
  session.entries?.reduce(
    (sum, entry) =>
      sum +
      entry.sets.reduce(
        (s, set) => s + (set.warmup || !set.done ? 0 : number(set.weight) * number(set.reps)),
        0
      ),
    0
  ) || 0;
export const doneSets = (session) =>
  session?.entries?.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0) || 0;
// Epley estimate of the one-repetition maximum.
export const e1rm = (weight, reps) => number(weight) * (1 + number(reps) / 30);
export const RANGES = { '4w': 28, '3m': 91, '1y': 365, all: Infinity };
export const rangeCutoff = (range, today = new Date()) => {
  const days = RANGES[range] ?? Infinity;
  if (!Number.isFinite(days)) return '';
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return dayKey(d);
};
