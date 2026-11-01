// AI assistant with the person's own Claude key: a chat about their training and a plan from one sentence. Without a
// key this is only the screen to add one; nothing is sent before a tap on a button.
import { AiError, askClaude, verifyKey } from '../ai.js';
import {
  PLAN_SCHEMA,
  chatPrompt,
  planFromReply,
  planPrompt,
  replyHtml,
  trainingSummary,
} from '../aiPrompts.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { exerciseName } from '../library.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import {
  allPlans,
  clearAiKey,
  getAiChat,
  getAiKey,
  hasAiKey,
  saveAiChat,
  saveAiKey,
  savePlans,
} from '../storage.js';
import { actionSheet, sheet, toast, undoToast } from '../ui.js';
import { esc, setsCount } from '../util.js';

const LABELS = {
  plans: 'nav.plans',
  analytics: 'nav.history',
  more: 'nav.more',
  settings: 'settings.title',
  ai: 'ai.title',
};
const CLEAN = { aiInput: '', aiError: '', aiPlan: null, aiMessage: '', aiDropped: 0 };
const NEAR_BOTTOM = 80;

// One request at a time. A chat answer keeps running while the person looks elsewhere and waits in the chat.
let running = null;
let runningMode = null;
let liveText = '';
const discard = () => {
  running?.abort();
  running = null;
};

export function openAi(mode, from, patch = {}) {
  if (runningMode !== (mode || 'chat')) discard();
  navigate('ai', { ...CLEAN, aiMode: mode, aiReturn: from, ...patch });
}

const backTarget = () =>
  state.aiMode === 'plan' ? (state.aiReturn === 'plans' ? 'plans' : 'ai') : state.aiReturn || 'more';
const backButton = () =>
  `<button class="back" id="aiBack" aria-label="${t('common.back')}">${icon('chevron-left')}</button>`;
const backRow = () => `<div class="backrow">${backButton()}<span>${t(LABELS[backTarget()])}</span></div>`;
const head = (title) => `${backRow()}<section class="page-head compact"><h1>${esc(title)}</h1></section>`;
const errorLine = () =>
  state.aiError ? `<p class="ai-error" role="alert">${esc(t(`ai.error.${state.aiError}`))}</p>` : '';
const sentDetails = () =>
  `<p class="muted">${t('ai.sentHint')}</p><pre class="ai-sent">${esc(trainingSummary())}</pre>`;

const setupView = () =>
  `<main class="shell narrow">${head(t('ai.setupTitle'))}<p class="muted ai-intro">${t('ai.setupIntro')}</p>
  <form class="settings-form" id="aiKeyForm" novalidate><label><span>${t('ai.keyLabel')}</span><input id="aiKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-api…"></label>${errorLine()}<button class="primary full" id="aiKeySave">${state.aiChecking ? t('ai.checking') : t('ai.keySave')}</button></form>
  <ul class="ai-notes"><li>${t('ai.setupStays')}</li><li>${t('ai.setupLimit')}</li><li>${t('ai.setupSent')}</li></ul>
  <p class="settings-hint"><a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">${t('ai.keyLink')}</a></p></main>`;

// Plan from one sentence

const planPreview = () => {
  const plan = state.aiPlan;
  return `<main class="shell narrow ai-preview">${backRow()}<section class="assistant-hero preview-head"><h1>${esc(plan.name)}</h1><p>${esc(plan.description)}</p></section>${state.aiDropped ? `<p class="muted settings-hint">${t('ai.dropped', { n: state.aiDropped })}</p>` : ''}<div class="plan-preview">${plan.days
    .map(
      (day, i) =>
        `<article><span>${i + 1}</span><div><h2>${esc(day.name)}</h2><p>${day.exercises.map((x) => `${esc(exerciseName(x))} ${setsCount(x.sets)}×${esc(x.range)}`).join(' · ')}</p></div><b>${day.exercises.length}</b></article>`
    )
    .join(
      ''
    )}</div><div class="preview-actions"><button class="primary" id="aiUsePlan">${t('wizard.use')}</button><button class="secondary" id="aiEditPlan">${t('wizard.customize')}</button><button class="text-btn" id="aiDiscardPlan">${t('ai.planAgain')}</button></div></main>`;
};

