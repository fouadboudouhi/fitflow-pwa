// Plan editor with the exercise library dialog.
import { icon } from '../icons.js';
import { CATEGORIES, CATEGORY_BY_ID, EXERCISE_LIBRARY, libraryExercise } from '../library.js';
import { addDay, customExercise, planExerciseFromLibrary, planSchedule, scheduleSlots } from '../plans.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { allPlans, getPrefs, persistPlan, savePlans, savePrefs } from '../storage.js';
import { WEEKDAYS, esc, number, plural } from '../util.js';
import { empty } from './shell.js';
import * as plansView from './plans.js';

const exerciseRow = (ex, di, ei) =>
  `<article class="plan-exercise-row" data-ex-index="${ei}">${ex.gif ? `<img src="${esc(ex.gif)}" alt="" loading="lazy" decoding="async">` : '<div class="custom-exercise-icon">＋</div>'}<div class="plan-exercise-main">${
    ex.custom
      ? `<input class="custom-name" data-prop="name" value="${esc(ex.name)}" aria-label="Name der eigenen Übung">`
      : `<h3>${esc(ex.name)}</h3>`
  }<span>${esc(ex.category || CATEGORY_BY_ID[ex.libraryId || ex.id] || 'Übung')}</span><div class="quick-fields"><label><span>Sätze</span><input data-prop="sets" type="number" min="1" max="12" value="${esc(ex.sets)}"></label><label><span>Wiederholungen</span><input data-prop="range" value="${esc(ex.range)}"></label></div><button class="swap-link" data-replace-exercise="${di}:${ei}">↻ Übung ersetzen</button><details><summary>Weitere Einstellungen</summary><div class="detail-fields"><label><span>Pause in Sekunden</span><input data-prop="rest" type="number" min="0" max="600" value="${esc(ex.rest || '')}" placeholder="Standard"></label><label><span>Eigener Hinweis</span><input data-prop="note" value="${esc(ex.note || '')}"></label></div></details></div><div class="row-actions"><button class="tiny" data-move="up" data-day="${di}" data-ex="${ei}" aria-label="Nach oben">↑</button><button class="tiny" data-move="down" data-day="${di}" data-ex="${ei}" aria-label="Nach unten">↓</button><button class="tiny danger" data-remove-exercise="${di}:${ei}" aria-label="Übung entfernen">×</button></div></article>`;

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
      const search =
        `${ex.name} ${ex.sourceName || ''} ${ex.category} ${ex.equipment || ''} ${ex.target || ''}`.toLowerCase();
      return `<article class="library-item" data-category="${esc(ex.category)}" data-search="${esc(search)}"><img src="${esc(ex.gif)}" alt="" loading="lazy" decoding="async"><div><h3>${esc(ex.name)}</h3><span>${esc(ex.category)} · ${esc(ex.equipment || '')} · ${esc(ex.sets)} × ${esc(ex.range)}</span></div><div class="library-actions"><button class="star ${favorite ? 'active' : ''}" data-library-favorite="${ex.id}" aria-label="Favorit" aria-pressed="${favorite}">★</button><button class="${added ? 'added' : ''}" data-pick-exercise="${ex.id}" ${added ? 'disabled' : ''} aria-label="${added ? 'Bereits im Plan' : 'Übung hinzufügen'}">${added ? '✓' : '＋'}</button></div></article>`;
    })
    .join('');
  return `<div class="library-backdrop"><section class="exercise-library" role="dialog" aria-modal="true" aria-label="Übung auswählen"><div class="library-head"><div><span class="eyebrow">${replacing ? 'Ersatz wählen' : esc(day?.name || 'Trainingstag')} · ${EXERCISE_LIBRARY.length} Übungen</span><h2>${replacing ? 'Übung ersetzen' : 'Übung auswählen'}</h2></div><button class="icon-btn" id="closeLibrary" aria-label="Schließen">${icon('close')}</button></div><label class="library-search"><span>${icon('search')}</span><input id="librarySearch" type="search" placeholder="Name, Muskel oder Gerät …" autocomplete="off" value="${esc(state.libraryQuery || '')}"></label><div class="category-chips">${CATEGORIES.map((c) => `<button class="${state.libraryCategory === c ? 'active' : ''}" data-library-category="${c}" aria-pressed="${state.libraryCategory === c}">${c}</button>`).join('')}</div><div class="library-list">${items}</div><button class="custom-exercise-button" id="addCustomExercise">＋ Eigene Übung ohne Animation</button><button class="primary full library-done" id="closeLibraryBottom">Fertig</button></section></div>`;
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
        `<label><span>${esc(day.name)}</span><select data-schedule-day="${day.id}">${WEEKDAYS.map((name, weekday) => `<option value="${weekday}" ${(schedule.assignments?.[day.id] ?? scheduleSlots(p.days.length)[i]) === weekday ? 'selected' : ''}>${name}</option>`).join('')}</select></label>`
    )
    .join('');
  return `<main class="shell simple-editor"><div class="backrow"><button class="back" data-nav="plans" aria-label="Zurück">←</button><span>Plan bearbeiten</span></div>
    <section class="simple-plan-head"><label><span>Name des Plans</span><input id="planName" value="${esc(p.name)}" maxlength="60"></label><p>Lege deine Trainingstage an und wähle anschließend Übungen aus der Bibliothek.</p><input id="planDescription" type="hidden" value="${esc(p.description || '')}"></section>
    <section class="schedule-editor"><div><span class="eyebrow">Wochenrhythmus</span><h2>Wann möchtest du trainieren?</h2></div><div class="schedule-mode"><label><input type="radio" name="planScheduleMode" value="flexible" ${schedule.mode !== 'fixed' ? 'checked' : ''}> Flexibel</label><label><input type="radio" name="planScheduleMode" value="fixed" ${schedule.mode === 'fixed' ? 'checked' : ''}> Feste Tage</label></div><div class="schedule-days" id="scheduleDays" ${schedule.mode === 'fixed' ? '' : 'hidden'}>${scheduleDays}</div></section>
    <div class="editor-day-tabs" role="tablist">${p.days.map((day, i) => `<button class="${i === di ? 'active' : ''}" data-editor-day="${i}" role="tab" aria-selected="${i === di}"><span>${i + 1}</span>${esc(day.name)}</button>`).join('')}</div>
    ${
      d
        ? `<div class="editor-days"><section class="editor-day" data-day-index="${di}"><div class="simple-day-head"><div><span class="day-number">Tag ${di + 1} von ${p.days.length}</span><input class="day-name" value="${esc(d.name)}" aria-label="Name des Trainingstags"><input class="day-subtitle" value="${esc(d.subtitle || '')}" placeholder="Optional: z. B. Rücken · Bizeps"></div><button class="icon-btn danger" data-remove-day="${di}" aria-label="Trainingstag löschen">${icon('close')}</button></div>
      <div class="editor-exercises">${d.exercises.length ? d.exercises.map((ex, ei) => exerciseRow(ex, di, ei)).join('') : empty('Noch keine Übungen', 'Wähle Übungen aus der Bibliothek aus.')}</div><button class="choose-exercise" data-add-exercise="${di}"><span>＋</span><div><b>Übung auswählen</b><small>Bibliothek durchsuchen</small></div><i>→</i></button></section></div>`
        : ''
    }
    <button class="add-day-card" id="addDay">＋ Neuer Trainingstag</button>
    <div class="editor-footer"><span>${plural(p.days.length, 'Trainingstag', 'Trainingstage')}</span><button class="primary" id="savePlan">Fertig</button></div></main>${state.libraryDayIndex !== null ? libraryDialog(p) : ''}`;
}

