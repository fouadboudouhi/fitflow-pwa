import { plural, t, weekdayShort } from '../i18n.js';
import { icon } from '../icons.js';
import { state } from '../state.js';
import { activePlan, getHistory } from '../storage.js';
import { navigate } from '../render.js';
import { dayKey, esc, fmtMonth, number, weekdayIndex } from '../util.js';
import { empty, parentRow } from './shell.js';

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
  const todayKey = dayKey(today);
  const cells = Array.from({ length: offset + days }, (_, i) => {
    if (i < offset) return '<div class="calendar-day blank"></div>';
    const d = new Date(year, month, i - offset + 1);
    const key = dayKey(d);
    const done = sessions.get(key) || [];
    if (done.length)
      return `<button type="button" class="calendar-day completed ${key === todayKey ? 'today' : ''}" data-session="${esc(done[0].id)}" aria-label="${esc(t('calendar.open', { day: d.getDate() }))}"><span>${d.getDate()}</span><b>${esc(done[0].dayName || t('session.title'))}</b></button>`;
    return `<div class="calendar-day ${key === todayKey ? 'today' : ''}"><span>${d.getDate()}</span></div>`;
  });
  const upcoming =
    plan?.days
      ?.map(
        (d, i) =>
          `<div><span>${i + 1}</span><b>${esc(d.name)}</b><small>${plural(d.exercises.length, 'exercises')}</small></div>`
      )
      .join('') || '';
  return `<main class="shell calendar-shell">${parentRow('analytics')}<section class="calendar-head"><h1>${fmtMonth(first)}</h1><div class="calendar-nav"><button class="icon-btn" data-calendar-shift="-1" aria-label="${t('calendar.prev')}">${icon('chevron-left')}</button>${offsetMonths ? `<button class="icon-btn" data-calendar-shift="0">${t('calendar.today')}</button>` : ''}<button class="icon-btn" data-calendar-shift="1" aria-label="${t('calendar.next')}">${icon('chevron-right')}</button></div></section><div class="calendar-weekdays">${[0, 1, 2, 3, 4, 5, 6].map((x) => `<span>${weekdayShort(x)}</span>`).join('')}</div><section class="calendar-grid">${cells.join('')}</section><section class="calendar-plan"><div class="section-title"><h2>${t('calendar.rhythm')}</h2><small>${plan ? plural(plan.days.length, 'trainingDays') : ''}</small></div>${upcoming || empty(t('calendar.noPlanTitle'), t('calendar.noPlanText'), { label: t('calendar.emptyAction'), attrs: 'data-nav="templates"' })}</section></main>`;
}

export function bind() {
  document.querySelectorAll('[data-session]').forEach((b) => {
    b.onclick = () => navigate('session', { sessionFrom: 'calendar', sessionId: b.dataset.session });
  });
  document.querySelectorAll('[data-calendar-shift]').forEach((b) => {
    b.onclick = () => {
      const shift = number(b.dataset.calendarShift);
      state.calendarOffset = shift ? number(state.calendarOffset) + shift : 0;
      navigate('calendar');
    };
  });
}
