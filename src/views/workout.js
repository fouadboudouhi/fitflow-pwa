import { fmtNumber, t } from '../i18n.js';
import { icon } from '../icons.js';
import { exerciseName } from '../library.js';
import { BARS, PLATES, defaultBar, isBarbell, platesPerSide } from '../plates.js';
import { navigate, render } from '../render.js';
import { SET_TYPES, describeSet, parseDuration, setSetType } from '../sets.js';
import { state } from '../state.js';
import { getDay, getSettings, saveRestUntil, saveSettings } from '../storage.js';
import { actionSheet, confirmDialog, sheet, toast, undoToast } from '../ui.js';
import { fmtWeight, fromDisplay, toDisplay, unit } from '../units.js';
import { esc, isWorkSet, number } from '../util.js';
import {
  activeSession,
  carryFromSet,
  entryComplete,
  entryTrackType,
  finishSession,
  isRecord,
  mutateSession,
  newSet,
  previousEntry,
  sessionStarted,
  suggestion,
  warmupSets,
  workSets,
} from '../workout.js';
import { openExerciseSheet } from './exercise.js';
import * as home from './home.js';
import { setHead, setRow } from './setRow.js';

const suggestionText = (s) =>
  s.kind === 'progress'
    ? t('workout.suggest', { weight: fmtWeight(s.weight) })
    : t('workout.suggestConfirm', { weight: fmtWeight(s.weight) });

function exerciseSection(ex, index, entry, total, showRir) {
  const complete = entryComplete(entry);
  const suggest = suggestion(ex);
  const prevWork = previousEntry(ex);
  const prevSets = prevWork ? workSets(prevWork) : [];
  const name = exerciseName(ex);
  const trackType = entryTrackType(entry);
  // Values from the last session appear as placeholders, so an empty field already tells what was done before.
  const rows = entry.sets
    .map((set, i) =>
      setRow({
        set,
        index: i,
        exerciseIndex: index,
        trackType,
        workNumber: entry.sets.slice(0, i).filter(isWorkSet).length + 1,
        last: prevSets[i],
        showRir,
      })
    )
    .join('');
  const thumb = ex.gif
    ? `<button type="button" class="exercise-thumb" data-technique="${index}" aria-label="${t('workout.technique')}"><img class="exercise-gif" src="${esc(ex.gif)}" alt="" loading="lazy" decoding="async"></button>`
    : '';
  return `<section class="workout-exercise ${complete ? 'complete' : ''}" id="exercise-${index}">
      <div class="workout-exercise-head"><span class="exercise-number">${complete ? '✓' : index + 1}</span><div><h2><button type="button" class="exercise-title" data-exercise-history="${index}" aria-label="${esc(t('workout.historyOf', { name }))}">${esc(name)}${icon('chevron-right')}</button></h2><p>${esc(ex.sets)} × ${esc(ex.range)}${ex.note && !ex.gif ? ` · ${esc(ex.note)}` : ''}</p></div>${thumb}</div>
      ${suggest.weight ? `<button type="button" class="suggest-row" data-apply-suggestion="${index}" data-weight="${suggest.weight}">${icon('trend')}<span>${esc(suggestionText(suggest))}</span><small>${t('workout.apply')}</small></button>` : ''}
      <div class="set-table ${showRir ? '' : 'no-rir'}">${setHead(trackType, showRir)}<div class="set-list">${rows}</div></div>
      <div class="exercise-tools"><button class="text-btn" data-add-set="${index}">${t('workout.addSet')}</button><button class="icon-btn quiet" data-exercise-menu="${index}" aria-label="${esc(t('exercise.more', { name }))}">${icon('more')}</button></div>
      ${entry.note || state.openNotes?.has(index) ? `<label class="exercise-note"><span>${t('workout.note')}</span><textarea data-exercise-note="${index}" placeholder="${t('workout.notePlaceholder')}">${esc(entry.note || '')}</textarea></label>` : ''}
    </section>`;
}

