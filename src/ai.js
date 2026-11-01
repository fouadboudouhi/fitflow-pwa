// Claude API client for the optional AI features. No SDK, since the app has no build step: plain fetch, straight from
// this browser to Anthropic, with the person's own key and only after a tap.
const API = 'https://api.anthropic.com/v1';
const API_VERSION = '2026-10-21';
const TIMEOUT = 180000;
const RETRY_DELAY = 1500;
export const MODEL = 'claude-opus-5-5';

// `code` selects the message shown to the person, see `ai.error.*` in the dictionaries.
export class AiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const headers = (key) => ({
  'content-type': 'application/json',
  'x-api-key': key,
  'anthropic-version': API_VERSION,
  // Without this header the API refuses calls made from a web page.
  'anthropic-dangerous-direct-browser-access': 'true',
});

export function errorCode(status, message = '') {
  if (/credit balance|billing/i.test(message)) return 'billing';
  return (
    { 400: 'request', 401: 'key', 402: 'billing', 403: 'permission', 404: 'model', 429: 'rate' }[status] ||
    'server'
  );
}
const retryable = (code) => code === 'rate' || code === 'server';

async function post(path, key, body, signal) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw new AiError(err?.name === 'AbortError' ? 'aborted' : 'network');
  }
  if (response.ok) return response;
  const detail = await response.json().catch(() => null);
  throw new AiError(errorCode(response.status, detail?.error?.message));
}

// Stops a request when the caller cancels it or it takes too long; running out of time counts as a lost connection.
async function withTimeout(ms, signal, run) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  try {
    return await run(controller.signal);
  } catch (err) {
    throw timedOut ? new AiError('network') : err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

// Checks key and model with the free token count, so saving a key costs nothing.
export async function verifyKey(key) {
  if (/^sk-ant-oat/.test(key)) throw new AiError('subscription');
  await withTimeout(20000, null, (signal) =>
    post('/messages/count_tokens', key, { model: MODEL, messages: [{ role: 'user', content: 'Hi' }] }, signal)
  );
}

// Reads the server-sent events of a streamed reply. Thinking is skipped; only the answer text is kept.
export async function readStream(response, onText = () => {}) {
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';
  let text = '';
  let stopReason = null;
  const handle = (line) => {
    if (!line.startsWith('data:')) return;
    let event;
    try {
      event = JSON.parse(line.slice(5));
    } catch {
      return;
    }
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      text += event.delta.text;
      onText(text);
    } else if (event.type === 'message_delta') stopReason = event.delta?.stop_reason || stopReason;
    else if (event.type === 'error') throw new AiError('server');
  };
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = done ? '' : lines.pop();
    lines.forEach(handle);
    if (done) break;
  }
  return { text, stopReason };
}

// One request with one retry for a busy service, as long as no answer has appeared yet.
export async function askClaude({
  key,
  system,
  messages,
  maxTokens = 6000,
  schema,
  signal,
  onText = () => {},
}) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    stream: true,
    system,
    messages,
    ...(schema ? { output_config: { format: { type: 'json_schema', schema } } } : {}),
  };
  let started = false;
  const attempt = () =>
    withTimeout(TIMEOUT, signal, async (combined) => {
      try {
        const response = await post('/messages', key, body, combined);
        return await readStream(response, (text) => {
          started = true;
          onText(text);
        });
      } catch (err) {
        if (err instanceof AiError) throw err;
        throw new AiError(err?.name === 'AbortError' ? 'aborted' : 'network');
      }
    });
  let result;
  try {
    result = await attempt();
  } catch (err) {
    if (started || !retryable(err.code)) throw err;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    result = await attempt();
  }
  if (result.stopReason === 'refusal') throw new AiError('refusal');
  if (result.stopReason === 'max_tokens' && (schema || !result.text)) throw new AiError('truncated');
  return result;
}
