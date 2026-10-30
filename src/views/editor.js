// Plan editor. Exercises come from the picker overlay; secondary actions live in "⋯" menus.
import { plural, t, weekdayShort } from '../i18n.js';
import { icon } from '../icons.js';
import { exerciseName } from '../library.js';
import {
  addDay,
  customExercise,
  duplicatePlan,
  planExerciseFromLibrary,
  planSchedule,
  scheduleSlots,
} from '../plans.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { allPlans, persistPlan, savePlans } from '../storage.js';
import { actionSheet, toast, undoToast } from '../ui.js';
import { esc, number } from '../util.js';
import { openPicker } from './picker.js';
import { empty } from './shell.js';
import * as plansView from './plans.js';

const detailsOpen = (di, ei) => state.editorDetails?.has(`${di}:${ei}`);
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const exerciseRow = (ex, di, ei) =>
  `<article class="plan-exercise-row" data-ex-index="${ei}">${ex.gif ? `<img class="exercise-gif" src="${esc(ex.gif)}" alt="" loading="lazy" decoding="async">` : '<div class="custom-exercise-icon">＋</div>'}<div class="plan-exercise-main">${
    ex.custom
      ? `<input class="custom-name" data-prop="name" value="${esc(ex.name)}" aria-label="${t('editor.customName')}">`
      : `<h3>${esc(exerciseName(ex))}</h3>`
  }<div class="quick-fields"><label><span>${t('editor.sets')}</span><input data-prop="sets" type="number" min="1" max="12" value="${esc(ex.sets)}"></label><label><span>${t('editor.reps')}</span><input data-prop="range" value="${esc(ex.range)}"></label></div>${
    detailsOpen(di, ei) || ex.rest || (ex.note && ex.custom)
      ? `<div class="detail-fields"><label><span>${t('editor.rest')}</span><input data-prop="rest" type="number" min="0" max="600" value="${esc(ex.rest || '')}" placeholder="${t('editor.restDefault')}"></label><label><span>${t('editor.note')}</span><input data-prop="note" value="${esc(ex.note || '')}"></label></div>`
      : ''
  }</div><button type="button" class="icon-btn quiet" data-exercise-menu="${di}:${ei}" aria-label="${esc(t('exercise.more', { name: exerciseName(ex) }))}">${icon('more')}</button></article>`;

export function view() {
  const p = allPlans().items.find((x) => x.id === state.editPlanId);
  if (!p) {
    state.view = 'plans';
    return plansView.view();
  }
  const schedule = planSchedule(p);
  state.editorDayIndex = Math.min(state.editorDayIndex, p.days.length - 1);
  const di = Math.max(0, state.editorDayIndex);
  const d = p.days[di];
  const scheduleDays = p.days
    .map(
      (day, i) =>
        `<label><span>${esc(day.name)}</span><select data-schedule-day="${day.id}">${WEEKDAYS.map((weekday) => `<option value="${weekday}" ${(schedule.assignments?.[day.id] ?? scheduleSlots(p.days.length)[i]) === weekday ? 'selected' : ''}>${weekdayShort(weekday)}</option>`).join('')}</select></label>`
    )
    .join('');
  return `<main class="shell simple-editor"><div class="backrow"><button class="back" data-nav="plans" aria-label="${t('common.back')}">←</button><h1>${t('editor.title')}</h1><button type="button" class="icon-btn quiet backrow-action" id="planMenu" aria-label="${t('editor.planMenu')}">${icon('more')}</button></div>
    <section class="simple-plan-head"><label><span>${t('editor.planName')}</span><input id="planName" value="${esc(p.name)}" maxlength="60"></label><input id="planDescription" type="hidden" value="${esc(p.description || '')}"></section>
    <section class="schedule-editor"><div class="schedule-mode"><label><input type="radio" name="planScheduleMode" value="flexible" ${schedule.mode !== 'fixed' ? 'checked' : ''}> ${t('schedule.flexible')}</label><label><input type="radio" name="planScheduleMode" value="fixed" ${schedule.mode === 'fixed' ? 'checked' : ''}> ${t('schedule.fixedDays')}</label></div><div class="schedule-days" id="scheduleDays" ${schedule.mode === 'fixed' ? '' : 'hidden'}>${scheduleDays}</div></section>
    <div class="editor-day-tabs">${p.days.map((day, i) => `<button class="${i === di ? 'active' : ''}" data-editor-day="${i}" aria-pressed="${i === di}"><span>${i + 1}</span>${esc(day.name)}</button>`).join('')}<button type="button" class="add-day" id="addDay" aria-label="${t('editor.newDay')}">${icon('plus')}</button></div>
    ${
      d
        ? `<div class="editor-days"><section class="editor-day" data-day-index="${di}"><div class="simple-day-head"><input class="day-name" value="${esc(d.name)}" aria-label="${t('editor.dayName')}"><button class="icon-btn quiet" data-remove-day="${di}" aria-label="${t('editor.removeDay')}">${icon('close')}</button></div>
      <div class="editor-exercises">${d.exercises.length ? d.exercises.map((ex, ei) => exerciseRow(ex, di, ei)).join('') : empty(t('editor.noExercisesTitle'), t('editor.noExercisesText'))}</div><button class="choose-exercise" data-add-exercise="${di}">${icon('plus')}<b>${t('editor.addExercise')}</b></button></section></div>`
        : ''
    }
    <div class="editor-footer"><span>${plural(p.days.length, 'trainingDays')}</span><button class="primary" id="savePlan">${t('common.done')}</button></div></main>`;
}

