// Connecting the optional server copy: a sheet with address and code, shared by the backup screen and the first start.
import { t } from '../i18n.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import {
  SyncError,
  cleanSyncUrl,
  disconnectSync,
  fetchSnapshot,
  newSyncCode,
  restoreSnapshot,
  syncConfig,
  uploadNow,
} from '../sync.js';
import { confirmDialog, sheet, toast } from '../ui.js';
import { esc, fmtLong } from '../util.js';

const errorText = (err) => t(`sync.error.${err instanceof SyncError ? err.code : 'server'}`);

async function showCode(code) {
  await new Promise((resolve) => {
    const box = document.createElement('div');
    box.innerHTML = `<p>${t('sync.codeSave')}</p><p class="sync-code" id="syncCode">${esc(code)}</p><button type="button" class="secondary full" id="syncCopy">${t('sync.copy')}</button>`;
    box.querySelector('#syncCopy').addEventListener('click', async () => {
      await navigator.clipboard?.writeText(code).catch(() => {});
      toast(t('sync.copied'));
    });
    sheet({ title: t('sync.codeTitle'), content: box, closeLabel: t('sync.codeSaved'), onClose: resolve });
  });
}

// Afterwards this device and the server hold the same data. Data already on the server is never replaced from here.
async function connect(url, typed, done) {
  const code = typed || newSyncCode();
  const config = { url, code };
  const found = await fetchSnapshot(config);
  if (found) {
    const ok = await confirmDialog({
      title: t('sync.foundTitle'),
      text: t('sync.foundText', { date: fmtLong(found.data?.savedAt || new Date()) }),
      confirmLabel: t('sync.foundLoad'),
    });
    if (!ok) return;
    await restoreSnapshot(config, found);
    done();
    toast(t('sync.restored'));
    return;
  }
  await uploadNow(config, { force: true });
  done();
  if (!typed) await showCode(code);
  toast(t('sync.connected'));
}

export function openSyncForm({ onDone = () => render() } = {}) {
  const box = document.createElement('form');
  box.className = 'settings-form sync-form';
  box.noValidate = true;
  box.innerHTML = `<p class="muted">${t('sync.intro')}</p><label><span>${t('sync.url')}</span><input id="syncUrl" type="url" inputmode="url" autocomplete="url" autocapitalize="off" spellcheck="false" placeholder="https://…"></label><label><span>${t('sync.code')}</span><input id="syncCodeInput" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" placeholder="${t('sync.codeEmpty')}"></label><p class="ai-error" role="alert" id="syncError" hidden></p><button class="primary full" type="submit" id="syncConnect">${t('sync.connect')}</button>`;
  const close = sheet({ title: t('sync.title'), content: box });
  box.addEventListener('submit', async (e) => {
    e.preventDefault();
    const line = box.querySelector('#syncError');
    const button = box.querySelector('#syncConnect');
    const url = cleanSyncUrl(box.querySelector('#syncUrl').value);
    line.hidden = true;
    if (!url) {
      line.textContent = t('sync.error.url');
      line.hidden = false;
      return;
    }
    button.disabled = true;
    try {
      await connect(url, box.querySelector('#syncCodeInput').value.trim(), () => {
        close?.();
        onDone();
      });
    } catch (err) {
      line.textContent = errorText(err);
      line.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
}

export function syncSection() {
  const config = syncConfig();
  if (!config)
    return `<section class="list-section"><h2>${t('sync.title')}</h2><p class="muted settings-hint">${t('sync.hint')}</p><button type="button" class="secondary full" id="syncOpen">${t('sync.open')}</button></section>`;
  const status = config.problem
    ? `<p class="ai-error" role="alert">${t(`sync.error.${config.problem}`)}</p>`
    : `<p class="muted settings-hint">${config.at ? t('sync.lastDone', { date: new Date(config.at).toLocaleString() }) : ''}</p>`;
  const conflict = config.problem === 'newer';
  return `<section class="list-section sync-on"><h2>${t('sync.title')}</h2><p class="settings-hint">${t('sync.on', { host: esc(new URL(config.url).host) })}</p>${status}<div class="sync-actions">${conflict ? `<button type="button" class="secondary full" id="syncLoad">${t('sync.load')}</button><button type="button" class="secondary full" id="syncKeep">${t('sync.keepThis')}</button>` : `<button type="button" class="secondary full" id="syncNow">${t('sync.now')}</button><button type="button" class="secondary full" id="syncLoad">${t('sync.load')}</button>`}<button type="button" class="secondary full" id="syncShowCode">${t('sync.showCode')}</button><button type="button" class="text-btn" id="syncOff">${t('sync.off')}</button></div></section>`;
}

export function bindSync() {
  document.querySelector('#syncOpen')?.addEventListener('click', () => openSyncForm());
  const guarded = (selector, run) =>
    document.querySelector(selector)?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        await run();
      } catch (err) {
        toast(errorText(err));
      }
      render();
    });
  guarded('#syncNow', async () => {
    await uploadNow(syncConfig(), { force: true });
    toast(t('sync.saved'));
  });
  guarded('#syncKeep', async () => {
    const config = syncConfig();
    const found = await fetchSnapshot(config);
    await uploadNow({ ...config, version: found?.version }, { force: true });
    toast(t('sync.saved'));
  });
  guarded('#syncLoad', async () => {
    const config = syncConfig();
    const found = await fetchSnapshot(config);
    if (!found) return toast(t('sync.nothing'));
    const ok = await confirmDialog({
      title: t('sync.foundTitle'),
      text: t('sync.foundText', { date: fmtLong(found.data?.savedAt || new Date()) }),
      confirmLabel: t('sync.foundLoad'),
    });
    if (!ok) return;
    await restoreSnapshot(config, found);
    toast(t('sync.restored'));
  });
  document.querySelector('#syncShowCode')?.addEventListener('click', () => showCode(syncConfig().code));
  document.querySelector('#syncOff')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: t('sync.offTitle'),
      text: t('sync.offText'),
      confirmLabel: t('sync.off'),
    });
    if (!ok) return;
    disconnectSync();
    render();
  });
}

// From the first start, where a successful restore means the set-up is over.
export const openSyncFromStart = () =>
  openSyncForm({
    onDone: () => {
      Object.assign(state, { onboardingStep: 1, onboardingDraft: null, onboardingPreview: null });
      navigate('home', {}, { replace: true });
    },
  });