export function view() {
  const day = getDay(state.planId, state.dayId);
  if (!day?.exercises.length) {
    state.view = 'home';
    return home.view();
  }
  const session = activeSession(state.planId, state.dayId);
  const showRir = !!getSettings().showRir;
  const completed = session.entries.filter(entryComplete).length;
  const total = day.exercises.length;
  const list = day.exercises
    .map((ex, index) => exerciseSection(ex, index, session.entries[index], total, showRir))
    .join('');
  return `<main class="workout-shell" id="swipeArea"><div class="workout-top"><button class="back" id="exitWorkout" aria-label="${t('workout.exit')}">←</button><div><h1>${esc(day.name)}</h1><b>${t('workout.progress', { done: completed, total })}</b></div><div class="workout-top-actions"><button class="text-btn" id="finishWorkout">${t('workout.finish')}</button></div></div>
    <div class="progress-line" role="progressbar" aria-label="${t('workout.progressAria', { done: completed, total })}" aria-valuenow="${completed}" aria-valuemax="${total}"><i style="width:${(completed / total) * 100}%"></i></div>
    <div class="workout-exercise-list">${list}</div>
    <details class="session-status" id="session-status" ${Object.values(session.markers).some(Boolean) ? 'open' : ''}><summary>${t('workout.status')}</summary><div class="marker-row"><label><input type="checkbox" data-marker="deload" ${session.markers.deload ? 'checked' : ''}> ${t('marker.deload')}</label><label><input type="checkbox" data-marker="ill" ${session.markers.ill ? 'checked' : ''}> ${t('marker.ill')}</label><label><input type="checkbox" data-marker="pain" ${session.markers.pain ? 'checked' : ''}> ${t('marker.pain')}</label></div></details>
    <div class="rest-timer ${state.restUntil > Date.now() ? 'show' : ''}" id="restTimer" role="timer" aria-live="off"><div><span>${t('rest.title')}</span><b id="restCount">0:00</b></div><button data-rest-add>+30</button><button data-rest-skip>${t('rest.skip')}</button></div>
  </main>`;
}

const mutate = (fn, rerender = false) => {
  mutateSession(state.planId, state.dayId, fn);
  if (rerender) render();
};

function openPlates(ex, entry) {
  const u = unit();
  const start = toDisplay(number(entry.sets.find(isWorkSet)?.weight) || suggestion(ex).weight || 0) || '';
  const bar = toDisplay(getSettings().barWeight) || defaultBar();
  const box = document.createElement('div');
  box.className = 'plates';
  box.innerHTML = `<div class="plates-inputs"><label><span>${t('plates.weight', { unit: u })}</span><input type="number" inputmode="decimal" step="0.5" min="0" id="plateTarget" value="${esc(start)}"></label><label><span>${t('plates.bar', { unit: u })}</span><select id="plateBar">${BARS[u].map((b) => `<option value="${b}" ${b === bar ? 'selected' : ''}>${b}</option>`).join('')}${BARS[u].includes(bar) ? '' : `<option value="${bar}" selected>${bar}</option>`}</select></label></div><div class="plates-result" id="plateResult"></div><p class="muted">${t('plates.info', { plates: PLATES[u].join(', '), unit: u })}</p>`;
  const result = box.querySelector('#plateResult');
  const update = () => {
    const target = number(box.querySelector('#plateTarget').value);
    const barValue = number(box.querySelector('#plateBar').value);
    const { plates, remainder, perSide } = platesPerSide(target, barValue);
    result.textContent = '';
    if (!target) {
      result.textContent = t('plates.enterTarget');
      return;
    }
    if (target < barValue) {
      result.textContent = t('plates.belowBar');
      return;
    }
    const counts = new Map();
    plates.forEach((p) => counts.set(p, (counts.get(p) || 0) + 1));
    const row = document.createElement('div');
    row.className = 'plate-row';
    counts.forEach((count, plate) => {
      const chip = document.createElement('span');
      chip.className = 'plate';
      chip.textContent = `${count} × ${plate}`;
      row.append(chip);
    });
    if (!counts.size) {
      const none = document.createElement('span');
      none.className = 'muted';
      none.textContent = t('plates.barOnly');
      row.append(none);
    }
    const summary = document.createElement('b');
    summary.textContent = t('plates.perSide', { weight: fmtNumber(perSide), unit: u });
    result.append(summary, row);
    if (remainder) {
      const rest = document.createElement('small');
      rest.className = 'muted';
      rest.textContent = t('plates.remainder', { weight: fmtNumber(remainder), unit: u });
      result.append(rest);
    }
  };
  box.querySelector('#plateTarget').oninput = update;
  box.querySelector('#plateBar').onchange = update;
  update();
  sheet({ title: t('plates.title'), content: box });
  setTimeout(() => box.querySelector('#plateTarget').focus({ preventScroll: true }), 50);
}