const planStatus = () =>
  running
    ? `<div class="ai-status" role="status"><span>${t('ai.thinking')}</span><button type="button" class="text-btn" id="aiCancel">${t('common.cancel')}</button></div>`
    : '';
const planExamples = () =>
  `<div class="ai-examples">${t('ai.planExamples')
    .split('|')
    .map((text) => `<button type="button" data-ai-example>${esc(text)}</button>`)
    .join('')}</div>`;

const planView = () =>
  state.aiPlan
    ? planPreview()
    : `<main class="shell narrow">${head(t('ai.plan'))}<div class="notes-field ai-field"><label for="aiPlanInput">${t('ai.planLabel')}</label><textarea id="aiPlanInput" maxlength="600" placeholder="${esc(t('ai.planPlaceholder'))}">${esc(state.aiInput)}</textarea></div>${planExamples()}${errorLine()}${state.aiMessage ? `<p class="ai-error" role="alert">${esc(state.aiMessage)}</p>` : ''}${planStatus()}<button class="primary full" id="aiPlanSend" ${running ? 'disabled' : ''}>${t('ai.planSend')}</button><details class="ai-sent-toggle"><summary>${t('ai.whatIsSent')}</summary>${sentDetails()}<p class="muted">${t('ai.sentCatalogue')}</p></details></main>`;

async function sendPlan() {
  const input = state.aiInput.trim();
  if (running || !input) {
    document.querySelector('#aiPlanInput')?.focus();
    return;
  }
  Object.assign(state, { aiError: '', aiMessage: '', aiPlan: null });
  const job = new AbortController();
  running = job;
  runningMode = 'plan';
  redraw();
  try {
    const reply = await askClaude({
      key: getAiKey(),
      ...planPrompt(input, trainingSummary()),
      maxTokens: 16000,
      schema: PLAN_SCHEMA,
      signal: job.signal,
    });
    if (running !== job) return;
    let parsed;
    try {
      parsed = JSON.parse(reply.text);
    } catch {
      throw new AiError('format');
    }
    const result = planFromReply(parsed);
    state.aiPlan = result.plan;
    state.aiDropped = result.dropped;
    if (!result.plan) state.aiMessage = result.message || t('ai.error.format');
  } catch (err) {
    if (running === job && err.code !== 'aborted') state.aiError = err.code || 'server';
  } finally {
    if (running === job) {
      running = null;
      redraw();
    }
  }
}

function acceptPlan(customize) {
  const plan = state.aiPlan;
  if (!plan) return;
  const data = allPlans();
  data.items.push(plan);
  data.activePlanId = plan.id;
  savePlans(data);
  Object.assign(state, CLEAN);
  if (customize) navigate('planEditor', { editorReturn: 'plans', editPlanId: plan.id, editorDayIndex: 0 });
  else navigate('home');
}

// Chat

const messageHtml = (message) =>
  message.role === 'user'
    ? `<div class="chat-msg chat-user">${esc(message.text)}</div>`
    : `<div class="chat-msg chat-assistant">${replyHtml(message.text)}${message.cut ? `<p class="muted">${t('ai.cut')}</p>` : ''}</div>`;
const liveHtml = () =>
  liveText
    ? replyHtml(liveText)
    : `<span class="chat-dots" role="status" aria-label="${t('ai.thinking')}"><i></i><i></i><i></i></span>`;
const chatRunning = () => running && runningMode === 'chat';

const emptyChat = () =>
  `<div class="chat-empty"><h2>${t('ai.chatTitle')}</h2><p class="muted">${t('ai.chatNote')}</p><div class="chat-starters">${t(
    'ai.chatExamples'
  )
    .split('|')
    .map((text) => `<button type="button" data-chat-starter>${esc(text)}</button>`)
    .join('')}</div></div>`;

const messagesHtml = () => {
  const messages = getAiChat();
  if (!messages.length && !chatRunning()) return emptyChat();
  return `${messages.map(messageHtml).join('')}${chatRunning() ? `<div class="chat-msg chat-assistant" id="chatLive">${liveHtml()}</div>` : ''}`;
};

