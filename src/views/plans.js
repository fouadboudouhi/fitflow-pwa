import { icon } from '../icons.js';
import { createEmptyPlan, duplicatePlan, scheduleLabel } from '../plans.js';
import { navigate, render } from '../render.js';
import { allPlans, savePlans } from '../storage.js';
import { undoToast } from '../ui.js';
import { esc, plural } from '../util.js';

const planCard = (p, activeId, deletable) => {
  const count = p.days.reduce((n, d) => n + d.exercises.length, 0);
  const active = p.id === activeId;
  return `<article class="plan-card ${active ? 'selected' : ''}"><div class="plan-card-main"><h2>${esc(p.name)}${active ? '<span class="chip chip-green">Aktiv</span>' : ''}</h2><p>${plural(p.days.length, 'Tag', 'Tage')} · ${plural(count, 'Übung', 'Übungen')} · ${esc(scheduleLabel(p))}</p></div><div class="card-actions">${
    active ? '' : `<button class="secondary" data-activate-plan="${p.id}">Aktivieren</button>`
  }<button class="secondary" data-edit-plan="${p.id}">Bearbeiten</button><button class="icon-btn" data-copy-plan="${p.id}" title="Duplizieren" aria-label="Plan duplizieren">${icon('copy')}</button>${
    deletable
      ? `<button class="icon-btn danger" data-delete-plan="${p.id}" title="Löschen" aria-label="Plan löschen">${icon('close')}</button>`
      : ''
  }</div></article>`;
};

export function view() {
  const data = allPlans();
  return `<main class="shell"><section class="page-head"><h1>Pläne</h1><div class="card-actions"><button class="secondary" id="planAssistant">Assistent</button><button class="primary" id="newPlan">Neuer Plan</button></div></section>
  <div class="plan-list">${data.items.map((p) => planCard(p, data.activePlanId, data.items.length > 1)).join('')}</div></main>`;
}

export function bind() {
  document
    .querySelector('#planAssistant')
    ?.addEventListener('click', () =>
      navigate('assistant', { assistantStep: 1, assistantDraft: null, assistantPreview: null })
    );
  document.querySelector('#newPlan')?.addEventListener('click', () => {
    const data = allPlans();
    const plan = createEmptyPlan();
    data.items.push(plan);
    savePlans(data);
    navigate('planEditor', { editPlanId: plan.id, editorDayIndex: 0 });
  });
  document.querySelectorAll('[data-edit-plan]').forEach((b) => {
    b.onclick = () => navigate('planEditor', { editPlanId: b.dataset.editPlan, editorDayIndex: 0 });
  });
  document.querySelectorAll('[data-activate-plan]').forEach((b) => {
    b.onclick = () => {
      const d = allPlans();
      d.activePlanId = b.dataset.activatePlan;
      savePlans(d);
      render();
    };
  });
  document.querySelectorAll('[data-copy-plan]').forEach((b) => {
    b.onclick = () => {
      const d = allPlans();
      d.items.push(duplicatePlan(d.items.find((x) => x.id === b.dataset.copyPlan)));
      savePlans(d);
      render();
    };
  });
  document.querySelectorAll('[data-delete-plan]').forEach((b) => {
    b.onclick = () => {
      const d = allPlans();
      const index = d.items.findIndex((x) => x.id === b.dataset.deletePlan);
      if (index < 0 || d.items.length < 2) return;
      const [removed] = d.items.splice(index, 1);
      const wasActive = d.activePlanId === removed.id;
      if (wasActive) d.activePlanId = d.items[0].id;
      savePlans(d);
      render();
      undoToast(`„${removed.name}“ gelöscht`, () => {
        const current = allPlans();
        current.items.splice(Math.min(index, current.items.length), 0, removed);
        if (wasActive) current.activePlanId = removed.id;
        savePlans(current);
        render();
      });
    };
  });
}
