import { createEmptyPlan, duplicatePlan, scheduleLabel } from '../plans.js';
import { icon } from '../icons.js';
import { navigate, render } from '../render.js';
import { allPlans, savePlans } from '../storage.js';
import { esc, plural } from '../util.js';

const planCard = (p, activeId, deletable) => {
  const count = p.days.reduce((n, d) => n + d.exercises.length, 0);
  return `<article class="plan-card ${p.id === activeId ? 'selected' : ''}"><div><div class="eyebrow">${p.id === activeId ? 'Aktiver Plan' : 'Trainingsplan'}</div><h2>${esc(p.name)}</h2><p>${esc(scheduleLabel(p))} · ${plural(p.days.length, 'Tag', 'Tage')} · ${plural(count, 'Übung', 'Übungen')}</p></div><div class="card-actions">${
    p.id !== activeId ? `<button class="secondary" data-activate-plan="${p.id}">Aktivieren</button>` : ''
  }<button class="secondary" data-edit-plan="${p.id}">Bearbeiten</button><button class="icon-btn" data-copy-plan="${p.id}" title="Duplizieren" aria-label="Plan duplizieren">${icon('copy')}</button>${
    deletable
      ? `<button class="icon-btn danger" data-delete-plan="${p.id}" title="Löschen" aria-label="Plan löschen">${icon('close')}</button>`
      : ''
  }</div></article>`;
};

export function view() {
  const data = allPlans();
  return `<main class="shell"><section class="page-head"><div><span class="eyebrow">Programm</span><h1>Dein Plan</h1><p>Ein klarer Wochenrhythmus und alle Einheiten an einem Ort.</p></div><div class="card-actions"><button class="secondary" id="planAssistant">Plan-Assistent</button><button class="primary" id="newPlan">+ Eigener Plan</button></div></section>
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
      if (!confirm('Diesen Trainingsplan wirklich löschen?')) return;
      const d = allPlans();
      d.items = d.items.filter((x) => x.id !== b.dataset.deletePlan);
      if (d.activePlanId === b.dataset.deletePlan) d.activePlanId = d.items[0].id;
      savePlans(d);
      render();
    };
  });
}
