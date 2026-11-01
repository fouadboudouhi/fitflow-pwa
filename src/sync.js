// Optional automatic copy of everything on the person's own server (sync-server/). Off unless they connect one. The
// Claude key never leaves this device. Each upload names the version it builds on, so a device with old data can not
// silently replace newer data, and the server keeps older versions.
import { backupData, importBackup, validateBackup } from './backup.js';
import {
  LS,
  getAiChat,
  getAiMemory,
  markOnboarded,
  onDataChange,
  read,
  saveAiChat,
  saveAiMemory,
} from './storage.js';

const KEY = 'volumora-sync';
const DELAY = 20000;
const WATCHED = new Set([
  LS.plans,
  LS.history,
  LS.body,
  LS.settings,
  LS.exercisePrefs,
  LS.customExercises,
  LS.aiChat,
  LS.aiMemory,
]);

export class SyncError extends Error {
  constructor(code, latest = '') {
    super(code);
    this.code = code;
    this.latest = latest;
  }
}

export const syncConfig = () => read(KEY, null);
const saveConfig = (config) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // A full storage shows up elsewhere; the next upload tries again.
  }
};
export const disconnectSync = () => localStorage.removeItem(KEY);
const update = (changes) => {
  const config = syncConfig();
  if (config) saveConfig({ ...config, ...changes });
};

export function newSyncCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.match(/.{1,8}/g).join('-');
}

export function cleanSyncUrl(text) {
  const raw = String(text).trim().replace(/\/+$/, '');
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    return url.protocol === 'https:' || local ? url.href.replace(/\/+$/, '') : '';
  } catch {
    return '';
  }
}

async function call(config, path, options = {}) {
  let response;
  try {
    response = await fetch(`${config.url}${path}`, {
      ...options,
      headers: { authorization: `Bearer ${config.code}`, ...options.headers },
    });
  } catch {
    throw new SyncError('network');
  }
  if (response.status === 401) throw new SyncError('code');
  if (response.status === 429) throw new SyncError('blocked');
  if (response.status === 413) throw new SyncError('size');
  if (response.status === 412) throw new SyncError('newer', (await response.json().catch(() => ({}))).latest);
  if (!response.ok && response.status !== 404) throw new SyncError('server');
  return response;
}

const snapshot = async () => ({
  app: 'Volumora',
  savedAt: new Date().toISOString(),
  backup: await backupData(),
  aiChat: getAiChat(),
  aiMemory: getAiMemory(),
});

const digest = async (text) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
// What counts as a change: the data, not the moment it was packed.
const contentOf = ({ savedAt, backup: { exportedAt, ...backup }, ...rest }) =>
  JSON.stringify({ backup, ...rest });

// What the server holds: { version, data } or null when it holds nothing yet.
export async function fetchSnapshot(config = syncConfig()) {
  const response = await call(config, '/v1/snapshot');
  if (response.status === 404) return null;
  try {
    return { version: (response.headers.get('etag') || '').replaceAll('"', ''), data: await response.json() };
  } catch {
    throw new SyncError('server');
  }
}

let uploading = null;
export async function uploadNow(config = syncConfig(), { force = false } = {}) {
  if (!config) return false;
  if (uploading) await uploading.catch(() => {});
  uploading = (async () => {
    const data = await snapshot();
    const hash = await digest(contentOf(data));
    if (!force && hash === config.hash && config.version) return false;
    const response = await call(config, '/v1/snapshot', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        ...(config.version ? { 'if-match': `"${config.version}"` } : {}),
      },
      body: JSON.stringify(data),
    });
    const { version } = await response.json();
    const at = new Date().toISOString();
    if (syncConfig()) update({ version, hash, at, problem: '' });
    else saveConfig({ ...config, version, hash, at, problem: '' });
    return true;
  })();
  try {
    return await uploading;
  } finally {
    uploading = null;
  }
}

// Replaces what is on this device with what the server holds. The key and the running workout stay as they are.
export async function restoreSnapshot(config, { version, data }) {
  const backup = validateBackup(data?.backup);
  await importBackup(backup);
  if (Array.isArray(data.aiChat)) saveAiChat(data.aiChat);
  if (data.aiMemory) saveAiMemory(data.aiMemory);
  markOnboarded();
  const hash = await digest(contentOf(await snapshot()));
  saveConfig({ ...config, version, hash, at: new Date().toISOString(), problem: '' });
}

let timer = null;
const quietly = async () => {
  timer = null;
  const config = syncConfig();
  if (!config) return;
  try {
    await uploadNow(config);
  } catch (err) {
    update({ problem: err.code || 'server', latest: err.latest || '' });
  }
};
const soon = (delay = DELAY) => {
  clearTimeout(timer);
  timer = setTimeout(quietly, delay);
};

// Runs for the life of the app: uploads shortly after a change, when the connection returns, and when the app reopens.
export function startSync() {
  onDataChange((key) => {
    if (WATCHED.has(key) && syncConfig()) soon();
  });
  addEventListener('online', () => syncConfig() && soon(1000));
  document.addEventListener('visibilitychange', () => {
    if (syncConfig() && document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer);
      quietly();
    }
  });
  if (syncConfig()) soon(3000);
}
