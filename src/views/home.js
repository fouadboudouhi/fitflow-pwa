import { plural, t } from '../i18n.js';
import { icon } from '../icons.js';
import { nextSession, setCount, weekStats } from '../plans.js';
import { navigate } from '../render.js';
import { activePlan, getActive, getHistory, getSettings } from '../storage.js';
import { confirmDialog } from '../ui.js';
import { doneSets, esc, fmtLong } from '../util.js';
import { sessionStarted } from '../workout.js';
import { empty } from './shell.js';

const dayRow = (plan, d) =>
  `<button type="button" class="row" data-start="${d.id}" data-plan="${plan.id}"><span class="row-main"><b>${esc(d.name)}</b><small>${plural(d.exercises.length, 'exercises')}</small></span>${icon('chevron-right')}</button>`;

export function view() {
  const today = new Date();
  const plan = activePlan();
  const history = getHistory();
  const readyDays = plan?.days?.filter((d) => d.exercises.length) || [];
  const goal = Number(getSettings().weeklyGoal) || readyDays.length;
  const stats = weekStats(history, goal, today);

  let { day: next, label: nextLabel } = nextSession(plan, history, today);
  const active = getActive();
  const activeDay =
    active && plan?.id === active.planId ? plan.days.find((d) => d.id === active.dayId) : null;
  const resume = !!(activeDay?.exercises.length && sessionStarted(active));
  if (resume) {
    next = activeDay;
    nextLabel = t('home.resumeLabel');
  }
  const nextCard = next
    ? `<section class="next-card ${resume ? 'resume-card' : ''} ${next.exercises.length ? '' : 'empty-plan-card'}"><span class="next-label">${esc(next.exercises.length ? nextLabel : t('home.completePlan'))}</span><h2>${esc(next.name)}</h2><p>${
        resume
          ? plural(doneSets(active), 'home.setsDone')
          : next.exercises.length
            ? `${plural(next.exercises.length, 'exercises')} · ${plural(setCount(next), 'sets')}`
            : t('home.pickExercises')
      }</p><button class="primary start-main" ${next.exercises.length ? `data-start="${next.id}" data-plan="${plan.id}"` : 'id="editActivePlan"'}>${
        resume ? t('home.resume') : next.exercises.length ? t('home.start') : t('home.chooseExercises')
      }</button></section>`
    : empty(t('home.emptyTitle'), t('home.emptyText'));
  const others = readyDays.filter((d) => d.id !== next?.id);
  const weekStrip = readyDays.length
    ? `<section class="week" aria-label="${t('home.weeklyGoal')}"><div class="week-progress" role="progressbar" aria-label="${t('home.weeklyGoal')}" aria-valuenow="${stats.thisWeek}" aria-valuemax="${goal}"><i style="width:${Math.min(100, (stats.thisWeek / Math.max(1, goal)) * 100)}%"></i></div><div class="week-line"><span><b>${t('home.weekCount', { done: stats.thisWeek, goal })}</b> ${t('home.weekSuffix')}</span>${stats.streak ? `<em>${plural(stats.streak, 'home.streak')}</em>` : ''}</div></section>`
    : '';
  return `<main class="shell home-shell">
    <section class="home-intro"><h1>${t('home.title')}</h1><p>${fmtLong(today)}${plan ? ` · ${esc(plan.name)}` : ''}</p></section>
    ${nextCard}
    ${weekStrip}
    ${others.length ? `<section class="list-section"><h2>${t('home.otherSessions')}</h2><div class="list">${others.map((d) => dayRow(plan, d)).join('')}</div></section>` : ''}
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
          title: t('home.discardTitle'),
          text: t('home.discardText', { name: saved.dayName }),
          confirmLabel: t('home.discardConfirm'),
          danger: true,
        });
        if (!ok) return;
      }
      navigate('workout', { planId: b.dataset.plan, dayId: b.dataset.start });
    };
  });
}
