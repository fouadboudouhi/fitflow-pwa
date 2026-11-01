// Saying what a set was. The phone's own speech recognition is tried first; installed iPhone apps often cannot use it,
// so a field stays ready for the microphone on the keyboard, and after a failure that is the only way used from then on.
import { intlLocale, localDecimal, t } from '../i18n.js';
import { fmtDistance, fmtDuration } from '../sets.js';
import { parseSet } from '../speech.js';
import { sheet } from '../ui.js';
import { unit } from '../units.js';
import { esc } from '../util.js';

const OFF = 'volumora-speech-off';
// Long enough for someone to answer the microphone question, which pauses everything without telling the page.
const START_TIMEOUT = 20000;

const Recognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;
const speechOff = () => {
  try {
    return !!localStorage.getItem(OFF);
  } catch {
    return true;
  }
};

const preview = (values) =>
  [
    values.weight ? `${localDecimal(values.weight)} ${unit()}` : '',
    values.reps ? t('dictate.reps', { n: values.reps }) : '',
    values.distance ? fmtDistance(values.distance) : '',
    values.time ? fmtDuration(values.time) : '',
  ]
    .filter(Boolean)
    .join(' · ');

// `onValues` gets the parsed values, in the person's unit, once they are clear.
export function openDictation({ title, trackType, onValues }) {
  const box = document.createElement('form');
  box.className = 'dictate';
  box.noValidate = true;
  box.innerHTML = `<input id="dictateInput" autocomplete="off" enterkeyhint="done" placeholder="${esc(t(`dictate.placeholder.${trackType}`, null, t('dictate.placeholder.weight_reps')))}" aria-label="${esc(t('dictate.label'))}"><p class="dictate-state" role="status"></p><button class="primary full" id="dictateSave" disabled>${t('dictate.save')}</button>`;
  const useSpeech = !!Recognition() && !speechOff();
  const close = sheet({ title, content: box, autoFocus: false });
  const input = box.querySelector('#dictateInput');
  const state = box.querySelector('.dictate-state');
  const save = box.querySelector('#dictateSave');
  let recognition = null;
  let waiting = null;
  let done = false;

  const parsed = () => parseSet(input.value, trackType);
  const showParsed = () => {
    const values = parsed();
    save.disabled = !values;
    if (values) state.textContent = preview(values);
    return values;
  };
  const stop = () => {
    clearTimeout(waiting);
    if (!recognition) return;
    const running = recognition;
    recognition = null;
    running.onresult = running.onerror = running.onend = running.onstart = null;
    try {
      running.abort();
    } catch {
      // It had already ended.
    }
  };
  const finish = (values) => {
    if (done) return;
    done = true;
    stop();
    close();
    onValues(values);
  };
  const typeInstead = () => {
    stop();
    state.textContent = t('dictate.keyboard');
    input.focus();
  };
  const giveUpOnSpeech = () => {
    try {
      localStorage.setItem(OFF, '1');
    } catch {
      // Then it is simply tried again next time.
    }
    typeInstead();
  };

  // Tapping the field means typing or the keyboard's microphone, whatever the recognition was doing.
  input.addEventListener('focus', () => {
    if (!recognition) return;
    stop();
    state.textContent = t('dictate.keyboard');
  });
  input.addEventListener('input', () => {
    stop();
    if (!showParsed()) state.textContent = t('dictate.keyboard');
  });
  box.addEventListener('submit', (e) => {
    e.preventDefault();
    const values = parsed();
    if (values) finish(values);
  });
  // Closing the sheet any other way must not leave the microphone on.
  new MutationObserver((_, observer) => {
    if (!box.isConnected) {
      stop();
      observer.disconnect();
    }
  }).observe(document.body, { childList: true });

  if (!useSpeech) {
    typeInstead();
    return close;
  }
  state.textContent = t('dictate.listening');
  recognition = new (Recognition())();
  recognition.lang = intlLocale();
  recognition.interimResults = true;
  recognition.continuous = false;
  // Some phones offer the API and then simply do nothing.
  waiting = setTimeout(giveUpOnSpeech, START_TIMEOUT);
  recognition.onstart = () => clearTimeout(waiting);
  recognition.onresult = (e) => {
    clearTimeout(waiting);
    const result = e.results[e.results.length - 1];
    input.value = result[0].transcript;
    const values = showParsed();
    if (result.isFinal) {
      if (values) finish(values);
      else state.textContent = t('dictate.unclear');
    }
  };
  recognition.onerror = (e) => {
    if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error)) giveUpOnSpeech();
    else {
      stop();
      state.textContent = t('dictate.unclear');
    }
  };
  recognition.onend = () => {
    clearTimeout(waiting);
    recognition = null;
    if (!done && !parsed()) state.textContent = t('dictate.unclear');
  };
  try {
    recognition.start();
  } catch {
    giveUpOnSpeech();
  }
  return close;
}
