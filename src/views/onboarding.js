// First-run flow: language, unit, goal and experience, training days, then a ready plan. Skippable at any step.
import { plural, LANGUAGES, currentLanguage, languageLabel, setLanguage, t } from '../i18n.js';
import { icon } from '../icons.js';
import { defaultPlan, exerciseName } from '../library.js';
import { navigate, render } from '../render.js';
import { state } from '../state.js';
import { getSettings, markOnboarded, savePlans, saveSettings } from '../storage.js';
import { EQUIPMENT_CHOICES, pickTemplate, planFromTemplate } from '../templates.js';
import { infoDialog, toast } from '../ui.js';
import { LB_PER_KG } from '../units.js';
import { esc, number } from '../util.js';
import { importBackupFile } from './more.js';

const STEPS = 5;
const draft = () =>
  (state.onboardingDraft ||= {
    language: currentLanguage(),
    unit: getSettings().unit,
    goal: 'muscle',
    level: 'beginner',
    equipment: 'gym',
    days: 3,
  });

const progress = (step) =>
  `<div class="assistant-progress five">${Array.from({ length: STEPS }, (_, i) => `<i class="${step > i ? 'active' : ''}"></i>`).join('')}<span>${t('onboarding.step', { step, total: STEPS })}</span></div>`;
const head = (step) =>
  `<div class="backrow">${step > 1 ? `<button class="back" id="onboardingBack" aria-label="${t('common.back')}">${icon('chevron-left')}</button>` : '<span class="back-spacer"></span>'}<span>${t('onboarding.title')}</span><button type="button" class="text-btn backrow-action" id="onboardingSkip">${t('onboarding.skip')}</button></div>`;
const hero = (title, text) => `<section class="assistant-hero"><h1>${title}</h1><p>${text}</p></section>`;
const card = (name, value, title, text, checked) =>
  `<label><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span><b>${esc(title)}</b>${text ? `<small>${esc(text)}</small>` : ''}</span></label>`;
const form = (inner, label = t('wizard.next')) =>
  `<form id="onboardingForm" class="assistant-form">${inner}<button class="primary full" type="submit">${label}</button></form>`;

