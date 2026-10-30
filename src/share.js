// Sharing a finished workout as plain text: the system share sheet where it exists, the clipboard otherwise.
import { plural, t } from './i18n.js';
import { exerciseName } from './library.js';
import { describeSet } from './sets.js';
import { toast } from './ui.js';
import { fmtVolume } from './units.js';
import { fmtLong, number } from './util.js';

export function summaryText(session, records = []) {
  const lines = [
    `Volumora · ${session.dayName} · ${fmtLong(session.day || session.finishedAt)}`,
    `${plural(session.entries?.length || 0, 'exercises')} · ${plural(number(session.totalSets), 'sets')} · ${fmtVolume(session.volume || 0)} · ${t('session.minutes', { n: Math.round(number(session.duration) / 60) })}`,
  ];
  const headline = records.filter((r) => r.headline);
  if (headline.length)
    lines.push(
      `${t('summary.newRecords')}: ${headline
        .map((r) => `${exerciseName(r.item)} ${describeSet(r.set, r.trackType)}`)
        .join(', ')}`
    );
  return lines.join('\n');
}

export async function shareText(text) {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return true;
    }
    await navigator.clipboard.writeText(text);
    toast(t('share.copied'));
    return true;
  } catch (err) {
    if (err?.name !== 'AbortError') toast(t('share.failed'));
    return false;
  }
}
