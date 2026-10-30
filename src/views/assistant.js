import { t, weekdayShort } from '../i18n.js';
import { icon } from '../icons.js';
import { exerciseName } from '../library.js';
import { createSuggestedPlan, planSchedule, scheduleLabel } from '../plans.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { allPlans, savePlans } from '../storage.js';
import { esc, number } from '../util.js';

const progress = (step) =>
  `<div class="assistant-progress"><i class="active"></i><i class="${step >= 2 ? 'active' : ''}"></i><i class="${step >= 3 ? 'active' : ''}"></i><span>${t('wizard.step', { step })}</span></div>`;
const head = (backAttr) =>
  `<div class="backrow"><button class="back" ${backAttr} aria-label="${t('common.back')}">${icon('chevron-left')}</button><span>${t('wizard.title')}</span></div>`;
const GOALS = [
  ['muscle', 'goal.muscle', 'goal.muscleHint'],
  ['strength', 'goal.strength', 'goal.strengthHint'],
  ['fitness', 'goal.fitness', 'goal.fitnessHint'],
];

export function view() {
  const step = state.assistantStep || 1;
  const draft = state.assistantDraft || { goal: 'muscle', days: 3 };
  if (step === 2) {
    return `<main class="shell narrow">${head('id="assistantBack"')}${progress(step)}<section class="assistant-hero"><h1>${t('wizard.whenTitle')}</h1><p>${t('wizard.whenText')}</p></section><form id="assistantScheduleForm" class="assistant-form"><fieldset><label><input type="radio" name="scheduleMode" value="flexible" checked><span><b>${t('schedule.flexible')}</b><small>${t('wizard.flexibleHint')}</small></span></label><label><input type="radio" name="scheduleMode" value="fixed"><span><b>${t('schedule.fixedDays')}</b><small>${t('wizard.fixedHint', { n: draft.days })}</small></span></label></fieldset><button class="primary full" type="submit">${t('wizard.preview')}</button></form></main>`;
  }
  if (step === 3 && state.assistantPreview) {
    const p = state.assistantPreview;
    const schedule = planSchedule(p);
    return `<main class="shell narrow">${head('id="assistantBack"')}${progress(step)}<section class="assistant-hero preview-head"><h1>${esc(p.name)}</h1><p>${esc(t('wizard.previewText', { schedule: scheduleLabel(p) }))}</p></section><div class="plan-preview">${p.days
      .map(
        (d, i) =>
          `<article><span>${schedule.mode === 'fixed' ? weekdayShort(schedule.assignments[d.id]) : i + 1}</span><div><h2>${esc(d.name)}</h2><p>${d.exercises.map((x) => esc(exerciseName(x))).join(' · ')}</p></div><b>${d.exercises.length}</b></article>`
      )
      .join(
        ''
      )}</div><div class="preview-actions"><button class="primary" id="useSuggestedPlan">${t('wizard.use')}</button><button class="secondary" id="customizeSuggestedPlan">${t('wizard.customize')}</button></div></main>`;
  }
  return `<main class="shell narrow">${head('data-nav="plans"')}${progress(1)}<section class="assistant-hero"><h1>${t('wizard.goalTitle')}</h1><p>${t('wizard.goalText')}</p></section><form id="assistantForm" class="assistant-form"><fieldset>${GOALS.map(
    ([value, title, text]) =>
      `<label><input type="radio" name="goal" value="${value}" ${draft.goal === value ? 'checked' : ''}><span><b>${t(title)}</b><small>${t(text)}</small></span></label>`
  ).join(
    ''
  )}</fieldset><label class="days-choice"><span>${t('wizard.daysPerWeek')}</span><select name="days">${[2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${number(draft.days) === n ? 'selected' : ''}>${t('trainingDays.other', { n })}</option>`).join('')}</select></label><button class="primary full" type="submit">${t('wizard.next')}</button></form></main>`;
}

export function bind() {
  document.querySelector('#assistantForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    state.assistantDraft = { goal: f.get('goal'), days: number(f.get('days')) };
    state.assistantStep = 2;
    render();
  });
  document.querySelector('#assistantScheduleForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    state.assistantPreview = createSuggestedPlan(
      state.assistantDraft.goal,
      state.assistantDraft.days,
      f.get('scheduleMode')
    );
    state.assistantStep = 3;
    render();
  });
  document.querySelector('#assistantBack')?.addEventListener('click', () => {
    state.assistantStep = Math.max(1, state.assistantStep - 1);
    render();
  });
  const accept = (customize) => {
    const data = allPlans();
    const plan = state.assistantPreview;
    data.items.push(plan);
    data.activePlanId = plan.id;
    savePlans(data);
    Object.assign(state, { assistantStep: 1, assistantDraft: null, assistantPreview: null });
    if (customize) navigate('planEditor', { editorReturn: 'home', editPlanId: plan.id, editorDayIndex: 0 });
    else navigate('home');
  };
  document.querySelector('#useSuggestedPlan')?.addEventListener('click', () => accept(false));
  document.querySelector('#customizeSuggestedPlan')?.addEventListener('click', () => accept(true));
}
