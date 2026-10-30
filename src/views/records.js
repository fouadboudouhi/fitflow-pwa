// All-time bests per exercise, grouped by muscle group.
import { t } from '../i18n.js';
import { GROUPS, exerciseName, groupLabel, groupOf } from '../library.js';
import { KINDS, allRecords, headlineKind } from '../records.js';
import { describeSet } from '../sets.js';
import { fmtWeight } from '../units.js';
import { esc, fmtDate } from '../util.js';
import { openExerciseSheet } from './exercise.js';
import { backRow, empty } from './shell.js';

// "1RM ≈ 72 kg", "Max. Gewicht 60 kg", "Max. Wdh. 12" …
export const recordLine = (record, kind) => {
  const r = record[kind];
  if (!r) return '';
  const value =
    kind === 'e1rm' || kind === 'maxWeight'
      ? fmtWeight(r.value, kind === 'e1rm' ? 0 : 1)
      : kind === 'maxVolume'
        ? fmtWeight(r.value, 0)
        : describeSet(r.set, record.trackType);
  return `${t(`records.kind.${kind}`)} ${value}`;
};

export function view() {
  const records = Object.values(allRecords());
  const byGroup = new Map();
  records.forEach((r) => {
    const group = groupOf(r.item);
    byGroup.set(group, [...(byGroup.get(group) || []), r]);
  });
  const order = [...GROUPS, 'other'].filter((g) => byGroup.has(g));
  const sections = order
    .map((group) => {
      const rows = byGroup
        .get(group)
        .sort((a, b) => exerciseName(a.item).localeCompare(exerciseName(b.item)))
        .map((r) => {
          const kind = headlineKind(r.trackType);
          const extra = (KINDS[r.trackType] || [])
            .slice(1)
            .map((k) => recordLine(r, k))
            .filter(Boolean);
          return `<button type="button" class="row" data-record="${esc(r.key)}"><span class="row-main"><b>${esc(exerciseName(r.item))}</b><small>${esc([recordLine(r, kind), ...extra].join(' · '))}</small></span><span class="row-value"><small>${fmtDate(r[kind]?.day)}</small></span></button>`;
        })
        .join('');
      return `<section class="list-section"><h2>${esc(groupLabel(group))}</h2><div class="list">${rows}</div></section>`;
    })
    .join('');
  return `<main class="shell">${backRow(t('records.title'), 'analytics')}<section class="page-head compact"><h1>${t('records.title')}</h1></section>${sections || empty(t('records.empty'), t('records.emptyText'))}</main>`;
}

export function bind() {
  document.querySelectorAll('[data-record]').forEach((b) => {
    b.onclick = () => openExerciseSheet(allRecords()[b.dataset.record]?.item);
  });
}
