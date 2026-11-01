// Saying what a set was. The phone's own speech recognition starts by itself; after a refusal it waits for a tap on the
// microphone in the field, which also shows why it was refused. The keyboard's microphone works in the field either way.
import { intlLocale, localDecimal, t } from '../i18n.js';
import { fmtDistance, fmtDuration } from '../sets.js';
import { parseSet } from '../speech.js';
import { icon } from '../icons.js';
import { sheet } from '../ui.js';
import { unit } from '../units.js';
import { esc } from '../util.js';

// Holds why the recognition last refused; while it is set, listening only starts from a tap.
const OFF = 'volumora-speech-off';
const REFUSALS = ['not-allowed', 'service-not-allowed', 'audio-capture'];
// Long enough for someone to answer the microphone question, which pauses everything without telling the page.
const START_TIMEOUT = 20000;

const Recognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;
const refusal = () => {
  try {
    return localStorage.getItem(OFF);
  } catch {
    return null;
  }
};
const rememberRefusal = (reason) => {
  try {
    if (reason) localStorage.setItem(OFF, reason);
    else localStorage.removeItem(OFF);
  } catch {
    // Then it is simply tried again next time.
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
  const canListen = !!Recognition();
  box.innerHTML = `<div class="dictate-field"><input id="dictateInput" autocomplete="off" enterkeyhint="done" placeholder="${esc(t(`dictate.placeholder.${trackType}`, null, t('dictate.placeholder.weight_reps')))}" aria-label="${esc(t('dictate.label'))}">${canListen ? `<button type="button" class="icon-btn quiet" id="dictateMic" aria-label="${esc(t('dictate.listen'))}" aria-pressed="false">${icon('mic')}</button>` : ''}</div><p class="dictate-state" role="status"></p><button class="primary full" id="dictateSave" disabled>${t('dictate.save')}</button>`;
  const close = sheet({ title, content: box, autoFocus: false });
  const input = box.querySelector('#dictateInput');
  const state = box.querySelector('.dictate-state');
  const save = box.querySelector('#dictateSave');
  const mic = box.querySelector('#dictateMic');
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
  const showListening = (on) => {
    mic?.classList.toggle('listening', on);
    mic?.setAttribute('aria-pressed', String(on));
  };
  const stop = () => {
    clearTimeout(waiting);
    showListening(false);
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
  const refused = (reason) => {
    rememberRefusal(reason);
    stop();
    state.textContent = `${t(`dictate.why.${reason}`)} ${t('dictate.retry')}`;
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

  function listen() {
    stop();
    input.blur();
    state.textContent = t('dictate.listening');
    showListening(true);
    recognition = new (Recognition())();
    recognition.lang = intlLocale();
    recognition.interimResults = true;
    recognition.continuous = false;
    // Some phones offer the API and then simply do nothing.
    waiting = setTimeout(() => refused('silent'), START_TIMEOUT);
    recognition.onstart = () => clearTimeout(waiting);
    recognition.onresult = (e) => {
      clearTimeout(waiting);
      rememberRefusal(null);
      const result = e.results[e.results.length - 1];
      input.value = result[0].transcript;
      const values = showParsed();
      if (result.isFinal) {
        if (values) finish(values);
        else state.textContent = t('dictate.unclear');
      }
    };
    recognition.onerror = (e) => {
      if (REFUSALS.includes(e.error)) return refused(e.error);
      stop();
      state.textContent = ['no-speech', 'aborted'].includes(e.error)
        ? t('dictate.unclear')
        : t('dictate.why.other', { code: e.error });
    };
    recognition.onend = () => {
      clearTimeout(waiting);
      recognition = null;
      showListening(false);
      if (!done && !parsed()) state.textContent = t('dictate.unclear');
    };
    try {
      recognition.start();
    } catch {
      refused('silent');
    }
  }
  mic?.addEventListener('click', () => {
    if (!recognition) return listen();
    stop();
    state.textContent = t('dictate.retry');
  });

  const reason = canListen && refusal();
  if (!canListen) {
    state.textContent = t('dictate.keyboard');
    input.focus();
  } else if (reason) {
    const known = [...REFUSALS, 'silent'].includes(reason);
    state.textContent = `${known ? `${t(`dictate.why.${reason}`)} ` : ''}${t('dictate.retry')}`;
  } else listen();
  return close;
}
