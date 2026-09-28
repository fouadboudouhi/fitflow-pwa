import { icon } from '../icons.js';
import { BARS, PLATES, defaultBar, isBarbell, platesPerSide } from '../plates.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { allPlans, getDay, getSettings, savePlans, saveRestUntil, saveSettings } from '../storage.js';
import { confirmDialog, sheet, toast, undoToast } from '../ui.js';
import { fieldValue, fmtWeight, fromDisplay, toDisplay, unit } from '../units.js';
import { esc, exerciseKey, fmtLong, number } from '../util.js';
import {
  activeSession,
  entryComplete,
  exerciseHistory,
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
import * as home from './home.js';

const field = (name, label, set, i, exerciseIndex, workNumber, attrs, value) =>
  `<label><span>${label}</span><input aria-label="${label} Satz ${workNumber}" type="number" ${attrs} data-set-field="${name}" data-exercise="${exerciseIndex}" data-index="${i}" value="${esc(value)}"></label>`;

function setRow(set, i, last, workIndex, showRir, exerciseIndex) {
  const workNumber = set.warmup ? 'W' : workIndex;
  const u = unit();
  return `<div class="set-row"><button class="set-delete" data-delete-set="${i}" data-exercise="${exerciseIndex}" aria-label="Satz löschen">Löschen</button><div class="set-card ${set.done ? 'complete' : ''} ${set.warmup ? 'warmup' : ''}" data-set="${i}"><div class="set-label"><b>${workNumber}</b><span class="${set.pr ? 'pr' : ''}">${set.warmup ? 'Warm-up' : set.pr ? 'PR' : ''}</span></div>${field('weight', u, set, i, exerciseIndex, workNumber, 'inputmode="decimal" step="0.5" min="0"', fieldValue(set.weight))}${field('reps', 'Wdh.', set, i, exerciseIndex, workNumber, 'inputmode="numeric" min="0"', set.reps)}${
    showRir
      ? field(
          'rir',
          'RIR',
          set,
          i,
          exerciseIndex,
          workNumber,
          'inputmode="numeric" min="0" max="10"',
          set.rir
        )
      : ''
  }<button class="set-check" data-set-done="${i}" data-exercise="${exerciseIndex}" aria-label="Satz fertig" aria-pressed="${set.done}">${set.done ? '✓' : ''}</button>${
    last
      ? `<small>Zuletzt ${last.weight ? fmtWeight(last.weight) : '–'} × ${esc(last.reps || '–')}</small>`
      : ''
  }</div></div>`;
}

const suggestionText = (s) =>
  s.kind === 'progress'
    ? `${fmtWeight(s.weight)} versuchen`
    : s.kind === 'confirm'
      ? `${fmtWeight(s.weight)} bestätigen, Wiederholungen steigern`
      : 'Konservativ starten, 2–3 Wiederholungen im Tank lassen';

function exerciseSection(ex, index, entry, total, showRir) {
  const complete = entryComplete(entry);
  const suggest = suggestion(ex);
  const prevWork = previousEntry(ex);
  const prevSets = prevWork ? workSets(prevWork) : [];
  const rows = entry.sets
    .map((set, i) =>
      setRow(set, i, prevSets[i], entry.sets.slice(0, i).filter((s) => !s.warmup).length + 1, showRir, index)
    )
    .join('');
  return `<section class="workout-exercise ${complete ? 'complete' : ''}" id="exercise-${index}">
      <div class="workout-exercise-head"><span class="exercise-number">${complete ? '✓' : index + 1}</span><div><h2><button type="button" class="exercise-title" data-exercise-history="${index}" aria-label="Verlauf von ${esc(ex.name)} anzeigen">${esc(ex.name)}${icon('chevron-right')}</button></h2><p>${esc(ex.sets)} × ${esc(ex.range)} Wdh.</p></div></div>
      ${ex.gif ? `<details class="technique compact-technique" id="technique-${index}"><summary><img class="exercise-gif" src="${esc(ex.gif)}" alt="" loading="lazy" decoding="async"><span><b>Technik</b><small>${esc(ex.note || 'Bewegungsablauf ansehen')}</small></span><i>⌄</i></summary><div class="exercise-media"><img class="exercise-gif" src="${esc(ex.gif)}" alt="Ausführung ${esc(ex.name)}" loading="lazy" decoding="async"></div></details>` : ex.note ? `<p class="coach-note">${esc(ex.note)}</p>` : ''}
      ${suggest.weight !== null ? `<div class="progression-row"><span>${icon('trend')}</span><b>${esc(suggestionText(suggest))}</b><button class="tiny" data-apply-suggestion="${index}" data-weight="${suggest.weight}">Nutzen</button></div>` : ''}
      <div class="set-table ${showRir ? '' : 'no-rir'}"><div class="set-head"><span>Satz</span><span>${unit()}</span><span>Wdh.</span>${showRir ? '<span>RIR</span>' : ''}<span></span></div><div class="set-list">${rows}</div></div>
      <div class="exercise-tools"><button class="text-btn" data-add-warmup="${index}">+ Aufwärmsatz</button><button class="text-btn" data-auto-warmup="${index}">Aufwärmen berechnen</button>${isBarbell(ex) ? `<button class="text-btn" data-plates="${index}">Scheiben</button>` : ''}</div>
      <details class="exercise-notes" id="notes-${index}" ${entry.note ? 'open' : ''}><summary>${entry.note ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}</summary><textarea data-exercise-note="${index}" placeholder="Technik, Geräteeinstellung, Gefühl …">${esc(entry.note || '')}</textarea></details>
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
  const list = day.exercises
    .map((ex, index) => exerciseSection(ex, index, session.entries[index], day.exercises.length, showRir))
    .join('');
  return `<main class="workout-shell" id="swipeArea"><div class="workout-top"><button class="back" id="exitWorkout" aria-label="Training verlassen">←</button><div><h1>${esc(day.name)}</h1><b>${completed} / ${day.exercises.length} Übungen</b></div><div class="workout-top-actions"><button class="text-btn" id="finishWorkout">Beenden</button></div></div>
    <div class="progress-line" role="progressbar" aria-label="Fortschritt: ${completed} von ${day.exercises.length} Übungen" aria-valuenow="${completed}" aria-valuemax="${day.exercises.length}"><i style="width:${(completed / day.exercises.length) * 100}%"></i></div>
    <div class="workout-options"><details class="session-status" id="session-status"><summary>Tagesform <span>optional</span></summary><div class="marker-row"><label><input type="checkbox" data-marker="deload" ${session.markers.deload ? 'checked' : ''}> Deload</label><label><input type="checkbox" data-marker="ill" ${session.markers.ill ? 'checked' : ''}> Krank</label><label><input type="checkbox" data-marker="pain" ${session.markers.pain ? 'checked' : ''}> Schmerzen</label></div></details><button class="optional-field" id="toggleRir">${showRir ? 'RIR ausblenden' : 'RIR einblenden'}</button></div>
    <div class="workout-exercise-list">${list}</div>
    <div class="rest-timer ${state.restUntil > Date.now() ? 'show' : ''}" id="restTimer" role="timer" aria-live="off"><div><span>Pause</span><b id="restCount">0:00</b></div><button data-rest-add>+30</button><button data-rest-skip>Überspringen</button></div>
  </main>`;
}

const mutate = (fn, rerender = false) => {
  mutateSession(state.planId, state.dayId, fn);
  if (rerender) render();
};

function openPlates(ex, entry) {
  const u = unit();
  const start =
    toDisplay(number(entry.sets.find((x) => !x.warmup)?.weight) || suggestion(ex).weight || 0) || '';
  const bar = toDisplay(getSettings().barWeight) || defaultBar();
  const box = document.createElement('div');
  box.className = 'plates';
  box.innerHTML = `<div class="plates-inputs"><label><span>Gewicht (${u})</span><input type="number" inputmode="decimal" step="0.5" min="0" id="plateTarget" value="${esc(start)}"></label><label><span>Stange (${u})</span><select id="plateBar">${BARS[u].map((b) => `<option value="${b}" ${b === bar ? 'selected' : ''}>${b}</option>`).join('')}${BARS[u].includes(bar) ? '' : `<option value="${bar}" selected>${bar}</option>`}</select></label></div><div class="plates-result" id="plateResult"></div><p class="muted">Pro Seite, größte Scheibe zuerst. Verfügbar: ${PLATES[u].join(', ')} ${u}.</p>`;
  const result = box.querySelector('#plateResult');
  const update = () => {
    const target = number(box.querySelector('#plateTarget').value);
    const barValue = number(box.querySelector('#plateBar').value);
    const { plates, remainder, perSide } = platesPerSide(target, barValue);
    result.textContent = '';
    if (!target) {
      result.textContent = 'Zielgewicht eintragen.';
      return;
    }
    if (target < barValue) {
      result.textContent = 'Das Ziel liegt unter dem Stangengewicht.';
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
      none.textContent = 'Nur die Stange.';
      row.append(none);
    }
    const summary = document.createElement('b');
    summary.textContent = `${perSide.toLocaleString('de-DE')} ${u} pro Seite`;
    result.append(summary, row);
    if (remainder) {
      const rest = document.createElement('small');
      rest.className = 'muted';
      rest.textContent = `${remainder.toLocaleString('de-DE')} ${u} pro Seite bleiben übrig.`;
      result.append(rest);
    }
  };
  box.querySelector('#plateTarget').oninput = update;
  box.querySelector('#plateBar').onchange = update;
  update();
  sheet({ title: 'Scheibenrechner', content: box });
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
        set[x.dataset.setField] = x.dataset.setField === 'weight' ? fromDisplay(x.value) : x.value;
      });
  });
  document.querySelectorAll('[data-set-done]').forEach((b) => {
    b.onclick = () => {
      const exerciseIndex = number(b.dataset.exercise);
      let record = null;
      mutate((s) => {
        const entry = s.entries[exerciseIndex];
        const set = entry.sets[number(b.dataset.setDone)];
        set.done = !set.done;
        const ex = getDay(state.planId, state.dayId).exercises[exerciseIndex];
        set.pr = set.done && isRecord(ex, set, entry);
        if (!set.done) return;
        if (set.pr) record = set;
        const settings = getSettings();
        if (settings.restTimer) {
          state.restUntil = Date.now() + (number(ex.rest) || number(settings.rest) || 90) * 1000;
          saveRestUntil(state.restUntil);
          armRestNotification();
        }
        navigator.vibrate?.(40);
      }, true);
      if (record)
        toast(`Neuer Bestwert: ${fmtWeight(record.weight)} × ${esc(record.reps)}`, { duration: 4000 });
    };
  });
  document.querySelectorAll('[data-delete-set]').forEach((b) => {
    b.onclick = () => {
      const exerciseIndex = number(b.dataset.exercise);
      const setIndex = number(b.dataset.deleteSet);
      const sets = activeSession(state.planId, state.dayId).entries[exerciseIndex].sets;
      if (sets.length <= 1) {
        toast('Mindestens ein Satz bleibt bestehen.');
        return;
      }
      const removed = sets[setIndex];
      mutate((s) => s.entries[exerciseIndex].sets.splice(setIndex, 1), true);
      undoToast('Satz gelöscht', () =>
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
  document.querySelectorAll('[data-add-warmup]').forEach((b) => {
    b.onclick = () =>
      mutate((s) => s.entries[number(b.dataset.addWarmup)].sets.unshift(newSet({ warmup: true })), true);
  });
  document.querySelectorAll('[data-auto-warmup]').forEach((b) => {
    b.onclick = () => {
      const exerciseIndex = number(b.dataset.autoWarmup);
      const ex = getDay(state.planId, state.dayId).exercises[exerciseIndex];
      const entry = activeSession(state.planId, state.dayId).entries[exerciseIndex];
      const target = number(entry.sets.find((x) => !x.warmup)?.weight) || suggestion(ex).weight;
      if (!target) {
        toast('Trage zuerst dein geplantes Arbeitsgewicht ein.');
        return;
      }
      mutate((s) => {
        const e = s.entries[exerciseIndex];
        e.sets = [...warmupSets(target), ...e.sets.filter((x) => !x.warmup)];
      }, true);
    };
  });
  document.querySelectorAll('[data-plates]').forEach((b) => {
    b.onclick = () => {
      const index = number(b.dataset.plates);
      openPlates(
        getDay(state.planId, state.dayId).exercises[index],
        activeSession(state.planId, state.dayId).entries[index]
      );
    };
  });
  document.querySelector('#toggleRir')?.addEventListener('click', () => {
    const s = getSettings();
    s.showRir = !s.showRir;
    saveSettings(s);
    render();
  });
  document.querySelectorAll('[data-apply-suggestion]').forEach((b) => {
    b.onclick = () =>
      mutate(
        (s) =>
          s.entries[number(b.dataset.applySuggestion)].sets
            .filter((x) => !x.warmup)
            .forEach((x) => {
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
        title: 'Noch kein Satz erledigt',
        text: 'Das Training trotzdem speichern?',
        confirmLabel: 'Speichern',
      }))
    )
      return;
    finishSession(session);
    navigate('analytics');
    toast('Training gespeichert');
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
  document.querySelectorAll('[data-exercise-history]').forEach((b) => {
    b.onclick = () => {
      const ex = getDay(state.planId, state.dayId).exercises[number(b.dataset.exerciseHistory)];
      const rows = exerciseHistory(exerciseKey(ex), 6);
      const content = rows.length
        ? `<div class="history-rows">${rows
            .map(
              (r) =>
                `<div class="history-row"><span>${fmtLong(r.day)}</span><b>${r.sets.map((s) => `${esc(toDisplay(s.weight))}×${esc(s.reps)}${s.pr ? '<i class="pr-chip">PR</i>' : ''}`).join(' · ')}</b><small>1RM ≈ ${fmtWeight(r.best, 0)}</small></div>`
            )
            .join('')}</div>`
        : '<p class="muted">Noch keine abgeschlossenen Sätze für diese Übung.</p>';
      sheet({ title: ex.name, content });
    };
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
        body: 'Weiter geht’s mit dem nächsten Satz.',
        tag: 'volumora-rest',
        icon: 'assets/icons/icon-192.png',
      };
      navigator.serviceWorker
        ?.getRegistration()
        .then((reg) =>
          reg ? reg.showNotification('Pause vorbei', options) : new Notification('Pause vorbei', options)
        )
        .catch(() => {});
    },
    Math.max(0, state.restUntil - Date.now())
  );
}
