// Translation runtime. Imports only the dictionaries, so it works in Node and never depends on storage or DOM.
import { LOCALES, LOCALE_META } from './locales/index.js';

let lang = 'de';
const pluralRules = new Map();

export const LANGUAGES = Object.keys(LOCALES);
export const currentLanguage = () => lang;
export const intlLocale = () => LOCALE_META[lang].intl;
export const languageLabel = (code) => LOCALE_META[code]?.label || code;

// 'de-AT' -> 'de'; anything the app does not ship falls back to English.
export const detectLanguage = (tag = globalThis.navigator?.language) => {
  const code = String(tag || '')
    .slice(0, 2)
    .toLowerCase();
  return LANGUAGES.includes(code) ? code : 'en';
};

const interpolate = (text, params) =>
  params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text;

// Plain text, never escaped: callers put user data through esc() before passing it as a parameter in markup.
export function t(key, params, fallback) {
  const text = LOCALES[lang][key] ?? LOCALES.de[key] ?? fallback ?? key;
  return interpolate(text, params);
}

// `${key}.one` / `${key}.other` with the count available as {n}.
export function plural(count, key) {
  const n = Number(count) || 0;
  if (!pluralRules.has(lang)) pluralRules.set(lang, new Intl.PluralRules(intlLocale()));
  const form = pluralRules.get(lang).select(n);
  const text =
    LOCALES[lang][`${key}.${form}`] ?? LOCALES[lang][`${key}.other`] ?? LOCALES.de[`${key}.other`] ?? key;
  return interpolate(text, { n: fmtNumber(n) });
}

export const fmtNumber = (value, options) => Number(value).toLocaleString(intlLocale(), options);
export const weekdayShort = (index) => t('weekdays.short').split('|')[index] || '';

// 'auto' follows the device language. Updates <html lang>, the title and the description when a document exists.
export function setLanguage(setting = 'auto') {
  lang = LANGUAGES.includes(setting) ? setting : detectLanguage();
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.title = t('app.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'));
  }
  return lang;
}
