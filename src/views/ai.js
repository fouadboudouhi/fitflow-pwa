// AI assistant with the person's own Claude key: a plan from one sentence, a review of the last weeks and a question
// about their numbers. Without a key this is only the screen to add one; nothing is sent before a tap on a button.
import { AiError, askClaude, verifyKey } from '../ai.js';
import {
  PLAN_SCHEMA,
  planFromReply,
  planPrompt,
  questionPrompt,
  replyHtml,
  reviewPrompt,
  trainingSummary,
} from '../aiPrompts.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { exerciseName } from '../library.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { allPlans, clearAiKey, getAiKey, getHistory, hasAiKey, saveAiKey, savePlans } from '../storage.js';
import { toast, undoToast } from '../ui.js';
import { esc, setsCount } from '../util.js';

const MODES = [
  ['plan', 'plan'],
  ['review', 'trend'],
  ['ask', 'note'],
];
const LABELS = {
  plans: 'nav.plans',
  analytics: 'nav.history',
  more: 'nav.more',
  settings: 'settings.title',
  ai: 'ai.title',
};
const CLEAN = {
  aiInput: '',
  aiText: '',
  aiError: '',
  aiPlan: null,
  aiMessage: '',
  aiDropped: 0,
  aiCut: false,
};

// A running request survives a look at another tab, but never reaches another mode: switching cancels it.
let running = null;
const stop = () => {
  running?.abort();
  running = null;
};

export function openAi(mode, from) {
  stop();
  navigate('ai', { ...CLEAN, aiMode: mode, aiReturn: from });
}

const backTarget = () =>
  !state.aiMode || ['plans', 'analytics'].includes(state.aiReturn) ? state.aiReturn || 'more' : 'ai';
const backRow = () => {
  const target = backTarget();
  return `<div class="backrow"><button class="back" id="aiBack" aria-label="${t('common.back')}">${icon('chevron-left')}</button><span>${t(LABELS[target])}</span></div>`;
};
const head = (title) => `${backRow()}<section class="page-head compact"><h1>${esc(title)}</h1></section>`;
const errorLine = () =>
  state.aiError ? `<p class="ai-error" role="alert">${esc(t(`ai.error.${state.aiError}`))}</p>` : '';
const sentDetails = (extra = '') =>
  `<details class="ai-sent"><summary>${t('ai.whatIsSent')}</summary><p class="muted">${t('ai.sentHint')}${extra}</p><pre>${esc(trainingSummary())}</pre></details>`;
const statusLine = () =>
  running
    ? `<div class="ai-status" role="status"><span>${t('ai.thinking')}</span><button type="button" class="text-btn" id="aiCancel">${t('common.cancel')}</button></div>`
    : '';
const output = () =>
  `<div class="ai-output" id="aiOutput" aria-live="polite">${replyHtml(state.aiText)}</div>${state.aiCut && !running ? `<p class="muted settings-hint">${t('ai.cut')}</p>` : ''}`;
const examples = (key) =>
  `<div class="ai-examples">${t(key)
    .split('|')
    .map((text) => `<button type="button" data-ai-example>${esc(text)}</button>`)
    .join('')}</div>`;

const setupView = () =>
  `<main class="shell narrow">${head(t('ai.setupTitle'))}<p class="muted ai-intro">${t('ai.setupIntro')}</p>
  <form class="settings-form" id="aiKeyForm" novalidate><label><span>${t('ai.keyLabel')}</span><input id="aiKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-api…"></label>${errorLine()}<button class="primary full" id="aiKeySave">${state.aiChecking ? t('ai.checking') : t('ai.keySave')}</button></form>
  <ul class="ai-notes"><li>${t('ai.setupStays')}</li><li>${t('ai.setupLimit')}</li><li>${t('ai.setupSent')}</li></ul>
  <p class="settings-hint"><a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">${t('ai.keyLink')}</a></p></main>`;

const homeView = () =>
  `<main class="shell narrow">${head(t('ai.title'))}<p class="muted ai-intro">${t('ai.intro')}</p><div class="list">${MODES.map(
    ([mode, ic]) =>
      `<button type="button" class="row" data-ai-mode="${mode}"><span class="row-icon">${icon(ic)}</span><span class="row-main"><b>${t(`ai.${mode}`)}</b><small>${t(`ai.${mode}Hint`)}</small></span>${icon('chevron-right')}</button>`
  ).join(
    ''
  )}</div><p class="muted settings-hint">${t('ai.privacy')}</p><button type="button" class="secondary danger full ai-remove" id="aiRemoveKey">${t('ai.removeKey')}</button></main>`;

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

