import { nextSession, scheduleLabel, setCount } from '../plans.js';
import { navigate } from '../render.js';
import { activePlan, getActive, getHistory } from '../storage.js';
import { sessionStarted } from '../workout.js';
import { dayKey, doneSets, esc, fmtLong, plural, volumeOf, weekdayIndex } from '../util.js';
import { empty } from './shell.js';

const dayButton = (plan, d) =>
  `<button data-start="${d.id}" data-plan="${plan.id}"><span><b>${esc(d.name)}</b><small>${plural(d.exercises.length, 'Übung', 'Übungen')} · ${plural(setCount(d), 'Satz', 'Sätze')}</small></span><i>→</i></button>`;

export function view() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - weekdayIndex(today));
  monday.setHours(0, 0, 0, 0);
  const mondayKey = dayKey(monday);
  const plan = activePlan();
  const history = getHistory();
  const last = history[0];
  const week = history.filter((x) => (x.day || dayKey(x.finishedAt)) >= mondayKey);
  const readyDays = plan?.days?.filter((d) => d.exercises.length) || [];
  const weekVolume = Math.round(week.reduce((s, x) => s + (x.volume || volumeOf(x)), 0));

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
    ? `<section class="next-card ${resume ? 'resume-card' : ''} ${next.exercises.length ? '' : 'empty-plan-card'}"><div><span class="next-label">${esc(next.exercises.length ? nextLabel : 'Plan vervollständigen')}</span><h2>${esc(next.name)}</h2><p>${
        resume
          ? `${plural(doneSets(active), 'Satz', 'Sätze')} erledigt · gestartet ${fmtLong(active.startedAt)}`
          : next.exercises.length
            ? `${plural(next.exercises.length, 'Übung', 'Übungen')} · ${plural(setCount(next), 'Satz', 'Sätze')} · ${esc(scheduleLabel(plan))}`
            : 'Wähle die Übungen aus, mit denen du starten möchtest.'
      }</p></div><button class="primary start-main" ${next.exercises.length ? `data-start="${next.id}" data-plan="${plan.id}"` : 'id="editActivePlan"'}>${
        resume ? 'Training fortsetzen' : next.exercises.length ? 'Training starten' : 'Übungen auswählen'
      } <span>→</span></button></section>`
    : empty('Noch kein Training', 'Erstelle einen Plan, um loszulegen.');
  const others = readyDays.filter((d) => d.id !== next?.id);
  return `<main class="shell home-shell">
    <section class="home-intro"><div><span class="eyebrow">${esc(plan?.name || 'Volumora')}</span><h1>Heute</h1></div><button class="text-btn" data-nav="plans">Plan ändern</button></section>
    ${nextCard}
    ${readyDays.length ? `<section class="home-week-summary"><div class="section-title"><h2>Diese Woche</h2><button class="text-btn" data-nav="calendar">Kalender</button></div><div class="week-summary"><div><b>${week.length} / ${readyDays.length}</b><span>Trainings</span></div><div class="week-progress"><i style="width:${Math.min(100, (week.length / readyDays.length) * 100)}%"></i></div>${weekVolume ? `<strong>${weekVolume.toLocaleString('de-DE')} kg</strong>` : ''}</div></section>` : ''}
    ${others.length ? `<section class="other-days"><div class="section-title"><h2>Weitere Einheiten</h2></div>${others.map((d) => dayButton(plan, d)).join('')}</section>` : ''}
    ${last ? `<button class="last-session" data-nav="analytics"><span><small>Zuletzt · ${fmtLong(last.finishedAt)}</small><b>${esc(last.dayName || last.day)}</b></span><span><b>${Math.round(last.volume || volumeOf(last)).toLocaleString('de-DE')} kg</b><small>${plural(Number(last.totalSets) || 0, 'Satz', 'Sätze')}</small></span></button>` : ''}
  </main>`;
}

export function bind() {
  document
    .querySelector('#editActivePlan')
    ?.addEventListener('click', () =>
      navigate('planEditor', { editPlanId: activePlan().id, editorDayIndex: 0 })
    );
  document.querySelectorAll('[data-start]').forEach((b) => {
    b.onclick = () => {
      const saved = getActive();
      const other = saved && (saved.planId !== b.dataset.plan || saved.dayId !== b.dataset.start);
      if (
        other &&
        sessionStarted(saved) &&
        !confirm(
          `Das begonnene Training „${saved.dayName}“ ist noch offen und wird verworfen. Trotzdem starten?`
        )
      )
        return;
      navigate('workout', { planId: b.dataset.plan, dayId: b.dataset.start });
    };
  });
}
