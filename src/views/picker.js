// Exercise picker. Lives on document.body so it survives render(); search with accent folding, group and
// equipment filters, favourites and recents, and the custom-exercise entry. The hooks (#librarySearch,
// .library-item, [data-pick-exercise], #closeLibraryBottom …) are part of the test contract.
import { plural, t } from '../i18n.js';
import { icon } from '../icons.js';
import {
  EQUIPMENT_KEYS,
  GROUPS,
  allExercises,
  customRecord,
  equipmentLabel,
  exerciseName,
  groupLabel,
  libraryOf,
  muscleLabel,
} from '../library.js';
import { popOverlay, pushOverlay } from '../router.js';
import { getPrefs, saveCustomExercise, savePrefs } from '../storage.js';
import { esc, fold } from '../util.js';
import { openCustomForm } from './customForm.js';
import { openExerciseSheet } from './exercise.js';

const EQUIPMENT = EQUIPMENT_KEYS;
const searchText = (ex, name) =>
  fold(
    `${name} ${ex.sourceName || ''} ${groupLabel(ex.group)} ${equipmentLabel(ex.equipment)} ${muscleLabel(ex.target)} ${ex.equipment || ''} ${ex.target || ''}`
  );

// `isAdded(id)` marks exercises that are already in the target; `onPick(exercise)` adds one (the picker stays open
// unless `closeOnPick`). A custom exercise created from the picker is stored and then picked the same way.
// `suggested` are shown first under their own heading until the person searches or filters.
// Returns the close function.
export function openPicker({
  title = t('picker.title'),
  subtitle = '',
  isAdded = () => false,
  addedLabel = t('picker.added'),
  onPick,
  closeOnPick = false,
  suggested = [],
}) {
  let query = '';
  let group = 'all';
  let equipment = 'all';
  const previous = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'library-backdrop';
  const equipmentOptions = EQUIPMENT.map((key) => [key, equipmentLabel(key)])
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`)
    .join('');
  backdrop.innerHTML = `<section class="exercise-library" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="library-head"><div><h2>${esc(title)}</h2><p class="muted">${subtitle ? `${esc(subtitle)} · ` : ''}<span id="libraryCount">${plural(allExercises().length, 'exercises')}</span></p></div><button type="button" class="icon-btn" id="closeLibrary" aria-label="${t('common.close')}">${icon('close')}</button></div><label class="library-search"><span>${icon('search')}</span><input id="librarySearch" type="search" placeholder="${t('picker.search')}" autocomplete="off"></label><div class="category-chips">${['all', ...GROUPS].map((g) => `<button type="button" class="${g === 'all' ? 'active' : ''}" data-library-category="${g}" aria-pressed="${g === 'all'}">${esc(groupLabel(g))}</button>`).join('')}</div><label class="library-filter"><span>${t('picker.equipment')}</span><select id="libraryEquipment"><option value="all">${t('picker.allEquipment')}</option>${equipmentOptions}</select></label><div class="library-list"></div><p class="muted library-empty" hidden>${t('picker.noResults')}</p><button type="button" class="custom-exercise-button" id="addCustomExercise">${t('picker.custom')}</button><button type="button" class="primary full library-done" id="closeLibraryBottom">${t('common.done')}</button></section>`;
  const dialog = backdrop.querySelector('.exercise-library');
  const list = backdrop.querySelector('.library-list');
  const empty = backdrop.querySelector('.library-empty');

  const applyFilter = () => {
    const tokens = fold(query).split(/\s+/).filter(Boolean);
    const suggestions = list.querySelector('.library-suggested');
    if (suggestions) suggestions.hidden = !!tokens.length || group !== 'all' || equipment !== 'all';
    list.querySelectorAll(':scope > .library-item').forEach((card) => {
      card.hidden =
        (group !== 'all' && card.dataset.group !== group) ||
        (equipment !== 'all' && card.dataset.equipment !== equipment) ||
        !tokens.every((token) => card.dataset.search.includes(token));
    });
    const matching = list.querySelectorAll(':scope > .library-item:not([hidden])').length;
    empty.hidden = !matching;
    const count = backdrop.querySelector('#libraryCount');
    if (count) count.textContent = plural(matching, 'exercises');
  };

  const pick = (source) => {
    if (!source) return;
    const current = getPrefs();
    current.recent = [source.id, ...current.recent.filter((x) => x !== source.id)].slice(0, 12);
    savePrefs(current);
    onPick?.(source);
    if (closeOnPick) close();
    else renderList();
  };

  const renderList = () => {
    const prefs = getPrefs();
    const rank = (id) => (prefs.recent.indexOf(id) < 0 ? 99 : prefs.recent.indexOf(id));
    const sorted = allExercises().sort(
      (a, b) => prefs.favorites.includes(b.id) - prefs.favorites.includes(a.id) || rank(a.id) - rank(b.id)
    );
    const card = (ex) => {
      const added = isAdded(ex.id);
      const favorite = prefs.favorites.includes(ex.id);
      const name = exerciseName(ex);
      const meta = [groupLabel(ex.group), equipmentLabel(ex.equipment), ex.custom ? t('custom.tag') : '']
        .filter(Boolean)
        .join(' · ');
      const media = ex.gif
        ? `<img class="exercise-gif" src="${esc(ex.gif)}" alt="" loading="lazy" decoding="async">`
        : `<div class="custom-exercise-icon">${icon('dumbbell')}</div>`;
      return `<article class="library-item" data-group="${esc(ex.group)}" data-equipment="${esc(ex.equipment || '')}" data-search="${esc(searchText(ex, name))}" ${ex.custom ? 'data-custom' : ''}><button type="button" class="library-info" data-library-info="${esc(ex.id)}" aria-label="${esc(t('picker.details', { name }))}">${media}<div><h3>${esc(name)}</h3><span>${esc(meta)}</span></div></button><div class="library-actions"><button type="button" class="star ${favorite ? 'active' : ''}" data-library-favorite="${esc(ex.id)}" aria-label="${t('picker.favorite')}" aria-pressed="${favorite}">${icon('star')}</button><button type="button" class="${added ? 'added' : ''}" data-pick-exercise="${esc(ex.id)}" ${added ? 'disabled' : ''} aria-label="${added ? addedLabel : t('picker.add')}">${added ? icon('check') : icon('plus')}</button></div></article>`;
    };
    const shown = suggested.filter((ex) => !isAdded(ex.id));
    const head = shown.length
      ? `<section class="library-suggested"><h3>${t('picker.suggested')}</h3>${shown.map(card).join('')}</section>`
      : '';
    list.innerHTML = head + sorted.map(card).join('');
    applyFilter();
    list.querySelectorAll('[data-library-favorite]').forEach((b) => {
      b.onclick = () => {
        const current = getPrefs();
        const id = b.dataset.libraryFavorite;
        current.favorites = current.favorites.includes(id)
          ? current.favorites.filter((x) => x !== id)
          : [id, ...current.favorites];
        savePrefs(current);
        renderList();
      };
    });
    list.querySelectorAll('[data-pick-exercise]').forEach((b) => {
      b.onclick = () => pick(libraryOf({ id: b.dataset.pickExercise }));
    });
    list.querySelectorAll('[data-library-info]').forEach((b) => {
      b.onclick = () => openExerciseSheet(libraryOf({ id: b.dataset.libraryInfo }));
    });
  };

  const focusable = () =>
    [...dialog.querySelectorAll('button:not([disabled]),input,select,textarea,a[href]')].filter(
      (el) => !el.closest('[hidden]')
    );
  const onKey = (e) => {
    // A sheet opened from the picker handles its own keys.
    if (document.querySelector('.sheet-backdrop')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
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
  let entry = null;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    popOverlay(entry);
    previous?.focus?.({ preventScroll: true });
  };
  entry = pushOverlay(close);

  backdrop.querySelector('#librarySearch').addEventListener('input', (e) => {
    query = e.target.value;
    applyFilter();
  });
  backdrop.querySelectorAll('[data-library-category]').forEach((b) => {
    b.onclick = () => {
      group = b.dataset.libraryCategory;
      backdrop.querySelectorAll('[data-library-category]').forEach((x) => {
        const active = x === b;
        x.classList.toggle('active', active);
        x.setAttribute('aria-pressed', String(active));
      });
      applyFilter();
    };
  });
  backdrop.querySelector('#libraryEquipment').addEventListener('change', (e) => {
    equipment = e.target.value;
    applyFilter();
  });
  backdrop.querySelector('#closeLibrary').onclick = close;
  backdrop.querySelector('#closeLibraryBottom').onclick = close;
  backdrop.querySelector('#addCustomExercise').onclick = () =>
    openCustomForm({
      onSave: (record) => {
        saveCustomExercise(record);
        pick(customRecord(record));
      },
    });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey, true);
  document.body.append(backdrop);
  renderList();
  backdrop.querySelector('#librarySearch').focus({ preventScroll: true });
  return close;
}
