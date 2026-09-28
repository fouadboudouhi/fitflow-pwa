import { icon } from '../icons.js';
import { createEmptyPlan, scheduleLabel } from '../plans.js';
import { navigate } from '../render.js';
import { allPlans, savePlans } from '../storage.js';
import { actionSheet } from '../ui.js';
import { esc, plural } from '../util.js';

const planRow = (p, activeId) => {
  const count = p.days.reduce((n, d) => n + d.exercises.length, 0);
  return `<button type="button" class="row" data-edit-plan="${p.id}"><span class="row-main"><b>${esc(p.name)}${p.id === activeId ? '<span class="chip chip-green">Aktiv</span>' : ''}</b><small>${plural(p.days.length, 'Tag', 'Tage')} · ${plural(count, 'Übung', 'Übungen')} · ${esc(scheduleLabel(p))}</small></span>${icon('chevron-right')}</button>`;
};

export function view() {
  const data = allPlans();
  return `<main class="shell"><section class="page-head"><h1>Pläne</h1><button class="icon-btn" id="newPlan" aria-label="Neuen Plan anlegen">${icon('plus')}</button></section>
  <div class="list">${data.items.map((p) => planRow(p, data.activePlanId)).join('')}</div></main>`;
}

export function bind() {
  document.querySelector('#newPlan')?.addEventListener('click', () =>
    actionSheet('Neuer Plan', [
      {
        label: 'Mit Assistent erstellen',
        hint: 'Ziel und Tage wählen, Vorschlag anpassen',
        onClick: () =>
          navigate('assistant', { assistantStep: 1, assistantDraft: null, assistantPreview: null }),
      },
      {
        label: 'Leeren Plan anlegen',
        hint: 'Tage und Übungen selbst zusammenstellen',
        onClick: () => {
          const data = allPlans();
          const plan = createEmptyPlan();
          data.items.push(plan);
          savePlans(data);
          navigate('planEditor', { editPlanId: plan.id, editorDayIndex: 0 });
        },
      },
    ])
  );
  document.querySelectorAll('[data-edit-plan]').forEach((b) => {
    b.onclick = () => navigate('planEditor', { editPlanId: b.dataset.editPlan, editorDayIndex: 0 });
  });
}
