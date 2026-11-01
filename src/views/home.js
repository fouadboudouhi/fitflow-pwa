import { deloadHint, deloadQuietDate } from '../deload.js';
import { fmtNumber, plural, t } from '../i18n.js';
import { icon } from '../icons.js';
import { nextSession, setCount, weekStats } from '../plans.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import {
  activePlan,
  backupDue,
  deloadQuietUntil,
  clearActive,
  dismissInstallTip,
  getActive,
  getHistory,
  getSettings,
  installTipDue,
  saveActive,
  quietDeload,
  snoozeBackup,
} from '../storage.js';
import { startOfWeek } from '../stats.js';
import { confirmDialog, infoDialog, undoToast } from '../ui.js';
import { toDisplay, unit } from '../units.js';
import { dayKey, doneSets, esc, fmtLong, number, volumeOf } from '../util.js';
import { reconcileActive, resetWorkoutUi, sessionExercises, sessionStarted } from '../workout.js';
import { empty } from './shell.js';

// The week ring in the hero: sessions done against the weekly goal.
function weekRing(done, goal) {
  const share = Math.min(1, done / Math.max(1, goal));
  return `<svg class="week-ring" viewBox="0 0 44 44" role="img" aria-label="${esc(t('home.weekCount', { done, goal }))}"><circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" stroke-width="4"/>${share ? `<circle cx="22" cy="22" r="18" fill="none" stroke="var(--green)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(113.1 * share).toFixed(1)} 113.1" transform="rotate(-90 22 22)"/>` : ''}<text x="22" y="26" text-anchor="middle">${done}/${goal}</text></svg>`;
}

const dayRow = (plan, d) =>
  `<button type="button" class="row" data-start="${d.id}" data-plan="${plan.id}"><span class="row-main"><b>${esc(d.name)}</b><small>${plural(d.exercises.length, 'exercises')}</small></span>${icon('chevron-right')}</button>`;

// A suggestion, not a task: it can be waved away and then stays quiet for weeks.
function deloadCard(history, today) {
  if (deloadQuietUntil() > today.getTime()) return '';
  const hint = deloadHint(history, today);
  if (!hint) return '';
  return `<section class="list-section"><div class="list"><div class="row backup-row" id="deloadCard"><span class="backup-main"><span class="row-icon">${icon('trend')}</span><span class="row-main"><b>${t('deload.title')}</b><small>${esc(t(`deload.${hint.reason}`, { n: hint.count }))}</small></span></span><button type="button" class="text-btn" id="deloadLater">${t('deload.later')}</button></div></div></section>`;
}

