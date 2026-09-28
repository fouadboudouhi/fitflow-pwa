import { icon } from '../icons.js';
import { nextSession, setCount, weekStats } from '../plans.js';
import { navigate } from '../render.js';
import { activePlan, getActive, getHistory, getSettings } from '../storage.js';
import { confirmDialog } from '../ui.js';
import { fmtVolume } from '../units.js';
import { dayKey, doneSets, esc, fmtLong, plural, volumeOf, weekdayIndex } from '../util.js';
import { sessionStarted } from '../workout.js';
import { empty } from './shell.js';

const dayRow = (plan, d) =>
  `<button type="button" class="row" data-start="${d.id}" data-plan="${plan.id}"><span class="row-main"><b>${esc(d.name)}</b><small>${plural(d.exercises.length, 'Übung', 'Übungen')} · ${plural(setCount(d), 'Satz', 'Sätze')}</small></span>${icon('chevron-right')}</button>`;

export function view() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - weekdayIndex(today));
  const mondayKey = dayKey(monday);
  const plan = activePlan();
  const history = getHistory();
  const last = history[0];
  const week = history.filter((x) => (x.day || dayKey(x.finishedAt)) >= mondayKey);
  const readyDays = plan?.days?.filter((d) => d.exercises.length) || [];
  const goal = Number(getSettings().weeklyGoal) || readyDays.length;
  const stats = weekStats(history, goal, today);
  const weekVolume = week.reduce((s, x) => s + (x.volume || volumeOf(x)), 0);

  let { day: next, label: nextLabel } = nextSession(plan, history, today);
  const active = getActive();
  const activeDay =
    active && plan?.id === active.planId ? plan.days.find((d) => d.id === active.dayId) : null;
  const resume = !!(activeDay?.exercises.length && sessionStarted(active));
  if (resume) {
    next = activeDay;
    nextLabel = 'Begonnenes Training';
  }
  const nextCard = next
    ? `<section class="next-card ${resume ? 'resume-card' : ''} ${next.exercises.length ? '' : 'empty-plan-card'}"><span class="next-label">${esc(next.exercises.length ? nextLabel : 'Plan vervollständigen')}</span><h2>${esc(next.name)}</h2><p>${
        resume
          ? `${plural(doneSets(active), 'Satz', 'Sätze')} erledigt, gestartet ${fmtLong(active.startedAt)}`
          : next.exercises.length
            ? `${plural(next.exercises.length, 'Übung', 'Übungen')} · ${plural(setCount(next), 'Satz', 'Sätze')}`
            : 'Wähle die Übungen aus, mit denen du starten möchtest.'
      }</p><button class="primary start-main" ${next.exercises.length ? `data-start="${next.id}" data-plan="${plan.id}"` : 'id="editActivePlan"'}>${
        resume ? 'Training fortsetzen' : next.exercises.length ? 'Training starten' : 'Übungen auswählen'
      }</button></section>`
    : empty('Noch kein Training', 'Erstelle einen Plan, um loszulegen.');
  const others = readyDays.filter((d) => d.id !== next?.id);
  const weekBlock = readyDays.length
    ? `<section class="week"><div class="week-head"><h2>Diese Woche</h2><button class="text-btn" data-nav="calendar">Kalender</button></div><div class="week-line"><b>${stats.thisWeek} von ${goal}</b><span>${plural(goal, 'Einheit', 'Einheiten')} geplant</span>${stats.streak ? `<em>${plural(stats.streak, 'Woche', 'Wochen')} in Folge</em>` : ''}</div><div class="week-progress" role="progressbar" aria-label="Wochenziel" aria-valuenow="${stats.thisWeek}" aria-valuemax="${goal}"><i style="width:${Math.min(100, (stats.thisWeek / Math.max(1, goal)) * 100)}%"></i></div>${weekVolume ? `<small>${fmtVolume(weekVolume)} bewegt</small>` : ''}</section>`
    : '';
  return `<main class="shell home-shell">
    <section class="home-intro"><div><h1>Heute</h1><p>${fmtLong(today)} · ${esc(plan?.name || 'Volumora')}</p></div><button class="text-btn" data-nav="plans">Plan ändern</button></section>
    ${nextCard}
    ${weekBlock}
    ${others.length ? `<section class="list-section"><h2>Weitere Einheiten</h2><div class="list">${others.map((d) => dayRow(plan, d)).join('')}</div></section>` : ''}
    ${last ? `<section class="list-section"><h2>Zuletzt</h2><div class="list"><button type="button" class="row" data-nav="analytics"><span class="row-main"><b>${esc(last.dayName || last.day)}</b><small>${fmtLong(last.day || last.finishedAt)} · ${fmtVolume(last.volume || volumeOf(last))}</small></span>${icon('chevron-right')}</button></div></section>` : ''}
  </main>`;
}

export function bind() {
  document
    .querySelector('#editActivePlan')
    ?.addEventListener('click', () =>
      navigate('planEditor', { editPlanId: activePlan().id, editorDayIndex: 0 })
    );
  document.querySelectorAll('[data-start]').forEach((b) => {
    b.onclick = async () => {
      const saved = getActive();
      const other = saved && (saved.planId !== b.dataset.plan || saved.dayId !== b.dataset.start);
      if (other && sessionStarted(saved)) {
        const ok = await confirmDialog({
          title: 'Begonnenes Training verwerfen?',
          text: `„${saved.dayName}“ ist noch offen. Die bereits eingetragenen Sätze gehen verloren.`,
          confirmLabel: 'Verwerfen und starten',
          danger: true,
        });
        if (!ok) return;
      }
      navigate('workout', { planId: b.dataset.plan, dayId: b.dataset.start });
    };
  });
}
