// Aggregations over sessions for summaries and analytics.
import { groupOf } from './library.js';
import { isWorkSet } from './util.js';

// Completed working sets per muscle group of one session, largest first: [{ group, sets }].
export function setsByGroup(session) {
  const totals = new Map();
  for (const entry of session.entries || []) {
    const sets = entry.sets.filter((s) => s.done && isWorkSet(s)).length;
    if (!sets) continue;
    const group = groupOf(entry);
    totals.set(group, (totals.get(group) || 0) + sets);
  }
  return [...totals].map(([group, sets]) => ({ group, sets })).sort((a, b) => b.sets - a.sets);
}