// Reads the editor form back into the plan and persists it.
function collectPlan() {
  const data = allPlans();
  const p = data.items.find((x) => x.id === state.editPlanId);
  p.name = document.querySelector('#planName').value.trim() || t('plan.defaultName');
  p.description = document.querySelector('#planDescription').value.trim();
  const assignments = {};
  document.querySelectorAll('[data-schedule-day]').forEach((x) => {
    assignments[x.dataset.scheduleDay] = number(x.value);
  });
  p.schedule = {
    mode: document.querySelector('[name="planScheduleMode"]:checked')?.value || 'flexible',
    assignments,
  };
  document.querySelectorAll('.editor-day').forEach((el) => {
    const di = number(el.dataset.dayIndex);
    const d = p.days[di];
    d.name = el.querySelector('.day-name').value.trim() || t('day.nth', { n: di + 1 });
    el.querySelectorAll('.plan-exercise-row').forEach((row, ei) => {
      const ex = d.exercises[ei];
      row.querySelectorAll('[data-prop]').forEach((input) => {
        const prop = input.dataset.prop;
        ex[prop] = prop === 'sets' || prop === 'rest' ? number(input.value) : input.value.trim();
      });
    });
  });
  savePlans(data);
  return p;
}

const currentPlan = () => allPlans().items.find((x) => x.id === state.editPlanId);

// Opens the picker for a day; with `replaceIndex` the chosen exercise takes that slot and keeps its targets.
function openLibrary(dayIndex, replaceIndex = null) {
  const plan = collectPlan();
  const replacing = replaceIndex !== null;
  openPicker({
    title: replacing ? t('picker.replaceTitle') : t('picker.title'),
    subtitle: replacing ? t('picker.replaceHint') : plan.days[dayIndex]?.name || t('day.fallback'),
    isAdded: (id) =>
      !replacing && !!currentPlan()?.days[dayIndex]?.exercises.some((x) => (x.libraryId || x.id) === id),
    closeOnPick: replacing,
    onPick: (source) => {
      const data = allPlans();
      const list = data.items.find((x) => x.id === state.editPlanId).days[dayIndex].exercises;
      const picked = planExerciseFromLibrary(source);
      if (replacing) {
        const old = list[replaceIndex];
        Object.assign(picked, { sets: old.sets, range: old.range, rest: old.rest });
        list[replaceIndex] = picked;
      } else list.push(picked);
      savePlans(data);
      render();
    },
    onCustom: () => {
      const data = allPlans();
      data.items.find((x) => x.id === state.editPlanId).days[dayIndex].exercises.push(customExercise());
      savePlans(data);
      render();
    },
  });
}

