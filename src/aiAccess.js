// Where the assistant gets Claude from: the server the person is signed in to, when it holds a key, else their own
// key on this device. Screens ask here instead of looking for a key.
import { getAiKey } from './storage.js';
import { syncConfig } from './sync.js';

export const serverAi = () => {
  const config = syncConfig();
  return config?.token && config.ai?.available && !config.problem ? config : null;
};
export const aiMode = () => (serverAi() ? 'server' : getAiKey() ? 'key' : null);
export const aiAvailable = () => aiMode() !== null;
// What the Claude client needs: { url, token } for the server, the key string otherwise.
export const aiAuth = () => {
  const server = serverAi();
  return server ? { url: server.url, token: server.token } : getAiKey();
};