const planView = () =>
  state.aiPlan
    ? planPreview()
    : `<main class="shell narrow">${head(t('ai.plan'))}<div class="notes-field ai-field"><label for="aiInput">${t('ai.planLabel')}</label><textarea id="aiInput" maxlength="600" placeholder="${esc(t('ai.planPlaceholder'))}">${esc(state.aiInput)}</textarea></div>${examples('ai.planExamples')}${errorLine()}${state.aiMessage ? `<p class="ai-error" role="alert">${esc(state.aiMessage)}</p>` : ''}${statusLine()}<button class="primary full" id="aiSend" ${running ? 'disabled' : ''}>${t('ai.planSend')}</button>${sentDetails(` ${t('ai.sentCatalogue')}`)}</main>`;

const reviewView = () =>
  `<main class="shell narrow">${head(t('ai.review'))}${
    getHistory().length
      ? `${output()}${errorLine()}${statusLine()}<button class="primary full" id="aiSend" ${running ? 'disabled' : ''}>${state.aiText ? t('ai.reviewAgain') : t('ai.reviewSend')}</button>${sentDetails()}`
      : `<p class="muted ai-intro">${t('ai.noHistory')}</p>`
  }</main>`;

const askView = () =>
  `<main class="shell narrow">${head(t('ai.ask'))}<div class="notes-field ai-field"><label for="aiInput">${t('ai.askLabel')}</label><textarea id="aiInput" maxlength="600" placeholder="${esc(t('ai.askPlaceholder'))}">${esc(state.aiInput)}</textarea></div>${examples('ai.askExamples')}${output()}${errorLine()}${statusLine()}<button class="primary full" id="aiSend" ${running ? 'disabled' : ''}>${t('ai.askSend')}</button>${sentDetails()}</main>`;

export function view() {
  if (!hasAiKey()) return setupView();
  if (state.aiMode === 'plan') return planView();
  if (state.aiMode === 'review') return reviewView();
  if (state.aiMode === 'ask') return askView();
  return homeView();
}

const redraw = () => state.view === 'ai' && render();
const paintText = () => {
  const box = document.querySelector('#aiOutput');
  if (box) box.innerHTML = replyHtml(state.aiText);
};

async function send(mode) {
  const input = state.aiInput.trim();
  if (running || (mode !== 'review' && !input)) {
    document.querySelector('#aiInput')?.focus();
    return;
  }
  Object.assign(state, { aiText: '', aiError: '', aiMessage: '', aiPlan: null, aiCut: false });
  const job = new AbortController();
  running = job;
  redraw();
  const summary = trainingSummary();
  const prompt =
    mode === 'plan'
      ? planPrompt(input, summary)
      : mode === 'ask'
        ? questionPrompt(summary, input)
        : reviewPrompt(summary);
  try {
    const reply = await askClaude({
      key: getAiKey(),
      ...prompt,
      maxTokens: mode === 'plan' ? 16000 : 6000,
      schema: mode === 'plan' ? PLAN_SCHEMA : undefined,
      signal: job.signal,
      onText:
        mode === 'plan'
          ? undefined
          : (text) => {
              if (running !== job) return;
              state.aiText = text;
              paintText();
            },
    });
    if (running !== job) return;
    if (mode === 'plan') {
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
    } else {
      state.aiText = reply.text;
      state.aiCut = reply.stopReason === 'max_tokens';
    }
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

export function bind() {
  document.querySelector('#aiBack')?.addEventListener('click', () => {
    const target = backTarget();
    stop();
    if (target === 'ai') navigate('ai', { ...CLEAN, aiMode: null });
    else navigate(target);
  });
  if (!hasAiKey()) {
    bindSetup();
    return;
  }
  document.querySelectorAll('[data-ai-mode]').forEach((b) => {
    b.onclick = () => navigate('ai', { ...CLEAN, aiMode: b.dataset.aiMode });
  });
  const input = document.querySelector('#aiInput');
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
  document.querySelector('#aiSend')?.addEventListener('click', () => send(state.aiMode));
  document.querySelector('#aiCancel')?.addEventListener('click', () => {
    stop();
    render();
  });
  document.querySelector('#aiUsePlan')?.addEventListener('click', () => acceptPlan(false));
  document.querySelector('#aiEditPlan')?.addEventListener('click', () => acceptPlan(true));
  document.querySelector('#aiDiscardPlan')?.addEventListener('click', () => {
    state.aiPlan = null;
    render();
  });
  document.querySelector('#aiRemoveKey')?.addEventListener('click', () => {
    const key = getAiKey();
    clearAiKey();
    render();
    undoToast(t('ai.keyRemoved'), () => {
      saveAiKey(key);
      render();
    });
  });
}