export function bind() {
  document.querySelectorAll('[data-marker]').forEach((x) => {
    x.onchange = () =>
      mutate((s) => {
        s.markers[x.dataset.marker] = x.checked;
      });
  });
  document.querySelectorAll('[data-set-field]').forEach((x) => {
    x.oninput = () =>
      mutate((s) => {
        const set = s.entries[number(x.dataset.exercise)].sets[number(x.dataset.index)];
        const name = x.dataset.setField;
        set[name] =
          name === 'weight' ? fromDisplay(x.value) : name === 'time' ? parseDuration(x.value) : x.value;
      });
  });
  document.querySelectorAll('[data-set-done]').forEach((b) => {
    b.onclick = () => {
      const exerciseIndex = number(b.dataset.exercise);
      let record = null;
      let recordType = 'weight_reps';
      mutate((s) => {
        const entry = s.entries[exerciseIndex];
        const set = entry.sets[number(b.dataset.setDone)];
        set.done = !set.done;
        const ex = getDay(state.planId, state.dayId).exercises[exerciseIndex];
        set.pr = set.done && isRecord(ex, set, entry);
        if (!set.done) return;
        if (set.pr) {
          record = set;
          recordType = entryTrackType(entry);
        }
        const settings = getSettings();
        if (settings.restTimer) {
          state.restUntil = Date.now() + (number(ex.rest) || number(settings.rest) || 90) * 1000;
          saveRestUntil(state.restUntil);
          armRestNotification();
        }
        navigator.vibrate?.(40);
      }, true);
      if (record) toast(t('workout.record', { set: describeSet(record, recordType) }), { duration: 4000 });
    };
  });
  // The set number opens the type picker: working, warm-up, drop or failure set.
  document.querySelectorAll('[data-set-type]').forEach((b) => {
    b.onclick = () => {
      const exerciseIndex = number(b.dataset.exercise);
      const setIndex = number(b.dataset.setType);
      actionSheet(
        t('workout.setType'),
        SET_TYPES.map((type) => ({
          label: t(`setType.${type}`),
          onClick: () => mutate((s) => setSetType(s.entries[exerciseIndex].sets[setIndex], type), true),
        }))
      );
    };
  });
  document.querySelectorAll('[data-delete-set]').forEach((b) => {
    b.onclick = () => {
      const exerciseIndex = number(b.dataset.exercise);
      const setIndex = number(b.dataset.deleteSet);
      const sets = activeSession(state.planId, state.dayId).entries[exerciseIndex].sets;
      if (sets.length <= 1) {
        toast(t('workout.minOneSet'));
        return;
      }
      const removed = sets[setIndex];
      mutate((s) => s.entries[exerciseIndex].sets.splice(setIndex, 1), true);
      undoToast(t('workout.setDeleted'), () =>
        mutate((s) => s.entries[exerciseIndex].sets.splice(setIndex, 0, removed), true)
      );
    };
  });
  document.querySelectorAll('.set-row').forEach((row) => {
    let startX = 0;
    let startY = 0;
    row.onpointerdown = (e) => {
      startX = e.clientX;
      startY = e.clientY;
    };
    row.onpointerup = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
        document
          .querySelectorAll('.set-row.swiped')
          .forEach((x) => x !== row && x.classList.remove('swiped'));
        row.classList.toggle('swiped', dx < 0);
      }
    };
  });
  document.querySelectorAll('[data-exercise-note]').forEach((x) => {
    x.oninput = () =>
      mutate((s) => {
        s.entries[number(x.dataset.exerciseNote)].note = x.value;
      });
  });
  document.querySelectorAll('[data-add-set]').forEach((b) => {
    b.onclick = () =>
      mutate((s) => {
        const entry = s.entries[number(b.dataset.addSet)];
        const lastWork = [...entry.sets].reverse().find(isWorkSet);
        entry.sets.push(newSet(entryTrackType(entry), carryFromSet(lastWork)));
      }, true);
  });
  // Thumbnail and title both open the exercise sheet: animation, muscles, note and the last sessions.
  document.querySelectorAll('[data-technique], [data-exercise-history]').forEach((b) => {
    b.onclick = () => {
      const index = number(b.dataset.technique ?? b.dataset.exerciseHistory);
      openExerciseSheet(getDay(state.planId, state.dayId).exercises[index]);
    };
  });
  document.querySelectorAll('[data-exercise-menu]').forEach((b) => {
    b.onclick = () => {
      const index = number(b.dataset.exerciseMenu);
      const ex = getDay(state.planId, state.dayId).exercises[index];
      const entry = activeSession(state.planId, state.dayId).entries[index];
      const showRir = getSettings().showRir;
      const weighted = entryTrackType(entry) === 'weight_reps';
      actionSheet(exerciseName(ex), [
        weighted && {
          label: t('workout.calcWarmups'),
          onClick: () => {
            const target = number(entry.sets.find(isWorkSet)?.weight) || suggestion(ex).weight;
            if (!target) {
              toast(t('workout.enterWorkWeight'));
              return;
            }
            mutate((s) => {
              const e = s.entries[index];
              e.sets = [...warmupSets(target), ...e.sets.filter(isWorkSet)];
            }, true);
          },
        },
        weighted && {
          label: t('workout.addWarmup'),
          onClick: () =>
            mutate(
              (s) => s.entries[index].sets.unshift(newSet('weight_reps', { warmup: true, type: 'warmup' })),
              true
            ),
        },
        isBarbell(ex) && { label: t('plates.title'), onClick: () => openPlates(ex, entry) },
        {
          label: entry.note ? t('workout.editNote') : t('workout.addNote'),
          onClick: () => {
            (state.openNotes ||= new Set()).add(index);
            render();
            document.querySelector(`[data-exercise-note="${index}"]`)?.focus();
          },
        },
        {
          label: showRir ? t('workout.hideRir') : t('workout.showRir'),
          hint: t('workout.rirHint'),
          onClick: () => {
            const s = getSettings();
            s.showRir = !s.showRir;
            saveSettings(s);
            render();
          },
        },
      ]);
    };
  });
  document.querySelectorAll('[data-apply-suggestion]').forEach((b) => {
    b.onclick = () =>
      mutate(
        (s) =>
          s.entries[number(b.dataset.applySuggestion)].sets.filter(isWorkSet).forEach((x) => {
            x.weight = String(b.dataset.weight);
          }),
        true
      );
  });
  document.querySelector('#finishWorkout').onclick = async () => {
    const session = activeSession(state.planId, state.dayId);
    if (
      !sessionStarted(session) &&
      !(await confirmDialog({
        title: t('workout.noSetsTitle'),
        text: t('workout.noSetsText'),
        confirmLabel: t('common.save'),
      }))
    )
      return;
    const saved = finishSession(session);
    navigate('summary', { sessionId: saved.id }, { replace: true });
    toast(t('workout.saved'));
  };
  document.querySelector('#exitWorkout').onclick = () => navigate('home');
  document.querySelector('[data-rest-add]')?.addEventListener('click', () => {
    state.restUntil = Math.max(state.restUntil, Date.now()) + 30000;
    saveRestUntil(state.restUntil);
    armRestNotification();
    updateRest();
  });
  document.querySelector('[data-rest-skip]')?.addEventListener('click', () => {
    state.restUntil = 0;
    saveRestUntil(0);
    armRestNotification();
    document.querySelector('#restTimer')?.classList.remove('show');
  });
}

