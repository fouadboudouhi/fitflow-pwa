import { createSuggestedPlan, planSchedule, scheduleLabel } from '../plans.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { allPlans, savePlans } from '../storage.js';
import { WEEKDAYS, esc, number } from '../util.js';

const progress = (step) =>
  `<div class="assistant-progress"><i class="active"></i><i class="${step >= 2 ? 'active' : ''}"></i><i class="${step >= 3 ? 'active' : ''}"></i><span>Schritt ${step} von 3</span></div>`;
const head = (backAttr) =>
  `<div class="backrow"><button class="back" ${backAttr} aria-label="Zurück">←</button><span>Plan-Assistent</span></div>`;
const GOALS = [
  ['muscle', 'Muskelaufbau', 'Ausgewogenes Volumen und 8–12 Wiederholungen'],
  ['strength', 'Kraft', 'Schwere Grundübungen mit längeren Pausen'],
  ['fitness', 'Allgemeine Fitness', 'Mehr Wiederholungen und kompakte Einheiten'],
];

export function view() {
  const step = state.assistantStep || 1;
  const draft = state.assistantDraft || { goal: 'muscle', days: 3 };
  if (step === 2) {
    return `<main class="shell narrow">${head('id="assistantBack"')}${progress(step)}<section class="assistant-hero"><h1>Wann trainierst du?</h1><p>Feste Tage geben Orientierung. Flexibel bedeutet: einfach immer mit der nächsten Einheit weitermachen.</p></section><form id="assistantScheduleForm" class="assistant-form"><fieldset><label><input type="radio" name="scheduleMode" value="flexible" checked><span><b>Flexible Reihenfolge</b><small>Wenn deine Trainingstage wechseln</small></span></label><label><input type="radio" name="scheduleMode" value="fixed"><span><b>Feste Wochentage</b><small>${draft.days} Einheiten sinnvoll über die Woche verteilt</small></span></label></fieldset><button class="primary full" type="submit">Vorschau anzeigen</button></form></main>`;
  }
  if (step === 3 && state.assistantPreview) {
    const p = state.assistantPreview;
    const schedule = planSchedule(p);
    return `<main class="shell narrow">${head('id="assistantBack"')}${progress(step)}<section class="assistant-hero preview-head"><h1>${esc(p.name)}</h1><p>${esc(scheduleLabel(p))}. Sofort verwenden oder vorher anpassen.</p></section><div class="plan-preview">${p.days
      .map(
        (d, i) =>
          `<article><span>${schedule.mode === 'fixed' ? WEEKDAYS[schedule.assignments[d.id]] : i + 1}</span><div><h2>${esc(d.name)}</h2><p>${d.exercises.map((x) => esc(x.name)).join(' · ')}</p></div><b>${d.exercises.length}</b></article>`
      )
      .join(
        ''
      )}</div><div class="preview-actions"><button class="primary" id="useSuggestedPlan">Plan verwenden</button><button class="secondary" id="customizeSuggestedPlan">Erst anpassen</button></div></main>`;
  }
  return `<main class="shell narrow">${head('data-nav="plans"')}${progress(1)}<section class="assistant-hero"><h1>Was möchtest du erreichen?</h1><p>Volumora erstellt daraus einen einfachen, ausgewogenen Startplan.</p></section><form id="assistantForm" class="assistant-form"><fieldset>${GOALS.map(
    ([value, title, text]) =>
      `<label><input type="radio" name="goal" value="${value}" ${draft.goal === value ? 'checked' : ''}><span><b>${title}</b><small>${text}</small></span></label>`
  ).join(
    ''
  )}</fieldset><label class="days-choice"><span>Trainingstage pro Woche</span><select name="days">${[2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${number(draft.days) === n ? 'selected' : ''}>${n} Trainingstage</option>`).join('')}</select></label><button class="primary full" type="submit">Weiter</button></form></main>`;
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
    if (customize) navigate('planEditor', { editPlanId: plan.id, editorDayIndex: 0 });
    else navigate('home');
  };
  document.querySelector('#useSuggestedPlan')?.addEventListener('click', () => accept(false));
  document.querySelector('#customizeSuggestedPlan')?.addEventListener('click', () => accept(true));
}
