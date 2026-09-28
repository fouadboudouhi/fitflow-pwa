import { icon } from '../icons.js';
import { planSchedule, scheduleLabel } from '../plans.js';
import { render } from '../render.js';
import { state } from '../state.js';
import { activePlan, getHistory } from '../storage.js';
import { WEEKDAYS, dayKey, esc, fmtMonth, number, plural, weekdayIndex } from '../util.js';
import { backRow, empty } from './shell.js';

export function view() {
  const history = getHistory();
  const plan = activePlan();
  const today = new Date();
  const offsetMonths = number(state.calendarOffset);
  const first = new Date(today.getFullYear(), today.getMonth() + offsetMonths, 1);
  const year = first.getFullYear();
  const month = first.getMonth();
  const offset = weekdayIndex(first);
  const days = new Date(year, month + 1, 0).getDate();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const sessions = new Map();
  history.forEach((h) => {
    const key = h.day || dayKey(h.finishedAt);
    if (key.startsWith(prefix)) sessions.set(key, [...(sessions.get(key) || []), h]);
  });
  const schedule = planSchedule(plan);
  const fixed = schedule.mode === 'fixed';
  const todayKey = dayKey(today);
  const cells = Array.from({ length: offset + days }, (_, i) => {
    if (i < offset) return '<div class="calendar-day blank"></div>';
    const d = new Date(year, month, i - offset + 1);
    const key = dayKey(d);
    const done = sessions.get(key) || [];
    const plannedDay = fixed
      ? plan.days.find((day) => schedule.assignments?.[day.id] === weekdayIndex(d))
      : null;
    return `<div class="calendar-day ${done.length ? 'completed' : ''} ${key === todayKey ? 'today' : ''}"><span>${d.getDate()}</span>${done.length ? `<b>✓ ${esc(done[0].dayName || 'Training')}</b>` : plannedDay ? `<small>${esc(plannedDay.name)}</small>` : ''}</div>`;
  });
  const upcoming =
    plan?.days
      ?.map(
        (d, i) =>
          `<div><span>${fixed ? WEEKDAYS[schedule.assignments?.[d.id]] : i + 1}</span><b>${esc(d.name)}</b><small>${plural(d.exercises.length, 'Übung', 'Übungen')}</small></div>`
      )
      .join('') || '';
  return `<main class="shell calendar-shell">${backRow('Trainingskalender', 'analytics')}<section class="calendar-head"><div><span class="eyebrow">Monatsansicht</span><h1>${fmtMonth(first)}</h1></div><div class="calendar-nav"><button class="icon-btn" data-calendar-shift="-1" aria-label="Vorheriger Monat">${icon('chevron-left')}</button>${offsetMonths ? '<button class="icon-btn" data-calendar-shift="0">Heute</button>' : ''}<button class="icon-btn" data-calendar-shift="1" aria-label="Nächster Monat">${icon('chevron-right')}</button></div><div class="calendar-key">${fixed ? '<span><i class="planned-dot"></i>Geplant</span>' : ''}<span><i class="done-dot"></i>Erledigt</span></div></section><div class="calendar-weekdays">${WEEKDAYS.map((x) => `<span>${x}</span>`).join('')}</div><section class="calendar-grid">${cells.join('')}</section><section class="calendar-plan"><div class="section-title"><h2>Wochenrhythmus</h2><small>${esc(scheduleLabel(plan))}</small></div>${upcoming || empty('Noch kein Plan', 'Erstelle zuerst einen Trainingsplan.')}</section></main>`;
}

export function bind() {
  document.querySelectorAll('[data-calendar-shift]').forEach((b) => {
    b.onclick = () => {
      const shift = number(b.dataset.calendarShift);
      state.calendarOffset = shift ? number(state.calendarOffset) + shift : 0;
      render();
    };
  });
}
