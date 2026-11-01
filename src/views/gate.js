// The first screen of every installation: an account on the server, so nothing is ever lost with the device.
import { t } from '../i18n.js';
import { navigate } from '../render.js';
import { needsOnboarding } from '../storage.js';
import { syncForm } from './sync.js';

export const view = () =>
  `<main class="shell narrow gate"><section class="assistant-hero"><h1>Volumora</h1><p>${t('gate.text')}</p></section><div id="gateMount"></div><p class="muted settings-hint gate-foot">${t('gate.foot')}</p></main>`;

export function bind() {
  document.querySelector('#gateMount')?.append(
    syncForm({
      mode: 'register',
      onDone: () => navigate(needsOnboarding() ? 'onboarding' : 'home', {}, { replace: true }),
    })
  );
}
