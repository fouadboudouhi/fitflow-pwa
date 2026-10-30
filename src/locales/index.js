// Every language the app ships. Adding one: create src/locales/<code>.js, import it here, precache it in sw.js.
import de from './de.js';
import en from './en.js';

export const LOCALES = { de, en };
export const LOCALE_META = {
  de: { label: 'Deutsch', intl: 'de-DE' },
  en: { label: 'English', intl: 'en-US' },
};