function bindPlanMenu() {
  document.querySelector('#planMenu')?.addEventListener('click', () => {
    const data = allPlans();
    const p = data.items.find((x) => x.id === state.editPlanId);
    const active = data.activePlanId === p.id;
    actionSheet(p.name, [
      !active && {
        label: t('editor.useActive'),
        onClick: () => {
          const d = allPlans();
          d.activePlanId = p.id;
          savePlans(d);
          render();
          toast(t('editor.nowActive'));
        },
      },
      {
        label: t('editor.duplicate'),
        onClick: () => {
          const d = allPlans();
          const copy = duplicatePlan(collectPlan());
          d.items.push(copy);
          savePlans(d);
          navigate('planEditor', { editPlanId: copy.id, editorDayIndex: 0 });
        },
      },
      data.items.length > 1 && {
        label: t('editor.deletePlan'),
        danger: true,
        onClick: () => {
          const d = allPlans();
          const index = d.items.findIndex((x) => x.id === p.id);
          const [removed] = d.items.splice(index, 1);
          const wasActive = d.activePlanId === removed.id;
          if (wasActive) d.activePlanId = d.items[0].id;
          savePlans(d);
          navigate('plans');
          undoToast(t('editor.deleted', { name: removed.name }), () => {
            const current = allPlans();
            current.items.splice(Math.min(index, current.items.length), 0, removed);
            if (wasActive) current.activePlanId = removed.id;
            savePlans(current);
            render();
          });
        },
      },
    ]);
  });
}

function bindExerciseMenus() {
  document.querySelectorAll('[data-exercise-menu]').forEach((b) => {
    b.onclick = () => {
      const [di, ei] = b.dataset.exerciseMenu.split(':').map(Number);
      const p = collectPlan();
      const list = p.days[di].exercises;
      const ex = list[ei];
      const move = (j) => {
        if (j < 0 || j >= list.length) return;
        [list[ei], list[j]] = [list[j], list[ei]];
        persistPlan(p);
        render();
      };
      actionSheet(exerciseName(ex), [
        { label: t('editor.replace'), hint: t('editor.replaceHint'), onClick: () => openLibrary(di, ei) },
        ei > 0 && { label: t('editor.moveUp'), onClick: () => move(ei - 1) },
        ei < list.length - 1 && { label: t('editor.moveDown'), onClick: () => move(ei + 1) },
        {
          label: t('editor.restAndNote'),
          onClick: () => {
            (state.editorDetails ||= new Set()).add(`${di}:${ei}`);
            render();
          },
        },
        {
          label: t('editor.remove'),
          danger: true,
          onClick: () => {
            const [removed] = list.splice(ei, 1);
            persistPlan(p);
            render();
            undoToast(t('editor.removed', { name: exerciseName(removed) }), () => {
              const current = allPlans().items.find((x) => x.id === p.id);
              const day = current?.days[di];
              if (!day) return;
              day.exercises.splice(Math.min(ei, day.exercises.length), 0, removed);
              persistPlan(current);
              render();
            });
          },
        },
      ]);
    };
  });
}

export function bind() {
  document.querySelectorAll('[data-editor-day]').forEach((b) => {
    b.onclick = () => {
      collectPlan();
      state.editorDayIndex = number(b.dataset.editorDay);
      render();
    };
  });
  document.querySelectorAll('[name="planScheduleMode"]').forEach((x) => {
    x.onchange = () =>
      document.querySelector('#scheduleDays')?.toggleAttribute('hidden', x.value !== 'fixed');
  });
  document.querySelector('#savePlan').onclick = () => {
    collectPlan();
    navigate('plans');
  };
  document.querySelector('#addDay').onclick = () => {
    const p = collectPlan();
    addDay(p);
    state.editorDayIndex = p.days.length - 1;
    persistPlan(p);
    render();
  };
  document.querySelectorAll('[data-remove-day]').forEach((b) => {
    b.onclick = () => {
      const p = collectPlan();
      const di = number(b.dataset.removeDay);
      const [removed] = p.days.splice(di, 1);
      const weekday = p.schedule?.assignments?.[removed.id];
      state.editorDayIndex = Math.max(0, Math.min(state.editorDayIndex, p.days.length - 1));
      persistPlan(p);
      render();
      undoToast(t('editor.removed', { name: removed.name }), () => {
        const current = allPlans().items.find((x) => x.id === p.id);
        if (!current) return;
        current.days.splice(Math.min(di, current.days.length), 0, removed);
        if (weekday !== undefined)
          (current.schedule ||= { mode: 'flexible', assignments: {} }).assignments[removed.id] = weekday;
        state.editorDayIndex = di;
        persistPlan(current);
        render();
      });
    };
  });
  document.querySelectorAll('[data-add-exercise]').forEach((b) => {
    b.onclick = () => openLibrary(number(b.dataset.addExercise));
  });
  bindPlanMenu();
  bindExerciseMenus();
}
