// Privacy, imprint and licences on one page; texts come from the dictionaries.
import { t } from '../i18n.js';
import { esc } from '../util.js';
import { parentRow } from './shell.js';

const paragraphs = (key) =>
  t(key)
    .split('\n')
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');

export function view() {
  return `<main class="shell narrow legal">${parentRow('more')}<section class="page-head compact"><h1>${t('legal.title')}</h1></section>
    <section class="legal-section"><h2 id="privacy">${t('legal.privacy')}</h2>${paragraphs('legal.privacyText')}</section>
    <section class="legal-section"><h2 id="imprint">${t('legal.imprint')}</h2>${paragraphs('legal.imprintText')}<p><a href="https://fouad-boudouhi.de" target="_blank" rel="noopener">fouad-boudouhi.de</a></p></section>
    <section class="legal-section"><h2 id="licenses">${t('legal.licenses')}</h2>${paragraphs('legal.licensesText')}<ul class="legal-links"><li><a href="https://github.com/fouadboudouhi/fitflow-pwa" target="_blank" rel="noopener">github.com/fouadboudouhi/fitflow-pwa</a></li><li><a href="https://github.com/YaKohen/exercises-dataset" target="_blank" rel="noopener">github.com/YaKohen/exercises-dataset</a></li><li><a href="https://exercisedb.dev" target="_blank" rel="noopener">exercisedb.dev</a></li></ul></section></main>`;
}

export function bind() {}
