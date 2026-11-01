// Claude API client for the optional AI assistant. No SDK, since the app has no build step: plain fetch, straight from
// this browser to Anthropic, with the person's own key and only after they send something.
const API = 'https://api.anthropic.com/v1';
const API_VERSION = '2026-10-21';
const TIMEOUT = 180000;
const RETRY_DELAY = 1500;
const MAX_STEPS = 12;
export const MODEL = 'claude-opus-5-5';

// `code` selects the message shown to the person, see `ai.error.*` in the dictionaries.
export class AiError extends Error {
  constructor(code, detail = '') {
    super(code);
    this.code = code;
    this.detail = detail;
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
  const message = detail?.error?.message || '';
  throw new AiError(errorCode(response.status, message), message);
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
  if (signal?.aborted) cancel();
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

// Rebuilds the reply's content blocks from the server-sent events. Thinking blocks and their signatures stay exactly
// as received, because a turn with tool calls has to be sent back unchanged. Tool input whose JSON cannot be read
// is marked, not guessed at.
export async function readStream(response, onText = () => {}) {
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  const blocks = [];
  let buffer = '';
  let stopReason = null;
  const textDeltas = { text_delta: 'text', thinking_delta: 'thinking', signature_delta: 'signature' };
  const textOf = () =>
    blocks
      .filter((b) => b?.type === 'text')
      .map((b) => b.text)
      .join('');
  const handle = (line) => {
    if (!line.startsWith('data:')) return;
    let event;
    try {
      event = JSON.parse(line.slice(5));
    } catch {
      return;
    }
    if (event.type === 'content_block_start') {
      blocks[event.index] = { ...event.content_block };
      if (blocks[event.index].type === 'tool_use') blocks[event.index].partial = '';
    } else if (event.type === 'content_block_delta') {
      const block = blocks[event.index];
      if (!block) return;
      const field = textDeltas[event.delta?.type];
      if (field) {
        block[field] = (block[field] || '') + event.delta[field];
        if (field === 'text') onText(textOf());
      } else if (event.delta?.type === 'input_json_delta') block.partial += event.delta.partial_json;
    } else if (event.type === 'content_block_stop') {
      const block = blocks[event.index];
      if (block?.type !== 'tool_use') return;
      try {
        block.input = block.partial ? JSON.parse(block.partial) : {};
      } catch {
        block.invalid = block.partial;
        block.input = {};
      }
      delete block.partial;
    } else if (event.type === 'message_delta') stopReason = event.delta?.stop_reason || stopReason;
    else if (event.type === 'error') throw new AiError('server', event.error?.message);
  };
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = done ? '' : lines.pop();
    lines.forEach(handle);
    if (done) break;
  }
  return { content: blocks.filter(Boolean), text: textOf(), stopReason };
}

// What goes back to the API: the reply as received, without what only this client added.
const asSent = (block) => {
  if (block.type !== 'tool_use') return block;
  const { invalid, partial, ...sent } = block;
  return sent;
};

async function requestStep({ key, body, signal, onText }) {
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
  try {
    return await attempt();
  } catch (err) {
    if (started || !retryable(err.code)) throw err;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    return attempt();
  }
}

// One turn of the assistant: asks Claude, runs the tools it calls, sends the results back and repeats until it
// answers. `execute(name, input)` returns the tool's result. System prompt and tools stay the same for the whole
// turn and the transcript only grows, as the API requires for thinking blocks to stay valid. Between turns only the
// visible text is kept, so nothing earlier has to match.
export async function runTurn({
  key,
  system,
  messages,
  tools = [],
  maxTokens = 8000,
  signal,
  onText = () => {},
  execute,
}) {
  const transcript = [...messages];
  let shown = '';
  const join = (text) => [shown, text.trim()].filter(Boolean).join('\n\n');
  for (let step = 0; step < MAX_STEPS; step++) {
    const reply = await requestStep({
      key,
      signal,
      onText: (text) => onText(join(text)),
      body: {
        model: MODEL,
        max_tokens: maxTokens,
        stream: true,
        cache_control: { type: 'ephemeral' },
        system,
        ...(tools.length ? { tools } : {}),
        messages: transcript,
      },
    });
    shown = join(reply.text);
    const calls = reply.content.filter((block) => block.type === 'tool_use');
    if (reply.stopReason === 'refusal') throw new AiError('refusal');
    if (reply.stopReason === 'max_tokens') {
      if (calls.length || !shown) throw new AiError('truncated');
      return { text: shown, stopReason: reply.stopReason };
    }
    if (reply.stopReason !== 'tool_use' || !calls.length)
      return { text: shown, stopReason: reply.stopReason };
    transcript.push({ role: 'assistant', content: reply.content.map(asSent) });
    const results = [];
    for (const call of calls) {
      if (signal?.aborted) throw new AiError('aborted');
      if (call.invalid !== undefined) {
        results.push({
          type: 'tool_result',
          tool_use_id: call.id,
          is_error: true,
          content: JSON.stringify({ INVALID_JSON: call.invalid }),
        });
        continue;
      }
      let outcome;
      try {
        outcome = await execute(call.name, call.input);
      } catch (err) {
        outcome = { error: err?.message || 'Tool failed' };
      }
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        ...(outcome?.error ? { is_error: true } : {}),
        content: JSON.stringify(outcome?.error ? { error: outcome.error } : outcome),
      });
    }
    transcript.push({ role: 'user', content: results });
  }
  throw new AiError('steps');
}
