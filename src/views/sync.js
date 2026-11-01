// Signing in to the optional server copy: a sheet with address, name and password, shared by the backup screen and
// the first start. New accounts need an invitation from whoever runs the server.
import { t } from '../i18n.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import {
  SyncError,
  cleanSyncUrl,
  fetchSnapshot,
  register,
  restoreSnapshot,
  signIn,
  signOut,
  syncConfig,
  uploadNow,
} from '../sync.js';
import { confirmDialog, sheet, toast } from '../ui.js';
import { esc, fmtLong } from '../util.js';

const LAST_URL = 'volumora-sync-url';
const errorText = (err) => t(`sync.error.${err instanceof SyncError ? err.code : 'server'}`);

// Afterwards this device and the server hold the same data. Data already on the server is never replaced from here.
async function connect(config, done) {
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
  toast(t('sync.connected'));
}

export function openSyncForm({ onDone = () => render() } = {}) {
  const box = document.createElement('form');
  box.className = 'settings-form sync-form';
  box.noValidate = true;
  let lastUrl = '';
  try {
    lastUrl = localStorage.getItem(LAST_URL) || '';
  } catch {
    // Only a convenience.
  }
  const mode = (name, label) =>
    `<button type="button" class="${name === 'login' ? 'active' : ''}" data-sync-mode="${name}" aria-pressed="${name === 'login'}">${label}</button>`;
  box.innerHTML = `<p class="muted">${t('sync.intro')}</p><div class="segmented small" role="group" aria-label="${t('sync.title')}">${mode('login', t('sync.modeLogin'))}${mode('register', t('sync.modeRegister'))}</div><label><span>${t('sync.url')}</span><input id="syncUrl" type="url" inputmode="url" autocomplete="url" autocapitalize="off" spellcheck="false" placeholder="https://…" value="${esc(lastUrl)}"></label><label><span>${t('sync.username')}</span><input id="syncUser" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="32"></label><label><span>${t('sync.password')}</span><input id="syncPassword" type="password" autocomplete="current-password" minlength="8"></label><label id="syncInviteRow" hidden><span>${t('sync.invite')}</span><input id="syncInvite" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="xxxx-xxxx-xxxx"></label><p class="muted settings-hint" id="syncRegisterHint" hidden>${t('sync.registerHint')}</p><p class="ai-error" role="alert" id="syncError" hidden></p><button class="primary full" type="submit" id="syncConnect">${t('sync.signIn')}</button>`;
  const close = sheet({ title: t('sync.title'), content: box });
  let registering = false;
  box.querySelectorAll('[data-sync-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      registering = button.dataset.syncMode === 'register';
      box.querySelectorAll('[data-sync-mode]').forEach((b) => {
        const on = b === button;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on);
      });
      box.querySelector('#syncInviteRow').hidden = !registering;
      box.querySelector('#syncRegisterHint').hidden = !registering;
      box.querySelector('#syncPassword').autocomplete = registering ? 'new-password' : 'current-password';
      box.querySelector('#syncConnect').textContent = t(registering ? 'sync.register' : 'sync.signIn');
    });
  });
  box.addEventListener('submit', async (e) => {
    e.preventDefault();
    const line = box.querySelector('#syncError');
    const button = box.querySelector('#syncConnect');
    const fail = (key) => {
      line.textContent = t(`sync.error.${key}`);
      line.hidden = false;
    };
    const url = cleanSyncUrl(box.querySelector('#syncUrl').value);
    const username = box.querySelector('#syncUser').value.trim().toLowerCase();
    const password = box.querySelector('#syncPassword').value;
    const invite = box.querySelector('#syncInvite').value.trim();
    line.hidden = true;
    if (!url) return fail('url');
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) return fail('username');
    if (password.length < 8) return fail('password');
    if (registering && !invite) return fail('invite');
    button.disabled = true;
    try {
      const config = registering
        ? await register(url, username, password, invite)
        : await signIn(url, username, password);
      try {
        localStorage.setItem(LAST_URL, url);
      } catch {
        // Only a convenience.
      }
      await connect(config, () => {
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
  const expired = config.problem === 'session';
  return `<section class="list-section sync-on"><h2>${t('sync.title')}</h2><p class="settings-hint">${t('sync.on', { user: esc(config.username || ''), host: esc(new URL(config.url).host) })}</p>${status}<div class="sync-actions">${
    expired
      ? `<button type="button" class="secondary full" id="syncOpen">${t('sync.signInAgain')}</button>`
      : conflict
        ? `<button type="button" class="secondary full" id="syncLoad">${t('sync.load')}</button><button type="button" class="secondary full" id="syncKeep">${t('sync.keepThis')}</button>`
        : `<button type="button" class="secondary full" id="syncNow">${t('sync.now')}</button><button type="button" class="secondary full" id="syncLoad">${t('sync.load')}</button>`
  }<button type="button" class="text-btn" id="syncOff">${t('sync.off')}</button></div></section>`;
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
  document.querySelector('#syncOff')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: t('sync.offTitle'),
      text: t('sync.offText'),
      confirmLabel: t('sync.off'),
    });
    if (!ok) return;
    await signOut();
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