const chatView = () =>
  `<main class="ai-chat"><header class="chat-head">${backButton()}<h1>${t('ai.title')}</h1><button type="button" class="icon-btn quiet" id="aiMenu" aria-label="${t('ai.menu')}">${icon('more')}</button></header>
  <div class="chat-scroll" id="chatScroll" role="log">${messagesHtml()}</div>
  <div class="chat-foot">${errorLine().replace('ai-error', 'ai-error chat-error')}<form class="chat-composer" id="chatForm"><textarea id="aiInput" rows="1" maxlength="2000" enterkeyhint="send" aria-label="${t('ai.chatPlaceholder')}" placeholder="${t('ai.chatPlaceholder')}">${esc(state.aiInput)}</textarea><button type="submit" class="chat-send" id="aiSend" aria-label="${t('ai.chatSend')}" ${chatRunning() ? 'hidden' : ''} ${state.aiInput.trim() ? '' : 'disabled'}>${icon('up')}</button><button type="button" class="chat-send chat-stop" id="aiStop" aria-label="${t('ai.chatStop')}" ${chatRunning() ? '' : 'hidden'}>${icon('stop')}</button></form></div></main>`;

const scroller = () => document.querySelector('#chatScroll');
const nearBottom = (box) => box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_BOTTOM;
const toBottom = () => {
  const box = scroller();
  if (box) box.scrollTop = box.scrollHeight;
};

// The chat updates its parts instead of rendering the screen, so the field keeps its focus and the keyboard stays.
function paintChat() {
  const box = scroller();
  if (!box) return;
  box.innerHTML = messagesHtml();
  bindStarters();
  const send = document.querySelector('#aiSend');
  const stop = document.querySelector('#aiStop');
  const input = document.querySelector('#aiInput');
  send.hidden = !!chatRunning();
  stop.hidden = !chatRunning();
  send.disabled = !input.value.trim();
  const foot = document.querySelector('.chat-foot');
  foot.querySelector('.ai-error')?.remove();
  foot.insertAdjacentHTML('afterbegin', errorLine().replace('ai-error', 'ai-error chat-error'));
}

function paintLive() {
  const box = scroller();
  const live = document.querySelector('#chatLive');
  if (!box || !live) return;
  const follow = nearBottom(box);
  live.innerHTML = liveHtml();
  if (follow) toBottom();
}