// Reads the editor form back into the plan and persists it.
function collectPlan() {
  const data = allPlans();
  const p = data.items.find((x) => x.id === state.editPlanId);
  p.name = document.querySelector('#planName').value.trim() || 'Mein Trainingsplan';
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
    d.name = el.querySelector('.day-name').value.trim() || `Tag ${di + 1}`;
    d.subtitle = el.querySelector('.day-subtitle').value.trim();
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
    libraryCategory: 'Alle',
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
        (state.libraryCategory !== 'Alle' && card.dataset.category !== state.libraryCategory) ||
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
  // Keyboard: Escape closes, Tab stays inside the dialog.
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
      p.days.splice(number(b.dataset.removeDay), 1);
      state.editorDayIndex = Math.max(0, Math.min(state.editorDayIndex, p.days.length - 1));
      persistPlan(p);
      render();
    };
  });
  document.querySelectorAll('[data-add-exercise]').forEach((b) => {
    b.onclick = () => openLibrary(number(b.dataset.addExercise), null);
  });
  document.querySelectorAll('[data-replace-exercise]').forEach((b) => {
    b.onclick = () => {
      const [di, ei] = b.dataset.replaceExercise.split(':').map(Number);
      openLibrary(di, ei);
    };
  });
  document.querySelectorAll('[data-remove-exercise]').forEach((b) => {
    b.onclick = () => {
      const [di, ei] = b.dataset.removeExercise.split(':').map(Number);
      const p = collectPlan();
      p.days[di].exercises.splice(ei, 1);
      persistPlan(p);
      render();
    };
  });
  document.querySelectorAll('[data-move]').forEach((b) => {
    b.onclick = () => {
      const p = collectPlan();
      const list = p.days[number(b.dataset.day)].exercises;
      const i = number(b.dataset.ex);
      const j = b.dataset.move === 'up' ? i - 1 : i + 1;
      if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      persistPlan(p);
      render();
    };
  });
  bindLibrary();
}