export function startRestTicker() {
  updateRest();
  state.restTimer = setInterval(updateRest, 1000);
}
function updateRest() {
  const box = document.querySelector('#restTimer');
  const count = document.querySelector('#restCount');
  if (!box || !count) return;
  const left = Math.max(0, Math.ceil((state.restUntil - Date.now()) / 1000));
  box.classList.toggle('show', left > 0);
  count.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  if (left === 0 && state.restUntil) {
    navigator.vibrate?.([100, 80, 100]);
    state.restUntil = 0;
    saveRestUntil(0);
  }
}

// Fires a system notification at the end of the rest when the app is in the background.
let notifyTimer = null;
function armRestNotification() {
  clearTimeout(notifyTimer);
  if (
    !state.restUntil ||
    !getSettings().restNotify ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  )
    return;
  notifyTimer = setTimeout(
    () => {
      if (document.visibilityState === 'visible') return;
      const options = {
        body: t('rest.notifyBody'),
        tag: 'volumora-rest',
        icon: 'assets/icons/icon-192.png',
      };
      const title = t('rest.notifyTitle');
      navigator.serviceWorker
        ?.getRegistration()
        .then((reg) => (reg ? reg.showNotification(title, options) : new Notification(title, options)))
        .catch(() => {});
    },
    Math.max(0, state.restUntil - Date.now())
  );
}