export function view() {
  const today = new Date();
  const plan = activePlan();
  const history = getHistory();
  const readyDays = plan?.days?.filter((d) => d.exercises.length) || [];
  const goal = Number(getSettings().weeklyGoal) || readyDays.length;
  const stats = weekStats(history, goal, today);
  const fromKey = dayKey(startOfWeek(today));
  const weekSessions = history.filter((h) => (h.day || dayKey(h.finishedAt)) >= fromKey);
  const volume = weekSessions.reduce((sum, h) => sum + (number(h.volume) || volumeOf(h)), 0);
  const records = weekSessions.reduce(
    (n, h) => n + (h.entries || []).reduce((m, e) => m + (e.sets || []).filter((x) => x.pr).length, 0),
    0
  );

  let { day: next, label: nextLabel } = nextSession(plan, history, today);
  // A running workout leads the screen, whatever became of its plan day in the meantime.
  const active = reconcileActive();
  const resume = !!(active && sessionStarted(active));
  const freeActive = resume && active.planId == null;
  if (resume) {
    next = { id: active.dayId || '', name: active.dayName, exercises: sessionExercises(active) };
    nextLabel = t('home.resumeLabel');
  }
  const startAttr = freeActive
    ? 'id="startFree"'
    : next?.exercises.length
      ? `data-start="${next.id}" data-plan="${resume ? active.planId : plan.id}"`
      : 'id="editActivePlan"';
  const nextCard = next
    ? `<section class="next-card ${resume ? 'resume-card' : ''} ${next.exercises.length ? '' : 'empty-plan-card'}"><span class="next-label">${esc(next.exercises.length ? nextLabel : t('home.completePlan'))}</span>${readyDays.length ? weekRing(stats.thisWeek, goal) : ''}<h2>${esc(next.name)}</h2><p>${
        resume
          ? doneSets(active)
            ? plural(doneSets(active), 'home.setsDone')
            : t('home.valuesTyped')
          : next.exercises.length
            ? `${plural(next.exercises.length, 'exercises')} · ${plural(setCount(next), 'sets')}`
            : t('home.pickExercises')
      }</p><button class="primary start-main" ${startAttr}>${
        resume ? t('home.resume') : next.exercises.length ? t('home.start') : t('home.chooseExercises')
      }</button>${resume ? `<button type="button" class="text-btn discard-btn" id="discardSession">${t('home.discard')}</button>` : ''}</section>`
    : empty(t('home.emptyTitle'), t('home.emptyText'), {
        label: t('home.emptyAction'),
        attrs: 'id="editActivePlan"',
      });
  const others = readyDays.filter((d) => d.id !== next?.id);
  // Three numbers for the week: volume, records, sessions against the goal; the streak sits in the heading.
  const weekStrip = readyDays.length
    ? `<section class="week week-line" aria-label="${t('home.weeklyGoal')}"><h2>${t('home.thisWeek')}${stats.streak ? `<em>${plural(stats.streak, 'home.streak')}</em>` : ''}</h2><div class="kpis"><div class="kpi"><b>${fmtNumber(Math.round(toDisplay(volume)))}<u>${unit()}</u></b><span>${t('home.kpiVolume')}</span></div><div class="kpi"><b>${records}</b><span>${t('home.kpiRecords')}</span></div><div class="kpi"><b>${t('home.weekCount', { done: stats.thisWeek, goal })}</b><span>${t('home.kpiSessions')}</span></div></div></section>`
    : '';
  const freeRow = freeActive
    ? ''
    : `<button type="button" class="row" id="startFree"><span class="row-icon">${icon('plus')}</span><span class="row-main"><b>${t('home.free')}</b><small>${t('home.freeHint')}</small></span>${icon('chevron-right')}</button>`;
  return `<main class="shell home-shell">
    <section class="home-intro"><h1>${t('home.title')}</h1><p>${fmtLong(today)}${plan ? ` · ${esc(plan.name)}` : ''}</p></section>
    ${nextCard}
    ${weekStrip}
    ${
      installTipDue()
        ? `<section class="list-section"><div class="list"><div class="row backup-row"><button type="button" class="backup-main" id="installNow"><span class="row-icon">${icon('install')}</span><span class="row-main"><b>${t('home.installTitle')}</b><small>${t('home.installText')}</small></span></button><button type="button" class="text-btn" id="installLater">${t('home.backupLater')}</button></div></div></section>`
        : ''
    }
    ${
      backupDue(history)
        ? `<section class="list-section"><div class="list"><div class="row backup-row"><button type="button" class="backup-main" id="backupNow"><span class="row-icon">${icon('backup')}</span><span class="row-main"><b>${t('home.backupTitle')}</b><small>${t('home.backupText')}</small></span></button><button type="button" class="text-btn" id="backupLater">${t('home.backupLater')}</button></div></div></section>`
        : ''
    }
    ${resume ? '' : deloadCard(history, today)}
    <section class="list-section">${others.length ? `<h2>${t('home.otherSessions')}</h2>` : ''}<div class="list">${others.map((d) => dayRow(plan, d)).join('')}${freeRow}</div></section>
  </main>`;
}

// Starting a different session than the one in progress asks first.
async function start(planId, dayId) {
  const saved = getActive();
  const other = saved && (saved.planId !== planId || saved.dayId !== dayId);
  if (other && sessionStarted(saved)) {
    const ok = await confirmDialog({
      title: t('home.discardTitle'),
      text: t('home.discardText', { name: saved.dayName }),
      confirmLabel: t('home.discardConfirm'),
      danger: true,
    });
    if (!ok) return;
    clearActive();
    resetWorkoutUi();
  }
  navigate('workout', { planId, dayId });
}

export function bind() {
  document.querySelector('#deloadLater')?.addEventListener('click', () => {
    quietDeload(deloadQuietDate());
    render();
  });
  document
    .querySelector('#installNow')
    ?.addEventListener('click', () =>
      state.installPrompt
        ? state.installPrompt.prompt()
        : infoDialog(t('more.install'), t('more.installText'))
    );
  document.querySelector('#installLater')?.addEventListener('click', () => {
    dismissInstallTip();
    render();
  });
  document.querySelector('#backupNow')?.addEventListener('click', () => navigate('backup'));
  document.querySelector('#backupLater')?.addEventListener('click', () => {
    snoozeBackup();
    render();
  });
  document.querySelector('#editActivePlan')?.addEventListener('click', () =>
    navigate('planEditor', {
      editPlanId: activePlan().id,
      editorDayIndex: Math.max(
        0,
        activePlan().days.findIndex((d) => !d.exercises.length)
      ),
      editorReturn: 'home',
    })
  );
  document.querySelector('#discardSession')?.addEventListener('click', () => {
    const session = getActive();
    clearActive();
    resetWorkoutUi();
    render();
    undoToast(t('home.discarded', { name: session?.dayName || '' }), () => {
      saveActive(session);
      render();
    });
  });
  document.querySelectorAll('[data-start]').forEach((b) => {
    b.onclick = () => start(b.dataset.plan, b.dataset.start);
  });
  document.querySelector('#startFree')?.addEventListener('click', () => start(null, null));
}