const sizeInput = (input) => {
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight}px`;
};
function setDraft(text) {
  state.aiInput = text;
  const input = document.querySelector('#aiInput');
  if (!input) return;
  input.value = text;
  sizeInput(input);
}

async function sendChat(text) {
  const question = text.trim();
  if (running || !question) return;
  const messages = [...getAiChat(), { role: 'user', text: question }];
  saveAiChat(messages);
  state.aiError = '';
  setDraft('');
  const job = new AbortController();
  running = job;
  runningMode = 'chat';
  liveText = '';
  paintChat();
  toBottom();
  // A question without an answer goes back into the field, so the conversation keeps taking turns.
  const takeBack = () => {
    saveAiChat(messages.slice(0, -1));
    setDraft(question);
  };
  try {
    const reply = await askClaude({
      key: getAiKey(),
      ...chatPrompt(trainingSummary(), messages),
      signal: job.signal,
      onText: (current) => {
        if (running !== job) return;
        liveText = current;
        paintLive();
      },
    });
    if (running !== job) return;
    if (!reply.text.trim()) throw new AiError('server');
    saveAiChat([
      ...messages,
      {
        role: 'assistant',
        text: reply.text.trim(),
        ...(reply.stopReason === 'max_tokens' ? { cut: true } : {}),
      },
    ]);
  } catch (err) {
    if (running !== job) return;
    if (liveText.trim()) saveAiChat([...messages, { role: 'assistant', text: liveText.trim() }]);
    else takeBack();
    if (err.code !== 'aborted') state.aiError = err.code || 'server';
  } finally {
    if (running === job) {
      running = null;
      liveText = '';
      paintChat();
      const box = scroller();
      if (box && nearBottom(box)) toBottom();
    }
  }
}

function newChat() {
  discard();
  const before = getAiChat();
  saveAiChat([]);
  Object.assign(state, CLEAN);
  render();
  undoToast(t('ai.chatCleared'), () => {
    saveAiChat(before);
    render();
    toBottom();
  });
}

function removeKey() {
  discard();
  const key = getAiKey();
  clearAiKey();
  render();
  undoToast(t('ai.keyRemoved'), () => {
    saveAiKey(key);
    render();
  });
}

function openMenu() {
  actionSheet(t('ai.title'), [
    getAiChat().length > 0 && { label: t('ai.chatNew'), onClick: newChat },
    { label: t('ai.plan'), hint: t('ai.planHint'), onClick: () => openAi('plan', 'ai') },
    {
      label: t('ai.whatIsSent'),
      onClick: () => {
        const box = document.createElement('div');
        box.innerHTML = sentDetails();
        sheet({ title: t('ai.whatIsSent'), content: box });
      },
    },
    { label: t('ai.removeKey'), danger: true, onClick: removeKey },
  ]);
}

export function view() {
  if (!hasAiKey()) return setupView();
  return state.aiMode === 'plan' ? planView() : chatView();
}

const redraw = () => state.view === 'ai' && render();

function bindSetup() {
  document.querySelector('#aiKeyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const field = document.querySelector('#aiKey');
    const key = field.value.trim();
    if (!key || state.aiChecking) {
      field.focus();
      return;
    }
    Object.assign(state, { aiChecking: true, aiError: '' });
    const button = document.querySelector('#aiKeySave');
    button.disabled = true;
    button.textContent = t('ai.checking');
    try {
      await verifyKey(key);
      saveAiKey(key);
      state.aiChecking = false;
      toast(t('ai.keySaved'));
    } catch (err) {
      Object.assign(state, { aiChecking: false, aiError: err.code || 'network' });
    }
    redraw();
  });
}

function bindPlan() {
  const input = document.querySelector('#aiPlanInput');
  input?.addEventListener('input', () => {
    state.aiInput = input.value;
  });
  document.querySelectorAll('[data-ai-example]').forEach((b) => {
    b.onclick = () => {
      input.value = b.textContent;
      state.aiInput = input.value;
      input.focus();
    };
  });
  document.querySelector('#aiPlanSend')?.addEventListener('click', sendPlan);
  document.querySelector('#aiCancel')?.addEventListener('click', () => {
    discard();
    render();
  });
  document.querySelector('#aiUsePlan')?.addEventListener('click', () => acceptPlan(false));
  document.querySelector('#aiEditPlan')?.addEventListener('click', () => acceptPlan(true));
  document.querySelector('#aiDiscardPlan')?.addEventListener('click', () => {
    state.aiPlan = null;
    render();
  });
}

function bindStarters() {
  document.querySelectorAll('[data-chat-starter]').forEach((b) => {
    b.onclick = () => sendChat(b.textContent);
  });
}

// Whoever reads the latest message keeps seeing it when the keyboard or a growing field takes space away.
let chatResize = null;
function keepLatestVisible() {
  const box = scroller();
  let pinned = true;
  box.addEventListener(
    'scroll',
    () => {
      pinned = nearBottom(box);
    },
    { passive: true }
  );
  chatResize?.disconnect();
  chatResize = new ResizeObserver(() => {
    if (pinned) toBottom();
  });
  chatResize.observe(box);
}

function bindChat() {
  const input = document.querySelector('#aiInput');
  const send = document.querySelector('#aiSend');
  if (!input) return;
  sizeInput(input);
  toBottom();
  keepLatestVisible();
  bindStarters();
  input.addEventListener('input', () => {
    state.aiInput = input.value;
    send.disabled = !input.value.trim();
    sizeInput(input);
  });
  // With a real keyboard Enter sends; on a phone it starts a new line and the button sends.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !matchMedia('(pointer: coarse)').matches) {
      e.preventDefault();
      sendChat(input.value);
    }
  });
  document.querySelector('#chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    sendChat(input.value);
  });
  // Tapping the buttons must not take the focus from the field, or the keyboard would drop after every message.
  document.querySelectorAll('.chat-send').forEach((b) => {
    b.addEventListener('mousedown', (e) => e.preventDefault());
  });
  document.querySelector('#aiStop').addEventListener('click', () => running?.abort());
  document.querySelector('#aiMenu').addEventListener('click', openMenu);
}

export function bind() {
  document.querySelector('#aiBack')?.addEventListener('click', () => {
    const target = backTarget();
    if (state.aiMode === 'plan') discard();
    if (target === 'ai') navigate('ai', { ...CLEAN, aiMode: null, aiReturn: 'more' });
    else navigate(target);
  });
  if (!hasAiKey()) {
    bindSetup();
    return;
  }
  if (state.aiMode === 'plan') bindPlan();
  else bindChat();
}
