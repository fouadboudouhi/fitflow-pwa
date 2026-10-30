// Plan editor with the exercise library dialog. Secondary actions live in "⋯" menus.
import { plural, t, weekdayShort } from '../i18n.js';
import { icon } from '../icons.js';
import {
  EXERCISE_LIBRARY,
  GROUPS,
  equipmentLabel,
  exerciseName,
  groupLabel,
  libraryExercise,
  muscleLabel,
} from '../library.js';
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
import { allPlans, getPrefs, persistPlan, savePlans, savePrefs } from '../storage.js';
import { actionSheet, toast, undoToast } from '../ui.js';
import { esc, number } from '../util.js';
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

function libraryDialog(plan) {
  const day = plan.days[state.libraryDayIndex];
  const prefs = getPrefs();
  const replacing = state.replaceExerciseIndex !== null;
  const rank = (id) => (prefs.recent.indexOf(id) < 0 ? 99 : prefs.recent.indexOf(id));
  const sorted = EXERCISE_LIBRARY.slice().sort(
    (a, b) => prefs.favorites.includes(b.id) - prefs.favorites.includes(a.id) || rank(a.id) - rank(b.id)
  );
  const items = sorted
    .map((ex) => {
      const added = !replacing && day?.exercises.some((x) => (x.libraryId || x.id) === ex.id);
      const favorite = prefs.favorites.includes(ex.id);
      const name = exerciseName(ex);
      const search =
        `${name} ${ex.sourceName || ''} ${groupLabel(ex.group)} ${equipmentLabel(ex.equipment)} ${muscleLabel(ex.target)} ${ex.equipment || ''} ${ex.target || ''}`.toLowerCase();
      return `<article class="library-item" data-category="${esc(ex.group)}" data-search="${esc(search)}"><img class="exercise-gif" src="${esc(ex.gif)}" alt="" loading="lazy" decoding="async"><div><h3>${esc(name)}</h3><span>${esc(groupLabel(ex.group))} · ${esc(equipmentLabel(ex.equipment))}</span></div><div class="library-actions"><button class="star ${favorite ? 'active' : ''}" data-library-favorite="${ex.id}" aria-label="${t('picker.favorite')}" aria-pressed="${favorite}">★</button><button class="${added ? 'added' : ''}" data-pick-exercise="${ex.id}" ${added ? 'disabled' : ''} aria-label="${added ? t('picker.added') : t('picker.add')}">${added ? '✓' : '＋'}</button></div></article>`;
    })
    .join('');
  const chips = ['all', ...GROUPS];
  return `<div class="library-backdrop"><section class="exercise-library" role="dialog" aria-modal="true" aria-label="${t('picker.title')}"><div class="library-head"><div><h2>${replacing ? t('picker.replaceTitle') : t('picker.title')}</h2><p class="muted">${replacing ? t('picker.replaceHint') : esc(day?.name || t('day.fallback'))} · ${plural(EXERCISE_LIBRARY.length, 'exercises')}</p></div><button class="icon-btn" id="closeLibrary" aria-label="${t('common.close')}">${icon('close')}</button></div><label class="library-search"><span>${icon('search')}</span><input id="librarySearch" type="search" placeholder="${t('picker.search')}" autocomplete="off" value="${esc(state.libraryQuery || '')}"></label><div class="category-chips">${chips.map((c) => `<button class="${state.libraryCategory === c ? 'active' : ''}" data-library-category="${c}" aria-pressed="${state.libraryCategory === c}">${esc(groupLabel(c))}</button>`).join('')}</div><div class="library-list">${items}</div><button class="custom-exercise-button" id="addCustomExercise">${t('picker.custom')}</button><button class="primary full library-done" id="closeLibraryBottom">${t('common.done')}</button></section></div>`;
}

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
    <div class="editor-footer"><span>${plural(p.days.length, 'trainingDays')}</span><button class="primary" id="savePlan">${t('common.done')}</button></div></main>${state.libraryDayIndex !== null ? libraryDialog(p) : ''}`;
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

const openLibrary = (dayIndex, replaceIndex) => {
  collectPlan();
  Object.assign(state, {
    libraryDayIndex: dayIndex,
    replaceExerciseIndex: replaceIndex,
    libraryCategory: 'all',
    libraryQuery: '',
  });
  render();
};
const closeLibrary = () => {
  Object.assign(state, { libraryDayIndex: null, replaceExerciseIndex: null });
  render();
};

function bindLibrary() {
  const dialog = document.querySelector('.exercise-library');
  if (!dialog) return;
  document.querySelectorAll('[data-library-category]').forEach((b) => {
    b.onclick = () => {
      state.libraryCategory = b.dataset.libraryCategory;
      render();
    };
  });
  const filter = () => {
    const q = (state.libraryQuery || '').toLowerCase().trim();
    document.querySelectorAll('.library-item').forEach((card) => {
      card.hidden =
        (state.libraryCategory !== 'all' && card.dataset.category !== state.libraryCategory) ||
        !card.dataset.search.includes(q);
    });
  };
  document.querySelector('#librarySearch')?.addEventListener('input', (e) => {
    state.libraryQuery = e.target.value;
    filter();
  });
  filter();
  document.querySelectorAll('[data-library-favorite]').forEach((b) => {
    b.onclick = () => {
      const prefs = getPrefs();
      const id = b.dataset.libraryFavorite;
      prefs.favorites = prefs.favorites.includes(id)
        ? prefs.favorites.filter((x) => x !== id)
        : [id, ...prefs.favorites];
      savePrefs(prefs);
      render();
    };
  });
  document.querySelectorAll('[data-pick-exercise]').forEach((b) => {
    b.onclick = () => {
      const data = allPlans();
      const plan = data.items.find((x) => x.id === state.editPlanId);
      const source = libraryExercise(b.dataset.pickExercise);
      const picked = planExerciseFromLibrary(source);
      const list = plan.days[state.libraryDayIndex].exercises;
      if (state.replaceExerciseIndex !== null) {
        const old = list[state.replaceExerciseIndex];
        Object.assign(picked, { sets: old.sets, range: old.range, rest: old.rest });
        list[state.replaceExerciseIndex] = picked;
      } else list.push(picked);
      const prefs = getPrefs();
      prefs.recent = [source.id, ...prefs.recent.filter((x) => x !== source.id)].slice(0, 12);
      savePrefs(prefs);
      savePlans(data);
      if (state.replaceExerciseIndex !== null) closeLibrary();
      else render();
    };
  });
  document.querySelector('#closeLibrary')?.addEventListener('click', closeLibrary);
  document.querySelector('#closeLibraryBottom')?.addEventListener('click', closeLibrary);
  document.querySelector('#addCustomExercise')?.addEventListener('click', () => {
    const data = allPlans();
    data.items
      .find((x) => x.id === state.editPlanId)
      .days[state.libraryDayIndex].exercises.push(customExercise());
    savePlans(data);
    closeLibrary();
  });
  const focusable = () =>
    [...dialog.querySelectorAll('button:not([disabled]),input,select,textarea,a[href]')].filter(
      (el) => !el.closest('[hidden]')
    );
  document.onkeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLibrary();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (!dialog.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  if (!dialog.contains(document.activeElement))
    document.querySelector('#librarySearch')?.focus({ preventScroll: true });
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
    b.onclick = () => openLibrary(number(b.dataset.addExercise), null);
  });
  bindPlanMenu();
  bindExerciseMenus();
  bindLibrary();
}
