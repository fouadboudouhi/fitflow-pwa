// Sheet with the form for a custom exercise: name, muscle group, equipment, exercise type, note.
import { t } from '../i18n.js';
import { EQUIPMENT_KEYS, GROUPS, equipmentLabel, groupLabel } from '../library.js';
import { TRACK_TYPES, trackTypeLabel } from '../sets.js';
import { sheet } from '../ui.js';
import { esc, uid } from '../util.js';

const option = (value, label, current) =>
  `<option value="${esc(value)}" ${current === value ? 'selected' : ''}>${esc(label)}</option>`;

// `onSave(record)` receives the complete record; the caller stores it.
export function openCustomForm({ initial = {}, onSave }) {
  const form = document.createElement('form');
  form.className = 'custom-form settings-form';
  form.id = 'customForm';
  form.innerHTML = `<label><span>${t('custom.name')}</span><input name="name" required maxlength="80" autocomplete="off" value="${esc(initial.name || '')}"></label>
    <label><span>${t('custom.group')}</span><select name="category">${[...GROUPS, 'other'].map((g) => option(g, groupLabel(g), initial.category || 'other')).join('')}</select></label>
    <label><span>${t('custom.equipment')}</span><select name="equipment">${EQUIPMENT_KEYS.map((k) => option(k, equipmentLabel(k), initial.equipment || 'other')).join('')}</select></label>
    <label><span>${t('custom.trackType')}</span><select name="trackType">${TRACK_TYPES.map((k) => option(k, trackTypeLabel(k), initial.trackType || 'weight_reps')).join('')}</select></label>
    <label><span>${t('custom.note')}</span><input name="note" maxlength="300" autocomplete="off" value="${esc(initial.note || '')}"></label>
    <button class="primary full" type="submit">${t('common.save')}</button>`;
  const close = sheet({ title: initial.id ? t('custom.editTitle') : t('custom.newTitle'), content: form });
  form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const name = String(f.get('name') || '').trim();
    if (!name) return;
    close();
    onSave({
      id: initial.id || uid(),
      name,
      category: f.get('category'),
      equipment: f.get('equipment'),
      trackType: f.get('trackType'),
      note: String(f.get('note') || '').trim(),
      createdAt: initial.createdAt || new Date().toISOString(),
    });
  };
  setTimeout(() => form.querySelector('[name="name"]').focus({ preventScroll: true }), 50);
  return close;
}