function step1(d) {
  return `${hero(t('onboarding.welcomeTitle'), t('onboarding.welcomeText'))}${form(
    `<fieldset>${LANGUAGES.map((code) => card('language', code, languageLabel(code), '', d.language === code)).join('')}</fieldset>`
  )}<p class="onboarding-foot"><button type="button" class="text-btn" id="onboardingImport">${t('onboarding.haveBackup')}</button><input type="file" id="onboardingFile" accept="application/json,.json" hidden></p>`;
}
function step2(d) {
  return `${hero(t('onboarding.unitTitle'), t('onboarding.unitText'))}${form(
    `<fieldset>${card('unit', 'kg', t('settings.kg'), t('onboarding.kgHint'), d.unit === 'kg')}${card('unit', 'lbs', t('settings.lbs'), t('onboarding.lbsHint'), d.unit === 'lbs')}</fieldset>`
  )}`;
}
function step3(d) {
  const goals = ['muscle', 'strength', 'fitness'];
  const levels = ['beginner', 'intermediate', 'advanced'];
  return `${hero(t('wizard.goalTitle'), t('wizard.goalText'))}${form(
    `<fieldset>${goals.map((g) => card('goal', g, t(`goal.${g}`), t(`goal.${g}Hint`), d.goal === g)).join('')}</fieldset><h2 class="onboarding-subhead">${t('onboarding.levelTitle')}</h2><fieldset>${levels.map((l) => card('level', l, t(`level.${l}`), t(`level.${l}Hint`), d.level === l)).join('')}</fieldset>`
  )}`;
}
function step4(d) {
  return `${hero(t('onboarding.daysTitle'), t('onboarding.daysText'))}${form(
    `<fieldset>${EQUIPMENT_CHOICES.map((key) => card('equipment', key, t(`equipmentChoice.${key}`), t(`equipmentChoice.${key}Hint`), d.equipment === key)).join('')}</fieldset><label class="days-choice"><span>${t('wizard.daysPerWeek')}</span><select name="days">${[2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${number(d.days) === n ? 'selected' : ''}>${t('trainingDays.other', { n })}</option>`).join('')}</select></label>`,
    t('wizard.preview')
  )}`;
}
function step5() {
  const p = state.onboardingPreview;
  return `<section class="assistant-hero preview-head"><h1>${esc(p.name)}</h1><p>${plural(p.days.length, 'trainingDays')}. ${t('onboarding.previewText')}</p></section><div class="plan-preview">${p.days
    .map(
      (d, i) =>
        `<article><span>${i + 1}</span><div><h2>${esc(d.name)}</h2><p>${d.exercises.map((x) => esc(exerciseName(x))).join(' · ')}</p></div><b>${d.exercises.length}</b></article>`
    )
    .join(
      ''
    )}</div><div class="preview-actions"><button class="primary" id="onboardingUse">${t('onboarding.use')}</button><button class="secondary" id="onboardingCustomize">${t('wizard.customize')}</button></div>`;
}

export function view() {
  const step = Math.min(STEPS, Math.max(1, state.onboardingStep || 1));
  const d = draft();
  if (step === 5 && !state.onboardingPreview) {
    const template = pickTemplate({ days: d.days, equipment: d.equipment, goal: d.goal, level: d.level });
    state.onboardingPreview = planFromTemplate(template.id, { level: d.level });
  }
  const body = [step1, step2, step3, step4, step5][step - 1](d);
  return `<main class="shell narrow onboarding">${head(step)}${progress(step)}${body}</main>`;
}

const go = (step) => {
  state.onboardingStep = step;
  if (step < 5) state.onboardingPreview = null;
  render();
};

// Persists the choices and the plan, then leaves the flow for good.
function finish(plan, customize = false) {
  const d = draft();
  const settings = getSettings();
  settings.language = d.language;
  if (d.unit !== settings.unit) {
    settings.unit = d.unit;
    // Sensible defaults for the other unit: 5 lb steps and a 45 lb bar.
    settings.increment = d.unit === 'lbs' ? 5 / LB_PER_KG : 2.5;
    settings.barWeight = d.unit === 'lbs' ? 45 / LB_PER_KG : 20;
  }
  saveSettings(settings);
  savePlans({ activePlanId: plan.id, items: [plan] });
  leave(
    customize
      ? ['planEditor', { editPlanId: plan.id, editorDayIndex: 0, editorReturn: 'home' }]
      : ['home', {}]
  );
}
function leave([view, patch]) {
  markOnboarded();
  Object.assign(state, { onboardingStep: 1, onboardingDraft: null, onboardingPreview: null });
  navigate(view, patch, { replace: true });
  if (!matchMedia('(display-mode: standalone)').matches)
    toast(t('onboarding.installTip'), {
      action: {
        label: t('onboarding.installHow'),
        onClick: () =>
          state.installPrompt
            ? state.installPrompt.prompt()
            : infoDialog(t('more.install'), t('more.installText')),
      },
      duration: 8000,
    });
}

export function bind() {
  const d = draft();
  document.querySelector('#onboardingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    for (const key of ['language', 'unit', 'goal', 'level', 'equipment']) if (f.has(key)) d[key] = f.get(key);
    if (f.has('days')) d.days = number(f.get('days'));
    go((state.onboardingStep || 1) + 1);
  });
  document.querySelectorAll('input[name="language"]').forEach((x) => {
    x.onchange = () => {
      d.language = x.value;
      const settings = getSettings();
      settings.language = x.value;
      saveSettings(settings);
      setLanguage(x.value);
      render();
    };
  });
  document
    .querySelector('#onboardingBack')
    ?.addEventListener('click', () => go((state.onboardingStep || 1) - 1));
  document.querySelector('#onboardingSkip')?.addEventListener('click', () => finish(defaultPlan()));
  document.querySelector('#onboardingUse')?.addEventListener('click', () => finish(state.onboardingPreview));
  document
    .querySelector('#onboardingCustomize')
    ?.addEventListener('click', () => finish(state.onboardingPreview, true));
  document
    .querySelector('#onboardingImport')
    ?.addEventListener('click', () => document.querySelector('#onboardingFile')?.click());
  document.querySelector('#onboardingFile')?.addEventListener('change', async (e) => {
    if (await importBackupFile(e.target, { replace: true })) {
      markOnboarded();
      Object.assign(state, { onboardingStep: 1, onboardingDraft: null, onboardingPreview: null });
    }
  });
}
